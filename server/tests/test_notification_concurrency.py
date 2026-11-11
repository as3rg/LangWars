"""Notification publication invariants against an isolated PostgreSQL schema."""
import copy
import os
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from server.store import Store


@unittest.skipUnless(os.environ.get("TEST_POSTGRES_URL"), "Set TEST_POSTGRES_URL for PostgreSQL notification checks")
class NotificationConcurrencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        from psycopg import sql
        cls.base_url = os.environ["TEST_POSTGRES_URL"]
        cls.schema = "lw_notify_" + uuid.uuid4().hex
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
            for kind in ("notifications", "break_audits", "break_snapshots", "break_candidates", "submissions"):
                tx.execute("DELETE FROM records WHERE kind=?", (kind,))
            tx.execute("DELETE FROM dependencies")

    def test_concurrent_event_retries_preserve_single_entry_and_read_state(self):
        from server.notifications import event

        def deliver(_):
            with self.store.transaction() as tx:
                tx.world()
                return event(tx, "recipient", "accepted", "result:one", submissionId="one")["id"]

        with ThreadPoolExecutor(max_workers=4) as pool:
            identifiers = list(pool.map(deliver, range(8)))
        self.assertEqual(len(set(identifiers)), 1)
        with self.store.transaction() as tx:
            tx.world()
            notice = tx.get("notifications", identifiers[0])
            notice["read"] = True
            tx.put("notifications", notice["id"], notice)
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(deliver, range(8)))
        with self.store.transaction() as tx:
            self.assertEqual(len(tx.list("notifications", user_id="recipient")), 1)
            self.assertTrue(tx.get("notifications", identifiers[0])["read"])

    def test_duplicate_audit_workers_credit_one_player_once_and_release_snapshots(self):
        from server.break_audits import schedule
        from server.langwarsscript import compile_program
        from server.worker import process_job

        code = "@solution fn solve(){return value;}"
        function = compile_program(code)["functions"]["solve"]
        with self.store.transaction() as tx:
            world = tx.world()
            before = copy.deepcopy(world)
            before["version"] = 1
            before["snapshot"] = {"variables": {"value": 1}, "functions": {"solve": function}, "last": {}}
            before["owners"] = {"value": "seed", "solve": "victim-sub"}
            after = copy.deepcopy(before)
            after["version"] = 2
            after["snapshot"]["variables"]["value"] = 2
            after["owners"]["value"] = "cause-sub"
            tx.save_world(after)
            for identifier in ("victim", "attacker"):
                tx.put("users", identifier, {"id": identifier, "username": identifier, "banned": False, "role": "user"})
            tx.put("tasks", "causal-test", {"id": "causal-test", "title": "Causal test", "score": 10,
                                            "timeLimitMs": 1000, "tests": [{"input": [], "expected": 1}]})
            # The ordinary latest-world recheck has already observed the failure.
            victim = {"id": "victim-sub", "userId": "victim", "taskId": "causal-test", "code": code,
                      "status": "BROKEN", "verdictStatus": "WRONG_ANSWER", "everAccepted": True,
                      "worldVersion": 2, "notificationState": {"passing": True, "version": 1}}
            cause = {"id": "cause-sub", "userId": "attacker", "taskId": "causal-test", "taskTitle": "Causal test",
                     "status": "OK", "everAccepted": True, "worldVersion": 2}
            tx.put("submissions", victim["id"], victim)
            tx.put("submissions", cause["id"], cause)
            schedule(tx, before, after, cause, [victim["id"]])
        job = self.store.claim()
        self.assertIsNotNone(job)
        # Both processes can finish their sandbox work, but only one fenced commit wins.
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _: process_job(self.store, job), range(2)))
        process_job(self.store, job)
        with self.store.transaction() as tx:
            notices = tx.list("notifications")
            self.assertEqual(sum(item["kind"] == "broken" for item in notices), 1)
            self.assertEqual(sum(item["kind"] == "breaking" for item in notices), 1)
            self.assertEqual(tx.get("submissions", "cause-sub")["brokenUserIds"], ["victim"])
            self.assertEqual(tx.get("submissions", "victim-sub")["notificationState"], {"passing": False, "version": 2})
            for kind in ("break_audits", "break_snapshots", "break_candidates"):
                self.assertEqual(tx.list(kind), [], kind)
            self.assertEqual(tx.execute("SELECT status FROM jobs WHERE id=?", (job["id"],)).fetchone()[0], "completed")
