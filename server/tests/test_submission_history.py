"""Bound player history while retaining executable and causal game state."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server import submission_history as history
from server.scoring import solved_tasks
from server.store import Store, dumps


class SubmissionHistoryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.store = Store("sqlite:///" + str(Path(self.directory.name) / "test.db"))
        self.store.initialize()

    def submission(self, tx, identifier, user="player", accepted=False, active=False, status="WRONG_ANSWER", **extra):
        value = {"id": identifier, "userId": user, "taskId": "shared-sum", "status": status,
                 "everAccepted": accepted, "active": active, "code": "x" * 200,
                 "createdAt": "2026-11-01T00:00:00Z", "dependencies": ["global_value"], **extra}
        tx.put("submissions", identifier, value)
        return value

    def job(self, tx, identifier, user="player", status="completed", mode="submit", **extra):
        value = {"id": identifier, "userId": user, "mode": mode, **extra}
        tx.execute("INSERT INTO jobs(id,user_id,status,created,data,mode) VALUES(?,?,?,?,?,?)",
                   (identifier, user, status, 1793500000, dumps(value), mode))
        return value

    def test_pruning_preserves_active_scores_causal_sources_victims_and_live_rechecks(self):
        with self.store.transaction() as tx, patch.object(history, "HISTORY_ITEMS", 1):
            tx.world()
            active = self.submission(tx, "active", accepted=True, active=True, status="OK")
            self.submission(tx, "broken", accepted=True, active=True, status="BROKEN", taskId="another-task")
            self.submission(tx, "retired", accepted=True)
            self.submission(tx, "rejected")
            self.submission(tx, "audit-source", accepted=True)
            self.submission(tx, "audit-victim", accepted=True)
            self.submission(tx, "live-recheck", accepted=True)
            self.submission(tx, "another-user", user="other")
            tx.put("break_audits", "audit-source", {"id": "audit-source", "userId": "player", "submissionId": "audit-source"})
            tx.put("break_candidates", "audit-source:0", {"submissionId": "audit-victim", "userId": "audit-victim"})
            self.job(tx, "recheck_live-recheck", status="queued", mode="recheck", submissionId="live-recheck")
            self.job(tx, "finished", result={"submission": {"code": "x" * 200}})
            world = tx.world()
            world["owners"]["older_global"] = "retired"
            world.get("ownerUsers", {}).pop("older_global", None)
            tx.save_world(world)
            before = solved_tasks(tx, {"id": "player"})
            self.assertEqual(before, {"shared-sum"})
            counts = history.prune(tx, "player")
            self.assertEqual(counts, {"submissions": 2, "jobs": 1})
            self.assertEqual(solved_tasks(tx, {"id": "player"}), before)
            self.assertEqual(tx.get("submissions", "active"), active)
            for identifier in ("broken", "audit-source", "audit-victim", "live-recheck", "another-user"):
                self.assertIsNotNone(tx.get("submissions", identifier))
            self.assertEqual(tx.get("system", "world")["ownerUsers"]["older_global"], "player")
            self.assertEqual(tx.get("system", "world")["owners"]["older_global"], "retired")
            self.assertIsNone(tx.execute("SELECT 1 FROM dependencies WHERE submission_id='retired'").fetchone())
            self.assertIsNotNone(tx.execute("SELECT 1 FROM dependencies WHERE submission_id='active'").fetchone())
            self.assertIsNone(tx.execute("SELECT 1 FROM jobs WHERE id='finished'").fetchone())

    def test_completed_job_duplicate_and_unicode_source_count_toward_bytes(self):
        with self.store.transaction() as tx, patch.object(history, "MAX_ACCOUNT_BYTES", 4000), patch.object(history, "RUN_RESERVATION", 100):
            tx.world()
            sub = self.submission(tx, "entry", code="ж" * 200)
            self.assertTrue(history.capacity_available(tx, "player", "run"))
            self.job(tx, "duplicate", result={"submission": sub})
            self.job(tx, "duplicate-again", result={"submission": sub})
            self.assertFalse(history.capacity_available(tx, "player", "run"))
            self.assertTrue(history.capacity_available(tx, "another", "run"))

    def test_inflight_reservations_cover_two_completed_results_before_next_admission(self):
        with self.store.transaction() as tx, patch.object(history, "MAX_ACCOUNT_BYTES", 6000), patch.object(history, "SUBMIT_RESERVATION", 2000):
            tx.world()
            for index in range(3):
                self.assertTrue(history.capacity_available(tx, "player", "submit"))
                self.job(tx, "pending_" + str(index), status="running" if index == 0 else "queued", code="small")
            self.assertFalse(history.capacity_available(tx, "player", "submit"))

    def test_record_cap_includes_future_submission_rows(self):
        with self.store.transaction() as tx, patch.object(history, "MAX_ACCOUNT_ITEMS", 4):
            tx.world()
            self.job(tx, "pending", status="queued")
            self.assertTrue(history.capacity_available(tx, "player", "submit"))
            self.submission(tx, "retained")
            self.assertFalse(history.capacity_available(tx, "player", "submit"))
            self.assertTrue(history.capacity_available(tx, "player", "run"))

    def test_cleanup_enforces_byte_bound_for_legacy_rejected_and_accepted_history(self):
        with self.store.transaction() as tx, patch.object(history, "HISTORY_BYTES", 700):
            tx.world()
            for index in range(5):
                self.submission(tx, "old_" + str(index), accepted=bool(index % 2))
            counts = history.cleanup(tx)
            self.assertEqual(counts["submissions"], 4)
            self.assertLessEqual(tx.execute("SELECT SUM(length(data)) FROM records WHERE kind='submissions'").fetchone()[0], 700)

    def test_protected_working_set_blocks_admission_instead_of_deleting_solutions(self):
        with self.store.transaction() as tx, patch.object(history, "HISTORY_ITEMS", 1), patch.object(history, "MAX_ACCOUNT_ITEMS", 2):
            tx.world()
            self.submission(tx, "active", accepted=True, active=True, status="OK")
            self.submission(tx, "broken", accepted=True, active=True, status="BROKEN")
            self.assertEqual(history.prune(tx, "player"), {"submissions": 0, "jobs": 0})
            self.assertFalse(history.capacity_available(tx, "player", "submit"))
            self.assertEqual(len(tx.list("submissions", user_id="player")), 2)


if __name__ == "__main__":
    unittest.main()
