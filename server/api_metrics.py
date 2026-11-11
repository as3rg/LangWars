"""Process-local, bounded HTTP counters: no request bodies, paths or identities."""
import math
import os
import threading
import time

WINDOW_SECONDS = 60
LATENCY_BOUNDS_MS = (1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000)
REJECTION_COUNTERS = {"QUEUE_FULL": "queueFull", "NOTIFICATION_BACKLOG": "notificationBacklog", "COOLDOWN": "cooldowns"}


class ApiMetrics:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.started = clock()
        self.lock = threading.Lock()
        self.buckets = {}
        self.in_flight = 0

    def _bucket(self, now):
        second = math.floor(now)
        for old in tuple(self.buckets):
            if old <= second - WINDOW_SECONDS:
                del self.buckets[old]
        return self.buckets.setdefault(second, {"requests": 0, "errors": 0, "rejected": 0, "rateLimited": 0,
            "queueFull": 0, "notificationBacklog": 0, "cooldowns": 0, "runsAccepted": 0, "submissionsAccepted": 0, "latencySum": 0.0, "latencyMax": 0.0,
            "histogram": [0] * (len(LATENCY_BOUNDS_MS) + 1)})

    def begin(self):
        with self.lock:
            self.in_flight += 1
        return self.clock()

    def end(self, started, status, admission=None):
        now = self.clock()
        elapsed = max(0.0, (now - started) * 1000)
        with self.lock:
            self.in_flight = max(0, self.in_flight - 1)
            bucket = self._bucket(now)
            bucket["requests"] += 1
            bucket["errors"] += status >= 500
            bucket["rejected"] += 400 <= status < 500
            bucket["rateLimited"] += status == 429
            if status == 202 and admission in ("runsAccepted", "submissionsAccepted"):
                bucket[admission] += 1
            bucket["latencySum"] += elapsed
            bucket["latencyMax"] = max(bucket["latencyMax"], elapsed)
            index = next((index for index, bound in enumerate(LATENCY_BOUNDS_MS) if elapsed <= bound), len(LATENCY_BOUNDS_MS))
            bucket["histogram"][index] += 1

    def rejection(self, code):
        counter = REJECTION_COUNTERS.get(code)
        if counter:
            with self.lock:
                self._bucket(self.clock())[counter] += 1

    def snapshot(self):
        now = self.clock()
        with self.lock:
            self._bucket(now)
            counters = {key: sum(bucket[key] for bucket in self.buckets.values()) for key in
                        ("requests", "errors", "rejected", "rateLimited", "queueFull", "notificationBacklog", "cooldowns", "runsAccepted", "submissionsAccepted")}
            total = counters["requests"]
            mean = sum(bucket["latencySum"] for bucket in self.buckets.values()) / total if total else None
            target, seen, p95 = math.ceil(total * .95), 0, None
            for index in range(len(LATENCY_BOUNDS_MS) + 1):
                seen += sum(bucket["histogram"][index] for bucket in self.buckets.values())
                if total and seen >= target:
                    p95 = LATENCY_BOUNDS_MS[index] if index < len(LATENCY_BOUNDS_MS) else max(bucket["latencyMax"] for bucket in self.buckets.values())
                    break
            uptime = max(0.0, now - self.started)
            return {"processId": os.getpid(), "uptimeSeconds": uptime, "windowSeconds": WINDOW_SECONDS,
                    **counters, "requestsPerSecond": total / max(1.0, min(WINDOW_SECONDS, uptime)),
                    "admissionsPerSecond": (counters["runsAccepted"] + counters["submissionsAccepted"]) / max(1.0, min(WINDOW_SECONDS, uptime)),
                    "meanLatencyMs": mean, "p95LatencyMs": p95, "inFlight": self.in_flight}


class ApiMetricsMiddleware:
    def __init__(self, app, metrics):
        self.app, self.metrics = app, metrics

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        started, status = self.metrics.begin(), 500
        # Classify into two fixed counters; retain no URL, task ID or user ID.
        path = scope.get("path", "")
        admission = None
        if scope.get("method") == "POST" and path.startswith("/api/tasks/"):
            admission = "runsAccepted" if path.endswith("/run") else "submissionsAccepted" if path.endswith("/submit") else None

        async def measured_send(message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, measured_send)
        finally:
            self.metrics.end(started, status, admission)
