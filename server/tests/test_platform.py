import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from server.app import create_app
from server.store import Store, dumps, uid
from server.worker import finish, process_job, sandbox
from server.tests.task_solutions import TASK_SOLUTIONS


class PlatformTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.url = "sqlite:///" + str(Path(self.directory.name) / "test.db")
        self.environment = patch.dict(os.environ, {"BOOTSTRAP_ADMIN_USERNAME": "operator", "BOOTSTRAP_ADMIN_PASSWORD": "admin-password-for-tests"})
        self.environment.start()
        self.app = create_app(self.url)
        self.client = TestClient(self.app)
        self.client.__enter__()
        self.store = self.app.state.store
        # Most platform fixtures deliberately use open registration; deployment
        # defaults are tested separately below.
        with self.store.transaction() as tx:
            world = tx.world()
            world["settings"]["registrationMode"] = "open"
            tx.save_world(world)
        response = self.client.post("/api/auth/login", json={"username": "operator", "password": "admin-password-for-tests"})
        self.assertEqual(response.status_code, 200, response.text)
        self.admin = {"Authorization": "Bearer " + response.json()["token"]}

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.environment.stop()
        self.directory.cleanup()

    def register(self, username="player", **extra):
        response = self.client.post("/api/auth/register", json={"username": username, "password": "player-password-for-tests", **extra})
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        return data["user"], {"Authorization": "Bearer " + data["token"]}

    def settings(self, **patches):
        response = self.client.patch("/api/admin/settings", json=patches, headers=self.admin)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_invite_single_use_and_registration_modes(self):
        self.settings(registrationMode="invite")
        invite = self.client.post("/api/admin/invites", json={}, headers=self.admin).json()
        self.assertNotIn("code", self.client.get("/api/admin/invites", headers=self.admin).json()[0])
        self.register(inviteCode=invite["code"])
        reused = self.client.post("/api/auth/register", json={"username": "another", "password": "player-password-for-tests", "inviteCode": invite["code"]})
        self.assertEqual(reused.status_code, 403)
        self.settings(registrationMode="closed")
        self.assertEqual(self.client.post("/api/auth/register", json={"username": "third", "password": "player-password-for-tests"}).status_code, 403)

    def test_admin_authorization_sessions_and_account_deletion(self):
        user, headers = self.register()
        self.assertEqual(self.client.get("/api/admin/settings", headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/api/admin/users").status_code, 401)
        response = self.client.post(f"/api/admin/users/{user['id']}/password", json={"password": "a-replacement-password"}, headers=self.admin)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/me", headers=headers).status_code, 401)
        response = self.client.post("/api/auth/login", json={"username": "player", "password": "a-replacement-password"})
        self.assertEqual(response.status_code, 200)
        headers = {"Authorization": "Bearer " + response.json()["token"]}
        self.assertEqual(self.client.patch(f"/api/admin/users/{user['id']}", json={"banned": True}, headers=self.admin).status_code, 200)
        self.assertEqual(self.client.get("/api/me", headers=headers).status_code, 401)
        self.assertEqual(self.client.delete(f"/api/admin/users/{user['id']}", headers=self.admin).status_code, 204)
        admin_id = self.client.get("/api/me", headers=self.admin).json()["id"]
        self.assertEqual(self.client.delete(f"/api/admin/users/{admin_id}", headers=self.admin).status_code, 409)

    def test_denylist_validation_and_body_limit(self):
        self.settings(denyWords=["blocked"])
        self.assertEqual(self.client.post("/api/auth/register", json={"username": "ＢＬＯＣＫＥＤ", "password": "player-password-for-tests"}).status_code, 422)
        _, headers = self.register()
        response = self.client.post("/api/tasks/shared-sum/run", json={"code": "// BLOCKED\n@solution fn solve(){return 0;}", "languageVersion": "v0.3"}, headers=headers)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.post("/api/auth/login", content=b"x" * (512 * 1024 + 1)).status_code, 413)
        self.assertEqual(self.client.patch("/api/admin/settings", json={"permittedOverrides": ["execute"]}, headers=self.admin).status_code, 422)

    def test_malformed_unicode_and_json_are_rejected_before_authentication(self):
        for content in [b'{"username":"player","password":"bad\\ud800"}', b'{"\\udfff":"value"}', b'{"value":NaN}', b'[' * 1000 + b'0' + b']' * 1000]:
            response = self.client.post("/api/auth/login", content=content, headers={"Content-Type": "application/json"})
            self.assertEqual(response.status_code, 400, response.text)
            self.assertEqual(response.json()["error"]["code"], "BAD_JSON")

    def test_queue_admission_and_job_privacy(self):
        self.settings(runCooldownSeconds=0, submitCooldownSeconds=0)
        _, headers = self.register()
        _, other = self.register("another")
        data = {"code": "@solution fn solve(){return 0;}", "languageVersion": "v0.3"}
        response = self.client.post("/api/tasks/shared-sum/run", json=data, headers=headers)
        self.assertEqual(response.status_code, 202, response.text)
        job_id = response.json()["jobId"]
        self.assertEqual(self.client.get(f"/api/jobs/{job_id}", headers=other).status_code, 404)
        self.assertEqual(self.client.get(f"/api/jobs/{job_id}", headers=headers).json(), {"status": "queued"})
        self.assertEqual(self.client.post("/api/tasks/shared-sum/run", json=data, headers=headers).status_code, 202)
        self.assertEqual(self.client.post("/api/tasks/shared-sum/run", json=data, headers=headers).status_code, 429)

    def test_fenced_lease_recovery_cannot_publish_old_attempt(self):
        _, headers = self.register()
        response = self.client.post("/api/tasks/shared-sum/run", json={"code": "x"}, headers=headers)
        first = self.store.claim()
        with self.store.transaction() as tx:
            tx.execute("UPDATE jobs SET lease=? WHERE id=?", (time.time() - 9999, first["id"]))
        second = self.store.claim()
        self.assertEqual(first["id"], second["id"])
        with self.store.transaction() as tx:
            self.assertFalse(finish(tx, first, result={"forged": True}))
            self.assertTrue(finish(tx, second, result={"safe": True}))
        result = self.client.get("/api/jobs/" + response.json()["jobId"], headers=headers).json()
        self.assertEqual(result["result"], {"safe": True})

    def test_hidden_tests_private_and_scores_idempotent(self):
        self.settings(submitCooldownSeconds=0)
        user, headers = self.register()
        task = self.client.get("/api/tasks/shared-sum").json()
        self.assertNotIn("tests", task)
        payload = {"code": TASK_SOLUTIONS[task["id"]], "languageVersion": "v0.3"}
        self.client.post("/api/tasks/shared-sum/submit", json=payload, headers=headers)
        process_job(self.store, self.store.claim())
        details = self.client.get("/api/submissions", headers=headers).json()
        self.assertEqual(len(details), 1)
        self.assertEqual(details[0]["status"], "OK")
        detail = self.client.get("/api/submissions/" + details[0]["id"], headers=headers).json()
        self.assertEqual(detail["tests"][2]["expected"], "<hidden>")
        self.assertNotIn("actual", detail["tests"][2])
        self.client.post("/api/tasks/shared-sum/submit", json=payload, headers=headers)
        process_job(self.store, self.store.claim())
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 50)
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["solvedCount"], 1)

    def test_unique_name_quota_and_readonly_runs(self):
        user, headers = self.register()
        self.client.patch(f"/api/admin/users/{user['id']}", json={"nameLimit": 1}, headers=self.admin)
        task = self.client.get("/api/tasks/shared-sum").json()
        response = self.client.post("/api/tasks/shared-sum/submit", json={"code": TASK_SOLUTIONS[task["id"]]}, headers=headers)
        process_job(self.store, self.store.claim())
        result = self.client.get("/api/jobs/" + response.json()["jobId"], headers=headers).json()["result"]
        self.assertEqual(result["submission"]["status"], "CE")
        self.assertEqual(self.client.get("/api/namespace").json()["version"], 0)

    def create_task(self, slug, expected):
        response = self.client.post("/api/admin/tasks", json={"slug": slug, "title": slug, "tests": [{"input": [], "expected": expected}]}, headers=self.admin)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def submit_and_work(self, task_id, code, headers):
        response = self.client.post(f"/api/tasks/{task_id}/submit", json={"code": code}, headers=headers)
        self.assertEqual(response.status_code, 202, response.text)
        process_job(self.store, self.store.claim())
        result = self.client.get("/api/jobs/" + response.json()["jobId"], headers=headers).json()
        self.assertEqual(result["status"], "completed", result)
        return result["result"]["submission"]

    def drain(self):
        for _ in range(20):
            job = self.store.claim()
            if not job:
                return
            process_job(self.store, job)
        self.fail("Queue did not settle")

    def test_shared_publication_breaks_and_repairs_existing_solution(self):
        self.settings(submitCooldownSeconds=0)
        first_user, first_headers = self.register("first")
        _, second_headers = self.register("second")
        first_task = self.create_task("first", 11)
        second_task = self.create_task("second", 100)
        repair_task = self.create_task("repair", 10)
        first = self.submit_and_work(first_task, "@solution fn first_answer(){ let answer=10; return answer+1; }", first_headers)
        self.assertEqual(first["status"], "OK")
        second = self.submit_and_work(second_task, "@solution fn second_answer(){ let answer=50; return answer+answer; }", second_headers)
        self.assertEqual(second["status"], "OK")
        self.drain()
        broken = self.client.get("/api/submissions/" + first["id"], headers=first_headers).json()
        self.assertEqual(broken["status"], "WRONG_ANSWER", broken)
        self.assertEqual(self.client.get("/api/me", headers=first_headers).json()["rating"], 0)
        self.submit_and_work(repair_task, "@solution fn helper_answer(){ let answer=10; return answer; }", second_headers)
        self.drain()
        repaired = self.client.get("/api/submissions/" + first["id"], headers=first_headers).json()
        self.assertEqual(repaired["status"], "OK", repaired)
        self.assertEqual(self.client.get("/api/me", headers=first_headers).json()["rating"], 50)

    def test_atomic_publication_retries_if_admin_changes_dictionary(self):
        _, headers = self.register()
        task = self.client.get("/api/tasks/shared-sum").json()
        response = self.client.post("/api/tasks/shared-sum/submit", json={"code": TASK_SOLUTIONS[task["id"]]}, headers=headers)
        changed = False
        def racing_sandbox(payload, timeout=None):
            nonlocal changed
            result = sandbox(payload, timeout)
            if payload.get("action") == "validate" and not changed:
                changed = True
                with self.store.transaction() as tx:
                    world = tx.world()
                    world["settings"]["allowedWords"].remove("sum")
                    world["version"] += 1
                    tx.save_world(world)
            return result
        with patch("server.worker.sandbox", side_effect=racing_sandbox):
            process_job(self.store, self.store.claim())
        result = self.client.get("/api/jobs/" + response.json()["jobId"], headers=headers).json()["result"]
        self.assertTrue(changed)
        self.assertEqual(result["submission"]["status"], "CE")
        self.assertEqual(self.client.get("/api/namespace").json()["values"], {})

    def test_restore_default_core_operation_in_worker(self):
        _, headers = self.register()
        task = self.create_task("core", 1)
        submission = self.submit_and_work(task, "@eq fn <int,int> custom_equal(left,right){return __builtin_eq__(left,right);}\n@solution fn core_answer(){return 1;}", headers)
        self.assertEqual(submission["status"], "OK", submission)
        self.assertIn("custom_equal", self.client.get("/api/namespace").json()["functions"])
        response = self.client.post("/api/admin/overrides/restore", json={"operations": ["eq"]}, headers=self.admin)
        job_id = response.json()["jobId"]
        process_job(self.store, self.store.claim())
        outcome = self.client.get("/api/jobs/" + job_id, headers=self.admin).json()
        self.assertEqual(outcome["status"], "completed", outcome)
        self.assertNotIn("custom_equal", self.client.get("/api/namespace").json()["functions"])

    def test_decoded_and_computed_publication_words_filtered(self):
        self.settings(denyWords=["badword"])
        _, headers = self.register()
        task = self.create_task("blocked", "badword")
        result = self.submit_and_work(task, '@solution fn answer(){let text=concat("bad", "word"); return text;}', headers)
        self.assertEqual(result["status"], "CE", result)
        self.assertEqual(self.client.get("/api/namespace").json()["values"], {})

    def test_restore_rechecks_permissions_after_contract_validation(self):
        _, headers = self.register()
        task = self.create_task("core", 1)
        result = self.submit_and_work(task, "@eq fn <int,int> custom_equal(left,right){return __builtin_eq__(left,right);}\n@solution fn core_answer(){return 1;}", headers)
        self.assertEqual(result["status"], "OK")
        response = self.client.post("/api/admin/overrides/restore", json={"operations": ["eq"]}, headers=self.admin)
        job = self.store.claim()
        def demote_during_validation(payload, timeout=None):
            result = sandbox(payload, timeout)
            if payload.get("action") == "validate":
                with self.store.transaction() as tx:
                    user = tx.get("users", job["userId"])
                    user["role"] = "user"
                    tx.put("users", user["id"], user)
            return result
        with patch("server.worker.sandbox", side_effect=demote_during_validation):
            process_job(self.store, job)
        outcome = self.client.get("/api/jobs/" + response.json()["jobId"], headers=self.admin).json()
        self.assertEqual(outcome["status"], "failed", outcome)
        self.assertEqual(outcome["error"]["code"], "FORBIDDEN")
        self.assertIn("custom_equal", self.client.get("/api/namespace").json()["functions"])

    def test_retention_keeps_accepted_history_and_active_sessions(self):
        from server.maintenance import cleanup
        with self.store.transaction() as tx:
            tx.execute("INSERT INTO jobs(id,user_id,status,created,data) VALUES('old','none','completed',0,'{}')")
            tx.put("sessions", "expired", {"userId": "none", "expires": 0})
            tx.put("throttle", "expired", [0])
            tx.put("submissions", "rejected", {"createdAt": "2000-01-01T00:00:00Z", "everAccepted": False})
            tx.put("submissions", "accepted", {"createdAt": "2000-01-01T00:00:00Z", "everAccepted": True})
        counts = cleanup(self.store)
        self.assertEqual(counts["jobs"], 1)
        self.assertEqual(counts["sessions"], 1)
        self.assertEqual(counts["rejectedSubmissions"], 1)
        self.assertEqual(self.client.get("/api/me", headers=self.admin).status_code, 200)
        with self.store.transaction() as tx:
            self.assertIsNotNone(tx.get("submissions", "accepted"))

    def test_submission_history_cursor_orders_timestamp_ties_without_gaps(self):
        user, headers = self.register()
        same_time = "2026-01-01T12:00:00.000001Z"
        identifiers = ["sub_a", "sub_b", "sub_c", "sub_d", "sub_e"]
        with self.store.transaction() as tx:
            for identifier in reversed(identifiers):
                tx.put("submissions", identifier, {"id": identifier, "createdAt": same_time, "taskId": "shared-sum", "userId": user["id"], "status": "CE", "everAccepted": False})
            tx.put("submissions", "sub_old", {"id": "sub_old", "createdAt": "2025-12-31T00:00:00Z", "taskId": "shared-sum", "userId": user["id"], "status": "CE", "everAccepted": False})
        for route, authorization in [("/api/admin/submissions", self.admin), ("/api/submissions", headers), ("/api/tasks/shared-sum/submissions", headers)]:
            observed, cursor = [], {}
            for _ in range(5):
                response = self.client.get(route, params={"limit": 2, **cursor}, headers=authorization)
                self.assertEqual(response.status_code, 200, response.text)
                page = response.json()
                if not page:
                    break
                observed.extend(item["id"] for item in page)
                cursor = {"beforeCreated": page[-1]["createdAt"], "beforeId": page[-1]["id"]}
            self.assertEqual(observed, identifiers + ["sub_old"], route)
        for params in [{"beforeCreated": same_time}, {"beforeId": "sub_a"}, {"beforeCreated": "invalid", "beforeId": "sub_a"}, {"beforeCreated": "2026-99-99T00:00:00Z", "beforeId": "sub_a"}, {"beforeCreated": same_time, "beforeId": "x" * 100}]:
            self.assertEqual(self.client.get("/api/admin/submissions", params=params, headers=self.admin).status_code, 422)


if __name__ == "__main__":
    unittest.main()
