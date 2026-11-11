"""Durable, account-scoped events and read-time privacy projections."""
import hashlib
import re

from .store import iso

SOLUTION_KINDS = {"accepted", "rejected", "broken", "repaired", "breaking"}
GENERIC_KINDS = {"info", "success", "error"}
MAX_HISTORY = 500
PUBLIC_EVENT_FIELDS = {"id", "kind", "createdAt", "read", "taskId", "taskTitle", "submissionId", "verdictStatus", "occurredAt", "historical"}
EVENT_DETAILS = PUBLIC_EVENT_FIELDS - {"id", "kind", "createdAt", "read"}
PRIVATE_SUBMISSION_FIELDS = {"dependencyRevision", "brokenUserIds", "brokenSubmissionIds", "impactedUserIds", "notificationState", "actorUserId", "actorSubmissionId", "causeSubmissionId", "breakAuditId", "before", "after", "snapshot", "breaker", "breakImpact"}
LEGACY_PRIVATE_NOTICES = {"Code is private to its author.", "Код доступен только автору."}
LEGACY_RUN_NOTICE = re.compile(r"(?:Sample run|Примеры): (?:OK|FAIL|CE|TLE|MLE|RE|WRONG_ANSWER|BROKEN)")


def mark_read(tx, user_id, identifiers=None):
    """One account-scoped update; repeated requests never rewrite read events."""
    if identifiers == []:
        return 0
    if tx.postgres:
        update = "jsonb_set(data::jsonb, '{read}', 'true'::jsonb)::text"
        unread = "COALESCE(data::jsonb->>'read', 'false')='false'"
    else:
        update = "json_set(data, '$.read', json('true'))"
        unread = "COALESCE(json_extract(data, '$.read'), 0)=0"
    sql = "UPDATE records SET data=" + update + " WHERE kind='notifications' AND user_id=? AND " + unread
    params = [user_id]
    if identifiers is not None:
        sql += " AND id IN (" + ",".join("?" for _ in identifiers) + ")"
        params.extend(identifiers)
    return tx.execute(sql, params).rowcount


def _people(tx):
    # Scope the cache to one transaction: no stale names across requests/renames,
    # and a page of events does not perform a query for every actor/recipient.
    if not hasattr(tx, "notification_people"):
        tx.notification_people = {user["id"]: {"userId": user["id"], "username": user["username"]} for user in tx.list("users")}
    return tx.notification_people


def _ids(value):
    return {identifier for identifier in value if isinstance(identifier, str)} if isinstance(value, (list, tuple, set)) else set()


def event(tx, user_id, kind, key, **fields):
    """Call while holding the world's publication lock or recipient account lock.

    The deterministic ID makes retries preserve read state. Callers cannot replace
    identity/read metadata through additional fields. Server solution events store
    structured facts; only generic client notices may store a rendered message.
    """
    if kind not in SOLUTION_KINDS | GENERIC_KINDS:
        raise ValueError("Unknown notification kind")
    identifier = "ntf_" + hashlib.sha256((user_id + ":" + key).encode()).hexdigest()[:40]
    old = tx.get("notifications", identifier)
    if old:
        return old
    details = {name: item for name, item in fields.items() if name in EVENT_DETAILS}
    if kind == "broken" and isinstance(fields.get("actorUserId"), str):
        details["actorUserId"] = fields["actorUserId"]
    if kind == "breaking":
        details["impactedUserIds"] = sorted(_ids(fields.get("impactedUserIds", [])))
    if kind in GENERIC_KINDS:
        message = fields.get("message", "")
        if not isinstance(message, str) or len(message) > 2000:
            raise ValueError("Notification message exceeds its limit")
        details["message"] = message
    value = {"id": identifier, "userId": user_id, "kind": kind, "createdAt": iso(), "read": False, **details}
    tx.put("notifications", identifier, value)
    for row in tx.execute("SELECT id FROM records WHERE kind='notifications' AND user_id=? ORDER BY created DESC,id LIMIT 1000000 OFFSET ?", (user_id, MAX_HISTORY)).fetchall():
        tx.delete("notifications", row[0])
    return value


