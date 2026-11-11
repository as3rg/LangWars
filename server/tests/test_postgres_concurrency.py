"""Production-store concurrency checks, isolated in a disposable PostgreSQL schema.

Set TEST_POSTGRES_URL to enable. No existing schemas or application rows are changed.
"""
import os
import time
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from server.store import Store, dumps


@unittest.skipUnless(os.environ.get("TEST_POSTGRES_URL"), "Set TEST_POSTGRES_URL for PostgreSQL concurrency checks")
class PostgresConcurrencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        from psycopg import sql
        cls.base_url = os.environ["TEST_POSTGRES_URL"]
        cls.schema = "lwtest_" + uuid.uuid4().hex
        with psycopg.connect(cls.base_url, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(cls.schema)))
        parts = urlsplit(cls.base_url)
        query = dict(parse_qsl(parts.query))
        query["options"] = "-csearch_path=" + cls.schema
        cls.store = Store(urlunsplit(parts._replace(query=urlencode(query))))
        cls.store.initialize()

    @classmethod
    def tearDownClass(cls):
        import psycopg
        from psycopg import sql
        with psycopg.connect(cls.base_url, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(cls.schema)))

    def setUp(self):
        with self.store.transaction() as tx:
            tx.execute("DELETE FROM jobs")

    def enqueue(self, identifier, created=None):
        with self.store.transaction() as tx:
            job = {"id": identifier, "userId": "queue-test", "mode": "run"}
            tx.execute("INSERT INTO jobs(id,user_id,status,created,data) VALUES(?,?,'queued',?,?)", (identifier, "queue-test", created or time.time(), dumps(job)))

    def test_parallel_consumers_claim_each_job_exactly_once(self):
        for index in range(30):
            self.enqueue("claim_" + str(index), time.time() + index / 1000)
        with ThreadPoolExecutor(max_workers=6) as pool:
            claimed = list(pool.map(lambda _: self.store.claim(), range(36)))
        identifiers = [job["id"] for job in claimed if job]
        self.assertEqual(len(identifiers), 30)
        self.assertEqual(len(set(identifiers)), 30)

    def test_world_row_serializes_concurrent_publications(self):
        with self.store.transaction() as tx:
            before = tx.world()["version"]

        def increment(_):
            with self.store.transaction() as tx:
                world = tx.world()
                world["version"] += 1
                tx.save_world(world)

        with ThreadPoolExecutor(max_workers=5) as pool:
            list(pool.map(increment, range(20)))
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()["version"], before + 20)

    def test_reclaimed_lease_cannot_commit_old_result(self):
        from server.worker import finish, lease_valid
        self.enqueue("lease_test")
        original = self.store.claim()
        with self.store.transaction() as tx:
            tx.execute("UPDATE jobs SET lease=? WHERE id=?", (time.time() - 1000, "lease_test"))
        replacement = self.store.claim()
        self.assertEqual(replacement["id"], original["id"])
        self.assertNotEqual(replacement["lease"], original["lease"])
        with self.store.transaction() as tx:
            self.assertFalse(lease_valid(tx, original))
            self.assertFalse(finish(tx, original, result={"stale": True}))
            self.assertTrue(finish(tx, replacement, result={"current": True}))
        with self.store.transaction() as tx:
            row = tx.execute("SELECT status,data FROM jobs WHERE id=?", ("lease_test",)).fetchone()
            self.assertEqual(row[0], "completed")
            self.assertNotIn('"stale"', row[1])

    def test_parallel_fenced_completions_aggregate_once_per_claim(self):
        from server.worker import finish
        from server.telemetry import snapshot
        with self.store.transaction() as tx:
            tx.execute("DELETE FROM performance_minutes")
        for index in range(20):
            self.enqueue("metric_" + str(index), time.time() - 2)
        claims = [self.store.claim() for _ in range(20)]
        expected_wait = sum(job["telemetryWaitMs"] for job in claims)
        def complete(job):
            with self.store.transaction() as tx:
                self.assertTrue(finish(tx, job, result={"status": "WRONG_ANSWER"}))
                self.assertFalse(finish(tx, job, result={"status": "OK"}))
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(complete, claims))
        self.enqueue("stale_metric")
        stale = self.store.claim()
        with self.store.transaction() as tx:
            tx.execute("UPDATE jobs SET lease=lease+1 WHERE id=?", (stale["id"],))
            self.assertFalse(finish(tx, stale, result={}))
            total, failed, wait = tx.execute("SELECT SUM(completed),SUM(failed),SUM(wait_sum) FROM performance_minutes").fetchone()
            self.assertEqual((total, failed), (20, 0))
            self.assertAlmostEqual(wait, expected_wait)
        metrics = snapshot(self.store, force=True)["activity"]
        self.assertEqual(metrics["completed"], 20)
        self.assertGreaterEqual(metrics["meanWaitMs"], 2000)
        self.assertGreater(metrics["meanExecutionMs"], 0)

    def test_nonempty_upgrade_streams_and_updates_all_historical_batches(self):
        user_id = "legacy-backfill-player"
        with self.store.transaction() as tx:
            tx.world()
            tx.put("users", user_id, {"id": user_id, "username": "legacy", "submissionPenalties": 4, "createdAt": "2026-11-11T00:00:00Z"})
            for index in range(205):
                identifier = "archive_" + str(index).zfill(4)
                tx.put("submissions", identifier, {"id": identifier, "userId": user_id, "taskId": "shared-sum", "everAccepted": True,
                       "status": "OK", "code": "//" + "x" * 2000, "publicationVersion": index, "names": ["shared", "name_" + str(index)],
                       "createdAt": "2026-11-11T00:00:00Z", "penaltyPoints": 4 if index == 0 else 0})
            job = {"mode": "submit", "userId": user_id, "taskId": "shared-sum", "penaltyPoints": 4, "result": {"submission": {"id": "archive_0000"}}}
            tx.execute("INSERT INTO jobs(id,user_id,status,created,data) VALUES('archive-fee',?,'completed',0,?)", (user_id, dumps(job)))
            tx.delete("system", "task-ledger-v1")
        # Exercises named source cursors alongside UPDATEs in a real startup tx.
        self.store.initialize()
        self.store.initialize()
        with self.store.transaction() as tx:
            user = tx.get("users", user_id)
            self.assertEqual(user["taskPenalties"], {"shared-sum": 4})
            self.assertEqual((user["rating"], user["solvedCount"]), (46, 1))
            self.assertEqual(len(user["taskClaimedNames"]["shared-sum"]), 206)
            active = tx.execute("SELECT id FROM records WHERE kind='submissions' AND user_id=? AND active=1", (user_id,)).fetchall()
            self.assertEqual(active, [("archive_0204",)])
            self.assertFalse(tx.get("submissions", "archive_0000")["active"])
