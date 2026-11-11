import asyncio
import time
import unittest

from server.api_metrics import ApiMetrics, ApiMetricsMiddleware
from server.tests import test_platform as fixtures


class HttpMetricsTests(unittest.TestCase):
    def test_bounded_rolling_histogram_expires_old_counts_and_handles_no_data(self):
        now = [100.0]
        metrics = ApiMetrics(lambda: now[0])
        self.assertIsNone(metrics.snapshot()["meanLatencyMs"])
        for index in range(10000):
            start = metrics.begin()
            now[0] += .00001
            metrics.end(start, 200 if index % 2 else 429)
        metrics.rejection("QUEUE_FULL")
        metrics.rejection("NOTIFICATION_BACKLOG")
        metrics.rejection("COOLDOWN")
        metrics.rejection("unbounded user-controlled identifier")
        result = metrics.snapshot()
        self.assertEqual((result["requests"], result["rateLimited"], result["errors"], result["inFlight"]), (10000, 5000, 0, 0))
        self.assertEqual((result["queueFull"], result["notificationBacklog"], result["cooldowns"]), (1, 1, 1))
        self.assertLessEqual(len(metrics.buckets), 60)
        self.assertGreaterEqual(result["p95LatencyMs"], result["meanLatencyMs"])
        now[0] += 61
        result = metrics.snapshot()
        self.assertEqual(result["requests"], 0)
        self.assertIsNone(result["p95LatencyMs"])

    def test_exception_releases_inflight_and_records_server_error(self):
        metrics = ApiMetrics()
        async def broken(scope, receive, send):
            raise RuntimeError("not stored")
        with self.assertRaises(RuntimeError):
            asyncio.run(ApiMetricsMiddleware(broken, metrics)({"type": "http"}, None, None))
        result = metrics.snapshot()
        self.assertEqual((result["requests"], result["errors"], result["inFlight"]), (1, 1, 0))


class PerformanceEndpointTests(unittest.TestCase):
    setUp = fixtures.PlatformTests.setUp
    tearDown = fixtures.PlatformTests.tearDown
    register = fixtures.PlatformTests.register

    def test_only_admins_can_read_even_warmed_cache_and_no_private_payloads(self):
        _, player = self.register()
        self.assertEqual(self.client.get("/api/admin/performance").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/performance", headers=player).status_code, 403)
        response = self.client.get("/api/admin/performance", headers=self.admin)
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertIn("queue", result)
        self.assertIn("workers", result)
        self.assertIn("activity", result)
        self.assertEqual(result["api"]["inFlight"], 1)
        self.assertEqual(result["api"]["errors"], 0)
        self.assertGreaterEqual(result["store"]["probeMs"], 0)
        for secret in ("passwordHash", "session", "admin-password-for-tests", "code", "DATABASE_URL"):
            self.assertNotIn(secret, response.text)
        self.assertEqual(self.client.get("/api/admin/performance", headers=player).status_code, 403)

    def test_http_limits_errors_and_rejections_are_included(self):
        self.client.post("/api/auth/login", content=b'x' * (512 * 1024 + 1))
        self.client.post("/api/auth/login", content=b'{bad', headers={"Content-Type": "application/json"})
        with self.store.transaction() as tx:
            user = next(user for user in tx.list("users") if user["role"] == "admin")
            user["lastRun"] = time.time()
            tx.put("users", user["id"], user)
        denied = self.client.post("/api/tasks/shared-sum/run", json={"code": "@solution fn answer(){return 0;}"}, headers=self.admin)
        self.assertEqual(denied.status_code, 429, denied.text)
        with self.store.transaction() as tx:
            user = tx.get("users", user["id"])
            user["lastRun"] = 0
            tx.put("users", user["id"], user)
        accepted = self.client.post("/api/tasks/shared-sum/run", json={"code": "@solution fn answer(){return 0;}"}, headers=self.admin)
        self.assertEqual(accepted.status_code, 202, accepted.text)
        result = self.client.get("/api/admin/performance", headers=self.admin).json()["api"]
        self.assertGreaterEqual(result["rejected"], 3)
        self.assertEqual(result["cooldowns"], 1)
        self.assertEqual(result["rateLimited"], 1)
        self.assertEqual(result["runsAccepted"], 1)
        self.assertEqual(result["submissionsAccepted"], 0)


if __name__ == "__main__":
    unittest.main()
