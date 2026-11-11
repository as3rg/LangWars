"""Catalog/scheduling safety checks; live recovery validation is documented separately."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("db_backup", Path(__file__).resolve().parents[1] / "db_backup.py")
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repository = Path(self.temporary.name)
        self.backups = backup.Backups(self.repository, "test-container")

    def record(self, number, parent=None, completed=None, system="cluster-one"):
        identifier = f"20260101T000000Z-{number:08x}"
        path = self.repository / identifier
        (path / "data").mkdir(parents=True)
        (path / "data" / "backup_manifest").write_text("test")
        result = {"id": identifier, "type": "incremental" if parent else "full",
                  "parent": parent, "completed": number if completed is None else completed,
                  "systemIdentifier": system}
        backup.atomic_json(path / "record.json", result)
        return result

    def test_schedule_uses_age_of_full_not_recent_incremental(self):
        root = self.record(1, completed=0)
        increment = self.record(2, root["id"], completed=6 * 86400)
        records = self.backups.records()
        self.assertEqual(self.backups.select_parent(records, "cluster-one", 7, now=7 * 86400 - 1), increment)
        self.assertIsNone(self.backups.select_parent(records, "cluster-one", 7, now=7 * 86400))
        self.assertIsNone(self.backups.select_parent(records, "cluster-two", 7, now=1))
        self.assertIsNone(self.backups.select_parent(records, "cluster-one", 7, force_full=True, now=1))

    def test_prune_keeps_complete_new_chains_and_partial_work(self):
        first = self.record(1)
        increment = self.record(2, first["id"])
        second = self.record(3)
        latest = self.record(4, second["id"])
        third = self.record(5)
        partial = self.repository / ".partial-keep-for-inspection"
        partial.mkdir()
        self.backups.prune(self.backups.records(), 2)
        self.assertEqual(set(self.backups.records()), {second["id"], latest["id"], third["id"]})
        self.assertFalse((self.repository / first["id"]).exists())
        self.assertFalse((self.repository / increment["id"]).exists())
        self.assertTrue(partial.exists())

    def test_missing_parent_and_cross_cluster_chains_are_rejected(self):
        first = self.record(1)
        increment = self.record(2, first["id"], system="another-cluster")
        with self.assertRaisesRegex(backup.BackupError, "different database clusters"):
            self.backups.records()
        metadata = self.repository / increment["id"] / "record.json"
        increment["systemIdentifier"] = "cluster-one"
        increment["parent"] = "20260101T000000Z-ffffffff"
        backup.atomic_json(metadata, increment)
        with self.assertRaisesRegex(backup.BackupError, "incomplete or circular"):
            self.backups.records()

    def test_circular_chain_is_rejected(self):
        first = self.record(1)
        second = self.record(2, first["id"])
        first.update(type="incremental", parent=second["id"])
        backup.atomic_json(self.repository / first["id"] / "record.json", first)
        with self.assertRaisesRegex(backup.BackupError, "incomplete or circular"):
            self.backups.records()

    def test_lock_rejects_concurrent_access_and_releases_on_error(self):
        with self.assertRaisesRegex(RuntimeError, "failure"):
            with backup.repository_lock(self.repository):
                with self.assertRaisesRegex(backup.BackupError, "locked"):
                    with backup.repository_lock(self.repository):
                        self.fail("Second writer obtained repository lock")
                raise RuntimeError("failure")
        with backup.repository_lock(self.repository):
            self.assertTrue((self.repository / ".backup.lock" / "owner.json").exists())
        self.assertFalse((self.repository / ".backup.lock").exists())

    def test_restore_refuses_traversal_and_existing_output_before_running_tools(self):
        record = self.record(1)
        records = self.backups.records()
        (self.repository / "restore-existing").mkdir()
        with patch.object(self.backups, "tool") as tool:
            for output in ("../production", "/data", "restore-../../data", "restore-existing"):
                with self.subTest(output=output), self.assertRaises(backup.BackupError):
                    self.backups.prepare(record["id"], records, output)
            tool.assert_not_called()
        with self.assertRaises(backup.BackupError):
            self.backups.path("../../data")

    def test_backup_failure_never_creates_completed_record(self):
        answers = {"SHOW server_version_num": "170005", "SHOW summarize_wal": "on",
                   "SELECT count(*) FROM pg_tablespace WHERE spcname NOT IN ('pg_default','pg_global')": "0",
                   "SELECT system_identifier::text FROM pg_control_system()": "test-cluster"}
        with patch.object(self.backups, "sql", side_effect=lambda query: answers[query]), \
                patch.object(self.backups, "tool", side_effect=OSError("disk full")):
            with self.assertRaisesRegex(OSError, "disk full"):
                self.backups.backup(7, 3)
        self.assertEqual(self.backups.records(), {})
        self.assertEqual(len(list(self.repository.glob(".partial-*"))), 1)


if __name__ == "__main__":
    unittest.main()
