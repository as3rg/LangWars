import unittest

from server.tests import test_platform as fixtures
from server.worker import process_job


class GameplayPolishTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work
    drain = fixtures.PlatformTests.drain

    def test_task_penalty_ledger_and_event_ladders(self):
        self.settings(submitCooldownSeconds=0, resubmitPenaltyEnabled=True, resubmitPenaltyPercent=5)
        player, headers = self.register()
        task = self.create_task("charged-task", 1)
        self.client.patch(f"/api/admin/tasks/{task}", json={"score": 70, "ratingTable": "Event"}, headers=self.admin)
        self.submit_and_work(task, "@solution fn solve(){return 1;}", headers)
        queued = self.client.post(f"/api/tasks/{task}/submit", json={"code": "@solution fn solve(){return 1;}", "acceptResubmitPenalty": True, "expectedPenaltyPoints": 4}, headers=headers)
        self.assertEqual(queued.status_code, 202, queued.text)
        self.drain()
        for table in ("global", "task:" + task, "Event"):
            row = self.client.get("/api/rating", params={"table": table}, headers=headers).json()["me"]
            self.assertEqual((row["baseScore"], row["penalty"], row["score"]), (70, 4, 66))
        # Restart/backfill must not count job and submission as two charges.
        with self.store.transaction() as tx:
            tx.delete("system", "task-ledger-v1")
        self.store.initialize()
        with self.store.transaction() as tx:
            user = tx.get("users", player["id"])
            self.assertEqual(user["taskPenalties"], {task: 4})
            self.assertEqual(user["rating"], 66)

    def test_latest_publication_active_and_failed_retry_does_not_retire(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task("active-task", 1)
        first = self.submit_and_work(task, "@solution fn solve(){return 1;}", headers)
        second = self.submit_and_work(task, "@solution fn answer(){return 1;}", headers)
        failed = self.submit_and_work(task, "@solution fn solve(){return 0;}", headers)
        self.assertFalse(self.client.get("/api/submissions/" + first["id"], headers=headers).json()["active"])
        self.assertTrue(self.client.get("/api/submissions/" + second["id"], headers=headers).json()["active"])
        self.assertFalse(failed["active"])
        self.drain()
        self.assertTrue(self.client.get("/api/tasks/" + task, headers=headers).json()["solved"])

    def test_task_name_budget_cumulative_and_inherited_core_override(self):
        self.settings(submitCooldownSeconds=0, defaultTaskNameLimit=2, defaultCoreOverrideLimit=0)
        _, headers = self.register()
        task = self.create_task("budget-task", 1)
        authored = next(value for value in self.client.get("/api/admin/tasks", headers=self.admin).json() if value["id"] == task)
        self.assertIsNone(authored["coreOverrideLimit"])
        first = self.submit_and_work(task, "@solution fn solve(){let first=1;return first;}", headers)
        self.assertEqual(first["status"], "OK", first)
        second = self.submit_and_work(task, "@solution fn solve(){let second=1;return second;}", headers)
        self.assertEqual(second["status"], "CE", second)
        self.assertEqual(second["diagnostics"][0]["code"], "TASK_NAME_LIMIT")
        detail = self.client.get("/api/tasks/" + task, headers=headers).json()
        self.assertEqual(detail["nameBudget"]["taskUsed"], 2)
        self.assertEqual(detail["nameBudget"]["taskLimit"], 2)
        self.assertEqual(detail["nameBudget"]["coreLimit"], 0)
        response = self.client.patch(f"/api/admin/tasks/{task}", json={"namePublishLimit": 3, "coreOverrideLimit": None}, headers=self.admin)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.submit_and_work(task, "@solution fn solve(){let second=1;return second;}", headers)["status"], "OK")

    def test_namespace_ownership_is_admin_only_and_diff_previous_source(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task("ownership-task", 1)
        first = self.submit_and_work(task, "@solution fn solve(){return 1;}", headers)
        second = self.submit_and_work(task, "@solution fn solve(){let first=1;return first;}", headers)
        world = self.client.get("/api/namespace", headers=self.admin).json()
        self.assertEqual(world["ownership"]["solve"]["submissionId"], second["id"])
        self.assertEqual(world["ownership"]["solve"]["taskId"], task)
        self.assertNotIn("ownership", self.client.get("/api/namespace", headers=headers).json())
        detail = self.client.get("/api/submissions/" + second["id"], headers=headers).json()
        self.assertEqual(detail["previousId"], first["id"])
        self.assertEqual(detail["previousCode"], first["code"])
        self.assertEqual(self.client.get(f"/api/admin/submissions/{second['id']}/rechecks", headers=headers).status_code, 403)

    def test_legacy_backfill_spans_batches_preserves_claims_and_caps_attributed_fees(self):
        from server.scoring import backfill_gameplay
        from server.store import dumps
        player, _ = self.register()
        with self.store.transaction() as tx:
            user = tx.get("users", player["id"])
            user["submissionPenalties"] = 10
            tx.put("users", user["id"], user)
            for index in range(205):
                sub = {"id": "legacy_" + str(index), "userId": user["id"], "taskId": "shared-sum", "status": "OK",
                       "everAccepted": True, "names": ["shared", "name_" + str(index)], "code": "//" + "x" * 2000,
                       "createdAt": f"2026-11-11T12:{index // 60:02d}:{index % 60:02d}Z",
                       "publicationVersion": 1000 if index == 50 else index, "penaltyPoints": 4 if index == 0 else 0}
                tx.put("submissions", sub["id"], sub)
            for identifier, result in [("completed", {"submission": {"id": "legacy_0"}}), ("queued", {})]:
                job = {"mode": "submit", "userId": user["id"], "taskId": "shared-sum", "penaltyPoints": 4, "result": result}
                tx.execute("INSERT INTO jobs(id,user_id,status,created,data) VALUES(?,?,'queued',0,?)", (identifier, user["id"], dumps(job)))
            tx.delete("system", "task-ledger-v1")
            backfill_gameplay(tx)
            updated = tx.get("users", user["id"])
            self.assertEqual(updated["taskPenalties"], {"shared-sum": 8})
            self.assertEqual(updated["rating"], 40)  # The untraceable 2 points stay global.
            self.assertEqual(len(updated["taskClaimedNames"]["shared-sum"]), 206)
            active = [sub["id"] for sub in tx.iter_records("submissions") if sub["active"]]
            self.assertEqual(active, ["legacy_50"])
            backfill_gameplay(tx)
            self.assertEqual(tx.get("users", user["id"]), updated)


if __name__ == "__main__":
    unittest.main()
