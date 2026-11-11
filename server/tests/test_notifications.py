"""Publication causality, notification privacy and recovery regressions."""
import unittest
from unittest.mock import patch

from server.tests import test_platform as fixtures
from server.worker import process_job


class NotificationTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work
    drain = fixtures.PlatformTests.drain

    def submit_now(self, task, code, headers):
        # A normal submission claim precedes older rechecks on three of four
        # claims. Model rapid publications without allowing that fourth claim.
        self.store.claim_count = 0
        return self.submit_and_work(task, code, headers)

    def notices(self, headers, kind=None):
        result = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(result.status_code, 200, result.text)
        return [item for item in result.json()["items"] if kind is None or item["kind"] == kind]

    def scenario(self):
        self.settings(submitCooldownSeconds=0, showBreakerIdentity=True)
        first_user, first_headers = self.register("first")
        second_user, second_headers = self.register("second")
        first_task = self.create_task("first", 11)
        second_task = self.create_task("second", 100)
        third_task = self.create_task("third", 60)
        first = self.submit_now(first_task, '@solution fn first_answer(){let answer=10;return answer+1;}', first_headers)
        second = self.submit_now(second_task, '@solution fn second_answer(){let answer=50;return answer+answer;}', second_headers)
        return first_user, first_headers, second_user, second_headers, first_task, third_task, first, second

    def assert_audits_released(self):
        with self.store.transaction() as tx:
            for kind in ("break_audits", "break_snapshots", "break_candidates"):
                self.assertEqual(tx.list(kind), [], kind)

    def test_exact_earlier_publication_gets_credit_when_later_recheck_is_coalesced(self):
        first_user, first_headers, second_user, second_headers, first_task, third_task, first, second = self.scenario()
        # The second change also fails the victim, but it did not introduce the
        # passing->failing edge. The latest-world job has now been overwritten.
        third = self.submit_now(third_task, '@solution fn third_answer(){let answer=60;return answer;}', second_headers)
        self.drain()
        broken = self.notices(first_headers, "broken")
        self.assertEqual(len(broken), 1, broken)
        self.assertEqual(broken[0]["submissionId"], first["id"])
        self.assertEqual(broken[0]["breaker"], {"userId": second_user["id"], "username": "second"})
        source = self.client.get("/api/submissions/" + second["id"], headers=second_headers).json()
        unrelated = self.client.get("/api/submissions/" + third["id"], headers=second_headers).json()
        self.assertEqual(source["breakImpact"], {"userCount": 1})
        self.assertNotIn("breakImpact", unrelated)
        self.assertEqual(len(self.notices(second_headers, "breaking")), 1)
        task = self.client.get("/api/tasks/" + first_task, headers=first_headers).json()
        self.assertEqual(task["status"], "broken")
        self.assertTrue(task["broken"])
        current = self.client.get("/api/submissions/" + first["id"], headers=first_headers).json()
        self.assertEqual((current["status"], current["verdictStatus"]), ("BROKEN", "WRONG_ANSWER"))
        self.assert_audits_released()

    def test_unrelated_admin_edit_does_not_duplicate_exact_broken_notification(self):
        _, first_headers, _, _, _, _, _, _ = self.scenario()
        world = self.client.get("/api/namespace", headers=self.admin).json()
        edited = self.client.patch("/api/admin/world/temporary", json={"version": world["version"], "kind": "variable", "value": 99}, headers=self.admin)
        self.assertEqual(edited.status_code, 200, edited.text)
        self.drain()
        notices = self.notices(first_headers, "broken")
        self.assertEqual(len(notices), 1, notices)
        self.assertEqual(notices[0]["breaker"]["username"], "second")

    def test_genuine_admin_break_is_reported_after_pending_nonbreaking_audit(self):
        self.settings(submitCooldownSeconds=0, showBreakerIdentity=True)
        _, first_headers = self.register("first")
        _, second_headers = self.register("second")
        first_task = self.create_task("first", 11)
        second_task = self.create_task("second", 10)
        self.submit_now(first_task, '@solution fn first_answer(){let answer=10;return answer+1;}', first_headers)
        # Change answer's ownership and exercise a shared name without breaking it.
        self.submit_now(second_task, '@solution fn second_answer(){let answer=10;return answer;}', second_headers)
        world = self.client.get("/api/namespace", headers=self.admin).json()
        self.client.patch("/api/admin/world/answer", json={"version": world["version"], "kind": "variable", "value": 50}, headers=self.admin)
        self.drain()
        broken = self.notices(first_headers, "broken")
        self.assertEqual(len(broken), 1, broken)
        self.assertNotIn("breaker", broken[0])
        self.assertEqual(self.notices(second_headers, "breaking"), [])

    def test_break_then_admin_repair_before_live_recheck_keeps_both_history_edges(self):
        _, first_headers, _, _, first_task, _, first, _ = self.scenario()
        world = self.client.get("/api/namespace", headers=self.admin).json()
        response = self.client.patch("/api/admin/world/answer", json={"version": world["version"], "kind": "variable", "value": 10}, headers=self.admin)
        self.assertEqual(response.status_code, 200)
        self.drain()
        self.assertEqual(len(self.notices(first_headers, "broken")), 1)
        self.assertEqual(len(self.notices(first_headers, "repaired")), 1)
        self.assertEqual(self.client.get("/api/tasks/" + first_task, headers=first_headers).json()["status"], "solved")

    def test_source_account_deletion_releases_pending_snapshots_and_notifies_anonymously(self):
        _, first_headers, second_user, _, _, _, _, _ = self.scenario()
        response = self.client.delete("/api/admin/users/" + second_user["id"], headers=self.admin)
        self.assertEqual(response.status_code, 204)
        self.drain()
        broken = self.notices(first_headers, "broken")
        self.assertEqual(len(broken), 1, broken)
        self.assertNotIn("breaker", broken[0])
        self.assert_audits_released()
        with self.store.transaction() as tx:
            self.assertEqual(tx.list("notifications", user_id=second_user["id"]), [])

    def test_privacy_toggles_reproject_old_history_and_submission_apis(self):
        _, first_headers, _, second_headers, _, _, _, source = self.scenario()
        self.drain()
        self.settings(breakImpactVisibility="usernames", showBreakerIdentity=True)
        self.assertEqual(self.notices(first_headers, "broken")[0]["breaker"]["username"], "second")
        detail = self.client.get("/api/submissions/" + source["id"], headers=second_headers).json()
        self.assertEqual(detail["breakImpact"], {"userCount": 1, "usernames": ["first"]})
        others = self.client.get("/api/submissions", headers=first_headers).json()
        self.assertNotIn("breakImpact", next(item for item in others if item["id"] == source["id"]))
        self.settings(showBreakerIdentity=False, breakImpactVisibility="count")
        self.assertNotIn("breaker", self.notices(first_headers, "broken")[0])
        self.assertNotIn("usernames", self.notices(second_headers, "breaking")[0]["impact"])
        self.settings(solutionNotificationsEnabled=False, breakImpactVisibility="hidden")
        self.assertEqual(self.notices(first_headers), [])
        self.assertNotIn("breakImpact", self.client.get("/api/submissions/" + source["id"], headers=second_headers).json())
        self.assertEqual(self.client.get("/api/notifications", headers=first_headers).json()["unreadCount"], 0)
        self.assertEqual(self.client.post("/api/notifications", json={"kind": "info", "message": "Saved a local editor action."}, headers=first_headers).status_code, 201)
        self.assertEqual(len(self.notices(first_headers)), 1)

    def test_bell_is_account_scoped_idempotent_read_and_rejects_spoofed_outcomes(self):
        _, first_headers, _, second_headers, _, _, _, _ = self.scenario()
        self.drain()
        first = self.notices(first_headers)[0]
        self.client.post("/api/notifications/read", json={"ids": [first["id"]]}, headers=second_headers)
        self.assertFalse(next(item for item in self.notices(first_headers) if item["id"] == first["id"])["read"])
        self.assertEqual(self.client.post("/api/notifications/read", json={"ids": [first["id"]]}, headers=first_headers).status_code, 204)
        self.assertTrue(next(item for item in self.notices(first_headers) if item["id"] == first["id"])["read"])
        self.assertEqual(self.client.post("/api/notifications/read", json={"all": True}, headers=first_headers).status_code, 204)
        self.assertEqual(self.client.get("/api/notifications", headers=first_headers).json()["unreadCount"], 0)
        self.assertEqual(self.client.get("/api/notifications").status_code, 401)
        self.assertEqual(self.client.post("/api/notifications", json={"kind": "broken", "message": "forged"}, headers=first_headers).status_code, 422)
        self.assertEqual(self.client.post("/api/notifications", json={"kind": "info", "message": "x", "actorUserId": "other"}, headers=first_headers).status_code, 422)

    def test_backpressure_prevents_publication_without_claiming_success(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task("first", 11)
        with patch("server.break_audits.capacity_available", return_value=False):
            rejected = self.client.post("/api/tasks/" + task + "/submit", json={"code": '@solution fn first_answer(){return 11;}'}, headers=headers)
        self.assertEqual(rejected.status_code, 429)
        queued = self.client.post("/api/tasks/" + task + "/submit", json={"code": '@solution fn first_answer(){return 11;}'}, headers=headers)
        with patch("server.break_audits.capacity_available", return_value=False):
            process_job(self.store, self.store.claim())
        result = self.client.get("/api/jobs/" + queued.json()["jobId"], headers=headers).json()["result"]
        self.assertEqual(result["submission"]["status"], "FAIL")
        self.assertEqual(result["notification"]["kind"], "rejected")
        self.assertEqual(self.client.get("/api/namespace", headers=self.admin).json()["functions"], {})

    def test_startup_language_revision_rechecks_old_passing_solutions_once(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task("first", 11)
        sub = self.submit_now(task, '@solution fn first_answer(){return 11;}', headers)
        with self.store.transaction() as tx:
            world = tx.world()
            world.pop("languageRevision", None)
            tx.save_world(world)
        self.store.initialize()
        with self.store.transaction() as tx:
            job = tx.execute("SELECT data FROM jobs WHERE id=?", ("recheck_" + sub["id"],)).fetchone()
            self.assertIsNotNone(job)
            version = tx.world()["version"]
        self.store.initialize()
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()["version"], version)
        self.drain()
        self.assertEqual(self.notices(headers, "broken"), [])

    def test_multiple_break_repair_cycles_count_distinct_players_not_attempts(self):
        self.settings(submitCooldownSeconds=0)
        _, first_headers = self.register("first")
        _, second_headers = self.register("second")
        first_task = self.create_task("first", 11)
        second_task = self.create_task("second", 100)
        repair_task = self.create_task("repair", 10)
        third_task = self.create_task("third", 50)
        self.submit_now(first_task, '@solution fn first_answer(){let answer=10;return answer+1;}', first_headers)
        self.submit_now(first_task, '@solution fn shared_answer(){let answer=10;return answer+1;}', first_headers)
        first_breaker = self.submit_now(second_task, '@solution fn second_answer(){let answer=50;return answer+answer;}', second_headers)
        self.drain()
        self.assertEqual(len(self.notices(first_headers, "broken")), 2)
        first_impact = self.client.get("/api/submissions/" + first_breaker["id"], headers=second_headers).json()["breakImpact"]
        self.assertEqual(first_impact, {"userCount": 1})
        self.submit_now(repair_task, '@solution fn helper_answer(){let answer=10;return answer;}', second_headers)
        self.drain()
        self.assertEqual(len(self.notices(first_headers, "repaired")), 2)
        self.submit_now(third_task, '@solution fn third_answer(){let answer=50;return answer;}', second_headers)
        self.drain()
        self.assertEqual(len(self.notices(first_headers, "broken")), 4)
        self.assertEqual(len(self.notices(second_headers, "breaking")), 2)
        self.assert_audits_released()


if __name__ == "__main__":
    unittest.main()
