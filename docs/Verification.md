# Verification — 10 November 2026

- **62 server tests passed inside the Linux Docker image**, including real PostgreSQL tests in a disposable schema. None were skipped in this run.
- **31 frontend tests passed**, and the TypeScript/Vite production build passed both locally and in Docker.
- The updated frontend dependency tree reported **zero npm audit vulnerabilities**, including development dependencies.
- Python dependency audit checked **20 resolved packages** and reported **no known vulnerabilities**.
- Base and public Compose configurations validated. PostgreSQL, API, nginx, Caddy, and two workers started successfully with the supplied resource and filesystem restrictions.
- All **ten task reference implementations** passed complete submissions through HTTPS → Caddy → nginx → API → PostgreSQL queue → Linux interpreter subprocess → publication. All ten unfinished starters returned wrong-answer verdicts as intended; reference solutions live only in test fixtures.
- HTTPS was checked with hostname/certificate verification enabled using a disposable local CA. HTTP redirected to HTTPS, HSTS was present, and a forged `X-Forwarded-For` header did not become nginx's client identity. Real-domain ACME issuance remains dependent on the operator's DNS and reachable ports.
- Privacy tests covered all sixteen visibility-policy combinations for guest, player and administrator roles, including hidden bodies/signatures/remembered results. Authentication tests covered randomized salts, bounded hash parameters, unknown-account parity, persistent backoff across restart, and request rate limits. Invite tests covered expiry, revocation, reuse caps and concurrent single-use redemption.
- HTTP smoke and integration checks covered authorization, private job access, hidden-test redaction, password-reset session revocation, task ranking, timeout and syntax verdicts, SPA routes, and security headers.
- The earlier read-only probe sent **300 requests with 150 concurrent clients**: 300 HTTP 200 responses, 3.76 seconds overall, 1.66 seconds median request latency and 2.22 seconds p95 on this development environment. This used public read endpoints before the invite-only release; it is not a measurement of interpreter throughput or a production capacity guarantee.
- The Nix npm dependency hash was recomputed after the dependency updates. A complete Nix package build was not run.
- Visual browser QA could not be completed: embedded browser access was unavailable, and native browser capture remained unavailable after window recovery. UI verification consists of the production build, automated tests, and HTTP checks.

The server suite covers language arithmetic/casts, mutable dictionary keys, aliases,
overload selection, source-scoped `comefrom`, contracts and restoration, frozen
recheck state, malicious syntax, resource budgets, Unicode moderation, account
controls, stable history pagination, publication races, worker lease recovery,
and solve → break → repair with score recalculation. Its adversarial checks include
300 deterministic malformed programs and 120 integer arithmetic comparisons
against an independent oracle.

The [interpreter decisions](../server/langwarsscript/DECISIONS.md) describe limits
of sampled contract verification and choices made where the working specification
is ambiguous. The [operations guide](Operations.md) covers deployment, resource
ceilings, VPN workers, backups, and maintenance.
