"""Queue visibility, fixed telemetry bounds, stale workers and fenced samples."""
import os
import tempfile
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from server.store import Store, dumps
from server.telemetry import WorkerHeartbeat, cleanup, record_claim, snapshot
from server.worker import finish


class TelemetryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.store = Store("sqlite:///" + str(Path(self.directory.name) / "test.db"))
        self.store.initialize()

    def enqueue(self, identifier, mode="run", created=1000, status="queued", lease=0):
        with self.store.transaction() as tx:
            data = {"id": identifier, "mode": mode, "userId": "PRIVATE_USER", "code": "SECRET_SOURCE", "passwordHash": "SECRET_HASH"}
            tx.execute("INSERT INTO jobs(id,user_id,status,created,lease,data,mode) VALUES(?,?,?,?,?,?,?)", (identifier, "player", status, created, lease, dumps(data), mode))

    def test_live_queue_is_split_by_mode_and_actual_admission_rule(self):
        self.enqueue("run", created=900)
        self.enqueue("submit", "submit", created=990, status="running", lease=999)
        self.enqueue("recheck_one", "recheck", created=950)
        self.enqueue("recheck_audit_one", "break_audit", created=970, status="running", lease=700)
        self.enqueue("finished", created=0, status="completed")
        value = snapshot(self.store, now=1000)
        self.assertEqual((value["queue"]["queued"], value["queue"]["running"], value["queue"]["expired"]), (2, 2, 1))
        self.assertEqual((value["queue"]["foregroundQueued"], value["queue"]["foregroundRunning"], value["queue"]["admissionUsed"]), (1, 1, 2))
        self.assertEqual(value["queue"]["oldestWaitSeconds"], 100)
        self.assertEqual(value["queue"]["meanWaitSeconds"], 75)
        groups = {group["mode"]: group for group in value["queue"]["byMode"]}
        self.assertEqual(groups["recheck"]["oldestWaitSeconds"], 50)
        self.assertEqual(groups["recheck"]["meanWaitSeconds"], 50)
        self.assertIsNone(value["activity"]["meanWaitMs"])
        self.assertNotIn("SECRET", dumps(value))
        self.assertNotIn("PRIVATE_USER", dumps(value))

    def test_completion_retry_and_stale_claim_cannot_double_count(self):
        self.enqueue("first", created=998)
        with patch("server.store.time.time", return_value=1000):
            job = self.store.claim()
        self.assertEqual(job["telemetryWaitMs"], 2000)
        job.pop("_telemetryMonotonic")
        with patch("server.telemetry.time.time", return_value=1003), self.store.transaction() as tx:
            self.assertTrue(finish(tx, job, result={"status": "WRONG_ANSWER"}))
            self.assertFalse(finish(tx, job, result={"status": "OK"}))
        value = snapshot(self.store, now=1004)["activity"]
        self.assertEqual((value["completed"], value["failed"]), (1, 0))
        self.assertEqual((value["meanWaitMs"], value["meanExecutionMs"]), (2000, 3000))
        self.assertEqual((value["p95WaitMs"], value["p95ExecutionMs"]), (2500, 5000))
        self.enqueue("second", created=1000)
        with patch("server.store.time.time", return_value=1004):
            stale = self.store.claim()
        with self.store.transaction() as tx:
            tx.execute("UPDATE jobs SET lease=lease+1 WHERE id=?", (stale["id"],))
            self.assertFalse(finish(tx, stale, result={}))
        self.assertEqual(snapshot(self.store, now=1005)["activity"]["completed"], 1)

    def test_aggregates_keep_fixed_cardinality_and_expire_without_history_scans(self):
        with self.store.transaction() as tx:
            for index in range(1000):
                record_claim(tx, {"id": str(index), "mode": "submit", "telemetryClaimedAt": 1000, "telemetryWaitMs": 10}, failed=index == 0, now=1002)
            self.assertEqual(tx.execute("SELECT COUNT(*) FROM performance_minutes").fetchone()[0], 1)
        stats = snapshot(self.store, now=1010)["activity"]
        self.assertEqual((stats["completed"], stats["failed"], stats["perMinute"]), (999, 1, 200))
        self.assertEqual(stats["p95WaitMs"], 10)
        self.assertFalse(stats["p95WaitCapped"])
        self.assertEqual(snapshot(self.store, now=1400)["activity"]["completed"], 0)
        with self.store.transaction() as tx:
            self.assertEqual(cleanup(tx, now=100000)["buckets"], 1)

    def test_heartbeat_busy_occupancy_crash_detection_and_retention(self):
        worker = WorkerHeartbeat(self.store)
        with patch("server.telemetry.time.time", return_value=1000), patch("server.telemetry.time.monotonic", return_value=100):
            worker.report()
            worker.begin({"mode": "submit", "code": "SECRET"})
        with patch("server.telemetry.time.time", return_value=1010), patch("server.telemetry.time.monotonic", return_value=110):
            worker.report()
        state = snapshot(self.store, now=1011)["workers"]
        self.assertEqual((state["online"], state["busy"], state["stale"]), (1, 1, 0))
        self.assertEqual((state["items"][0]["mode"], state["items"][0]["busySeconds"], state["items"][0]["utilizationPercent"]), ("submit", 10, 100))
        self.assertNotIn("SECRET", dumps(state))
        stale = snapshot(self.store, now=1046)["workers"]
        self.assertEqual((stale["online"], stale["stale"], stale["items"][0]["state"]), (0, 1, "offline"))
        with patch("server.telemetry.time.time", return_value=1020), patch("server.telemetry.time.monotonic", return_value=120):
            worker.end()
            worker.report()
        self.assertEqual(snapshot(self.store, now=1021)["workers"]["busy"], 0)
        with self.store.transaction() as tx:
            self.assertEqual(cleanup(tx, now=100000)["workers"], 1)

    def test_cached_snapshot_is_shared_but_cannot_be_mutated_by_api_enrichment(self):
        first = snapshot(self.store)
        first["queue"]["queued"] = 999
        self.enqueue("new", created=1000)
        self.assertEqual(snapshot(self.store)["queue"]["queued"], 0)
        self.assertEqual(snapshot(self.store, force=True)["queue"]["queued"], 1)

    def test_startup_backfills_only_live_legacy_mode(self):
        self.enqueue("old", mode="unknown")
        self.enqueue("archive", mode="unknown", status="completed")
        with self.store.transaction() as tx:
            for identifier in ("old", "archive"):
                tx.execute("UPDATE jobs SET data=? WHERE id=?", (dumps({"mode": "submit", "code": "SECRET"}), identifier))
        self.store.initialize()
        with self.store.transaction() as tx:
            modes = dict(tx.execute("SELECT id,mode FROM jobs").fetchall())
        self.assertEqual(modes, {"old": "submit", "archive": "unknown"})


