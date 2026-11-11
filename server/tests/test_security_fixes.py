"""Regressions for account lockout, notification writes and publication quotas."""
import time
import unittest
from unittest.mock import patch

from server.auth import token_hash
from server.notifications import mark_read
from server.store import Tx
from server.tests import test_platform as fixtures
from server.world_limits import MAX_ACCOUNT_WORLD_BYTES, account_growth_allowed, last_result_owners


class SecurityFixTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work

    def test_registration_cannot_exhaust_existing_account_login_budget(self):
        for mode in ("invite", "open", "closed"):
            self.settings(registrationMode=mode)
            for _ in range(20):
                response = self.client.post("/api/auth/register", json={
                    "username": "OPERATOR", "password": "attacker-password-long"})
                self.assertEqual(response.status_code, 403 if mode == "closed" else 409)
        with self.store.transaction() as tx:
            # Even a saturated valid-registration client bucket is independent.
            tx.put("throttle", token_hash("register:ip:testclient"), [time.time()] * 600)
        response = self.client.post("/api/auth/login", json={
            "username": "operator", "password": "admin-password-for-tests"})
        self.assertEqual(response.status_code, 200, response.text)

    def test_valid_registration_still_has_its_own_client_limit(self):
        with self.store.transaction() as tx:
            tx.put("throttle", token_hash("register:ip:testclient"), [time.time()] * 600)
        with patch("server.app.password_hash", side_effect=AssertionError("Throttled registration reached scrypt")):
            response = self.client.post("/api/auth/register", json={
                "username": "new_player", "password": "player-password-for-tests"})
        self.assertEqual(response.status_code, 429)

    def test_mark_all_read_updates_only_unread_rows_without_world_lock(self):
        user, headers = self.register()
        other, _ = self.register("other")
        with self.store.transaction() as tx:
            for index in range(500):
                tx.put("notifications", str(index), {"id": str(index), "userId": user["id"], "read": False})
            tx.put("notifications", "other", {"id": "other", "userId": other["id"], "read": False})
        counts = []

        def counted(*args):
            count = mark_read(*args)
            counts.append(count)
            return count

        with patch.object(Tx, "world", side_effect=AssertionError("Mark-read locked the world")), patch("server.notifications.mark_read", side_effect=counted):
            for _ in range(2):
                response = self.client.post("/api/notifications/read", json={"all": True}, headers=headers)
                self.assertEqual(response.status_code, 204, response.text)
        self.assertEqual(counts, [500, 0])
        with self.store.transaction() as tx:
            self.assertTrue(all(item["read"] is True for item in tx.list("notifications", user_id=user["id"])))
            self.assertIs(tx.get("notifications", "other")["read"], False)

    def test_mark_selected_read_is_account_scoped_and_rate_limited(self):
        user, headers = self.register()
        other, _ = self.register("other")
        with self.store.transaction() as tx:
            for identifier, owner in (("mine", user["id"]), ("unselected", user["id"]), ("other", other["id"])):
                tx.put("notifications", identifier, {"id": identifier, "userId": owner, "read": False})
        response = self.client.post("/api/notifications/read", json={"ids": ["mine", "other"]}, headers=headers)
        self.assertEqual(response.status_code, 204)
        with self.store.transaction() as tx:
            self.assertIs(tx.get("notifications", "mine")["read"], True)
            self.assertIs(tx.get("notifications", "unselected")["read"], False)
            self.assertIs(tx.get("notifications", "other")["read"], False)
            tx.put("throttle", "notification_reads:" + user["id"], [time.time()] * 120)
        response = self.client.post("/api/notifications/read", json={"all": True}, headers=headers)
        self.assertEqual(response.status_code, 429)
        with self.store.transaction() as tx:
            self.assertIs(tx.get("notifications", "unselected")["read"], False)

    def test_news_cta_rejects_browser_network_paths_and_encoded_separators(self):
        safe = {"title": "News", "cta": {"label": "Tasks", "href": "/tasks?sort=recent#top"}}
        response = self.client.post("/api/admin/news", json=safe, headers=self.admin)
        self.assertEqual(response.status_code, 201)
        identifier = response.json()["id"]
        for href in ("/\\evil.example", "//evil.example", "/\n/evil.example", "/\t/evil.example", "/%5cevil.example", "/%2fevil.example", "/%255cevil.example", "/%0a/evil.example", "https://evil.example", "javascript:alert(1)"):
            with self.subTest(href=href):
                body = {"title": "News", "cta": {"label": "Go", "href": href}}
                self.assertEqual(self.client.post("/api/admin/news", json=body, headers=self.admin).status_code, 422)
                self.assertEqual(self.client.patch("/api/admin/news/" + identifier, json=body, headers=self.admin).status_code, 422)
        self.assertEqual(self.client.get("/api/news/" + identifier).json()["cta"], safe["cta"])

    def test_account_cannot_fill_world_with_large_function_sources(self):
        user, headers = self.register()
        self.settings(submitCooldownSeconds=0)
        task = self.create_task("world-quota", 42)
        for index in range(9):
            source = "@solution fn answer_" + chr(ord("a") + index) + "(){\n//" + "x" * 60000 + "\nreturn 42;}"
            result = self.submit_and_work(task, source, headers)
            self.assertEqual(result["status"], "OK" if index < 8 else "CE", result.get("diagnostics"))
        self.assertEqual(result["diagnostics"][0]["code"], "WORLD_ACCOUNT_LIMIT")
        with self.store.transaction() as tx:
            world = tx.world()
            self.assertNotIn("answer_i", world["snapshot"]["functions"])
            self.assertEqual(len([owner for owner in world["ownerUsers"].values() if owner == user["id"]]), 8)
            self.assertEqual(world["lastOwnerUsers"]["answer_a"], user["id"])

    def test_history_quota_blocks_run_and_submit_without_spending_cooldown_or_rating(self):
        user, headers = self.register()
        task = self.create_task("history-quota", 42)
        with self.store.transaction() as tx:
            tx.put("submissions", "protected", {"id": "protected", "userId": user["id"], "taskId": task,
                   "everAccepted": True, "active": True, "status": "OK", "code": "x" * 1000})
            before = tx.get("users", user["id"])
        with patch("server.submission_history.MAX_ACCOUNT_BYTES", 500):
            for mode in ("run", "submit"):
                response = self.client.post(f"/api/tasks/{task}/{mode}", json={"code": "@solution fn answer(){return 42;}"}, headers=headers)
                self.assertEqual(response.status_code, 429, response.text)
                self.assertEqual(response.json()["error"]["code"], "HISTORY_QUOTA")
        with self.store.transaction() as tx:
            self.assertEqual(tx.get("users", user["id"]), before)
            self.assertIsNotNone(tx.get("submissions", "protected"))
            self.assertEqual(tx.execute("SELECT COUNT(*) FROM jobs WHERE user_id=?", (user["id"],)).fetchone()[0], 0)


