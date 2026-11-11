"""Durable PostgreSQL work queue with fenced leases and optimistic world publication."""
from __future__ import annotations

import copy
import json
import logging
import os
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

from .auth import prohibited
from .store import Store, dumps, iso, uid
from .scoring import refresh_ratings

log = logging.getLogger("langwars.worker")


def diagnostic(message, code="PLATFORM_POLICY"):
    return {"severity": "error", "message": message, "code": code, "addonId": "core", "from": 0, "to": 0}


def failure(message, status="CE", code="PLATFORM_POLICY"):
    return {"status": status, "tests": [], "stdout": "", "diagnostics": [diagnostic(message, code)], "changes": {}, "names": [], "dependencies": []}


def sandbox(payload, timeout=None):
    # Deliberately omit DATABASE_URL, bootstrap credentials, user sessions, and host PYTHONPATH.
    env = {key: os.environ[key] for key in ("SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP") if key in os.environ}
    env.update(PYTHONIOENCODING="utf-8", PYTHONHASHSEED="0", PYTHONDONTWRITEBYTECODE="1", LANGWARS_MEMORY_MB=os.environ.get("WORKER_MEMORY_MB", "256"))
    limit = timeout or float(os.environ.get("WORKER_TIMEOUT_SECONDS", "20"))
    try:
        with tempfile.TemporaryFile() as source:
            source.write(dumps(payload).encode())
            source.seek(0)
            child = subprocess.Popen([sys.executable, "-m", "server.sandbox"], stdin=source,
                                     stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                     cwd=str(Path(__file__).resolve().parent.parent), env=env)
            captured = []
            def collect():
                data = child.stdout.read(8 * 1024 * 1024 + 1)
                captured.append(data)
                if len(data) > 8 * 1024 * 1024:
                    child.kill()
            reader = threading.Thread(target=collect, daemon=True)
            reader.start()
            try:
                child.wait(timeout=limit)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
                reader.join(timeout=1)
                return None
            reader.join(timeout=1)
            child.stdout.close()
            if child.returncode or not captured or len(captured[0]) > 8 * 1024 * 1024:
                return None
            return json.loads(captured[0])
    except (subprocess.TimeoutExpired, ValueError, OSError):
        return None


def options_for(world, task):
    settings = world["settings"]
    return {"allowed_words": task.get("allowedWords") if task.get("allowedWords") is not None else settings["allowedWords"],
            "max_name_length": settings["maxNameLength"],
            "deny_words": settings["denyWords"], "permitted_overrides": settings["permittedOverrides"],
            "max_overrides": task.get("coreOverrideLimit") if task.get("coreOverrideLimit") is not None else settings["defaultCoreOverrideLimit"],
            "max_names": task.get("namePublishLimit") if task.get("namePublishLimit") is not None else settings.get("defaultTaskNameLimit", 30),
            "cheap_invariants": settings.get("cheapInvariantChecksEnabled", False),
            "max_steps": max(10000, min(task.get("timeLimitMs", 1000) * 200, 1000000)),
            "max_cells": 100000, "timeout_ms": task.get("timeLimitMs", 1000)}


def merged_snapshot(snapshot, changes):
    merged = copy.deepcopy(snapshot)
    for section in ("variables", "functions", "last"):
        merged.setdefault(section, {}).update(changes.get(section, {}))
    for name in changes.get("variables", {}):
        merged["functions"].pop(name, None)
        merged["last"].pop(name, None)
    for name in changes.get("functions", {}):
        merged["variables"].pop(name, None)
    return merged


def changed_names(changes):
    return set(changes.get("variables", {})) | set(changes.get("functions", {})) | set(changes.get("last", {}))


def effective_changes(snapshot, changes):
    """Only semantic differences invalidate earlier solutions; ownership still records all writes."""
    return {section: {name: value for name, value in changes.get(section, {}).items() if name not in snapshot.get(section, {}) or snapshot[section][name] != value} for section in ("variables", "functions", "last")}


