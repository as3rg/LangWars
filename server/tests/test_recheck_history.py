"""Judge-history bounds, replay fencing and administrative disclosure."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server import recheck_history as history
from server.store import Store, dumps
from server.tests import test_platform as fixtures
from server.worker import process_job, sandbox, schedule_rechecks


class HistoryStorageTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.store = Store("sqlite:///" + str(Path(self.directory.name) / "test.db"))
        self.store.initialize()
        self.sub = {"id": "victim", "userId": "player", "taskId": "task", "status": "OK", "everAccepted": True}
        self.task = {"id": "task", "title": "Task"}
        with self.store.transaction() as tx:
            tx.put("submissions", self.sub["id"], self.sub)

    def record(self, tx, index=0, **kwargs):
        return history.record(tx, {"id": "job_" + str(index), "lease": 1}, self.sub, self.task,
                              {"status": "OK", "tests": []}, world_version=index, **kwargs)

    def test_replay_is_idempotent_timestamp_ties_paginate_without_gaps(self):
        with self.store.transaction() as tx, patch("server.recheck_history.iso", return_value="2026-11-11T12:00:00Z"):
            records = [self.record(tx, index) for index in range(7)]
            repeated = self.record(tx, 0)
            self.assertEqual(repeated, records[0])
            observed, cursor = [], None
            while True:
                result = history.page(tx, submission_id="victim", limit=2, cursor=cursor)
                observed.extend(item["id"] for item in result["items"])
                cursor = result["nextCursor"]
                if cursor is None:
                    break
            self.assertEqual(observed, sorted(record["id"] for record in records))

    def test_cause_filter_payload_privacy_and_unavailable_verdict(self):
        result = {"status": "WRONG_ANSWER", "stdout": "SECRET", "code": "PRIVATE", "changes": {"answer": "SECRET"},
                  "tests": [{"passed": False, "input": "SECRET", "expected": "SECRET", "actual": "SECRET", "durationMs": 0.125}],
                  "diagnostics": [{"code": "CONTRACT", "message": "x" * 2000}] * 10}
        with self.store.transaction() as tx:
            value = history.record(tx, {"id": "causal", "lease": 1}, self.sub, self.task, result, "causal_after", world_version=2, cause_submission_id="source")
            self.assertEqual((value["status"], value["durationMs"], value["testsTotal"]), ("BROKEN", 0.125, 1))
            self.assertEqual(len(value["diagnostics"]), 8)
            self.assertEqual(len(value["diagnostics"][0]["message"]), 1000)
            self.assertNotIn("SECRET", dumps(value))
            self.assertNotIn("PRIVATE", dumps(value))
            unavailable = history.record(tx, {"id": "timeout", "lease": 1}, self.sub, self.task, None, world_version=3)
            self.assertFalse(unavailable["completed"])
            self.assertEqual(unavailable["verdictStatus"], "UNAVAILABLE")
            caused = history.page(tx, cause_submission_id="source")["items"]
            self.assertEqual([item["id"] for item in caused], [value["id"]])
            self.assertEqual(len(history.page(tx, submission_id="victim")["items"]), 2)

    def test_history_is_bounded_and_cleanup_removes_old_or_deleted_targets(self):
        with self.store.transaction() as tx, patch("server.recheck_history.MAX_RUNS_PER_SUBMISSION", 2):
            for index in range(4):
                with patch("server.recheck_history.iso", return_value=f"2026-11-11T12:00:0{index}Z"):
                    self.record(tx, index)
            self.assertEqual([item["worldVersion"] for item in history.page(tx, submission_id="victim")["items"]], [3, 2])
            tx.execute("UPDATE recheck_runs SET created='2000-01-01T00:00:00Z' WHERE id=?", (history.page(tx, submission_id="victim")["items"][0]["id"],))
            self.assertEqual(history.cleanup(tx), 1)
            tx.delete("submissions", "victim")
            self.assertEqual(history.cleanup(tx), 1)
            self.assertEqual(history.page(tx, submission_id="victim")["items"], [])


class HistoryEndpointTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work
    drain = fixtures.PlatformTests.drain

    def test_live_and_causal_history_are_admin_only_and_replay_safe(self):
        self.settings(submitCooldownSeconds=0)
        _, player = self.register()
        _, attacker = self.register("attacker")
        task = self.create_task("victim", 11)
        source_task = self.create_task("attacker", 50)
        victim = self.submit_and_work(task, '@solution fn first_answer(){let answer=10;return answer+1;}', player)
        source = self.submit_and_work(source_task, '@solution fn second_answer(){let answer=50;return answer;}', attacker)
        self.drain()
        route = f"/api/admin/submissions/{victim['id']}/rechecks"
        self.assertEqual(self.client.get(route).status_code, 401)
        self.assertEqual(self.client.get(route, headers=player).status_code, 403)
        self.assertEqual(self.client.get(route, headers=attacker).status_code, 403)
        target = self.client.get(route, headers=self.admin).json()["items"]
        self.assertEqual({item["kind"] for item in target}, {"live", "causal_before", "causal_after"})
        causal = {item["kind"]: item for item in target if item["kind"] != "live"}
        self.assertEqual(causal["causal_before"]["verdictStatus"], "OK")
        self.assertEqual(causal["causal_after"]["verdictStatus"], "WRONG_ANSWER")
        caused = self.client.get(f"/api/admin/submissions/{source['id']}/rechecks", params={"scope": "caused"}, headers=self.admin).json()["items"]
        self.assertEqual({item["id"] for item in caused}, {item["id"] for item in target})
        for params in ({"scope": "private"}, {"limit": 101}, {"beforeId": "a"}):
            self.assertEqual(self.client.get(route, params=params, headers=self.admin).status_code, 422)

    def test_retired_victim_keeps_historical_causal_log_without_changing_new_solve(self):
        self.settings(submitCooldownSeconds=0)
        _, player = self.register()
        _, attacker = self.register("attacker")
        task = self.create_task("victim", 11)
        source_task = self.create_task("attacker", 50)
        self.store.claim_count = 0
        victim = self.submit_and_work(task, '@solution fn first_answer(){let answer=10;return answer+1;}', player)
        self.store.claim_count = 0
        source = self.submit_and_work(source_task, '@solution fn second_answer(){let answer=50;return answer;}', attacker)
        self.store.claim_count = 0
        replacement = self.submit_and_work(task, '@solution fn helper_answer(){let answer=10;return answer+1;}', player)
        self.assertEqual(replacement["status"], "OK", replacement)
        self.drain()
        notices = self.client.get("/api/notifications", headers=player).json()["items"]
        broken = [item for item in notices if item["kind"] == "broken" and item["submissionId"] == victim["id"]]
        self.assertEqual(len(broken), 1)
        self.assertTrue(broken[0]["historical"])
        self.assertTrue(self.client.get("/api/tasks/" + task, headers=player).json()["solved"])
        self.assertTrue(self.client.get("/api/submissions/" + replacement["id"], headers=player).json()["active"])
        runs = self.client.get(f"/api/admin/submissions/{source['id']}/rechecks", params={"scope": "caused"}, headers=self.admin).json()["items"]
        self.assertEqual({item["kind"] for item in runs}, {"causal_before", "causal_after"})

    def test_lost_worker_lease_does_not_write_judge_history(self):
        _, player = self.register()
        task = self.create_task("victim", 1)
        victim = self.submit_and_work(task, '@solution fn first_answer(){return 1;}', player)
        with self.store.transaction() as tx:
            schedule_rechecks(tx, {}, tx.world(), all_submissions=True)
        job = self.store.claim()
        def lose_lease(payload):
            result = sandbox(payload)
            with self.store.transaction() as tx:
                tx.execute("UPDATE jobs SET lease=lease+1 WHERE id=?", (job["id"],))
            return result
        with patch("server.worker.sandbox", side_effect=lose_lease):
            process_job(self.store, job)
        response = self.client.get(f"/api/admin/submissions/{victim['id']}/rechecks", headers=self.admin)
        self.assertEqual(response.json()["items"], [])


if __name__ == "__main__":
    unittest.main()
