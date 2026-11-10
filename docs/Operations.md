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

## Accounts, invitations, and visibility

Passwords use scrypt with `N=32768`, `r=8`, `p=3`, a fresh 16-byte random salt and a 32-byte derived hash. The stored record includes the parameters, and verification uses a constant-time comparison. These work factors match one of the [OWASP scrypt configurations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Three concurrent hashing slots cap hashing memory at roughly 96 MiB; hashing does not hold the shared-world lock. Bearer sessions and invitation secrets are stored only as SHA-256 digests of high-entropy random tokens.

After three failed logins, persisted per-account delays grow from one second to a maximum of 60 seconds; a 15-minute quiet period resets the failure count. Unknown usernames use the same password work and delay rules. Authentication also has per-account and gateway request budgets; nginx allows 60 authentication requests per minute per client with a burst of 150 to accommodate a shared venue NAT. Throttled requests return 429 and login timeouts include `Retry-After`. Password resets, bans, deletion, and logout revoke the relevant sessions. There is no email recovery flow; an administrator resets passwords.

Registration defaults to invitation-only. An invitation permits 1–500 registrations and expires in 1–168 hours; defaults are one registration and 24 hours. For a presentation, set the intended audience size and expiry, then copy the generated link. It has the form `https://your.domain.example/auth#invite=TOKEN`: fragments are absent from HTTP requests, and the form clears the fragment after reading it. Keep the link when it is first shown because the server cannot recover plaintext invitation tokens. A manually supplied token can also be converted to a link. Revoke the link after the event if capacity remains. Anyone holding a valid link can use its remaining registrations.

World visibility has four independent policies: variable names, variable values, function names, and function bodies/signatures. `admin_only` names remove the corresponding entries completely; hidden values produce names-only entries and never return function bodies, signatures, or remembered results. Administrators always retain full access. These settings control inspection through the website/API. The shared language can still compute with shared values, and deliberately public function bodies may mention variable names; visibility is not a new language isolation boundary.

This release intentionally requires a fresh database. To discard the old development accounts, sessions, invitations, and world state, stop this application's stack and remove its PostgreSQL volume with `docker compose down --volumes`, then start the new stack. This deletes application data; schema and password-format migrations are deliberately absent.

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

Back up before upgrading. Store backups outside this machine and test restoring them into a separate empty PostgreSQL database using `pg_restore`. Database backups contain password hashes, session hashes, private code, and administrator audit records. Preserve them accordingly.

Deleting a user revokes their sessions. Published definitions remain part of the shared world until superseded or restored by an administrator, so deleting an account does not silently roll back other players' environment. Resetting a password also revokes active sessions.

Use the admin override restore action when a shared operation needs to return to its built-in behavior. Rejudging is read-only: it must never republish the original code's values. Scores count each currently passing task once per user, so repeated submissions do not farm points.

## Execution boundary

Player source is parsed into a dedicated language tree and interpreted without host `eval`, `exec`, imports, filesystem access, subprocess calls, or networking. Execution has independent source, syntax depth, instruction, call, value, and collection limits. Interpreter subprocesses receive a minimal environment rather than database or bootstrap credentials. Linux resource limits and a parent wall timeout provide additional containment.

Resource exhaustion produces a rejected verdict; language-specific cases such as division by zero still follow the language specification. The Windows development path has the interpreter's own budgets and parent timeout; Linux containers are the production resource boundary.

Contract checking combines restricted contract bodies and bounded invariant probes. As permitted by the spec, this is testing of free-form functions, not a proof for every possible input. Administrators can disable individual override operations. Avoid claiming arbitrary hostile overrides are mathematically verified.

The 50–150 concurrent-user target is an architectural sizing goal. CPU-heavy submissions, world size, and rejudge fan-out determine actual throughput. Benchmark representative solutions on your hardware, use queue capacity and cooldown controls to balance demand, and track worker restarts and PostgreSQL latency.

For a bounded read-only HTTP check, run `python scripts/load_probe.py --clients 150 --requests 300`. This probes public API reads, not 150 simultaneous interpreter executions. The configured workers and queue deliberately limit concurrent execution independently of connected browsers.

Schedule `docker compose exec -T api python -m server.maintenance --job-days 7 --rejected-days 30 --audit-days 180` daily to remove expired sessions, old throttle entries, completed jobs, old rejected attempts, and old audit records. Ever-accepted submission history is retained because it can be rechecked after world changes.
