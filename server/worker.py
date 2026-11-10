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
            "max_overrides": task.get("coreOverrideLimit", settings["defaultCoreOverrideLimit"]),
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


def schedule_rechecks(tx, changes, world, exclude=None, all_submissions=False, task_id=None):
    names = changed_names(changes)
    core_changed = any(function.get("annotation") not in (None, "solution") for definition in changes.get("functions", {}).values() for function in (definition if isinstance(definition, list) else [definition]))
    now = time.time()
    if all_submissions or core_changed:
        candidates = tx.iter_records("submissions", accepted=1, task_id=task_id)
    else:
        candidate_ids = set()
        for name in names:
            candidate_ids.update(row[0] for row in tx.execute("SELECT submission_id FROM dependencies WHERE name=?", (name,)).fetchall())
        candidates = (tx.get("submissions", key) for key in candidate_ids)
    for sub in candidates:
        if not sub:
            continue
        if sub["id"] == exclude or not sub.get("everAccepted"):
            continue
        if not all_submissions and not core_changed and not names.intersection(sub.get("dependencies", [])):
            continue
        job_id = "recheck_" + sub["id"]
        job = {"id": job_id, "userId": sub["userId"], "taskId": sub["taskId"], "submissionId": sub["id"],
               "code": sub["code"], "mode": "recheck", "languageVersion": sub["languageVersion"],
               "createdAt": iso(), "requestedVersion": world["version"]}
        # A newer world invalidates any in-flight lease, so its result cannot overwrite this request.
        tx.execute("INSERT INTO jobs(id,user_id,status,created,lease,data) VALUES(?,?,'queued',?,0,?) ON CONFLICT(id) DO UPDATE SET status='queued',created=excluded.created,lease=0,data=excluded.data", (job_id, sub["userId"], now, dumps(job)))


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
    completed.pop("code", None)
    completed["finishedAt"] = iso()
    if result is not None:
        completed["result"] = result
    if error:
        completed["error"] = error
    updated = tx.execute("UPDATE jobs SET status=?,data=? WHERE id=? AND lease=?", ("failed" if error else "completed", dumps(completed), job["id"], job["lease"]))
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
        options = options_for(world, task)
        if sub:
            options.update(read_only=True, overlay_names=[name for name, owner in world.get("owners", {}).items() if owner != sub["id"]])
            # Previously accepted code remains eligible after administrative dictionary changes.
            options["allowed_words"] = None
            options["max_name_length"] = None
            options["deny_words"] = []
            options["permitted_overrides"] = ["eq", "cmp", "cast", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat"]
            options["max_overrides"] = 1000
        tests = [t for t in task["tests"] if not t.get("hidden")] if job["mode"] == "run" else task["tests"]
        if prohibited(job["code"], world["settings"]["denyWords"]) and not sub:
            result = failure("Code contains a word blocked by the platform", code="DENIED_WORD")
        else:
            result = sandbox({"code": job["code"], "tests": tests, "snapshot": world["snapshot"], "options": options})
            if not isinstance(result, dict) or result.get("sandboxError"):
                result = failure("Execution exceeded the worker budget", "TLE", "EXECUTION_BUDGET")
        result.setdefault("tests", [])
        result.setdefault("diagnostics", [])
        result.setdefault("stdout", "")
        names = set(result.get("names", []))
        if not sub and len(set(user.get("claimedNames", [])) | names) > user["nameLimit"]:
            result = failure(f"This program exceeds your limit of {user['nameLimit']} unique names", code="NAME_LIMIT")
        if job["mode"] == "submit" and result.get("status") == "OK":
            errors = publication_errors(world, result, task)
            if errors:
                result.update(status="CE", diagnostics=errors, changes={})
            candidate = merged_snapshot(world["snapshot"], result.get("changes", {}))
            if len(dumps(candidate)) > 4 * 1024 * 1024 or len(set(candidate["variables"]) | set(candidate["functions"])) > 20000:
                result = failure("The shared world has reached its size limit; reuse existing names or ask an administrator to restore definitions", code="WORLD_LIMIT")
            elif prohibited(json.dumps(effective_changes(world["snapshot"], result.get("changes", {})), ensure_ascii=False), world["settings"]["denyWords"]):
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
                sub.update(status=result["status"], tests=redact_tests(result, task)["tests"], diagnostics=result["diagnostics"],
                           testsPassed=sum(bool(t.get("passed")) for t in result["tests"]), testsTotal=len(result["tests"]),
                           score=task["score"] if result["status"] == "OK" else 0, recheckedAt=iso(), worldVersion=latest["version"], dependencies=result.get("dependencies", []))
                tx.put("submissions", sub["id"], sub)
                refresh_ratings(tx)
                finish(tx, job, result={"status": result["status"], "submissionId": sub["id"]})
                return
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
                          "worldVersion": latest["version"], "penaltyPoints": job.get("penaltyPoints", 0)}
            if result["status"] == "OK":
                # Quotas and account state can change independently of the namespace version.
                if len(set(latest_user.get("claimedNames", [])) | names) > latest_user["nameLimit"]:
                    submission.update(status="CE", score=0, everAccepted=False, diagnostics=[diagnostic("Your unique-name limit changed during execution", "NAME_LIMIT")])
                else:
                    changes = result.get("changes", {})
                    invalidations = effective_changes(latest["snapshot"], changes)
                    latest["snapshot"] = merged_snapshot(latest["snapshot"], changes)
                    latest["version"] += 1
                    submission["worldVersion"] = latest["version"]
                    for name in set(changes.get("variables", {})) | set(changes.get("functions", {})):
                        latest["owners"][name] = submission_id
                        latest.setdefault("ownerUsers", {})[name] = user["id"]
                    latest_user["claimedNames"] = sorted(set(latest_user.get("claimedNames", [])) | names)
                    latest_user.get("solvedOverrides", {}).pop(task["id"], None)
                    tx.put("users", user["id"], latest_user)
                    tx.save_world(latest)
                    schedule_rechecks(tx, invalidations, latest, exclude=submission_id)
            tx.put("submissions", submission_id, submission)
            refresh_ratings(tx)
            updated = tx.get("users", user["id"])
            finish(tx, job, result={"submission": {key: val for key, val in submission.items() if key not in {"dependencies", "names"}},
                                   "ratingUpdate": {"tableId": "global", "delta": updated["rating"] - before_rating, "newScore": updated["rating"], "rank": ranking(tx, user["id"]), "rankBefore": before_rank}})
            return
    with store.transaction() as tx:
        finish(tx, job, error={"code": "WORLD_BUSY", "message": "The shared world changed repeatedly during execution. Try again."})


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    store = Store()
    store.initialize()
    log.info("Worker ready")
    while True:
        job = None
        try:
            job = store.claim()
            if not job:
                time.sleep(0.5)
                continue
            process_job(store, job)
        except KeyboardInterrupt:
            break
        except Exception:
            log.exception("Job processing failed")
            if job:
                try:
                    with store.transaction() as tx:
                        finish(tx, job, error={"code": "WORKER_ERROR", "message": "The worker could not complete this request"})
                except Exception:
                    log.exception("Could not finalize failed job; its lease will recover")
            time.sleep(1)


if __name__ == "__main__":
    main()
