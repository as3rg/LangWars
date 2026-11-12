"""Read-time challenge visibility shared by admission, workers and projections."""
from datetime import datetime, timezone
import time


ALLOWED_KEYWORDS = frozenset(("let", "return", "if", "else", "while", "comefrom", "and", "or", "not"))


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError("Timestamp must be text")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp needs a timezone")
    return parsed.astimezone(timezone.utc).timestamp()


def task_visible(tx, task, viewer=None, now=None):
    if viewer and viewer.get("role") == "admin":
        return bool(task)
    if not task:
        return False
    policy = task.get("visibility", "visible")
    if policy == "visible":
        return True
    if policy != "event":
        return False
    event = tx.get("news", task.get("eventId", ""))
    if not event or event.get("category") != "event" or not event.get("visible", True):
        return False
    now = time.time() if now is None else now
    try:
        return ((not event.get("startsAt") or timestamp(event["startsAt"]) <= now)
                and (not event.get("endsAt") or now < timestamp(event["endsAt"])))
    except (ValueError, OverflowError):
        return False


def visible_tasks(tx, viewer=None):
    return {task["id"]: task for task in tx.list("tasks") if task_visible(tx, task, viewer)}
