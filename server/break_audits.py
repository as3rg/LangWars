"""Exact causal comparisons, independent of coalesced latest-world rechecks.

Immutable worlds are stored once per pending publication, not per victim. Capacity
backpressure prevents unbounded snapshot accumulation. One victim is processed per
claim so two sandbox timeouts fit inside the queue's fenced lease.
"""
import hashlib
import time

from .notifications import event, reconcile_solution
from .store import dumps, iso

MAX_PENDING_AUDITS = 32


def fingerprint(task):
    return hashlib.sha256(dumps({"tests": task["tests"], "timeLimitMs": task.get("timeLimitMs", 1000)}).encode()).hexdigest()


def capacity_available(tx):
    return tx.execute("SELECT count(*) FROM records WHERE kind='break_audits'").fetchone()[0] < MAX_PENDING_AUDITS


def schedule(tx, before, after, submission, candidate_ids):
    if not candidate_ids:
        return
    key = submission["id"]
    record = {"id": key, "userId": submission["userId"], "submissionId": key,
              "createdAt": iso(), "version": after["version"], "total": len(set(candidate_ids)), "cursor": 0,
              "taskHashes": {task["id"]: fingerprint(task) for task in tx.list("tasks")}, "brokenUserIds": []}
    tx.put("break_snapshots", key, {"before": before, "after": after})
    for index, identifier in enumerate(sorted(set(candidate_ids))):
        tx.put("break_candidates", key + ":" + str(index), {"submissionId": identifier, "userId": identifier})
    tx.put("break_audits", key, record)
    job = {"id": "recheck_audit_" + key, "mode": "break_audit", "auditId": key, "userId": submission["userId"], "createdAt": iso()}
    tx.execute("INSERT INTO jobs(id,user_id,status,created,data,mode) VALUES(?,?,'queued',?,?,'break_audit')", (job["id"], job["userId"], time.time(), dumps(job)))


def process(store, job):
    from .worker import finish, lease_valid, options_for, sandbox
    with store.transaction() as tx:
        if not lease_valid(tx, job):
            return
        audit = tx.get("break_audits", job["auditId"])
        if not audit:
            finish(tx, job, result={"complete": True})
            return
        candidate_key = audit["id"] + ":" + str(audit["cursor"])
        candidate = tx.get("break_candidates", candidate_key)
        victim = tx.get("submissions", candidate["submissionId"]) if candidate else None
        task = tx.get("tasks", victim["taskId"]) if victim else None
        source = tx.get("submissions", audit["submissionId"])
        snapshots = tx.get("break_snapshots", audit["id"])
    before_pass = after_pass = None
    comparisons = []
    if (victim and task and source and snapshots and
            audit["taskHashes"].get(task["id"]) == fingerprint(task)):
        outcomes = []
        for world in (snapshots["before"], snapshots["after"]):
            options = options_for(world, task)
            options.update(read_only=True, overlay_names=[name for name, owner in world.get("owners", {}).items() if owner != victim["id"]],
                           allowed_words=None, max_name_length=None, max_names=None, deny_words=[],
                           permitted_overrides=["eq", "cmp", "cast", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat"], max_overrides=1000)
            result = sandbox({"code": victim["code"], "tests": task["tests"], "snapshot": world["snapshot"], "options": options})
            comparisons.append((world["version"], result))
            outcomes.append(result.get("status") == "OK" if isinstance(result, dict) and not result.get("sandboxError") else None)
        before_pass, after_pass = outcomes
    with store.transaction() as tx:
        world = tx.world()
        if not lease_valid(tx, job):
            return
        latest = tx.get("break_audits", audit["id"])
        if not latest or latest["cursor"] != audit["cursor"]:
            return
        source = tx.get("submissions", audit["submissionId"])
        recipient = tx.get("users", victim["userId"]) if victim else None
        current_victim = tx.get("submissions", victim["id"]) if victim else None
        current_task = tx.get("tasks", victim["taskId"]) if victim else None
        task_unchanged = current_task and fingerprint(current_task) == audit["taskHashes"].get(victim["taskId"])
        if current_victim and task_unchanged:
            from .recheck_history import record
            for kind, (version, result) in zip(("causal_before", "causal_after"), comparisons):
                record(tx, job, current_victim, current_task, result, kind, world_version=version,
                       previous_status=victim["status"], cause_submission_id=audit["submissionId"])
        if source and recipient and not recipient.get("banned") and current_victim and task_unchanged:
            fields = {"taskId": task["id"], "taskTitle": task["title"], "submissionId": victim["id"],
                      "occurredAt": audit["createdAt"], "historical": world["version"] != audit["version"] or not current_victim.get("active", True)}
            if before_pass is True and after_pass is False:
                event(tx, victim["userId"], "broken", "broken:" + audit["id"] + ":" + victim["id"], actorUserId=source["userId"], **fields)
                if victim["userId"] != source["userId"]:
                    latest["brokenUserIds"] = sorted(set(latest["brokenUserIds"]) | {victim["userId"]})
                    source["brokenUserIds"] = sorted(set(source.get("brokenUserIds", [])) | {victim["userId"]})
                    tx.put("submissions", source["id"], source)
            elif before_pass is False and after_pass is True:
                event(tx, victim["userId"], "repaired", "repaired:" + audit["id"] + ":" + victim["id"], **fields)
            if before_pass is not None and after_pass is not None and before_pass != after_pass:
                old_version = current_victim.get("notificationState", {}).get("version", -1)
                if audit["version"] >= old_version:
                    current_victim["notificationState"] = {"passing": after_pass, "version": audit["version"]}
                    tx.put("submissions", current_victim["id"], current_victim)
        latest["cursor"] += 1
        tx.delete("break_candidates", candidate_key)
        if current_victim and task:
            reconcile_solution(tx, current_victim, task)
        if latest["cursor"] >= latest["total"]:
            if source and latest["brokenUserIds"]:
                event(tx, source["userId"], "breaking", "breaking:" + source["id"], taskId=source["taskId"], taskTitle=source["taskTitle"], submissionId=source["id"], impactedUserIds=latest["brokenUserIds"], occurredAt=audit["createdAt"])
            tx.delete("break_audits", latest["id"])
            tx.delete("break_snapshots", latest["id"])
            finish(tx, job, result={"complete": True})
        else:
            from .telemetry import record_claim
            record_claim(tx, job)
            tx.put("break_audits", latest["id"], latest)
            queued = dict(job)
            queued.pop("lease", None)
            queued.pop("_telemetryMonotonic", None)
            tx.execute("UPDATE jobs SET status='queued',created=?,lease=0,data=? WHERE id=? AND lease=?", (time.time(), dumps(queued), job["id"], job["lease"]))
