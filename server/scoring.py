"""Current passing tasks, durable administrative corrections and submission charges."""
from __future__ import annotations
import json


def solved_tasks(tx, user, tasks=None):
    tasks = {task["id"]: task for task in tx.list("tasks")} if tasks is None else tasks
    solved = {row[0] for row in tx.execute("SELECT DISTINCT task_id FROM records WHERE kind='submissions' AND user_id=? AND state='OK' AND active=1", (user["id"],)).fetchall() if row[0] in tasks}
    for task_id, completed in user.get("solvedOverrides", {}).items():
        if task_id in tasks:
            if completed:
                solved.add(task_id)
            else:
                solved.discard(task_id)
    return solved


def solved_task_map(tx, users=None, tasks=None):
    users = tx.list("users") if users is None else users
    tasks = {task["id"]: task for task in tx.list("tasks")} if tasks is None else tasks
    result = {user["id"]: set() for user in users}
    for user_id, task_id in tx.execute("SELECT DISTINCT user_id,task_id FROM records WHERE kind='submissions' AND state='OK' AND active=1").fetchall():
        if user_id in result and task_id in tasks:
            result[user_id].add(task_id)
    for user in users:
        for task_id, completed in user.get("solvedOverrides", {}).items():
            if task_id in tasks:
                if completed:
                    result[user["id"]].add(task_id)
                else:
                    result[user["id"]].discard(task_id)
    return result


def refresh_ratings(tx):
    tasks = {task["id"]: task for task in tx.list("tasks")}
    users = tx.list("users")
    solves = solved_task_map(tx, users, tasks)
    for user in users:
        completed = solves[user["id"]]
        user["solvedCount"] = len(completed)
        user["rating"] = sum(tasks[key]["score"] for key in completed) + user.get("ratingAdjustment", 0) - user.get("submissionPenalties", 0)
        tx.put("users", user["id"], user)


def resubmit_penalty(tx, user, task, settings, solved=None):
    if solved is None:
        solved = bool(user and task["id"] in solved_tasks(tx, user, {task["id"]: task}))
    enabled = bool(settings.get("resubmitPenaltyEnabled", False) and solved)
    percent = settings.get("resubmitPenaltyPercent", 5)
    points = (task["score"] * percent + 99) // 100 if enabled else 0
    return {"enabled": enabled, "percent": percent, "points": points}


def backfill_gameplay(tx):
    """One-time, non-destructive attribution of existing charges and active entries."""
    if tx.get("system", "task-ledger-v1"):
        return
    active, fees, claimed = {}, {}, {}
    completed = set()
    # Queue entries survive completion and contain the admission charge; never
    # count the corresponding completed submission a second time. Stream source-
    # bearing rows with a server cursor: an upgrade must not load years of code.
    cursor = tx.connection.cursor(name="ledger_backfill_jobs") if tx.postgres else tx.connection.cursor()
    try:
        cursor.execute("SELECT data FROM jobs")
        while rows := cursor.fetchmany(100):
            for row in rows:
                job = json.loads(row[0])
                amount = max(0, job.get("penaltyPoints", 0))
                if job.get("mode") != "submit" or not amount:
                    continue
                result_id = job.get("result", {}).get("submission", {}).get("id")
                if result_id:
                    completed.add(result_id)
                key = (job["userId"], job["taskId"])
                fees[key] = fees.get(key, 0) + amount
    finally:
        cursor.close()
    for sub in tx.iter_records("submissions", stable_order=True):
        key = (sub["userId"], sub["taskId"])
        if sub.get("everAccepted"):
            order = (sub.get("publicationVersion", -1), sub.get("createdAt", ""), sub["id"])
            if key not in active or order > active[key][0]:
                active[key] = (order, sub["id"])
            claimed.setdefault(sub["userId"], {}).setdefault(sub["taskId"], set()).update(sub.get("names", []))
        if sub["id"] not in completed:
            fees[key] = fees.get(key, 0) + max(0, sub.get("penaltyPoints", 0))
    # A second streaming pass applies flags without retaining program bodies.
    for sub in tx.iter_records("submissions", stable_order=True):
        chosen = active.get((sub["userId"], sub["taskId"]), (None, None))[1] == sub["id"]
        if sub.get("active") is not chosen:
            sub["active"] = chosen
            tx.put("submissions", sub["id"], sub)
    by_user = {}
    for (user_id, task_id), amount in sorted(fees.items()):
        if task_id and amount:
            by_user.setdefault(user_id, []).append((task_id, amount))
    for user in tx.list("users"):
        remaining = max(0, user.get("submissionPenalties", 0))
        ledger = {}
        for task_id, amount in by_user.get(user["id"], []):
            ledger[task_id] = min(amount, remaining)
            remaining -= ledger[task_id]
        user["taskPenalties"] = ledger
        user["taskClaimedNames"] = {key: sorted(value) for key, value in claimed.get(user["id"], {}).items()}
        tx.put("users", user["id"], user)
    tx.put("system", "task-ledger-v1", True)
    refresh_ratings(tx)
