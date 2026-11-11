"""Bounded administrative judge history; endpoints must authorize administrators."""
import hashlib
import json
import math
from datetime import datetime, timedelta, timezone

from .store import dumps, iso

MAX_RUNS_PER_SUBMISSION = 200


def initialize(tx):
    tx.execute("CREATE TABLE IF NOT EXISTS recheck_runs(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL,cause_submission_id TEXT NOT NULL,created TEXT NOT NULL,data TEXT NOT NULL)")
    tx.execute("CREATE INDEX IF NOT EXISTS recheck_runs_target ON recheck_runs(submission_id,created DESC,id)")
    tx.execute("CREATE INDEX IF NOT EXISTS recheck_runs_cause ON recheck_runs(cause_submission_id,created DESC,id)")


def record(tx, job, submission, task, result, kind="live", *, world_version, previous_status=None, cause_submission_id=None):
    if kind not in ("live", "causal_before", "causal_after"):
        raise ValueError("Unknown recheck kind")
    cause = cause_submission_id or job.get("causeSubmissionId") or ""
    identity = dumps([job["id"], job.get("lease"), submission["id"], cause, kind, world_version])
    identifier = "rck_" + hashlib.sha256(identity.encode()).hexdigest()[:40]
    old = tx.execute("SELECT data FROM recheck_runs WHERE id=?", (identifier,)).fetchone()
    if old:
        return json.loads(old[0])
    completed = isinstance(result, dict) and not result.get("sandboxError")
    result = result if completed else {}
    verdict = result.get("verdictStatus", result.get("status", "UNAVAILABLE"))
    tests = result.get("tests", [])
    durations = [test.get("durationMs", 0) for test in tests if isinstance(test, dict)]
    duration = sum(value for value in durations if isinstance(value, (int, float)) and math.isfinite(value) and value >= 0)
    diagnostics = [
        {"code": str(item.get("code", ""))[:80], "message": str(item.get("message", ""))[:1000]}
        for item in result.get("diagnostics", [])[:8] if isinstance(item, dict)
    ]
    if not completed:
        diagnostics = [{"code": "SANDBOX_UNAVAILABLE", "message": "The sandbox did not return a verdict"}]
    now = iso()
    value = {"id": identifier, "submissionId": submission["id"], "taskId": task["id"], "taskTitle": task.get("title", task["id"]),
             "userId": submission["userId"], "causeSubmissionId": cause or None, "kind": kind,
             "worldVersion": world_version, "createdAt": now, "finishedAt": now,
             "status": "OK" if verdict == "OK" else "BROKEN" if completed and submission.get("everAccepted") else "FAIL",
             "verdictStatus": verdict, "previousStatus": previous_status, "completed": completed,
             "testsPassed": sum(bool(test.get("passed")) for test in tests if isinstance(test, dict)),
             "testsTotal": len(tests), "durationMs": duration, "diagnostics": diagnostics}
    tx.execute("INSERT INTO recheck_runs(id,submission_id,cause_submission_id,created,data) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING", (identifier, submission["id"], cause, now, dumps(value)))
    tx.execute("DELETE FROM recheck_runs WHERE id IN (SELECT id FROM recheck_runs WHERE submission_id=? ORDER BY created DESC,id LIMIT 1000000 OFFSET ?)", (submission["id"], MAX_RUNS_PER_SUBMISSION))
    return value


def page(tx, *, submission_id=None, cause_submission_id=None, cursor=None, limit=50):
    if not submission_id and not cause_submission_id:
        raise ValueError("Select a submission or a causing publication")
    if type(limit) is not int or not 1 <= limit <= 100:
        raise ValueError("Recheck page size must be between 1 and 100")
    sql, params = "SELECT data FROM recheck_runs WHERE 1=1", []
    for column, value in (("submission_id", submission_id), ("cause_submission_id", cause_submission_id)):
        if value:
            sql += " AND " + column + "=?"
            params.append(value)
    if cursor is not None:
        if not isinstance(cursor, dict) or set(cursor) != {"beforeCreated", "beforeId"} or not all(isinstance(value, str) for value in cursor.values()):
            raise ValueError("Invalid recheck cursor")
        sql += " AND (created<? OR (created=? AND id>?))"
        params.extend([cursor["beforeCreated"], cursor["beforeCreated"], cursor["beforeId"]])
    sql += " ORDER BY created DESC,id LIMIT ?"
    params.append(limit + 1)
    items = [json.loads(row[0]) for row in tx.execute(sql, params).fetchall()]
    more = len(items) > limit
    items = items[:limit]
    last = items[-1] if items else None
    return {"items": items, "nextCursor": {"beforeCreated": last["createdAt"], "beforeId": last["id"]} if more and last else None}


def cleanup(tx, days=90):
    if type(days) is not int or days < 1:
        raise ValueError("Retention must be a positive number of days")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+00:00", "Z")
    return tx.execute("DELETE FROM recheck_runs WHERE created<? OR submission_id NOT IN (SELECT id FROM records WHERE kind='submissions')", (cutoff,)).rowcount
