"""Small transactional store; PostgreSQL in production, SQLite for local development."""
from __future__ import annotations

import contextlib
import json
import os
import sqlite3
import time
import uuid
from pathlib import Path


def uid(prefix=""):
    return prefix + uuid.uuid4().hex


def dumps(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"), allow_nan=False)


class Tx:
    def __init__(self, connection, postgres):
        self.connection = connection
        self.postgres = postgres

    def execute(self, sql, params=()):
        return self.connection.execute(sql.replace("%", "%%").replace("?", "%s") if self.postgres else sql, params)

    def get(self, kind, key):
        row = self.execute("SELECT data FROM records WHERE kind=? AND id=?", (kind, key)).fetchone()
        return json.loads(row[0]) if row else None

    def put(self, kind, key, value):
        metadata = value if isinstance(value, dict) else {}
        self.execute("INSERT INTO records(kind,id,data,created,user_id,task_id,state,accepted,duration,active) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data,created=excluded.created,user_id=excluded.user_id,task_id=excluded.task_id,state=excluded.state,accepted=excluded.accepted,duration=excluded.duration,active=excluded.active", (kind, key, dumps(value), metadata.get("createdAt", ""), metadata.get("userId", ""), metadata.get("taskId", ""), metadata.get("status", ""), int(metadata.get("everAccepted", False)), metadata.get("durationMs", 0), int(metadata.get("active", True))))
        if kind == "submissions":
            self.execute("DELETE FROM dependencies WHERE submission_id=?", (key,))
            for name in set(metadata.get("dependencies", [])):
                self.execute("INSERT INTO dependencies(name,submission_id) VALUES(?,?) ON CONFLICT(name,submission_id) DO NOTHING", (name, key))

    def delete(self, kind, key):
        self.execute("DELETE FROM records WHERE kind=? AND id=?", (kind, key))
        if kind == "submissions":
            self.execute("DELETE FROM dependencies WHERE submission_id=?", (key,))

    def list(self, kind, limit=None, user_id=None, task_id=None, accepted=None, state=None, before_created=None, before_id=None):
        sql = "SELECT data FROM records WHERE kind=?"
        params = [kind]
        for column, value in [("user_id", user_id), ("task_id", task_id), ("accepted", accepted), ("state", state)]:
            if value is not None:
                sql += " AND " + column + "=?"
                params.append(value)
        if before_created is not None:
            sql += " AND (created<? OR (created=? AND id>?))"
            params.extend([before_created, before_created, before_id])
        sql += " ORDER BY created DESC,id"
        if limit is not None:
            sql += " LIMIT ?"
            params.append(limit)
        return [json.loads(row[0]) for row in self.execute(sql, params).fetchall()]

    def iter_records(self, kind, accepted=None, task_id=None, stable_order=False):
        """Stream large recheck sweeps instead of materializing years of source in memory."""
        sql, params = "SELECT data FROM records WHERE kind=?", [kind]
        for column, value in [("accepted", accepted), ("task_id", task_id)]:
            if value is not None:
                sql += " AND " + column + "=?"
                params.append(value)
        if stable_order:
            # Updating indexed metadata while streaming must not move a row
            # ahead of the cursor. IDs and kind are immutable in these sweeps.
            sql += " ORDER BY id"
        cursor = self.connection.cursor(name="records_" + uuid.uuid4().hex) if self.postgres else self.connection.cursor()
        try:
            cursor.execute(sql.replace("?", "%s") if self.postgres else sql, params)
            while rows := cursor.fetchmany(100):
                for row in rows:
                    yield json.loads(row[0])
        finally:
            cursor.close()

    def world(self):
        suffix = " FOR UPDATE" if self.postgres else ""
        row = self.execute("SELECT data FROM records WHERE kind='system' AND id='world'" + suffix).fetchone()
        return json.loads(row[0])

    def save_world(self, world):
        self.put("system", "world", world)

    def audit(self, actor, action, target="", **details):
        entry = dict(id=uid("aud_"), actorId=actor, action=action, target=target, createdAt=iso(), **details)
        self.put("audit", entry["id"], entry)


def iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class Store:
    def __init__(self, url=None):
        self.url = url or os.environ.get("DATABASE_URL", "sqlite:///./data/langwars.db")
        self.postgres = self.url.startswith(("postgres://", "postgresql://"))
        self.claim_count = 0
        if not self.postgres:
            self.path = self.url.removeprefix("sqlite:///")
            Path(self.path).resolve().parent.mkdir(parents=True, exist_ok=True)

    def connect(self):
        if self.postgres:
            import psycopg
            return psycopg.connect(self.url, connect_timeout=10)
        connection = sqlite3.connect(self.path, timeout=30)
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=30000")
        return connection

    @contextlib.contextmanager
    def transaction(self):
        conn = self.connect()
        try:
            if not self.postgres:
                conn.execute("BEGIN IMMEDIATE")
            yield Tx(conn, self.postgres)
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self):
        from .seed import initial_world, initial_tasks, initial_news, refresh_seed_language_copy, OPERATIONS, LANGUAGE_REVISION, OVERRIDE_DEFAULTS_REVISION
        with self.transaction() as tx:
            if self.postgres:
                tx.execute("SELECT pg_advisory_xact_lock(82317102)")
            tx.execute("CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL DEFAULT '',user_id TEXT NOT NULL DEFAULT '',task_id TEXT NOT NULL DEFAULT '',state TEXT NOT NULL DEFAULT '',accepted INTEGER NOT NULL DEFAULT 0,duration DOUBLE PRECISION NOT NULL DEFAULT 0,PRIMARY KEY(kind,id))")
            if self.postgres:
                tx.execute("ALTER TABLE records ADD COLUMN IF NOT EXISTS active INTEGER NOT NULL DEFAULT 1")
            elif "active" not in {row[1] for row in tx.execute("PRAGMA table_info(records)").fetchall()}:
                tx.execute("ALTER TABLE records ADD COLUMN active INTEGER NOT NULL DEFAULT 1")
            tx.execute("CREATE INDEX IF NOT EXISTS records_active_solutions ON records(kind,user_id,task_id,active,state)")
            tx.execute("CREATE INDEX IF NOT EXISTS records_feed ON records(kind,created DESC)")
            tx.execute("CREATE INDEX IF NOT EXISTS records_feed_cursor ON records(kind,created DESC,id ASC)")
            tx.execute("CREATE INDEX IF NOT EXISTS records_user_task ON records(kind,user_id,task_id,state)")
            tx.execute("CREATE INDEX IF NOT EXISTS records_task ON records(kind,task_id,state)")
            tx.execute("CREATE INDEX IF NOT EXISTS records_accepted ON records(kind,accepted)")
            tx.execute("CREATE INDEX IF NOT EXISTS records_notification_feed ON records(kind,user_id,created DESC,id)")
            tx.execute("CREATE TABLE IF NOT EXISTS dependencies(name TEXT NOT NULL,submission_id TEXT NOT NULL,PRIMARY KEY(name,submission_id))")
            tx.execute("CREATE INDEX IF NOT EXISTS dependencies_submission ON dependencies(submission_id)")
            tx.execute("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,status TEXT NOT NULL,created DOUBLE PRECISION NOT NULL,lease DOUBLE PRECISION NOT NULL DEFAULT 0,data TEXT NOT NULL)")
            tx.execute("CREATE INDEX IF NOT EXISTS jobs_claim ON jobs(status,created)")
            if self.postgres:
                tx.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'unknown'")
            elif "mode" not in {row[1] for row in tx.execute("PRAGMA table_info(jobs)").fetchall()}:
                tx.execute("ALTER TABLE jobs ADD COLUMN mode TEXT NOT NULL DEFAULT 'unknown'")
            tx.execute("CREATE INDEX IF NOT EXISTS jobs_live_modes ON jobs(status,mode,created) WHERE status IN ('queued','running')")
            from .telemetry import initialize as initialize_telemetry
            initialize_telemetry(tx)
            # Only live legacy rows need a mode backfill. Never deserialize years
            # of completed source just to render a performance dashboard.
            cursor = tx.connection.cursor(name="job_modes_" + uuid.uuid4().hex) if tx.postgres else tx.connection.cursor()
            try:
                cursor.execute("SELECT id,data FROM jobs WHERE status IN ('queued','running') AND mode='unknown' ORDER BY id")
                while rows := cursor.fetchmany(100):
                    from .telemetry import mode_of
                    for key, encoded in rows:
                        mode = mode_of(json.loads(encoded))
                        tx.execute("UPDATE jobs SET mode=? WHERE id=?", (mode, key))
            finally:
                cursor.close()
            from .recheck_history import initialize as initialize_rechecks
            initialize_rechecks(tx)
            if not tx.get("system", "world"):
                tx.put("system", "world", initial_world())
                for task in initial_tasks():
                    tx.put("tasks", task["id"], task)
                for news in initial_news():
                    tx.put("news", news["id"], news)
            else:
                world = tx.world()
                from .ownership import remember_owners
                previous_owners = dict(world.get("ownerUsers", {}))
                remember_owners(tx, world)
                defaults = initial_world()["settings"]
                changed = previous_owners != world["ownerUsers"]
                for key, value in defaults.items():
                    if key not in world["settings"]:
                        world["settings"][key] = value
                        changed = True
                if world.get("overrideDefaultsRevision") != OVERRIDE_DEFAULTS_REVISION:
                    # The exact legacy factory policy follows the safer new
                    # default. Preserve custom policies and subsequent opt-ins.
                    if set(world["settings"]["permittedOverrides"]) == set(OPERATIONS):
                        world["settings"]["permittedOverrides"] = list(defaults["permittedOverrides"])
                    world["overrideDefaultsRevision"] = OVERRIDE_DEFAULTS_REVISION
                    changed = True
                if changed:
                    world["version"] += 1
                    tx.save_world(world)
                for seeded in initial_tasks():
                    task = tx.get("tasks", seeded["id"])
                    if task:
                        before_copy = dumps(task)
                        refresh_seed_language_copy(task, seeded)
                        if dumps(task) != before_copy:
                            tx.put("tasks", task["id"], task)
                    if task and not task.get("translations") and all(task.get(key) == seeded.get(key) for key in ("title", "statement", "constraints", "examples", "tests")):
                        task["translations"] = seeded["translations"]
                        tx.put("tasks", task["id"], task)
                if world.get("languageRevision") != LANGUAGE_REVISION:
                    from .worker import schedule_rechecks
                    world["languageRevision"] = LANGUAGE_REVISION
                    world["version"] += 1
                    tx.save_world(world)
                    schedule_rechecks(tx, {}, world, all_submissions=True)
            from .scoring import backfill_gameplay
            backfill_gameplay(tx)

    def claim(self):
        with self.transaction() as tx:
            # Expired jobs are retried. Every publication/result commit verifies lease ownership.
            cutoff = time.time() - max(120, int(os.environ.get("WORKER_TIMEOUT_SECONDS", "20")) * 6)
            tx.execute("UPDATE jobs SET status='queued' WHERE status='running' AND lease<?", (cutoff,))
            suffix = " FOR UPDATE SKIP LOCKED" if self.postgres else ""
            # Reserve one claim in four for deduplicated rechecks; players keep the other slots.
            self.claim_count += 1
            prefer_recheck = self.claim_count % 4 == 0
            order = "CASE WHEN id LIKE 'recheck_%' THEN " + ("0 ELSE 1" if prefer_recheck else "1 ELSE 0") + " END,created"
            row = tx.execute("SELECT id,data,created FROM jobs WHERE status='queued' ORDER BY " + order + " LIMIT 1" + suffix).fetchone()
            if not row:
                return None
            lease = time.time()
            job = json.loads(row[1])
            job["lease"] = lease
            job["telemetryClaimedAt"] = lease
            job["telemetryWaitMs"] = max(0, (lease - row[2]) * 1000)
            from .telemetry import mode_of
            tx.execute("UPDATE jobs SET status='running',lease=?,data=?,mode=? WHERE id=?", (lease, dumps(job), mode_of(job), row[0]))
            job["_telemetryMonotonic"] = time.monotonic()
            return job
