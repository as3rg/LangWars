# Notifications and breaking changes

Notifications are durable, account-scoped records. The bell retains the latest
500 events per account, including ordinary interface notices, accepted/rejected
submissions, broken/repaired solutions and confirmed effects on other players.
Sample runs produce neither popups nor bell records; their output stays in the
task workspace. Private-source access errors stay in the submission dialog and
are not saved as notifications. Exact legacy popup messages for these two actions
are also hidden when projecting old history and unread counts; ordinary notices
with other text remain visible. Reading another account's bell is not supported,
including for administrators. Mark-read operations are restricted to the recipient.

`solutionNotificationsEnabled` defaults to true. It hides all solution outcome
events when disabled, including old history and immediate submission responses;
ordinary interface notices remain available. Events are retained internally while
hidden. `showBreakerIdentity` defaults to false. `breakImpactVisibility` defaults
to `count` and accepts `usernames`, `count`, or `hidden`. These settings are applied
when returning every feed/submission response, so disabling disclosure also
redacts previously stored events. Usernames resolve to current account names;
deleted accounts do not leave an exposed cached login. Break-impact information
is returned only to the submission's author or an administrator, never another
player browsing the shared submission feed.

A previously accepted submission that subsequently fails is `BROKEN`; its
underlying interpreter verdict remains in `verdictStatus`. A task is `broken`
when its owner's active submission currently fails (subject to explicit
administrative solved-task corrections). Only the latest accepted publication
per player/task stays active; unsuccessful attempts do not retire it. Retired
entries remain in history with muted styling, and their published names remain
in the world until overwritten or removed by an administrator.
Repaired solutions return to `OK`. A failing first attempt is not a broken
solution. Breaking one's own solution can produce a broken notification but does
not count as breaking another player.

## Causality

Ordinary live rechecks are coalesced per submission and evaluate the latest world.
They update the current task state and score. They cannot establish which of
several rapid publications introduced a failure.

For that reason a passing publication also queues independent comparisons of
affected solutions active at publication against the exact world before and after
that publication. Immutable snapshots are stored once per pending publication;
candidate references and the small progress cursor are separate records. A
publication receives credit only for a verified passing-to-failing transition.
It never receives credit merely because a later recheck happened to fail. Changes
to the victim task's tests or execution time limit invalidate a comparison rather
than attributing an administrative task edit to a player. A sandbox process that
cannot return a result also cannot establish causal credit.

Distinct affected players are counted once per source submission, even if several
of their solutions fail. The attacker receives one summary notification after
the publication's comparisons finish. The source submission retains its confirmed
impact for My submissions. Self-breaks are excluded from that impact.

Victim notifications carry `createdAt` (delivery/history cursor time) and
`occurredAt` (the publication time). A comparison can finish after a subsequent
repair; `historical` marks comparisons against an earlier world. Notification
history therefore preserves changes that a coalesced live recheck might skip.
A later accepted repair may retire a candidate before its comparison finishes;
the historical comparison still records the earlier break, without changing the
new solution's score or state.

Exact comparisons and live rechecks reconcile through a versioned per-submission
notification baseline. Live notifications wait while exact candidates remain.
After the last candidate, any latest-state transition not explained by a
publication is emitted anonymously. This avoids duplicate notices for a player
break followed by an unrelated administrator edit, while retaining a genuine
administrator break or repair. Older comparisons never roll back the baseline.

## Bounds and recovery

At most 32 immutable publication comparisons may remain pending. Each retains two
namespace snapshots (each bounded by the existing 4 MiB limit), plus ownership
and policy metadata. Publication admission returns
429 when that capacity is full, before charging a repeat-submission fee. A queued
submission that loses the capacity race returns `FAIL/NOTIFICATION_BACKLOG`
without publishing or claiming acceptance. Its already-paid queue-admission fee
follows the existing no-refund policy. Capacity is released when the comparison
finishes; snapshots are not retained as permanent world history.

One candidate is processed per queue claim. Two sandbox calls fit within a
normal lease, and `recheck_*` queue scheduling reserves processing capacity for
this work. Leases fence every progress/event commit. Replayed or stale workers
cannot duplicate notices or credit. Unexpected audit-worker exceptions requeue
the job; expired leases recover normally. `python -m server.maintenance` also
repairs missing/failed audit queue records without discarding their snapshots.
Deleting an account preserves these cleanup jobs so they can release resources
and reconcile remaining victims without exposing the deleted account.

Generic client notices permit only `info`, `success`, or `error` and a message of
at most 2000 characters, with a 120-per-minute account budget. Clients cannot
submit structured accepted/broken events, forge actors, or target another user.
The frontend does not post server-generated popups back to the API. Immediate
submission notifications and feed delivery share the same deterministic ID.

The language revision marker schedules one read-only sweep of active accepted
solutions after semantic updates, including the removal of `swap()`, unknown-name
assignment becoming a no-op, and the revised stdlib guards. Database and history
are preserved. Publication-only sampled conditions (such as truthy reachability)
are checked on future publications; existing overrides are not automatically
deleted and may need an administrator restore when they violate new contracts.
Stop all workers, including workers on remote VPN hosts, before starting the new
API release and this sweep. Update every worker to the same interpreter release
before resuming processing; mixing interpreter revisions would invalidate both
ordinary verdicts and causal comparisons.

## Administrative judge history

Submission dialogs expose two administrator-only, paginated views: live and
causal runs against the selected solution, and runs caused by its publication.
Rows include verdicts, test counts, duration, world version and bounded diagnostics.
They never copy program source, stdout or hidden test inputs into this log.
Exact comparisons record both before/after runs, including unavailable sandboxes;
the latter cannot establish causal credit. Fenced commits prevent stale workers
from adding rows. Replaying a committed run does not create a second record.
Each target retains at most 200 runs. `python -m server.maintenance` removes runs
older than 90 days and rows whose target submission was deleted; customize with
`--recheck-days`. Old deployments have no reconstructible historical judge runs:
the log starts with execution by this release.

## Task quotas and charges

`defaultTaskNameLimit` defaults to 30. A task's nullable `namePublishLimit` and
`coreOverrideLimit` inherit the corresponding global settings. Published-name
usage is cumulative distinct custom identifiers in accepted programs for that
player/task, including parameters and references, matching the account-wide
name budget. Runs and failed submissions do not spend either budget. Rechecks
are exempt from subsequently tightened publication limits.

Repeat-submission charges are recorded both in the account total and in a
per-task ledger, and deducted only once. Task and event rankings include their
own charges, displaying base score minus fees while sorting by the net score.
The one-time non-destructive backfill attributes retained submission/job charges
without counting both copies; any older charge whose evidence was already
deleted remains in the global total but cannot be attributed to a task. The
backfill also selects one active accepted publication per player/task and
recalculates ratings; historical submissions and world definitions remain intact.
Source-bearing submission and queue rows are streamed in bounded batches during
this upgrade; only identities, per-task claims and fee aggregates stay in memory.
