"""Opt-in worker fallbacks and conservative dependency selection."""
import unittest

from server.break_audits import MAX_PENDING_AUDITS
from server.seed import initial_world
from server.store import iso
from server.telemetry import snapshot
from server.tests import test_platform as fixtures
from server.worker import options_for, recheck_candidates


class FallbackChecksTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work
    drain = fixtures.PlatformTests.drain

    def test_settings_are_strict_opt_in_and_backfill_preserves_opt_in(self):
        defaults = initial_world()["settings"]
        for key in ("dependencyCausalChecksEnabled", "cheapInvariantChecksEnabled"):
            self.assertIs(defaults[key], False)
            for invalid in (0, 1, "true", None, []):
                response = self.client.patch("/api/admin/settings", json={key: invalid}, headers=self.admin)
                self.assertEqual(response.status_code, 422, response.text)
        self.settings(dependencyCausalChecksEnabled=True, cheapInvariantChecksEnabled=True)
        self.store.initialize()
        with self.store.transaction() as tx:
            world = tx.world()
            self.assertTrue(world["settings"]["dependencyCausalChecksEnabled"])
            self.assertTrue(options_for(world, {})["cheap_invariants"])
            world["settings"].pop("dependencyCausalChecksEnabled")
            tx.save_world(world)
        self.store.initialize()
        with self.store.transaction() as tx:
            self.assertFalse(tx.world()["settings"]["dependencyCausalChecksEnabled"])
            self.assertTrue(tx.world()["settings"]["cheapInvariantChecksEnabled"])

    def test_core_change_selects_operation_users_and_keeps_legacy_conservative(self):
        self.settings(submitCooldownSeconds=0, dependencyCausalChecksEnabled=True)
        _, headers = self.register()
        task = self.create_task("first", 3)
        first = self.submit_and_work(task, '@solution fn first_answer(){return 3;}', headers)
        with self.store.transaction() as tx:
            original = tx.get("submissions", first["id"])
            for key, deps in (("equal_user", ["@eq"]), ("cast_user", ["@cast"]), ("legacy", [])):
                item = dict(original, id=key, dependencies=deps)
                if key == "legacy":
                    item.pop("dependencyRevision")
                tx.put("submissions", key, item)
            changes = {"functions": {"equal": {"annotation": "eq"}}}
            selected = {sub["id"] for sub in recheck_candidates(tx, changes, tx.world())}
            self.assertEqual(selected, {"equal_user", "legacy"})
            changes = {"functions": {"cast": {"annotation": "cast"}}}
            selected = {sub["id"] for sub in recheck_candidates(tx, changes, tx.world())}
            self.assertEqual(selected, {"cast_user", "legacy"})
            world = tx.world()
            world["settings"]["dependencyCausalChecksEnabled"] = False
            self.assertEqual({sub["id"] for sub in recheck_candidates(tx, changes, world)}, {first["id"], "equal_user", "cast_user", "legacy"})

    def test_unrelated_override_does_not_create_audit_but_collision_still_breaks(self):
        self.settings(submitCooldownSeconds=0, dependencyCausalChecksEnabled=True, cheapInvariantChecksEnabled=True)
        _, first_headers = self.register("first")
        _, second_headers = self.register("second")
        task = self.create_task("first", 11)
        source_task = self.create_task("second", 7)
        victim = self.submit_and_work(task, '@solution fn first_answer(){let answer=10;return answer+1;}', first_headers)
        source = self.submit_and_work(source_task, '@eq fn <int,int> equal(left,right){return __builtin_eq__(left,right);}@solution fn second_answer(){return 7;}', second_headers)
        self.assertEqual(source["status"], "OK", source)
        with self.store.transaction() as tx:
            self.assertEqual(tx.list("break_audits"), [])
            self.assertIsNone(tx.execute("SELECT id FROM jobs WHERE id=?", ("recheck_" + victim["id"],)).fetchone())
        source = self.submit_and_work(source_task, '@solution fn second_answer(){let answer=50;return 7;}', second_headers)
        self.assertEqual(source["status"], "OK", source)
        self.drain()
        current = self.client.get("/api/submissions/" + victim["id"], headers=first_headers).json()
        self.assertEqual(current["status"], "BROKEN")
        self.assertNotIn("dependencyRevision", current)
        notices = self.client.get("/api/notifications", headers=first_headers).json()["items"]
        self.assertEqual(sum(item["kind"] == "broken" for item in notices), 1)
        impact = self.client.get("/api/submissions/" + source["id"], headers=second_headers).json()["breakImpact"]
        self.assertEqual(impact, {"userCount": 1})

    def test_full_audits_allow_unrelated_publication_but_reject_collision(self):
        self.settings(submitCooldownSeconds=0, dependencyCausalChecksEnabled=True)
        _, first_headers = self.register("first")
        _, second_headers = self.register("second")
        first_task = self.create_task("first", 11)
        second_task = self.create_task("second", 7)
        self.submit_and_work(first_task, '@solution fn first_answer(){let answer=10;return answer+1;}', first_headers)
        with self.store.transaction() as tx:
            for index in range(MAX_PENDING_AUDITS):
                key = "pending_" + str(index)
                tx.put("break_audits", key, {"id": key, "createdAt": iso(), "total": 1, "cursor": 0})
        self.assertTrue(snapshot(self.store, force=True)["admission"]["submitAllowed"])
        unrelated = self.submit_and_work(second_task, '@solution fn second_answer(){return 7;}', second_headers)
        self.assertEqual(unrelated["status"], "OK", unrelated)
        collided = self.submit_and_work(second_task, '@solution fn second_answer(){let answer=50;return 7;}', second_headers)
        self.assertEqual(collided["status"], "FAIL", collided)
        self.assertEqual(collided["diagnostics"][0]["code"], "NOTIFICATION_BACKLOG")
        with self.store.transaction() as tx:
            self.assertEqual(tx.world()["snapshot"]["variables"]["answer"], 10)

    def test_stale_graph_is_conservative_until_live_recheck_finishes(self):
        self.settings(submitCooldownSeconds=0, dependencyCausalChecksEnabled=True)
        _, headers = self.register()
        task = self.create_task("first", 11)
        victim = self.submit_and_work(task, '@solution fn first_answer(){let answer=10;return answer+1;}', headers)
        from server.worker import schedule_rechecks
        with self.store.transaction() as tx:
            world = tx.world()
            schedule_rechecks(tx, {"variables": {"answer": 50}}, world)
            selected = list(recheck_candidates(tx, {"variables": {"temporary": 2}}, world))
            self.assertEqual([sub["id"] for sub in selected], [victim["id"]])


if __name__ == "__main__":
    unittest.main()