def impact(tx, user_ids, settings):
    mode = settings.get("breakImpactVisibility", "count")
    if mode == "hidden":
        return None
    identifiers = _ids(user_ids)
    result = {"userCount": len(identifiers)}
    if mode == "usernames":
        people = _people(tx)
        result["usernames"] = sorted({people[identifier]["username"] for identifier in identifiers if identifier in people})
    return result


def project(tx, value, settings, viewer=None):
    if viewer is not None and viewer.get("id") != value.get("userId"):
        return None
    kind = value["kind"]
    if kind in GENERIC_KINDS:
        message = value.get("message", "")
        if isinstance(message, str) and (message in LEGACY_PRIVATE_NOTICES or LEGACY_RUN_NOTICE.fullmatch(message)):
            return None
    if kind in SOLUTION_KINDS and not settings.get("solutionNotificationsEnabled", True):
        return None
    if kind == "breaking" and settings.get("breakImpactVisibility", "count") == "hidden":
        return None
    result = {key: item for key, item in value.items() if key in PUBLIC_EVENT_FIELDS}
    if kind in GENERIC_KINDS and isinstance(value.get("message"), str):
        result["message"] = value["message"]
    if kind == "broken" and value.get("actorUserId") and settings.get("showBreakerIdentity", False):
        actor = _people(tx).get(value["actorUserId"])
        if actor:
            result["breaker"] = dict(actor)
    if kind == "breaking" and "impactedUserIds" in value:
        visible = impact(tx, value["impactedUserIds"], settings)
        if visible is not None:
            result["impact"] = visible
    return result


def project_submission(tx, value, settings, viewer=None):
    result = {key: item for key, item in value.items() if key not in PRIVATE_SUBMISSION_FIELDS}
    if value.get("everAccepted") and value["status"] not in ("OK", "BROKEN"):
        result.update(status="BROKEN", verdictStatus=value["status"])
    if result.get("status") == "OK" and result.get("verdictStatus") == "BROKEN":
        result["verdictStatus"] = "OK"
    privileged = bool(viewer and (viewer.get("id") == value.get("userId") or viewer.get("role") == "admin"))
    if privileged and value.get("brokenUserIds"):
        visible = impact(tx, value["brokenUserIds"], settings)
        if visible is not None:
            result["breakImpact"] = visible
    return result


def reconcile_solution(tx, sub, task):
    """Emit any latest-state transition not already explained by an exact audit.

    Audits may finish out of order. Defer until all exact comparisons for this
    solution have completed, and never overwrite a notification baseline with an
    older world version. The caller holds the world's commit lock.
    """
    if not sub or not task or not sub.get("active", True) or not tx.get("submissions", sub["id"]):
        return None
    recipient = tx.get("users", sub["userId"])
    if not recipient or recipient.get("banned"):
        return None
    if tx.execute("SELECT 1 FROM records WHERE kind='break_candidates' AND user_id=? LIMIT 1", (sub["id"],)).fetchone():
        return None
    version = sub.get("worldVersion", 0)
    state = sub.get("notificationState") or {"passing": True, "version": -1}
    if version < state["version"]:
        return None
    passing = sub["status"] == "OK"
    notice = None
    if passing != state["passing"]:
        notice = event(tx, sub["userId"], "repaired" if passing else "broken", "system:" + sub["id"] + ":" + str(version),
                       taskId=task["id"], taskTitle=task["title"], submissionId=sub["id"],
                       occurredAt=sub.get("recheckedAt", iso()), verdictStatus=sub.get("verdictStatus", sub["status"]))
    sub["notificationState"] = {"passing": passing, "version": version}
    tx.put("submissions", sub["id"], sub)
    return notice
