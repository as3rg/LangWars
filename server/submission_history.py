"""Bound account history without removing solutions needed by the shared game.

Call admission helpers while holding the world publication lock. Stored JSON is
ASCII, so SQL length(data) measures its serialized bytes on both supported stores.
Reservations include both the submission and its duplicated completed-job result.
"""

from .ownership import remember_owners

MAX_ACCOUNT_BYTES = 64 * 1024 * 1024
MAX_ACCOUNT_ITEMS = 1000
HISTORY_BYTES = 16 * 1024 * 1024
HISTORY_ITEMS = 200
# The sandbox response is capped at 8 MiB; source and result wrappers also fit.
SUBMIT_RESERVATION = 20 * 1024 * 1024
RUN_RESERVATION = 10 * 1024 * 1024


def capacity_available(tx, user_id, mode):
    """Reserve worst-case foreground results, including concurrent admitted jobs."""
    stored_bytes, stored_items = tx.execute(
        "SELECT COALESCE(SUM(length(data)),0),COUNT(*) FROM records WHERE kind='submissions' AND user_id=?",
        (user_id,),
    ).fetchone()
    job_bytes, job_items = tx.execute(
        "SELECT COALESCE(SUM(length(data)),0),COUNT(*) FROM jobs WHERE user_id=?", (user_id,),
    ).fetchone()
    stored_bytes += job_bytes
    stored_items += job_items
    # These already have a queue row counted above. Reserve only their future
    # growth; a submit will add one submission record when it finishes.
    for queued_mode, encoded_bytes in tx.execute(
        "SELECT mode,length(data) FROM jobs WHERE user_id=? AND status IN ('queued','running') AND mode IN ('submit','run','unknown')",
        (user_id,),
    ).fetchall():
        reservation = RUN_RESERVATION if queued_mode == "run" else SUBMIT_RESERVATION
        stored_bytes += max(0, reservation - encoded_bytes)
        stored_items += queued_mode != "run"
    reservation = RUN_RESERVATION if mode == "run" else SUBMIT_RESERVATION
    return stored_bytes + reservation <= MAX_ACCOUNT_BYTES and stored_items + (1 if mode == "run" else 2) <= MAX_ACCOUNT_ITEMS


def prune(tx, user_id):
    """Keep recent history; preserve active solutions, pending comparisons and jobs.

    The caller holds the world lock, also used by publication/audit processing.
    A protected working set may exceed the rolling target. Admission then applies
    the separate hard quota rather than deleting gameplay state.
    """
    rows = tx.execute(
        "SELECT id,length(data),created,accepted,active FROM records WHERE kind='submissions' AND user_id=? ORDER BY created,id",
        (user_id,),
    ).fetchall()
    jobs = tx.execute(
        "SELECT id,length(data),created,status FROM jobs WHERE user_id=? ORDER BY created,id", (user_id,),
    ).fetchall()
    total_bytes = sum(row[1] for row in rows) + sum(row[1] for row in jobs)
    total_items = len(rows) + len(jobs)
    counts = {"submissions": 0, "jobs": 0}
    if total_bytes <= HISTORY_BYTES and total_items <= HISTORY_ITEMS:
        return counts

    # New publications save ownerUsers; preserve legacy authorship before an old
    # accepted entry can disappear. No namespace values or owner IDs are changed.
    world = tx.get("system", "world")
    previous_owners = dict(world.get("ownerUsers", {}))
    remember_owners(tx, world)
    if previous_owners != world["ownerUsers"]:
        tx.save_world(world)

    candidates = [(created, "submissions", identifier, size) for identifier, size, created, accepted, active in rows if not (accepted and active)]
    # ISO timestamps and numeric queue timestamps need a common sort key.
    from datetime import datetime
    candidates = [(datetime.fromisoformat(created.replace("Z", "+00:00")).timestamp() if created else 0, kind, identifier, size)
                  for created, kind, identifier, size in candidates]
    candidates.extend((created, "jobs", identifier, size) for identifier, size, created, status in jobs if status in ("completed", "failed"))
    for _, kind, identifier, size in sorted(candidates):
        if total_bytes <= HISTORY_BYTES and total_items <= HISTORY_ITEMS:
            break
        if kind == "submissions":
            # break_candidates.user_id indexes the victim submission ID, while
            # each break_audit ID is the publication whose source it needs.
            if tx.execute("SELECT 1 FROM records WHERE kind='break_audits' AND id=?", (identifier,)).fetchone():
                continue
            if tx.execute("SELECT 1 FROM records WHERE kind='break_candidates' AND user_id=? LIMIT 1", (identifier,)).fetchone():
                continue
            if tx.execute("SELECT 1 FROM jobs WHERE id=? AND status IN ('queued','running')", ("recheck_" + identifier,)).fetchone():
                continue
            tx.delete("submissions", identifier)
        else:
            tx.execute("DELETE FROM jobs WHERE id=? AND status IN ('completed','failed')", (identifier,))
        counts[kind] += 1
        total_bytes -= size
        total_items -= 1
    return counts


def cleanup(tx):
    """Apply rolling bounds to legacy accounts during scheduled maintenance."""
    totals = {"submissions": 0, "jobs": 0}
    users = tx.execute("SELECT user_id FROM records WHERE kind='submissions' UNION SELECT user_id FROM jobs").fetchall()
    for (user_id,) in users:
        counts = prune(tx, user_id)
        for kind, count in counts.items():
            totals[kind] += count
    return totals
