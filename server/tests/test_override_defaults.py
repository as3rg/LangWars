import tempfile
import unittest
from pathlib import Path

from server.seed import OPERATIONS, initial_world
from server.store import Store
from server.tests import test_platform as fixtures


class OverrideDefaultUpgradeTests(unittest.TestCase):
    def test_default_disables_contains_without_removing_administrative_capability(self):
        self.assertIn("contains", OPERATIONS)
        self.assertNotIn("contains", initial_world()["settings"]["permittedOverrides"])
        # Each world's policy is independent of the module's operation registry.
        first = initial_world()
        first["settings"]["permittedOverrides"].append("contains")
        self.assertNotIn("contains", initial_world()["settings"]["permittedOverrides"])

    def test_upgrade_updates_only_legacy_factory_policy_and_runs_once(self):
        for policy in (list(OPERATIONS), ["eq", "contains"], ["eq"], []):
            with self.subTest(policy=policy), tempfile.TemporaryDirectory() as directory:
                store = Store("sqlite:///" + str(Path(directory) / "test.db"))
                store.initialize()
                with store.transaction() as tx:
                    world = tx.world()
                    world.pop("overrideDefaultsRevision")
                    world["settings"]["permittedOverrides"] = list(policy)
                    tx.save_world(world)
                store.initialize()
                with store.transaction() as tx:
                    world = tx.world()
                    expected = [operation for operation in OPERATIONS if operation != "contains"] if policy == OPERATIONS else policy
                    self.assertEqual(world["settings"]["permittedOverrides"], expected)
                    world["settings"]["permittedOverrides"] = list(OPERATIONS)
                    tx.save_world(world)
                    version = world["version"]
                store.initialize()
                with store.transaction() as tx:
                    self.assertEqual(tx.world()["settings"]["permittedOverrides"], OPERATIONS)
                    self.assertEqual(tx.world()["version"], version)


class OverrideDefaultEndpointTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work

    def test_admin_can_opt_back_into_contains(self):
        self.settings(submitCooldownSeconds=0)
        _, headers = self.register()
        task = self.create_task("membership", 1)
        source = '@contains fn <list,int> search(items,index){return __builtin_contains__(items,index);}\n@solution fn solve(){return 1;}'
        denied = self.submit_and_work(task, source, headers)
        self.assertEqual(denied["status"], "CE", denied)
        self.assertEqual(denied["diagnostics"][0]["code"], "OVERRIDE_DISABLED")
        self.settings(permittedOverrides=list(OPERATIONS))
        allowed = self.submit_and_work(task, source, headers)
        self.assertEqual(allowed["status"], "OK", allowed)
        self.store.initialize()
        self.assertIn("contains", self.client.get("/api/admin/settings", headers=self.admin).json()["permittedOverrides"])


if __name__ == "__main__":
    unittest.main()
