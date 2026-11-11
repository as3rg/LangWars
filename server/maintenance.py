"""Run regularly: python -m server.maintenance [--job-days 7] [--rejected-days 30]."""
import argparse
import time
from datetime import datetime, timedelta, timezone

from .store import Store, dumps, iso


def cleanup(store, job_days=7, rejected_days=30, audit_days=180, recheck_days=90):
    now = time.time()
    counts = {"jobs": 0, "sessions": 0, "throttle": 0, "auth_failures": 0, "rejectedSubmissions": 0, "audit": 0, "recoveredBreakAudits": 0}
    with store.transaction() as tx:
        tx.world()
        counts["jobs"] = tx.execute("DELETE FROM jobs WHERE status IN ('completed','failed') AND created<?", (now - job_days * 86400,)).rowcount
        for kind in ("sessions", "throttle", "auth_failures"):
            for row in tx.execute("SELECT id,data FROM records WHERE kind=?", (kind,)).fetchall():
                import json
                value = json.loads(row[1])
                expired = value.get("expires", 0) < now if kind == "sessions" else (value.get("lastFailure", 0) < now - 900 if kind == "auth_failures" else not value or max(value) < now - 60)
                if expired:
                    tx.delete(kind, row[0])
                    counts[kind] += 1
        cutoff = (datetime.now(timezone.utc) - timedelta(days=rejected_days)).isoformat().replace("+00:00", "Z")
        for row in tx.execute("SELECT id FROM records WHERE kind='submissions' AND accepted=0 AND created<?", (cutoff,)).fetchall():
            tx.delete("submissions", row[0])
            counts["rejectedSubmissions"] += 1
        cutoff = (datetime.now(timezone.utc) - timedelta(days=audit_days)).isoformat().replace("+00:00", "Z")
        counts["audit"] = tx.execute("DELETE FROM records WHERE kind='audit' AND created<?", (cutoff,)).rowcount
        from .recheck_history import cleanup as cleanup_rechecks
        counts["rechecks"] = cleanup_rechecks(tx, recheck_days)
        from .telemetry import cleanup as cleanup_telemetry
        counts["telemetry"] = cleanup_telemetry(tx, now)
        # Recover pending comparisons whose queue rows were removed by older
        # deployments or an interrupted manual cleanup; snapshots remain intact.
        for audit in tx.list("break_audits"):
            job_id = "recheck_audit_" + audit["id"]
            row = tx.execute("SELECT status FROM jobs WHERE id=?", (job_id,)).fetchone()
            if not row or row[0] in ("failed", "completed"):
                job = {"id": job_id, "mode": "break_audit", "auditId": audit["id"], "userId": audit["userId"], "createdAt": iso()}
                tx.execute("INSERT INTO jobs(id,user_id,status,created,lease,data,mode) VALUES(?,?,'queued',?,0,?,'break_audit') ON CONFLICT(id) DO UPDATE SET status='queued',created=excluded.created,lease=0,data=excluded.data,mode=excluded.mode", (job_id, audit["userId"], now, dumps(job)))
                counts["recoveredBreakAudits"] += 1
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job-days", type=int, default=7)
    parser.add_argument("--rejected-days", type=int, default=30)
    parser.add_argument("--audit-days", type=int, default=180)
    parser.add_argument("--recheck-days", type=int, default=90)
    args = parser.parse_args()
    if min(args.job_days, args.rejected_days, args.audit_days, args.recheck_days) < 1:
        parser.error("Retention periods must be positive")
    store = Store()
    store.initialize()
    print(cleanup(store, args.job_days, args.rejected_days, args.audit_days, args.recheck_days))


if __name__ == "__main__":
    main()