class WorldQuotaTests(unittest.TestCase):
    def test_changed_inherited_and_unowned_last_results_are_charged_to_publisher(self):
        world = {"snapshot": {"variables": {}, "functions": {"inherited": {}}, "last": {"inherited": 1}},
                 "ownerUsers": {"inherited": "author"}}
        for name in ("inherited", "<global>"):
            candidate = {**world["snapshot"], "last": {name: "x" * MAX_ACCOUNT_WORLD_BYTES}}
            changes = {"last": candidate["last"]}
            self.assertEqual(last_result_owners(world, candidate, changes, "player")[name], "player")
            self.assertFalse(account_growth_allowed(world, candidate, changes, "player"))
        unchanged = last_result_owners(world, world["snapshot"], {"last": {"inherited": 1}}, "player")
        self.assertEqual(unchanged["inherited"], "author")
        world["lastOwnerUsers"] = {"inherited": "previous_publisher"}
        self.assertEqual(last_result_owners(world, world["snapshot"], {}, "player")["inherited"], "previous_publisher")

    def test_quota_counts_owned_values_and_last_results_and_allows_legacy_shrinking(self):
        oversized = "x" * MAX_ACCOUNT_WORLD_BYTES
        snapshot = {"variables": {"mine": oversized, "theirs": oversized}, "functions": {}, "last": {"mine": oversized}}
        world = {"snapshot": snapshot, "ownerUsers": {"mine": "player", "theirs": "other"}}
        self.assertTrue(account_growth_allowed(world, snapshot, {"variables": {"mine": oversized}}, "player"))
        smaller = {**snapshot, "last": {}, "variables": {**snapshot["variables"], "mine": 1}}
        self.assertTrue(account_growth_allowed(world, smaller, {"variables": {"mine": 1}}, "player"))
        self.assertFalse(account_growth_allowed(world, snapshot, {"variables": {"theirs": oversized}}, "player"))
        # A fresh account is also charged for a function's last result.
        empty = {"snapshot": {"variables": {}, "functions": {}, "last": {}}, "ownerUsers": {}}
        candidate = {"variables": {}, "functions": {"mine": {}}, "last": {"mine": oversized}}
        self.assertFalse(account_growth_allowed(empty, candidate, {"functions": {"mine": {}}}, "player"))
