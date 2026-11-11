import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.notifications import MAX_HISTORY, event, impact, project, project_submission, reconcile_solution
from server.store import Store


class NotificationUnitTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.store = Store("sqlite:///" + str(Path(self.directory.name) / "notifications.db"))
        self.store.initialize()
        self.owner = {"id": "owner", "username": "Owner", "role": "user"}
        self.other = {"id": "other", "username": "Other", "role": "user"}
        self.admin = {"id": "admin", "username": "Admin", "role": "admin"}
        self.settings = {"solutionNotificationsEnabled": True, "showBreakerIdentity": False, "breakImpactVisibility": "count"}
        with self.store.transaction() as tx:
            for user in (self.owner, self.other, self.admin):
                tx.put("users", user["id"], user)

    def submission(self, **changes):
        return {"id": "sub_test", "userId": "owner", "taskId": "shared-sum", "status": "BROKEN", "everAccepted": True,
                "verdictStatus": "WRONG_ANSWER", "worldVersion": 12,
                "notificationState": {"passing": True, "version": 10}, **changes}

    def test_events_are_idempotent_preserve_read_state_and_cannot_forge_metadata(self):
        with self.store.transaction() as tx:
            first = event(tx, "owner", "accepted", "result:one", id="forged", userId="other", read=True,
                          createdAt="forged", message="Other broke it", taskId="shared-sum", snapshot={"secret": 1})
            self.assertNotEqual(first["id"], "forged")
            self.assertEqual(first["userId"], "owner")
            self.assertFalse(first["read"])
            self.assertNotEqual(first["createdAt"], "forged")
            self.assertNotIn("message", first)
            self.assertNotIn("snapshot", first)
            first["read"] = True
            tx.put("notifications", first["id"], first)
            repeated = event(tx, "owner", "accepted", "result:one", taskId="other-task")
            self.assertEqual(repeated, first)
            self.assertEqual(len(tx.list("notifications")), 1)

    def test_old_events_are_reprojected_for_current_disclosure_and_current_logins(self):
        with self.store.transaction() as tx:
            stored = event(tx, "owner", "broken", "broken:one", actorUserId="other", taskId="shared-sum")
            # Even legacy/preformatted fields must not bypass current privacy.
            stored.update(message="Other broke it", breaker={"username": "Other"}, actorSubmissionId="secret", before={"secret": 2})
            hidden = project(tx, stored, self.settings, self.owner)
            self.assertFalse(any(key in hidden for key in ("message", "breaker", "actorUserId", "actorSubmissionId", "before", "userId")))
            shown = project(tx, stored, {**self.settings, "showBreakerIdentity": True}, self.owner)
            self.assertEqual(shown["breaker"], {"userId": "other", "username": "Other"})
            self.assertIsNone(project(tx, stored, self.settings, self.other))
            self.assertIsNone(project(tx, stored, {**self.settings, "solutionNotificationsEnabled": False}, self.owner))
            changed = {**self.other, "username": "Renamed"}
            tx.put("users", "other", changed)
        with self.store.transaction() as tx:
            self.assertEqual(project(tx, stored, {**self.settings, "showBreakerIdentity": True}, self.owner)["breaker"]["username"], "Renamed")
            self.assertNotIn("breaker", project(tx, stored, self.settings, self.owner))

    def test_impact_is_unique_private_to_owner_or_admin_and_respects_all_modes(self):
        value = self.submission(brokenUserIds=["other", "other", "missing"], brokenSubmissionIds=["private"], causeSubmissionId="private", breakImpact={"usernames": ["leaked"]})
        with self.store.transaction() as tx:
            for viewer in (None, self.other):
                result = project_submission(tx, value, {**self.settings, "breakImpactVisibility": "usernames"}, viewer)
                self.assertNotIn("breakImpact", result)
                self.assertNotIn("brokenUserIds", result)
                self.assertNotIn("notificationState", result)
                self.assertNotIn("causeSubmissionId", result)
            for viewer in (self.owner, self.admin):
                self.assertEqual(project_submission(tx, value, self.settings, viewer)["breakImpact"], {"userCount": 2})
                self.assertEqual(project_submission(tx, value, {**self.settings, "breakImpactVisibility": "usernames"}, viewer)["breakImpact"], {"userCount": 2, "usernames": ["Other"]})
                self.assertNotIn("breakImpact", project_submission(tx, value, {**self.settings, "breakImpactVisibility": "hidden"}, viewer))
            legacy = project_submission(tx, self.submission(status="CE", verdictStatus="OK"), self.settings)
            self.assertEqual((legacy["status"], legacy["verdictStatus"]), ("BROKEN", "CE"))

    def test_identity_lookup_is_batched_per_transaction_and_never_exposes_ids_in_count_mode(self):
        with self.store.transaction() as tx:
            with patch.object(tx, "list", wraps=tx.list) as listing:
                for index in range(40):
                    stored = {"id": str(index), "userId": "owner", "kind": "broken", "actorUserId": "other"}
                    self.assertEqual(project(tx, stored, {**self.settings, "showBreakerIdentity": True})["breaker"]["username"], "Other")
                    self.assertEqual(impact(tx, ["other"], {**self.settings, "breakImpactVisibility": "usernames"})["usernames"], ["Other"])
                self.assertEqual(listing.call_count, 1)
            breaking = event(tx, "owner", "breaking", "breaking:one", impactedUserIds=["other", "other"])
            self.assertEqual(project(tx, breaking, self.settings)["impact"], {"userCount": 1})
            self.assertNotIn("impactedUserIds", project(tx, breaking, self.settings))
            self.assertIsNone(project(tx, breaking, {**self.settings, "breakImpactVisibility": "hidden"}))

    def test_generic_notices_remain_visible_when_solution_notifications_are_disabled_and_history_is_bounded(self):
        with self.store.transaction() as tx:
            for index in range(MAX_HISTORY + 5):
                event(tx, "owner", "info", "client:" + str(index), message="Saved.")
            records = tx.list("notifications", user_id="owner")
            self.assertEqual(len(records), MAX_HISTORY)
            shown = project(tx, records[0], {**self.settings, "solutionNotificationsEnabled": False})
            self.assertEqual(shown["message"], "Saved.")
            self.assertEqual(shown["kind"], "info")

    def test_reconcile_defers_pending_audits_then_reports_only_unexplained_latest_transition_once(self):
        with self.store.transaction() as tx:
            sub = self.submission()
            task = tx.get("tasks", sub["taskId"])
            tx.put("submissions", sub["id"], sub)
            tx.put("break_candidates", "candidate", {"userId": sub["id"]})
            self.assertIsNone(reconcile_solution(tx, sub, task))
            self.assertEqual(tx.list("notifications"), [])
            tx.delete("break_candidates", "candidate")
            broken = reconcile_solution(tx, sub, task)
            self.assertEqual(broken["kind"], "broken")
            self.assertIsNone(reconcile_solution(tx, sub, task))
            self.assertEqual(len(tx.list("notifications")), 1)
            sub.update(status="OK", verdictStatus="OK", worldVersion=13)
            tx.put("submissions", sub["id"], sub)
            repaired = reconcile_solution(tx, sub, task)
            self.assertEqual(repaired["kind"], "repaired")
            self.assertEqual(len(tx.list("notifications")), 2)

    def test_reconcile_does_not_duplicate_exact_audits_or_roll_back_newer_baselines(self):
        with self.store.transaction() as tx:
            sub = self.submission(notificationState={"passing": False, "version": 12})
            task = tx.get("tasks", sub["taskId"])
            tx.put("submissions", sub["id"], sub)
            self.assertIsNone(reconcile_solution(tx, sub, task))
            sub.update(worldVersion=11, status="OK")
            tx.put("submissions", sub["id"], sub)
            self.assertIsNone(reconcile_solution(tx, sub, task))
            self.assertEqual(sub["notificationState"], {"passing": False, "version": 12})
            self.assertEqual(tx.list("notifications"), [])
            tx.delete("submissions", sub["id"])
            self.assertIsNone(reconcile_solution(tx, sub, task))


if __name__ == "__main__":
    unittest.main()
