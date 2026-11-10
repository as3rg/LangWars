# Verification — 10 November 2026

- **47 server tests passed inside the Linux Docker image**, including real PostgreSQL tests in a disposable schema. None were skipped in this run.
- **24 frontend tests passed**, and the TypeScript/Vite production build passed both locally and in Docker.
- The updated frontend dependency tree reported **zero npm audit vulnerabilities**, including development dependencies.
- Compose configuration validated, and PostgreSQL, API, nginx, and two workers started successfully with the supplied resource and filesystem restrictions.
- All four seeded task starters passed visible runs and complete submissions through HTTP → nginx → API → PostgreSQL queue → Linux interpreter subprocess → publication.
- HTTP smoke and integration checks covered authorization, private job access, hidden-test redaction, password-reset session revocation, task ranking, timeout and syntax verdicts, SPA routes, and security headers.
- A read-only probe sent **300 requests with 150 concurrent clients**: 300 HTTP 200 responses, 3.76 seconds overall, 1.66 seconds median request latency and 2.22 seconds p95 on this development environment. This used public read endpoints; it is not a measurement of interpreter throughput or a production capacity guarantee.
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
