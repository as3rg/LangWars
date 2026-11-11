# Operating LangWars

The supplied stack runs PostgreSQL, one API process, a static nginx frontend, and independently scalable workers. It deliberately uses PostgreSQL for the queue as well as the world store, avoiding a second stateful queue service on small hosts. Queue claims use PostgreSQL's documented [`FOR UPDATE SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html) pattern.

## Resources and ingress

Start with two worker containers on a 4 GB host. The Compose memory ceilings are 512 MB for PostgreSQL, 384 MB for the API, 128 MB for nginx, and 384 MB for each worker. Each worker's interpreter process defaults to a separate 256 MB address-space limit on Linux and a 20 second wall-clock timeout. These are ceilings, not measurements of expected consumption. Leave memory for Docker, the OS, filesystem cache, and a TLS proxy. Add workers according to CPU availability and measured queue wait time.

The default HTTP port binds to loopback. Put an HTTPS reverse proxy in front of port 8080 for public hosting. Set `HTTP_BIND` to an appropriate interface only if direct access is intended. The API and database have no public host ports in the default configuration. Keep `.env` out of source control. The database password is interpolated into a URL, so use URL-safe random characters or percent-encode it consistently.

The server and worker containers run as an unprivileged user, with a read-only root filesystem, no Linux capabilities, no privilege escalation, a process limit, and a small temporary filesystem. They never mount the Docker socket or host directories. These use the [standard Compose service constraints](https://docs.docker.com/reference/compose-file/services/).

## Public HTTPS

Set `PUBLIC_DOMAIN=your.domain.example` in `.env`, point its DNS A record to the server, and allow inbound TCP ports 80 and 443 (UDP 443 is optional for HTTP/3). Publish an AAAA record only when IPv6 ingress is configured too. Then run:

```sh
docker compose -f compose.yaml -f compose.public.yaml up --build -d --scale worker=2
```

Caddy obtains and renews the domain certificate and redirects HTTP to HTTPS. The [automatic HTTPS requirements](https://caddyserver.com/docs/automatic-https) include correct DNS and reachable challenge ports. The API/database remain unexposed, and the direct nginx port retains its loopback binding. Caddy also runs as an unprivileged user with a read-only root and persistent named volumes for certificate state. No account email or ACME contact email is required by this configuration.

The public overlay uses a small dedicated ingress network (`172.30.250.0/29`). Only Caddy's address (`172.30.250.2`) is trusted by nginx to supply client addresses. Caddy overwrites untrusted forwarded headers at the public edge; nginx can therefore apply per-client authentication limits without grouping every visitor under the proxy address. See [Caddy proxy header behavior](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) and [nginx real-IP trust](https://nginx.org/en/docs/http/ngx_http_realip_module.html). If this subnet conflicts with your VPN, change both ingress addresses/subnet in `compose.public.yaml` and the exact trusted address in `deploy/proxy-trust-public.conf`. If another proxy or CDN sits before Caddy, configure its specific trusted addresses rather than trusting arbitrary client headers.

Check `https://your.domain.example/api/health` after deployment. Public certificate issuance was not tested against a real domain in this session; the HTTPS stack was tested locally with a trusted test CA. The public configuration enables HSTS and restrictive browser headers. Run builds with refreshed base images periodically (`docker compose -f compose.yaml -f compose.public.yaml build --pull`).

The production frontend bundles its fonts through Fontsource and serves them from
the same origin as its scripts and CSS. It does not contact Google Fonts. Font
licenses are distributed at `/fonts/licenses/`. Keep `script-src 'self'` and
`font-src 'self'`: the application does not require inline JavaScript. CSP reports
pointing to `content.js` or UUID-named sources can come from browser extensions;
compare with a clean browser profile and inspect the source before attributing
them to the application. Do not allow arbitrary inline scripts or copy unknown
script hashes into the policy to silence extension injections.

## Accounts, invitations, and visibility

Passwords use scrypt with `N=32768`, `r=8`, `p=3`, a fresh 16-byte random salt and a 32-byte derived hash. The stored record includes the parameters, and verification uses a constant-time comparison. These work factors match one of the [OWASP scrypt configurations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Three concurrent hashing slots cap hashing memory at roughly 96 MiB; hashing does not hold the shared-world lock. Bearer sessions and invitation secrets are stored only as SHA-256 digests of high-entropy random tokens.

After three failed logins, persisted per-account delays grow from one second to a maximum of 60 seconds; a 15-minute quiet period resets the failure count. Unknown usernames use the same password work and delay rules. Authentication also has per-account and gateway request budgets; nginx allows 60 authentication requests per minute per client with a burst of 150 to accommodate a shared venue NAT. Throttled requests return 429 and login timeouts include `Retry-After`. Password resets, bans, deletion, and logout revoke the relevant sessions. There is no email recovery flow; an administrator resets passwords.

Registration defaults to invitation-only. An invitation permits 1–500 registrations and expires in 1–168 hours; defaults are one registration and 24 hours. For a presentation, set the intended audience size and expiry, then copy the generated link. It has the form `https://your.domain.example/auth#invite=TOKEN`: fragments are absent from HTTP requests, and the form clears the fragment after reading it. Keep the link when it is first shown because the server cannot recover plaintext invitation tokens. A manually supplied token can also be converted to a link. Revoke the link after the event if capacity remains. Anyone holding a valid link can use its remaining registrations.

World visibility has four independent policies: variable names, variable values, function names, and function bodies/signatures. `admin_only` names remove the corresponding entries completely; hidden values produce names-only entries and never return function bodies, signatures, or remembered results. Administrators always retain full access. These settings control inspection through the website/API. The shared language can still compute with shared values, and deliberately public function bodies may mention variable names; visibility is not a new language isolation boundary.

Take a verified backup before upgrading; schema migrations between incompatible experimental releases are not maintained. This update preserves the existing database and supplies missing settings. It adds translations to untouched default tasks; customized tasks retain their existing text. Do not remove the PostgreSQL volume during a routine image update.

## Workers on VPN hosts

On the database host, set `VPN_DATABASE_BIND` to its VPN address and opt in to the additional binding:

```sh
docker compose -f compose.yaml -f compose.vpn.yaml up -d
```

Allow database connections only from worker VPN addresses in the host firewall. Use encrypted VPN transport, or configure PostgreSQL TLS and add the corresponding `sslmode` settings to the connection URL. Do not bind this port to a public interface.

On each additional host, deploy the same release of the repository or the same built server image. Set `DATABASE_URL` to the database's VPN address and run:

```sh
docker compose -f compose.worker.yaml up --build -d --scale worker=2
```

`SERVER_IMAGE` can select a registry image instead of the local image name. Workers do not need bootstrap administrator credentials. Keep interpreter code and database schema versions consistent across hosts; stop workers before replacing an incompatible release.

## Maintenance

```sh
docker compose ps
docker compose logs --tail=100 api worker
docker compose exec -T db pg_dump -U langwars -d langwars -Fc -f /tmp/langwars.dump
docker compose cp db:/tmp/langwars.dump ./langwars.dump
```

For scheduled physical incremental backups, full backups every N days, chain retention and tested recovery commands, see [Database backups and recovery](Backups.md). The optional `compose.backup.yaml` enables PostgreSQL 17 WAL summaries and an external backup directory without changing the normal deployment. The `pg_dump` command above remains useful for an independent logical export; restore that format with `pg_restore`, not the physical recovery procedure. Back up before upgrading and preserve off-host copies; backups contain password hashes, session hashes, private code, and administrator audit records.

Deleting a user revokes their sessions. Published definitions remain part of the shared world until superseded or restored by an administrator. A ban has a separate, opt-in state removal action: it removes the user's currently owned variables/functions and restores their currently owned standard-library overrides to builtin behavior. Definitions another player has since overwritten are preserved. Resulting contract conflicts must be resolved before that combined ban/removal can commit. Password resets and bans revoke active sessions. The deny-list also applies to new logins and administrative login changes; existing accounts are reviewed and banned manually.

Use the admin override restore action when a shared operation needs to return to its built-in behavior. Administrators can also edit or delete individual values and function definitions in World. These edits use the displayed world version, validate bounded language values/contracts, record an audit entry, and schedule rechecks. A conflicting concurrent publication requires refreshing and retrying. Rejudging is read-only: it must never republish the original code's values.

Scores count each currently passing task once per user, using the latest accepted publication for that player/task. Failed attempts leave the prior accepted solution active; older accepted entries stay in history but stop affecting scores and future rechecks. Their published globals remain in the shared world. The rating selector offers the whole world, individual tasks, and events with assigned tasks; player search preserves ranks within the selected ladder. Global scores also include administrative adjustments and repeat-submission charges. Task/event ladders subtract their own charges and display base score minus fees, ordered by the net score. Administrators can correct a player's login, score and solved task set; case-insensitive login uniqueness is enforced. A score correction establishes an offset from the current task total, so future solves and breaks still affect the score. Solved-task corrections survive rechecks; a fresh accepted submission for that task returns it to normal verdict tracking. Corrections never prevent solving other tasks later.

The optional repeat-submission charge is disabled by default. Enable it and choose the percentage in administration. Submitting a currently green task then costs `ceil(task score * percentage / 100)` points, with confirmation before the job is queued. The charge occurs once at queue admission, even if the new code fails; retries by workers do not charge again. Runs, automatic rechecks, rejected admission requests and submissions to currently broken/unsolved tasks are free. Charges persist across rechecks and remain part of the score if the setting is later disabled. The frontend warns on green tasks, while the API independently requires explicit acceptance whenever a charge applies.

The notification bell keeps account-scoped history of submission results, broken
and repaired solutions, and ordinary application popups. Notifications are enabled
by default; breaker identities are hidden and breaking-submission impact shows a
distinct-player count. Administration can disable solution notifications, show
breaker identities, or switch impact disclosure between usernames, count and
hidden. These policies are applied by the API to existing history too. A failed
recheck of an ever-accepted submission is shown as `BROKEN`, with the underlying
judge verdict retained separately. A task stays solved while that player's
active solution passes, subject to explicit administrative corrections. Sample
runs and private-submission access errors do not create notification records.

Breaking credit uses separate comparisons against the immutable worlds before
and after a publication. It does not assume the last publisher caused every
failure observed by a later recheck. Pending comparison storage is bounded and
backpressure can temporarily defer new publications while workers catch up.
History is limited to the most recent 500 entries per account; reopening the site
does not replay old popup animations. Effects respect reduced-motion preferences.

## Performance

Administration → Performance reads `/api/admin/performance`. It shows live and
busy workers, their last heartbeat and recent wall-time occupancy, foreground
queue capacity, pending background work, waiting ages, completed-claim throughput,
queue wait/execution timings and infrastructure errors. Run, Submit, live rechecks,
causal comparisons and administrative restores have separate rows. Worker occupancy
is time spent processing claims, including database waits and sandbox execution;
it is not CPU usage. A causal claim processes one candidate against two worlds.
Judge rejections such as a wrong answer are completed work, not infrastructure errors.

The dashboard polls every 10 seconds while open; queue snapshots are cached for
5 seconds per API process. Each worker sends one heartbeat every 10 seconds using
an independent connection without the publication lock. After 35 seconds without
a heartbeat it is shown as offline, which may also indicate database connectivity
trouble. Abruptly exited workers remain visible as stale entries for up to a day;
graceful exits remove their heartbeat. After an upgrade, old workers without
heartbeat support are not discoverable: update all workers to this release.

Judge timings update one fixed-size minute/mode aggregate in the existing fenced
commit transaction, including each causal comparison slice. No metrics insert
is made per test, and no per-submission telemetry history is retained. Discarded
stale-lease work does not count as a completed sample; worker occupancy still
includes that time. Queue summaries use indexed lightweight fields and do not
deserialize completed job results or source. Minute aggregates and stale worker
rows expire after 24 hours, with cleanup every five minutes from worker heartbeats
and during normal maintenance. Timings cover the current and previous four minute
buckets (roughly 4–5 minutes); throughput divides their counts by five minutes.
Means describe observed completed claims, while current queue ages describe work
still waiting. Percentiles are approximate histogram bounds; the dashboard shows
`≥` when the percentile exceeds the final seven-day bucket. No ETA is promised.
Synchronize VPN hosts' clocks for cross-host queue waiting times. Execution
duration uses the worker's monotonic clock.

HTTP counters live only in API memory, with at most 60 one-second buckets and
fixed latency histograms: no paths, identities, source or request bodies are
retained. They cover the last 60 seconds, reset on restart and describe the API
process identified by PID, rather than all replicas. They include accepted
Run/Submit admissions, 429 responses, queue/cooldown/audit-backlog refusals,
HTTP 4xx/5xx counts and response latency. The database probe measures one `SELECT 1`
round trip on an already authenticated connection, not total database or host load.
Authentication is checked on every request even when queue metrics are cached.

Two workers execute at most two claims concurrently. A test of 200 players sending
code every three seconds offers about 67 foreground jobs per second before
publication-triggered rechecks and causal comparisons. Read-only requests do not
have that cost. Compare admissions with Run/Submit completions, current queue age
and background work when tuning cooldowns or worker count. A higher queue limit
only absorbs a longer burst; it does not increase execution throughput. Test
additional workers gradually: each worker is capped at one CPU and 384 MiB by the
default Compose files, while competing publications can cause world-version
retries. Persistent overload needs a lower admission rate or more measured
processing capacity. Stop old workers before upgrading API/schema and restart
all workers from the same release; preserve the database volume.

## Execution boundary

Player source is parsed into a dedicated language tree and interpreted without host `eval`, `exec`, imports, filesystem access, subprocess calls, or networking. Execution has independent source, syntax depth, instruction, call, value, and collection limits. Interpreter subprocesses receive a minimal environment rather than database or bootstrap credentials. Linux resource limits and a parent wall timeout provide additional containment.

Resource exhaustion produces a rejected verdict; language-specific cases such as division by zero still follow the language specification. The Windows development path has the interpreter's own budgets and parent timeout; Linux containers are the production resource boundary.

Contract checking combines restricted contract bodies and bounded invariant probes. As permitted by the spec, this is testing of free-form functions, not a proof for every possible input. Administrators can disable individual override operations. Avoid claiming arbitrary hostile overrides are mathematically verified.

The updated stdlib checks add fresh unpredictable samples to the fixed boundary
corpus, enforce the shared `empty`/`length` and `concat`/`length` conditions, and
require sampled witnesses for both results of each applicable `truthy` override.
`__builtin_contains__(container, value)` is available inside stdlib definitions
only; it bypasses user membership and equality overrides. See
[`DECISIONS.md`](../server/langwarsscript/DECISIONS.md) for the bounded checking
policy and deliberate compatibility choices.

`contains` overrides are disabled in new default policies. On upgrade, the exact
old factory policy also follows that default once; custom policies are retained.
Administrators can opt back in, and later restarts preserve that choice. Existing
published overrides remain until replaced or restored. If an old operator fails
new contracts, use the administrator restore action, possibly for related
operations together. The language revision queues a one-time read-only sweep of
active solutions; it does not delete historical submissions or definitions.

The 50–150 concurrent-user target is an architectural sizing goal. CPU-heavy submissions, world size, and rejudge fan-out determine actual throughput. Benchmark representative solutions on your hardware, use queue capacity and cooldown controls to balance demand, and track worker restarts and PostgreSQL latency.

For a bounded read-only HTTP check, run `python scripts/load_probe.py --clients 150 --requests 300`. This probes public API reads, not 150 simultaneous interpreter executions. The configured workers and queue deliberately limit concurrent execution independently of connected browsers.

Schedule `docker compose exec -T api python -m server.maintenance --job-days 7 --rejected-days 30 --audit-days 180 --recheck-days 90` daily to remove expired sessions, old throttle entries, completed jobs, old rejected attempts, old audit records, and old administrative judge runs. Judge history is also capped at 200 runs per target submission. Ever-accepted submission history is retained; active entries can be rechecked after world changes. Judge logs start with this release and cannot reconstruct older executions.

`defaultTaskNameLimit` sets the cumulative distinct-name budget per player/task (30 by default). A task's nullable `namePublishLimit` and `coreOverrideLimit` inherit global limits; explicit values override them. Custom identifiers include function names, variables, parameters and references, consistently with the account budget. Only accepted publications spend names; old rechecks bypass later tightened publication limits. The task workspace shows account and task usage alongside the effective limits.

On upgrade, retained job/submission fees are attributed to tasks without double counting; fees whose historical evidence has already been deleted stay in the account total only. Startup selects one active accepted publication per player/task and recalculates scores without deleting history or world state. Stop old workers before the upgrade and resume only workers of this release.