def redact_tests(result, task, admin=False):
    clean = copy.deepcopy(result)
    for key in ("changes", "dependencies", "names", "snapshot"):
        clean.pop(key, None)
    for index, test in enumerate(clean.get("tests", [])):
        if not admin and index < len(task["tests"]) and task["tests"][index].get("hidden"):
            clean["tests"][index] = {"name": f"Hidden test {index + 1}", "input": "<hidden>", "expected": "<hidden>", "passed": bool(test.get("passed")), "durationMs": test.get("durationMs", 0)}
    return clean


def ranking(tx, user_id):
    users = sorted([u for u in tx.list("users") if not u.get("banned")], key=lambda u: (-u["rating"], u["createdAt"]))
    return next((i + 1 for i, user in enumerate(users) if user["id"] == user_id), 0)


def recheck_candidates(tx, changes, world, exclude=None, all_submissions=False, task_id=None, retiring=None):
    """Select affected solutions without executing any player code under the lock."""
    names = changed_names(changes)
    core_changed = any(function.get("annotation") not in (None, "solution") for definition in changes.get("functions", {}).values() for function in (definition if isinstance(definition, list) else [definition]))
    selective = world["settings"].get("dependencyCausalChecksEnabled", False)
    pending = set()
    if selective:
        # Dispatch can change even when no source name is explicitly called.
        for name in tuple(names):
            for snapshot in (world["snapshot"], changes):
                definition = snapshot.get("functions", {}).get(name)
                for function in definition if isinstance(definition, list) else [definition]:
                    if function and function.get("annotation") not in (None, "solution"):
                        names.add("@" + function["annotation"])
        if changes.get("functions") or changes.get("variables"):
            names.add("@control")
    if all_submissions or (core_changed and not selective):
        candidates = tx.iter_records("submissions", accepted=1, task_id=task_id)
    else:
        candidate_ids = set()
        for name in names:
            candidate_ids.update(row[0] for row in tx.execute("SELECT submission_id FROM dependencies WHERE name=?", (name,)).fetchall())
        if selective and names:
            # An earlier relevant publication may change which branch is read.
            # Its graph is stale until the outstanding live recheck completes.
            pending = {row[0][len("recheck_"):] for row in tx.execute("SELECT id FROM jobs WHERE mode='recheck' AND status IN ('queued','running')").fetchall()}
            candidate_ids.update(pending)
        if core_changed:
            # Older judges did not record implicit casts or dispatch targets.
            # Keep their previous broad behavior until a live recheck refreshes them.
            candidate_ids.update(sub["id"] for sub in tx.iter_records("submissions", accepted=1, task_id=task_id)
                                 if sub.get("dependencyRevision") != 1)
        candidates = (tx.get("submissions", key) for key in candidate_ids)
    for sub in candidates:
        if not sub:
            continue
        if sub["id"] == exclude or not sub.get("everAccepted") or not sub.get("active", True):
            continue
        if task_id is not None and sub["taskId"] != task_id:
            continue
        if retiring and (sub["userId"], sub["taskId"]) == retiring:
            continue
        legacy_core = core_changed and sub.get("dependencyRevision") != 1
        if not all_submissions and sub["id"] not in pending and not (core_changed and (not selective or legacy_core)) and not names.intersection(sub.get("dependencies", [])):
            continue
        yield sub


def schedule_rechecks(tx, changes, world, exclude=None, all_submissions=False, task_id=None, cause_submission_id=None):
    now = time.time()
    scheduled = []
    for sub in recheck_candidates(tx, changes, world, exclude, all_submissions, task_id):
        job_id = "recheck_" + sub["id"]
        job = {"id": job_id, "userId": sub["userId"], "taskId": sub["taskId"], "submissionId": sub["id"],
               "code": sub["code"], "mode": "recheck", "languageVersion": sub["languageVersion"],
               "createdAt": iso(), "requestedVersion": world["version"]}
        if cause_submission_id:
            job["causeSubmissionId"] = cause_submission_id
        # A newer world invalidates any in-flight lease, so its result cannot overwrite this request.
        tx.execute("INSERT INTO jobs(id,user_id,status,created,lease,data,mode) VALUES(?,?,'queued',?,0,?,'recheck') ON CONFLICT(id) DO UPDATE SET status='queued',created=excluded.created,lease=0,data=excluded.data,mode=excluded.mode", (job_id, sub["userId"], now, dumps(job)))
        scheduled.append(sub["id"])
    return scheduled


