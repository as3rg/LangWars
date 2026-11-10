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

    def test_builtin_boundary_applies_to_run_and_submit_without_publication(self):
        _, headers = self.register()
        code = '@solution fn <list,int> cyclic_answer(items,index){let x=__builtin_eq__(1,1);return get(items,index);}'
        for action in ("run", "submit"):
            response = self.client.post(f"/api/tasks/cyclic-access/{action}", json={"code": code}, headers=headers)
            self.assertEqual(response.status_code, 202, response.text)
            process_job(self.store, self.store.claim())
            outcome = self.client.get("/api/jobs/" + response.json()["jobId"], headers=headers).json()
            self.assertEqual(outcome["status"], "completed", outcome)
            result = outcome["result"] if action == "run" else outcome["result"]["submission"]
            self.assertEqual(result["status"], "CE", result)
            self.assertEqual(result["diagnostics"][0]["code"], "BUILTIN_SCOPE")
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()["snapshot"], {"variables": {}, "functions": {}, "last": {}})
        self.settings(submitCooldownSeconds=0)
        allowed = '@get fn <list,int> helper(first,second){return __builtin_get__(first,second);}@solution fn <list,int> cyclic_answer(items,index){return get(items,index);}'
        accepted = self.submit_and_work("cyclic-access", allowed, headers)
        self.assertEqual(accepted["status"], "OK", accepted)

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
        response = self.client.post("/api/admin/tasks", json={"slug": slug, "title": slug, "statement": "Return the expected value.", "tests": [{"input": [], "expected": expected}]}, headers=self.admin)
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


    def test_login_denylist_and_admin_rename_enforce_case_insensitive_uniqueness(self):
        self.settings(denyWords=["blocked"])
        denied = self.client.post("/api/auth/register", json={"username": "MyBLOCKEDname", "password": "player-password-for-tests"})
        self.assertEqual(denied.status_code, 422, denied.text)
        self.assertEqual(denied.json()["error"]["code"], "DENIED_WORD")
        user, headers = self.register()
        self.register("another")
        route = "/api/admin/users/" + user["id"]
        self.assertEqual(self.client.patch(route, json={"username": "BLOCKED"}, headers=self.admin).status_code, 422)
        self.assertEqual(self.client.patch(route, json={"username": "ANOTHER"}, headers=self.admin).status_code, 409)
        changed = self.client.patch(route, json={"username": "renamed"}, headers=self.admin)
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["username"], "renamed")
        self.assertEqual(self.client.post("/api/auth/login", json={"username": "player", "password": "player-password-for-tests"}).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login", json={"username": "RENAMED", "password": "player-password-for-tests"}).status_code, 200)

    def test_resubmit_charge_requires_current_amount_and_is_once_per_enqueued_submit(self):
        from server.worker import refresh_ratings, schedule_rechecks
        self.settings(submitCooldownSeconds=0, runCooldownSeconds=0)
        user, headers = self.register()
        code = TASK_SOLUTIONS["shared-sum"]
        self.assertEqual(self.submit_and_work("shared-sum", code, headers)["status"], "OK")
        self.assertEqual(self.submit_and_work("shared-sum", code, headers)["penaltyPoints"], 0)
        self.drain()
        self.settings(resubmitPenaltyEnabled=True, resubmitPenaltyPercent=8)
        task = self.client.get("/api/tasks/shared-sum", headers=headers).json()
        self.assertEqual(task["resubmitPenalty"], {"enabled": True, "percent": 8, "points": 4})
        for extra in ({}, {"acceptResubmitPenalty": True}, {"acceptResubmitPenalty": True, "expectedPenaltyPoints": 3}, {"acceptResubmitPenalty": True, "expectedPenaltyPoints": True}):
            refused = self.client.post("/api/tasks/shared-sum/submit", json={"code": code, **extra}, headers=headers)
            self.assertEqual(refused.status_code, 409, refused.text)
            self.assertEqual(refused.json()["error"]["points"], 4)
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 50)
        run = self.client.post("/api/tasks/shared-sum/run", json={"code": code}, headers=headers)
        self.assertEqual(run.status_code, 202, run.text)
        self.drain()
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 50)
        queued = self.client.post("/api/tasks/shared-sum/submit", json={"code": code, "acceptResubmitPenalty": True, "expectedPenaltyPoints": 4}, headers=headers)
        self.assertEqual(queued.status_code, 202, queued.text)
        self.assertEqual(queued.json()["penaltyPoints"], 4)
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 46)
        job = self.store.claim()
        process_job(self.store, job)
        process_job(self.store, job)  # A duplicated lease cannot charge or publish twice.
        self.drain()
        outcome = self.client.get("/api/jobs/" + queued.json()["jobId"], headers=headers).json()["result"]
        self.assertEqual(outcome["submission"]["penaltyPoints"], 4)
        self.assertEqual(outcome["ratingUpdate"]["delta"], -4)
        with self.store.transaction() as tx:
            refresh_ratings(tx)
            schedule_rechecks(tx, {}, tx.world(), all_submissions=True)
        self.drain()
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 46)
        self.settings(resubmitPenaltyEnabled=False)
        self.assertEqual(self.submit_and_work("shared-sum", code, headers)["penaltyPoints"], 0)
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 46)
        with self.store.transaction() as tx:
            self.assertEqual(tx.get("users", user["id"])["submissionPenalties"], 4)
        self.settings(resubmitPenaltyEnabled=True)
        self.drain()
        failed = self.client.post("/api/tasks/shared-sum/submit", json={"code": "@solution fn solve(){return 0;}", "acceptResubmitPenalty": True, "expectedPenaltyPoints": 4}, headers=headers)
        self.assertEqual(failed.status_code, 202, failed.text)
        self.drain()
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 42)
        self.assertTrue(self.client.get("/api/tasks/shared-sum", headers=headers).json()["solved"])

    def test_admin_score_and_solved_corrections_survive_refresh_without_blocking_future_solves(self):
        from server.worker import refresh_ratings
        self.settings(submitCooldownSeconds=0)
        user, headers = self.register()
        route = "/api/admin/users/" + user["id"]
        patched = self.client.patch(route, json={"rating": 123, "solvedTaskIds": ["shared-sum"]}, headers=self.admin)
        self.assertEqual(patched.status_code, 200, patched.text)
        self.assertEqual(patched.json()["solvedTaskIds"], ["shared-sum"])
        with self.store.transaction() as tx:
            refresh_ratings(tx)
        self.assertTrue(self.client.get("/api/tasks/shared-sum", headers=headers).json()["solved"])
        self.assertEqual(self.client.get("/api/me", headers=headers).json()["rating"], 123)
        self.assertEqual(self.submit_and_work("cyclic-access", TASK_SOLUTIONS["cyclic-access"], headers)["status"], "OK")
        current = self.client.get("/api/me", headers=headers).json()
        self.assertEqual((current["rating"], current["solvedCount"]), (193, 2))
        removed = self.client.patch(route, json={"solvedTaskIds": []}, headers=self.admin)
        self.assertEqual(removed.status_code, 200, removed.text)
        self.assertFalse(self.client.get("/api/tasks/cyclic-access", headers=headers).json()["solved"])
        with self.store.transaction() as tx:
            refresh_ratings(tx)
        self.assertFalse(self.client.get("/api/tasks/cyclic-access", headers=headers).json()["solved"])
        self.drain()
        self.assertEqual(self.submit_and_work("cyclic-access", TASK_SOLUTIONS["cyclic-access"], headers)["status"], "OK")
        self.assertTrue(self.client.get("/api/tasks/cyclic-access", headers=headers).json()["solved"])
        self.assertEqual(self.client.patch(route, json={"solvedTaskIds": ["does-not-exist"]}, headers=self.admin).status_code, 422)

    def test_rating_lists_task_tables_and_search_preserves_actual_rank(self):
        first, _ = self.register("first")
        second, _ = self.register("second")
        self.client.patch("/api/admin/users/" + first["id"], json={"rating": 300}, headers=self.admin)
        self.client.patch("/api/admin/users/" + second["id"], json={"rating": 100, "solvedTaskIds": ["shared-sum"]}, headers=self.admin)
        tables = self.client.get("/api/rating/tables").json()
        self.assertIn("task:shared-sum", {table["id"] for table in tables})
        self.assertIn("task:cyclic-access", {table["id"] for table in tables})
        found = self.client.get("/api/rating", params={"q": "SeCoNd"}).json()["rows"]
        self.assertEqual([(row["username"], row["rank"] ) for row in found], [("second", 2)])
        task = self.client.get("/api/rating", params={"table": "task:shared-sum", "q": "second"}).json()["rows"][0]
        self.assertEqual((task["score"], task["solved"]), (50, 1))

    def test_ban_purge_is_optional_and_preserves_other_players_current_writes(self):
        self.settings(submitCooldownSeconds=0)
        first, first_headers = self.register("first")
        _, second_headers = self.register("second")
        task = self.create_task("core", 1)
        source = '@eq fn <int,int> custom_equal(left,right){return __builtin_eq__(left,right); }fn helper(){return 1;}@solution fn core_answer(){let answer=1;return helper();}'
        self.assertEqual(self.submit_and_work(task, source, first_headers)["status"], "OK")
        other = self.create_task("other", 2)
        self.assertEqual(self.submit_and_work(other, '@solution fn second_answer(){let answer=2;return answer;}', second_headers)["status"], "OK")
        self.drain()
        before = self.client.get("/api/namespace", headers=self.admin).json()
        route = "/api/admin/users/" + first["id"]
        self.assertEqual(self.client.patch(route, json={"banned": True}, headers=self.admin).status_code, 200)
        self.assertEqual(self.client.get("/api/namespace", headers=self.admin).json(), before)
        self.assertEqual(self.client.patch(route, json={"purgeState": True}, headers=self.admin).status_code, 422)
        purged = self.client.patch(route, json={"banned": True, "purgeState": True}, headers=self.admin)
        self.assertEqual(purged.status_code, 200, purged.text)
        after = self.client.get("/api/namespace", headers=self.admin).json()
        self.assertNotIn("helper", after["functions"])
        self.assertNotIn("custom_equal", after["functions"])
        self.assertNotIn("core_answer", after["functions"])
        self.assertIn("second_answer", after["functions"])
        self.assertEqual(after["values"]["answer"], 2)
        self.assertEqual(self.client.get("/api/me", headers=first_headers).status_code, 401)

    def test_admin_world_edits_are_versioned_bounded_and_contract_checked(self):
        _, headers = self.register()
        version = self.client.get("/api/namespace", headers=self.admin).json()["version"]
        body = {"version": version, "kind": "variable", "value": {"$dict": [["a", [1, 2]]]}}
        route = "/api/admin/world/answer"
        self.assertEqual(self.client.patch(route, json=body, headers=headers).status_code, 403)
        edited = self.client.patch(route, json=body, headers=self.admin)
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual(self.client.patch(route, json=body, headers=self.admin).status_code, 409)
        version = edited.json()["version"]
        for value in (True, None, 1000001, {"x": 2}, {"$dict": [[1]]}):
            self.assertEqual(self.client.patch(route, json={"version": version, "kind": "variable", "value": value}, headers=self.admin).status_code, 422)
        invalid = self.client.patch(route, json={"version": version, "kind": "function", "code": "fn answer(){return __builtin_eq__(1,1);}"}, headers=self.admin)
        self.assertEqual(invalid.status_code, 422, invalid.text)
        function = self.client.patch(route, json={"version": version, "kind": "function", "code": "fn answer(){return 42;}"}, headers=self.admin)
        self.assertEqual(function.status_code, 200, function.text)
        version = function.json()["version"]
        last = self.client.patch(route, json={"version": version, "kind": "last", "value": 17}, headers=self.admin)
        self.assertEqual(last.status_code, 200, last.text)
        state = self.client.get("/api/namespace", headers=self.admin).json()
        self.assertEqual(state["last"]["answer"], 17)
        self.assertIn("return 42", state["functions"]["answer"]["source"])
        deleted = self.client.delete(route, params={"version": state["version"]}, headers=self.admin)
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertNotIn("answer", self.client.get("/api/namespace", headers=self.admin).json()["functions"])

    def test_world_edit_rechecks_version_after_sandbox_without_holding_world_lock(self):
        version = self.client.get("/api/namespace", headers=self.admin).json()["version"]
        def change_during_validation(payload, timeout=None):
            result = sandbox(payload, timeout)
            with self.store.transaction() as tx:
                world = tx.world()
                world["version"] += 1
                tx.save_world(world)
            return result
        with patch("server.worker.sandbox", side_effect=change_during_validation):
            response = self.client.patch("/api/admin/world/answer", json={"version": version, "kind": "variable", "value": 5}, headers=self.admin)
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.client.get("/api/namespace", headers=self.admin).json()["values"], {})

    def test_task_translations_allow_one_language_and_validate_complete_entries(self):
        body = {"slug": "russian-task", "translations": {"ru": {"title": "Задача", "statement": "Верните ноль.", "constraints": ["Только целые числа."]}}, "tests": [{"input": [], "expected": 0}]}
        response = self.client.post("/api/admin/tasks", json=body, headers=self.admin)
        self.assertEqual(response.status_code, 201, response.text)
        task = response.json()
        self.assertEqual(task["title"], "Задача")
        self.assertEqual(task["translations"]["ru"]["examples"], [{"input": "[]", "output": "0"}])
        for translations in ({}, {"ru": {"title": "Название", "statement": " "}}, {"es": {"title": "Hola", "statement": "Texto"}}, {"en": {"title": "", "statement": "Text"}}):
            rejected = self.client.patch("/api/admin/tasks/" + task["id"], json={"translations": translations}, headers=self.admin)
            self.assertEqual(rejected.status_code, 422, rejected.text)
        bilingual = {"en": {"title": "Task", "statement": "Return zero."}, "ru": body["translations"]["ru"]}
        response = self.client.patch("/api/admin/tasks/" + task["id"], json={"translations": bilingual}, headers=self.admin)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["title"], "Task")
        public = self.client.get("/api/tasks/" + task["id"]).json()
        self.assertNotIn("tests", public)
        self.assertEqual(set(public["translations"]), {"en", "ru"})
        for change in ({"title": ""}, {"statement": ""}, {"title": "x" * 257}):
            self.assertEqual(self.client.patch("/api/admin/tasks/" + task["id"], json=change, headers=self.admin).status_code, 422)
        self.assertEqual(self.client.post("/api/admin/tasks", json={"slug": "empty-task", "title": "Empty", "tests": [{"input": [], "expected": 0}]}, headers=self.admin).status_code, 422)

    def test_ban_purge_retains_attribution_after_task_history_is_deleted(self):
        user, headers = self.register()
        task = self.create_task("temporary", 1)
        self.assertEqual(self.submit_and_work(task, '@solution fn temporary_answer(){let answer=1;return answer;}', headers)["status"], "OK")
        # Simulate a pre-upgrade world without durable owner IDs.
        with self.store.transaction() as tx:
            world = tx.world()
            world.pop("ownerUsers", None)
            tx.save_world(world)
        removed = self.client.delete("/api/admin/tasks/" + task, headers=self.admin)
        self.assertEqual(removed.status_code, 204, removed.text)
        self.assertIn("temporary_answer", self.client.get("/api/namespace", headers=self.admin).json()["functions"])
        banned = self.client.patch("/api/admin/users/" + user["id"], json={"banned": True, "purgeState": True}, headers=self.admin)
        self.assertEqual(banned.status_code, 200, banned.text)
        state = self.client.get("/api/namespace", headers=self.admin).json()
        self.assertEqual(state["functions"], {})
        self.assertEqual(state["values"], {})

    def test_submission_uses_latest_login_after_rename_during_execution(self):
        user, headers = self.register()
        task = self.create_task("rename", 1)
        queued = self.client.post("/api/tasks/" + task + "/submit", json={"code": "@solution fn answer(){return 1;}"}, headers=headers)
        renamed = False
        def rename_during_execution(payload, timeout=None):
            nonlocal renamed
            result = sandbox(payload, timeout)
            if "code" in payload and not renamed:
                renamed = True
                changed = self.client.patch("/api/admin/users/" + user["id"], json={"username": "renamed"}, headers=self.admin)
                self.assertEqual(changed.status_code, 200, changed.text)
            return result
        with patch("server.worker.sandbox", side_effect=rename_during_execution):
            process_job(self.store, self.store.claim())
        submission = self.client.get("/api/jobs/" + queued.json()["jobId"], headers=headers).json()["result"]["submission"]
        self.assertTrue(renamed)
        self.assertEqual(submission["username"], "renamed")


if __name__ == "__main__":
    unittest.main()