@unittest.skipUnless(os.environ.get("TEST_POSTGRES_URL"), "Set TEST_POSTGRES_URL for PostgreSQL telemetry checks")
class TelemetryPostgresTests(TelemetryTests):
    def setUp(self):
        import psycopg
        from psycopg import sql
        base_url = os.environ["TEST_POSTGRES_URL"]
        schema = "lwperf_" + uuid.uuid4().hex
        with psycopg.connect(base_url, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        def remove_schema():
            with psycopg.connect(base_url, autocommit=True) as connection:
                connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
        self.addCleanup(remove_schema)
        parts = urlsplit(base_url)
        query = dict(parse_qsl(parts.query))
        query["options"] = "-csearch_path=" + schema
        self.store = Store(urlunsplit(parts._replace(query=urlencode(query))))
        self.store.initialize()

    def test_parallel_bucket_upserts_preserve_every_completion(self):
        def add(index):
            with self.store.transaction() as tx:
                record_claim(tx, {"id": str(index), "mode": "recheck", "telemetryClaimedAt": 1000, "telemetryWaitMs": 10}, now=1002)
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(add, range(40)))
        activity = snapshot(self.store, now=1003)["activity"]
        self.assertEqual(activity["completed"], 40)
        self.assertEqual(activity["meanExecutionMs"], 2000)


if __name__ == "__main__":
    unittest.main()