def lease_valid(tx, job):
    # Fence the entire enclosing transaction: reclamation cannot change this lease
    # between the check and world publication, even if its timeout elapses meanwhile.
    suffix = " FOR UPDATE" if tx.postgres else ""
    row = tx.execute("SELECT status,lease FROM jobs WHERE id=?" + suffix, (job["id"],)).fetchone()
    return bool(row and row[0] == "running" and row[1] == job["lease"])


def finish(tx, job, result=None, error=None):
    if not lease_valid(tx, job):
        return False
    completed = dict(job)
    completed.pop("_telemetryMonotonic", None)
    completed.pop("code", None)
    completed["finishedAt"] = iso()
    if result is not None:
        completed["result"] = result
    if error:
        completed["error"] = error
    updated = tx.execute("UPDATE jobs SET status=?,data=? WHERE id=? AND lease=?", ("failed" if error else "completed", dumps(completed), job["id"], job["lease"]))
    if updated.rowcount == 1:
        from .telemetry import record_claim
        record_claim(tx, job, failed=bool(error))
    return updated.rowcount == 1


def publication_errors(world, result, task):
    errors = sandbox({"action": "validate", "snapshot": world["snapshot"], "changes": result.get("changes", {}), "options": options_for(world, task)})
    if errors is None:
        return [diagnostic("Contract validation exceeded the execution budget", "CONTRACT_BUDGET")]
    if not isinstance(errors, list):
        return [diagnostic("Contract validation could not complete", "CONTRACT_BUDGET")]
    return errors


def process_restore(store, job):
    for attempt in range(5):
        with store.transaction() as tx:
            if not lease_valid(tx, job):
                return
            world = tx.get("system", "world")
            user = tx.get("users", job["userId"])
            if not user or user.get("banned") or user["role"] != "admin":
                finish(tx, job, error={"code": "FORBIDDEN", "message": "Administrator access is no longer available"})
                return
        candidate = copy.deepcopy(world)
        removed = []
        for name, definition in list(candidate["snapshot"]["functions"].items()):
            definitions = definition if isinstance(definition, list) else [definition]
            keep = []
            for function in definitions:
                annotation = function.get("annotation") or function.get("decorator")
                operation = annotation.get("name") if isinstance(annotation, dict) else annotation
                if operation in job["operations"]:
                    removed.append(name)
                else:
                    keep.append(function)
            if not keep:
                del candidate["snapshot"]["functions"][name]
                candidate["snapshot"]["last"].pop(name, None)
                candidate["owners"].pop(name, None)
                candidate.setdefault("ownerUsers", {}).pop(name, None)
            elif isinstance(definition, list):
                candidate["snapshot"]["functions"][name] = keep
        opts = options_for(candidate, {"coreOverrideLimit": 1000})
        opts["permitted_overrides"] = []
        errors = sandbox({"action": "validate", "snapshot": candidate["snapshot"], "changes": {}, "options": opts})
        with store.transaction() as tx:
            latest = tx.world()
            if not lease_valid(tx, job):
                return
            current_user = tx.get("users", job["userId"])
            if not current_user or current_user.get("banned") or current_user["role"] != "admin":
                finish(tx, job, error={"code": "FORBIDDEN", "message": "Administrator access is no longer available"})
                return
            if latest["version"] != world["version"]:
                continue
            if errors is None or errors:
                finish(tx, job, error={"code": "CONTRACT_CONFLICT", "message": "Restoring those operations would violate another active contract; restore related operations together"})
                return
            candidate["version"] += 1
            tx.save_world(candidate)
            schedule_rechecks(tx, {}, candidate, all_submissions=True)
            tx.audit(job["userId"], "restore_overrides", operations=job["operations"])
            finish(tx, job, result={"restored": job["operations"], "version": candidate["version"]})
            return
    with store.transaction() as tx:
        finish(tx, job, error={"code": "WORLD_BUSY", "message": "The world changed repeatedly; try again"})


