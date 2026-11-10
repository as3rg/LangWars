"""Current passing tasks, durable administrative corrections and submission charges."""
from __future__ import annotations


def solved_tasks(tx, user, tasks=None):
    tasks = {task["id"]: task for task in tx.list("tasks")} if tasks is None else tasks
    solved = {row[0] for row in tx.execute("SELECT DISTINCT task_id FROM records WHERE kind='submissions' AND user_id=? AND state='OK'", (user["id"],)).fetchall() if row[0] in tasks}
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
    for user_id, task_id in tx.execute("SELECT DISTINCT user_id,task_id FROM records WHERE kind='submissions' AND state='OK'").fetchall():
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
