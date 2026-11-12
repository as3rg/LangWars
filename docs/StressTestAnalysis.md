# Mixed stress run: admission versus comparison backlog

The reported run used 200 player accounts, three-second think time, five tasks,
four shared-name groups and eq/get/concat overrides. The screenshot shows four
execution workers, all about 98% occupied. Player agents and execution workers
are different quantities.

## What the measurements establish

| Measurement | Interpretation |
| --- | --- |
| 32,122 HTTP requests / 606.2 s | About 53 HTTP requests/s, including polling and reads. |
| 2,714 enqueue attempts | About 4.48 code-admission attempts/s, rather than 200/3 actual admissions/s. |
| 1,770 accepted enqueues | About 2.92 admitted Run/Submit jobs/s. |
| 942 NOTIFICATION_BACKLOG, 2 COOLDOWN | 99.8% of admission refusals came from the comparison gate. |
| 19,935 job polls | About 62% of HTTP traffic was status polling. |
| Zero transport errors and HTTP 5xx | The supplied client log does not show HTTP service failure. |
| End-to-end p50 26.12 s, p95 60.62 s | Judging completion lagged substantially behind HTTP availability. |

The two admission gates are independent. Foreground jobs consume the configured
300 slots. Submit also requires fewer than 32 pending causal audits. Run does not
publish world changes and does not use the audit gate. Each audit retains the
immutable before/after worlds for one publication until every affected candidate
has been compared. It is not a queue of notification messages waiting for delivery.

Therefore free foreground slots and zero *running* submissions do not imply that
Submit is available. The screenshot has 43 queued submissions and zero running;
these are separate states. It also shows 27 audits with 2,295 candidates left:
roughly 85 remaining comparisons per pending publication. One candidate normally
requires two sandbox executions.

In the displayed five-minute window, 748 Run + 70 Submit = 818 of 1,092 claims
(74.9%) were foreground work. Live rechecks accounted for 207 (19.0%), and causal
comparisons for 67 (6.1%). This matches the existing scheduler's reservation of one
claim in four for the shared background lane. A completed comparison slice does
not free an audit slot until that publication's last candidate finishes. At a
high sustained publication rate, the 32-slot gate can thus stay saturated while
Run continues to consume foreground capacity.

## What the snapshot and timings cannot establish

A dashboard value of 27/32 was true at its snapshot time. Queue snapshots are
cached for five seconds and the page polls every ten seconds, with HTTP latency
on top. It does not establish that five slots were still free when a later Submit
arrived. Under contention other players can occupy released slots first. The
429 response now includes the actual pending-audit count and capacity checked
under the submission lock; dashboard availability is advisory, not a reservation.
Account cooldowns and the two-pending-job account limit apply separately.

The stress logger's sub-millisecond `execution` measures individual interpreter
test calls. It excludes sandbox startup, contract/publication validation, database
work, retries and HTTP/poll delays. Subtracting it from end-to-end time does not
isolate queue wait. The dashboard's claim execution duration includes the whole
claim; its queue wait is measured at claim time.

The 123 FAIL verdicts may include submissions admitted while audit capacity was
available but rejected at publication when it was full. Their diagnostic codes
are needed to establish the exact breakdown. Two WORLD_BUSY errors count jobs
that exhausted retries, not every retry in otherwise successful jobs.

## Changes following the run

The dashboard now displays separate global Run/Submit availability, a warning
when comparison slots block Submit despite free job slots, and the age of the
oldest audit. Refusals name solution comparisons rather than notification delivery
and include live capacity details. These changes preserve the scheduler, limits
and exact causal-attribution rules. They improve visibility rather than claiming
additional execution capacity.