def process_job(store, job):
    if job["mode"] == "break_audit":
        from .break_audits import process
        return process(store, job)
    if job["mode"] == "restore":
        return process_restore(store, job)
    for attempt in range(5):
        with store.transaction() as tx:
            if not lease_valid(tx, job):
                return
            world = tx.get("system", "world")
            task = tx.get("tasks", job["taskId"])
            user = tx.get("users", job["userId"])
            if not task or not user or user.get("banned"):
                finish(tx, job, error={"code": "UNAVAILABLE", "message": "The task or account is no longer available"})
                return
            sub = tx.get("submissions", job.get("submissionId", "")) if job["mode"] == "recheck" else None
            if job["mode"] == "recheck" and not sub:
                finish(tx, job, error={"code": "NOT_FOUND", "message": "Submission no longer exists"})
                return
            if sub and not sub.get("active", True):
                finish(tx, job, result={"status": "RETIRED", "submissionId": sub["id"]})
                return
        options = options_for(world, task)
        if sub:
            options.update(read_only=True, overlay_names=[name for name, owner in world.get("owners", {}).items() if owner != sub["id"]])
            # Previously accepted code remains eligible after administrative dictionary changes.
            options["allowed_words"] = None
            options["max_name_length"] = None
            options["deny_words"] = []
            options["permitted_overrides"] = ["eq", "cmp", "cast", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat"]
            options["max_overrides"] = 1000
            options["max_names"] = None
        tests = [t for t in task["tests"] if not t.get("hidden")] if job["mode"] == "run" else task["tests"]
        if prohibited(job["code"], world["settings"]["denyWords"]) and not sub:
            result = failure("Code contains a word blocked by the platform", code="DENIED_WORD")
        else:
            result = sandbox({"code": job["code"], "tests": tests, "snapshot": world["snapshot"], "options": options})
            sandbox_result = result
            if not isinstance(result, dict) or result.get("sandboxError"):
                result = failure("Execution exceeded the worker budget", "TLE", "EXECUTION_BUDGET")
        result.setdefault("tests", [])
        result.setdefault("diagnostics", [])
        result.setdefault("stdout", "")
        names = set(result.get("names", []))
        if not sub and len(set(user.get("claimedNames", [])) | names) > user["nameLimit"]:
            result = failure(f"This program exceeds your limit of {user['nameLimit']} unique names", code="NAME_LIMIT")
        task_names = set(user.get("taskClaimedNames", {}).get(task["id"], []))
        if not sub and len(task_names | names) > options["max_names"]:
            result = failure(f"This task permits at most {options['max_names']} unique published names", code="TASK_NAME_LIMIT")
        if job["mode"] == "submit" and result.get("status") == "OK":
            errors = publication_errors(world, result, task)
            if errors:
                result.update(status="CE", diagnostics=errors, changes={})
            candidate = merged_snapshot(world["snapshot"], result.get("changes", {}))
            if len(dumps(candidate)) > 4 * 1024 * 1024 or len(set(candidate["variables"]) | set(candidate["functions"])) > 20000:
                result = failure("The shared world has reached its size limit; reuse existing names or ask an administrator to restore definitions", code="WORLD_LIMIT")
            else:
                from .world_limits import account_growth_allowed
                if not account_growth_allowed(world, candidate, result.get("changes", {}), user["id"]):
                    result = failure("Your published world data exceeds 512 KiB; reuse names with smaller definitions or values", code="WORLD_ACCOUNT_LIMIT")
            if prohibited(json.dumps(effective_changes(world["snapshot"], result.get("changes", {})), ensure_ascii=False), world["settings"]["denyWords"]):
                result = failure("Published values contain a word blocked by the platform", code="DENIED_WORD")
        with store.transaction() as tx:
            latest = tx.world()
            if not lease_valid(tx, job):
                return
            if latest["version"] != world["version"]:
                continue
            latest_user = tx.get("users", user["id"])
            if not latest_user or latest_user.get("banned"):
                finish(tx, job, error={"code": "UNAVAILABLE", "message": "Account is no longer available"})
                return
            if job["mode"] == "run":
                finish(tx, job, result=redact_tests(result, {**task, "tests": tests}))
                return
            if sub:
                from .notifications import reconcile_solution
                from .recheck_history import record
                sub = tx.get("submissions", sub["id"])
                if not sub or not sub.get("active", True):
                    finish(tx, job, result={"status": "RETIRED", "submissionId": job["submissionId"]})
                    return
                record(tx, job, sub, task, sandbox_result, world_version=latest["version"], previous_status=sub["status"], cause_submission_id=job.get("causeSubmissionId"))
                passing = result["status"] == "OK"
                if result["status"] not in ("OK", "WRONG_ANSWER"):
                    result["dependencies"] = sorted(set(sub.get("dependencies", [])) | set(result.get("dependencies", [])))
                sub.setdefault("notificationState", {"passing": sub["status"] == "OK", "version": sub.get("worldVersion", 0)})
                sub.update(status="OK" if passing else "BROKEN", verdictStatus=result["status"], tests=redact_tests(result, task)["tests"], diagnostics=result["diagnostics"],
                           testsPassed=sum(bool(t.get("passed")) for t in result["tests"]), testsTotal=len(result["tests"]),
                           score=task["score"] if result["status"] == "OK" else 0, recheckedAt=iso(), worldVersion=latest["version"], dependencies=result.get("dependencies", []))
                if isinstance(sandbox_result, dict) and sandbox_result.get("status") in ("OK", "WRONG_ANSWER"):
                    sub["dependencyRevision"] = 1
                tx.put("submissions", sub["id"], sub)
                reconcile_solution(tx, sub, task)
                refresh_ratings(tx)
                finish(tx, job, result={"status": sub["status"], "verdictStatus": result["status"], "submissionId": sub["id"]})
                return
            from .break_audits import capacity_available, schedule as schedule_audit
            from .notifications import event
            invalidations = effective_changes(latest["snapshot"], result.get("changes", {}))
            needs_audit = bool(changed_names(invalidations))
            if needs_audit and latest["settings"].get("dependencyCausalChecksEnabled", False):
                needs_audit = next(recheck_candidates(tx, invalidations, latest, retiring=(user["id"], task["id"])), None) is not None
            if result["status"] == "OK" and needs_audit and not capacity_available(tx):
                result = failure("Submissions are paused: solution comparisons are full. Try again shortly.", "FAIL", "NOTIFICATION_BACKLOG")
            before_rating = latest_user["rating"] + job.get("penaltyPoints", 0)
            before_rank = ranking(tx, user["id"])
            submission_id = uid("sub_")
            clean = redact_tests(result, task)
            submission = {"id": submission_id, "taskId": task["id"], "taskTitle": task["title"], "userId": user["id"],
                          "username": latest_user["username"], "status": result["status"], "score": task["score"] if result["status"] == "OK" else 0,
                          "languageVersion": job["languageVersion"], "createdAt": job["createdAt"], "code": job["code"],
                          "durationMs": sum(t.get("durationMs", 0) for t in result["tests"]),
                          "testsPassed": sum(bool(t.get("passed")) for t in result["tests"]), "testsTotal": len(result["tests"]),
                          "tests": clean["tests"], "diagnostics": result["diagnostics"], "stdout": result["stdout"],
                          "dependencies": result.get("dependencies", []), "names": sorted(names), "everAccepted": result["status"] == "OK",
                          "dependencyRevision": 1,
                          "worldVersion": latest["version"], "penaltyPoints": job.get("penaltyPoints", 0), "verdictStatus": result["status"], "active": False,
                          "jobId": job["id"], "publishedAt": iso()}
            if result["status"] == "OK":
                # Quotas and account state can change independently of the namespace version.
                if len(set(latest_user.get("claimedNames", [])) | names) > latest_user["nameLimit"]:
                    submission.update(status="CE", verdictStatus="CE", score=0, everAccepted=False, diagnostics=[diagnostic("Your unique-name limit changed during execution", "NAME_LIMIT")])
                elif len(set(latest_user.get("taskClaimedNames", {}).get(task["id"], [])) | names) > options["max_names"]:
                    submission.update(status="CE", verdictStatus="CE", score=0, everAccepted=False, diagnostics=[diagnostic("This task's published-name budget is exhausted", "TASK_NAME_LIMIT")])
                else:
                    previous_world = copy.deepcopy(latest)
                    changes = result.get("changes", {})
                    invalidations = effective_changes(latest["snapshot"], changes)
                    candidate = merged_snapshot(latest["snapshot"], changes)
                    from .world_limits import last_result_owners
                    latest["lastOwnerUsers"] = last_result_owners(latest, candidate, changes, user["id"])
                    latest["snapshot"] = candidate
                    latest["version"] += 1
                    submission["worldVersion"] = latest["version"]
                    submission["publicationVersion"] = latest["version"]
                    submission["active"] = True
                    for previous in tx.list("submissions", user_id=user["id"], task_id=task["id"], accepted=1):
                        if previous.get("active", True):
                            previous["active"] = False
                            tx.put("submissions", previous["id"], previous)
                    submission["notificationState"] = {"passing": True, "version": latest["version"]}
                    for name in set(changes.get("variables", {})) | set(changes.get("functions", {})):
                        latest["owners"][name] = submission_id
                        latest.setdefault("ownerUsers", {})[name] = user["id"]
                    latest_user["claimedNames"] = sorted(set(latest_user.get("claimedNames", [])) | names)
                    latest_user.setdefault("taskClaimedNames", {})[task["id"]] = sorted(set(latest_user.get("taskClaimedNames", {}).get(task["id"], [])) | names)
                    latest_user.get("solvedOverrides", {}).pop(task["id"], None)
                    tx.put("users", user["id"], latest_user)
                    tx.save_world(latest)
                    affected = schedule_rechecks(tx, invalidations, latest, exclude=submission_id, cause_submission_id=submission_id)
                    schedule_audit(tx, previous_world, latest, submission, affected)
            tx.put("submissions", submission_id, submission)
            notice = event(tx, user["id"], "accepted" if submission["status"] == "OK" else "rejected", "result:" + submission_id,
                  taskId=task["id"], taskTitle=task["title"], submissionId=submission_id, verdictStatus=submission["status"])
            refresh_ratings(tx)
            updated = tx.get("users", user["id"])
            finish(tx, job, result={"notificationId": notice["id"], "submission": {key: val for key, val in submission.items() if key not in {"dependencies", "dependencyRevision", "names", "notificationState"}},
                                   "ratingUpdate": {"tableId": "global", "delta": updated["rating"] - before_rating, "newScore": updated["rating"], "rank": ranking(tx, user["id"]), "rankBefore": before_rank}})
            return
    with store.transaction() as tx:
        finish(tx, job, error={"code": "WORLD_BUSY", "message": "The shared world changed repeatedly during execution. Try again."})


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    store = Store()
    store.initialize()
    from .telemetry import WorkerHeartbeat, record_claim
    heartbeat = WorkerHeartbeat(store)
    heartbeat.start()
    log.info("Worker ready")
    while True:
        job = None
        try:
            job = store.claim()
            if not job:
                time.sleep(0.5)
                continue
            heartbeat.begin(job)
            process_job(store, job)
        except KeyboardInterrupt:
            break
        except Exception:
            log.exception("Job processing failed")
            if job:
                try:
                    with store.transaction() as tx:
                        if job.get("mode") == "break_audit" and lease_valid(tx, job):
                            record_claim(tx, job, failed=True)
                            retry = dict(job)
                            retry.pop("lease", None)
                            retry.pop("_telemetryMonotonic", None)
                            tx.execute("UPDATE jobs SET status='queued',created=?,lease=0,data=? WHERE id=? AND lease=?", (time.time(), dumps(retry), job["id"], job["lease"]))
                        else:
                            finish(tx, job, error={"code": "WORKER_ERROR", "message": "The worker could not complete this request"})
                except Exception:
                    log.exception("Could not finalize failed job; its lease will recover")
            time.sleep(1)
        finally:
            if job:
                heartbeat.end()
    heartbeat.close()


if __name__ == "__main__":
    main()
