"""Privacy and authentication regressions for the first public test release."""
import itertools
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from fastapi.testclient import TestClient

from server.app import create_app
from server.auth import password_hash, password_matches, token_hash
from server.tests import test_platform as fixtures


class PublicReleaseTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register
    settings = fixtures.PlatformTests.settings
    create_task = fixtures.PlatformTests.create_task
    submit_and_work = fixtures.PlatformTests.submit_and_work

    def test_passwords_use_unique_salts_and_bounded_memory_hard_hashes(self):
        first = password_hash("the-same-test-password")
        second = password_hash("the-same-test-password")
        self.assertNotEqual(first, second)
        self.assertEqual(first.split("$")[:4], ["scrypt", "32768", "8", "3"])
        self.assertEqual(len(first.split("$")[4]), 32)
        self.assertEqual(len(first.split("$")[5]), 64)
        self.assertTrue(password_matches("the-same-test-password", first))
        self.assertFalse(password_matches("a-different-password", first))
        self.assertFalse(password_matches("the-same-test-password", first.replace("32768", "1073741824")))

    def test_namespace_enforces_all_visibility_combinations_for_every_role(self):
        _, player = self.register()
        function = {"name": "secret_function", "params": ["value"], "types": ["int"], "annotation": None, "cast_to": None, "source": "fn secret_function(value) { return value; }", "source_id": "internal-fingerprint", "publication_priority": 9}
        with self.store.transaction() as tx:
            world = tx.world()
            world["snapshot"] = {"variables": {"secret_value": "hidden-variable"}, "functions": {"secret_function": function}, "last": {"secret_function": "hidden-result"}}
            tx.save_world(world)
        for variable_names, variable_values, function_names, function_values in itertools.product((False, True), repeat=4):
            policies = {"variables": {"names": "public" if variable_names else "admin_only", "values": "public" if variable_values else "admin_only"}, "functions": {"names": "public" if function_names else "admin_only", "values": "public" if function_values else "admin_only"}}
            self.settings(worldVisibility=policies)
            for headers in ({}, player):
                response = self.client.get("/api/namespace", headers=headers)
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertEqual(data["values"], {"secret_value": "hidden-variable" if variable_values else None} if variable_names else {})
                self.assertEqual(set(data["functions"]), {"secret_function"} if function_names else set())
                if function_names and not function_values:
                    self.assertIsNone(data["functions"]["secret_function"])
                self.assertEqual(data["last"], {"secret_function": "hidden-result"} if function_names and function_values else {})
                self.assertNotIn("internal-fingerprint", response.text)
            admin = self.client.get("/api/namespace", headers=self.admin).json()
            self.assertEqual(admin["values"]["secret_value"], "hidden-variable")
            self.assertEqual(admin["functions"]["secret_function"]["source"], function["source"])
            self.assertEqual(admin["last"]["secret_function"], "hidden-result")

    def test_visibility_and_name_length_settings_validate_strictly(self):
        for invalid in [0, 129, True, "48"]:
            self.assertEqual(self.client.patch("/api/admin/settings", json={"maxNameLength": invalid}, headers=self.admin).status_code, 422)
        for invalid in [{}, {"variables": {"names": "public", "values": "public"}}, {"variables": {"names": "public", "values": "public"}, "functions": {"names": "everyone", "values": "public"}}]:
            self.assertEqual(self.client.patch("/api/admin/settings", json={"worldVisibility": invalid}, headers=self.admin).status_code, 422)
        self.settings(maxNameLength=8)
        _, headers = self.register()
        task = self.create_task("name-limit", 42)
        result = self.submit_and_work(task, "@solution fn answer_answer() { return 42; }", headers)
        self.assertEqual(result["status"], "CE", result)
        self.assertTrue(any(item["code"] == "NAME_LENGTH" for item in result["diagnostics"]), result)
        self.assertEqual(self.client.get("/api/config").json()["maxNameLength"], 8)

    def test_accounts_do_not_collect_or_return_email(self):
        response = self.client.post("/api/auth/register", json={"username": "player", "password": "test-password-long", "email": "unused@example.org"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.post("/api/auth/login", json={"username": "operator", "password": "admin-password-for-tests", "email": "unused@example.org"}).status_code, 422)
        user, headers = self.register()
        self.assertNotIn("email", user)
        self.assertNotIn("email", self.client.get("/api/me", headers=headers).json())
        with self.store.transaction() as tx:
            self.assertTrue(all("email" not in item for item in tx.list("users")))

    def test_reusable_invitation_is_hashed_expiring_and_usage_limited(self):
        self.settings(registrationMode="invite")
        response = self.client.post("/api/admin/invites", json={"maxUses": 2, "expiresInHours": 24}, headers=self.admin)
        self.assertEqual(response.status_code, 201)
        invite = response.json()
        with self.store.transaction() as tx:
            stored = tx.get("invites", token_hash(invite["code"]))
            self.assertEqual(stored["maxUses"], 2)
            self.assertEqual(stored["uses"], 0)
            self.assertNotIn(invite["code"], str(stored))
        self.register("attendee_a", inviteCode=invite["code"])
        self.register("attendee_b", inviteCode=invite["code"])
        denied = self.client.post("/api/auth/register", json={"username": "attendee_c", "password": "attendee-password-long", "inviteCode": invite["code"]})
        self.assertEqual(denied.status_code, 403)
        listed = self.client.get("/api/admin/invites", headers=self.admin).json()[0]
        self.assertEqual(listed["uses"], 2)
        self.assertIn("usedAt", listed)
        self.assertNotIn("code", listed)

    def test_expired_or_revoked_invites_fail_before_password_hashing(self):
        self.settings(registrationMode="invite")
        invite = self.client.post("/api/admin/invites", json={}, headers=self.admin).json()
        with self.store.transaction() as tx:
            stored = tx.get("invites", token_hash(invite["code"]))
            stored["expiresAt"] = "2000-01-01T00:00:00Z"
            tx.put("invites", token_hash(invite["code"]), stored)
        with patch("server.app.password_hash", side_effect=AssertionError("Unusable invite reached scrypt")):
            response = self.client.post("/api/auth/register", json={"username": "attendee", "password": "attendee-password-long", "inviteCode": invite["code"]})
            self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.delete("/api/admin/invites/" + invite["id"], headers=self.admin).status_code, 204)
        self.assertEqual(self.client.post("/api/auth/register", json={"username": "attendee", "password": "attendee-password-long", "inviteCode": invite["code"]}).status_code, 403)

    def test_concurrent_registration_cannot_overconsume_single_use_invite(self):
        self.settings(registrationMode="invite")
        invite = self.client.post("/api/admin/invites", json={}, headers=self.admin).json()
        def register(index):
            return self.client.post("/api/auth/register", json={"username": "attendee_" + str(index), "password": "attendee-password-long", "inviteCode": invite["code"]}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = sorted(pool.map(register, range(2)))
        self.assertEqual(statuses, [201, 403])

    def test_login_backoff_persists_across_app_restart_and_recovers(self):
        for _ in range(3):
            self.assertEqual(self.client.post("/api/auth/login", json={"username": "OPERATOR", "password": "wrong-password"}).status_code, 401)
        with TestClient(create_app(self.url)) as restarted:
            response = restarted.post("/api/auth/login", json={"username": "operator", "password": "admin-password-for-tests"})
            self.assertEqual(response.status_code, 429)
            self.assertEqual(response.json()["error"]["code"], "LOGIN_TIMEOUT")
            self.assertGreaterEqual(int(response.headers["Retry-After"]), 1)
        with self.store.transaction() as tx:
            key = token_hash("operator")
            failures = tx.get("auth_failures", key)
            failures["blockedUntil"] = 0
            tx.put("auth_failures", key, failures)
        response = self.client.post("/api/auth/login", json={"username": "operator", "password": "admin-password-for-tests"})
        self.assertEqual(response.status_code, 200)
        with self.store.transaction() as tx:
            self.assertIsNone(tx.get("auth_failures", token_hash("operator")))

    def test_unknown_accounts_have_the_same_backoff_and_account_rate_limit(self):
        with patch("server.app.time.time", return_value=1800000000):
            for _ in range(3):
                response = self.client.post("/api/auth/login", json={"username": "unknown", "password": "wrong-password"})
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.json()["error"]["message"], "Wrong username or password")
            self.assertEqual(self.client.post("/api/auth/login", json={"username": "unknown", "password": "wrong-password"}).status_code, 429)
        with self.store.transaction() as tx:
            tx.put("throttle", token_hash("login:name:operator"), [time.time()] * 15)
        with patch("server.app.password_matches", side_effect=AssertionError("Rate-limited request reached scrypt")):
            response = self.client.post("/api/auth/login", json={"username": "operator", "password": "admin-password-for-tests"})
            self.assertEqual(response.status_code, 429)
            self.assertEqual(response.headers["Retry-After"], "60")
