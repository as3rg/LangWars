"""Small, bounded queue telemetry; no source, user names or request payloads.

Workers write one heartbeat per ten seconds. Claim outcomes add one fixed-size
minute/mode bucket in the existing fenced completion transaction. Reading the
dashboard never scans completed jobs or source-bearing queue JSON.
"""
from __future__ import annotations

import copy
import json
import logging
import math
import os
import socket
import threading
import time
import uuid
import weakref
from datetime import datetime, timezone

from .store import dumps

HEARTBEAT_SECONDS = 10
STALE_AFTER_SECONDS = 35
WINDOW_SECONDS = 300
RETENTION_SECONDS = 86400
CACHE_SECONDS = 5
MODES = ("run", "submit", "recheck", "break_audit", "restore", "unknown")
# Upper bounds in milliseconds; the last bucket covers larger values. The p95
# is an approximate bucket upper bound, not a stored list of individual timings.
BOUNDS_MS = (1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
             30000, 60000, 120000, 300000, 600000, 1800000, 3600000, 86400000, 604800000)
HISTOGRAM_SIZE = len(BOUNDS_MS) + 1
log = logging.getLogger("langwars.telemetry")
_cache = weakref.WeakKeyDictionary()
_cache_lock = threading.Lock()


def _iso(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")


def initialize(tx):
    tx.execute("CREATE TABLE IF NOT EXISTS worker_heartbeats(id TEXT PRIMARY KEY,seen DOUBLE PRECISION NOT NULL,data TEXT NOT NULL)")
    tx.execute("CREATE INDEX IF NOT EXISTS worker_heartbeats_seen ON worker_heartbeats(seen)")
    columns = ",".join(f"{prefix}{index} INTEGER NOT NULL DEFAULT 0" for prefix in ("w", "e") for index in range(HISTOGRAM_SIZE))
    tx.execute("CREATE TABLE IF NOT EXISTS performance_minutes(minute BIGINT NOT NULL,mode TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,failed INTEGER NOT NULL DEFAULT 0,wait_sum DOUBLE PRECISION NOT NULL DEFAULT 0,execution_sum DOUBLE PRECISION NOT NULL DEFAULT 0," + columns + ",PRIMARY KEY(minute,mode))")


def mode_of(job):
    mode = job.get("mode", "unknown")
    return mode if mode in MODES else "unknown"


def _duration(value):
    return max(0.0, float(value)) if isinstance(value, (int, float)) and math.isfinite(value) else 0.0


def record_claim(tx, job, failed=False, now=None):
    """Only call after validating/fencing a running claim in this transaction."""
    claimed = job.get("telemetryClaimedAt")
    if not isinstance(claimed, (int, float)) or not math.isfinite(claimed):
        return  # Existing old-version claims have no trustworthy timing sample.
    use_monotonic = now is None and isinstance(job.get("_telemetryMonotonic"), (int, float))
    now = time.time() if now is None else now
    wait = _duration(job.get("telemetryWaitMs", 0))
    execution = _duration((time.monotonic() - job["_telemetryMonotonic"]) * 1000 if use_monotonic else (now - claimed) * 1000)
    fields = ["completed", "failed", "wait_sum", "execution_sum"]
    values = [0 if failed else 1, 1 if failed else 0, wait, execution]
    for prefix, value in (("w", wait), ("e", execution)):
        bucket = next((index for index, bound in enumerate(BOUNDS_MS) if value <= bound), len(BOUNDS_MS))
        fields.append(prefix + str(bucket))
        values.append(1)
    columns = ["minute", "mode"] + fields
    update = ",".join(name + "=performance_minutes." + name + "+excluded." + name for name in fields)
    tx.execute("INSERT INTO performance_minutes(" + ",".join(columns) + ") VALUES(" + ",".join("?" for _ in columns) + ") ON CONFLICT(minute,mode) DO UPDATE SET " + update,
               [int(now // 60) * 60, mode_of(job)] + values)


def cleanup(tx, now=None):
    now = time.time() if now is None else now
    workers = tx.execute("DELETE FROM worker_heartbeats WHERE seen<?", (now - RETENTION_SECONDS,)).rowcount
    buckets = tx.execute("DELETE FROM performance_minutes WHERE minute<?", (int((now - RETENTION_SECONDS) // 60) * 60,)).rowcount
    return {"workers": workers, "buckets": buckets}


class WorkerHeartbeat:
    """Reports occupancy locally; the heartbeat thread does not share DB handles."""
    def __init__(self, store):
        self.store = store
        self.id = "worker_" + uuid.uuid4().hex
        self.hostname = socket.gethostname()[:128]
        self.pid = os.getpid()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._mode = None
        self._started = None
        self._busy_total = 0.0
        self._completed = 0
        self._sample = None
        self._sample_busy = 0.0
        self._cleanup_at = 0.0
        self._thread = threading.Thread(target=self._run, name="worker-heartbeat", daemon=True)

    def start(self):
        self._thread.start()

    def begin(self, job):
        with self._lock:
            self._mode = mode_of(job)
            self._started = time.monotonic()

    def end(self):
        with self._lock:
            if self._started is not None:
                self._busy_total += max(0, time.monotonic() - self._started)
                self._completed += 1
            self._started = None
            self._mode = None

    def report(self):
        now, tick = time.time(), time.monotonic()
        with self._lock:
            busy_seconds = max(0, tick - self._started) if self._started is not None else 0
            total = self._busy_total + busy_seconds
            elapsed = tick - self._sample if self._sample is not None else 0
            utilization = min(100, max(0, (total - self._sample_busy) / elapsed * 100)) if elapsed > 0 else None
            self._sample, self._sample_busy = tick, total
            value = {"id": self.id, "hostname": self.hostname, "pid": self.pid,
                     "lastSeen": _iso(now), "state": "busy" if self._started is not None else "idle",
                     "mode": self._mode, "busySeconds": busy_seconds, "completed": self._completed,
                     "utilizationPercent": utilization}
        with self.store.transaction() as tx:
            if tx.postgres:
                tx.execute("SET LOCAL lock_timeout = '500ms'")
                tx.execute("SET LOCAL statement_timeout = '2000ms'")
            tx.execute("INSERT INTO worker_heartbeats(id,seen,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET seen=excluded.seen,data=excluded.data", (self.id, now, dumps(value)))
            if now >= self._cleanup_at:
                cleanup(tx, now)
                self._cleanup_at = now + 300

    def _run(self):
        while not self._stop.is_set():
            try:
                self.report()
            except Exception:
                # Database trouble must not interrupt judging or leak a URL.
                log.warning("Worker heartbeat unavailable")
            self._stop.wait(HEARTBEAT_SECONDS)

    def close(self):
        self._stop.set()
        self._thread.join(timeout=3)
        # Abrupt exits age out naturally. Graceful exits are removed promptly.
        try:
            with self.store.transaction() as tx:
                tx.execute("DELETE FROM worker_heartbeats WHERE id=?", (self.id,))
        except Exception:
            log.warning("Worker heartbeat cleanup unavailable")


def _p95(histogram):
    count = sum(histogram)
    if not count:
        return None
    threshold, observed = math.ceil(count * .95), 0
    for index, amount in enumerate(histogram):
        observed += amount
        if observed >= threshold:
            return BOUNDS_MS[index] if index < len(BOUNDS_MS) else BOUNDS_MS[-1]


def _statistics(rows):
    completed = sum(row[2] for row in rows)
    failed = sum(row[3] for row in rows)
    count = completed + failed
    wait = [sum(row[6 + index] for row in rows) for index in range(HISTOGRAM_SIZE)]
    execution = [sum(row[6 + HISTOGRAM_SIZE + index] for row in rows) for index in range(HISTOGRAM_SIZE)]
    return {"completed": completed, "failed": failed, "perMinute": count * 60 / WINDOW_SECONDS,
            "meanWaitMs": sum(row[4] for row in rows) / count if count else None,
            "p95WaitMs": _p95(wait), "p95WaitCapped": bool(count and sum(wait[:-1]) < math.ceil(count * .95)),
            "meanExecutionMs": sum(row[5] for row in rows) / count if count else None,
            "p95ExecutionMs": _p95(execution), "p95ExecutionCapped": bool(count and sum(execution[:-1]) < math.ceil(count * .95))}


def snapshot(store, *, force=False, now=None):
    """Admin-only caller, five-second cache scoped to this application's Store."""
    from .break_audits import MAX_PENDING_AUDITS
    with _cache_lock:
        tick = time.monotonic()
        cached = _cache.get(store)
        if not force and now is None and cached and tick - cached[0] < CACHE_SECONDS:
            return copy.deepcopy(cached[1])
        timestamp = time.time() if now is None else now
        with store.transaction() as tx:
            if tx.postgres:
                tx.execute("SET LOCAL statement_timeout = '3000ms'")
            settings = tx.get("system", "world")["settings"]
            worker_rows = tx.execute("SELECT seen,data FROM worker_heartbeats WHERE seen>=? ORDER BY seen DESC LIMIT 256", (timestamp - RETENTION_SECONDS,)).fetchall()
            workers = []
            for seen, encoded in worker_rows:
                item = json.loads(encoded)
                if timestamp - seen > STALE_AFTER_SECONDS:
                    item.update(state="offline", utilizationPercent=None)
                workers.append(item)
            cutoff = timestamp - max(120, int(os.environ.get("WORKER_TIMEOUT_SECONDS", "20")) * 6)
            queue_rows = tx.execute("SELECT mode,status,COUNT(*),MIN(created),SUM(CASE WHEN id NOT LIKE 'recheck_%' THEN 1 ELSE 0 END),SUM(CASE WHEN status='running' AND lease<? THEN 1 ELSE 0 END),SUM(created) FROM jobs WHERE status IN ('queued','running') GROUP BY mode,status", (cutoff,)).fetchall()
            per_mode = {}
            queued = running = expired = foreground_queued = foreground_running = 0
            oldest, queued_created = 0.0, 0.0
            for mode, status, count, created, foreground, expired_count, total_created in queue_rows:
                mode = mode if mode in MODES else "unknown"
                group = per_mode.setdefault(mode, {"mode": mode, "queued": 0, "running": 0, "oldestWaitSeconds": 0, "meanWaitSeconds": None})
                group[status] += count
                expired += expired_count
                if status == "queued":
                    queued += count
                    foreground_queued += foreground
                    queued_created += total_created
                    age = max(0, timestamp - created)
                    group["meanWaitSeconds"] = max(0, timestamp - total_created / count)
                    group["oldestWaitSeconds"] = max(group["oldestWaitSeconds"], age)
                    oldest = max(oldest, age)
                else:
                    running += count
                    foreground_running += foreground
            columns = ",".join(f"{prefix}{index}" for prefix in ("w", "e") for index in range(HISTOGRAM_SIZE))
            # Five minute buckets, including the current partial minute.
            first_minute = int(timestamp // 60) * 60 - WINDOW_SECONDS + 60
            rows = tx.execute("SELECT minute,mode,completed,failed,wait_sum,execution_sum," + columns + " FROM performance_minutes WHERE minute>=? AND minute<=?", (first_minute, int(timestamp // 60) * 60)).fetchall()
            activity = _statistics(rows)
            activity["byMode"] = [{"mode": mode, **_statistics([row for row in rows if row[1] == mode])} for mode in MODES if any(row[1] == mode for row in rows)]
            audits = tx.list("break_audits")
        audit_times = []
        for audit in audits:
            try:
                audit_times.append(datetime.fromisoformat(audit["createdAt"].replace("Z", "+00:00")).timestamp())
            except (KeyError, TypeError, ValueError):
                continue
        queue_full = foreground_queued + foreground_running >= settings["maxQueuedJobs"]
        comparisons_full = len(audits) >= MAX_PENDING_AUDITS and not settings.get("dependencyCausalChecksEnabled", False)
        result = {"generatedAt": _iso(timestamp), "windowSeconds": WINDOW_SECONDS,
                  "heartbeatSeconds": HEARTBEAT_SECONDS, "staleAfterSeconds": STALE_AFTER_SECONDS,
                  "workers": {"online": sum(item["state"] != "offline" for item in workers), "busy": sum(item["state"] == "busy" for item in workers), "stale": sum(item["state"] == "offline" for item in workers), "items": workers},
                  "queue": {"queued": queued, "running": running, "expired": expired, "capacity": settings["maxQueuedJobs"],
                            "oldestWaitSeconds": oldest, "meanWaitSeconds": max(0, timestamp - queued_created / queued) if queued else None,
                            "foregroundQueued": foreground_queued, "foregroundRunning": foreground_running,
                            "admissionUsed": foreground_queued + foreground_running, "byMode": [per_mode[mode] for mode in MODES if mode in per_mode]},
                  "admission": {"runAllowed": not queue_full, "submitAllowed": not queue_full and not comparisons_full,
                                "reasons": (["QUEUE_FULL"] if queue_full else []) + (["NOTIFICATION_BACKLOG"] if comparisons_full else [])},
                  "activity": activity, "audits": {"pending": len(audits), "remainingCandidates": sum(max(0, audit["total"] - audit["cursor"]) for audit in audits), "capacity": MAX_PENDING_AUDITS,
                  "oldestPendingSeconds": max(0, timestamp - min(audit_times)) if audit_times else None}}
        if now is None:
            _cache[store] = tick, result
        return copy.deepcopy(result)
