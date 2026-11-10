# Operating LangWars

The supplied stack runs PostgreSQL, one API process, a static nginx frontend, and independently scalable workers. It deliberately uses PostgreSQL for the queue as well as the world store, avoiding a second stateful queue service on small hosts. Queue claims use PostgreSQL's documented [`FOR UPDATE SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html) pattern.

## Resources and ingress

Start with two worker containers on a 4 GB host. The Compose memory ceilings are 512 MB for PostgreSQL, 384 MB for the API, 128 MB for nginx, and 384 MB for each worker. Each worker's interpreter process defaults to a separate 256 MB address-space limit on Linux and a 20 second wall-clock timeout. These are ceilings, not measurements of expected consumption. Leave memory for Docker, the OS, filesystem cache, and a TLS proxy. Add workers according to CPU availability and measured queue wait time.

The default HTTP port binds to loopback. Put an HTTPS reverse proxy in front of port 8080 for public hosting. Set `HTTP_BIND` to an appropriate interface only if direct access is intended. The API and database have no public host ports in the default configuration. Keep `.env` out of source control. The database password is interpolated into a URL, so use URL-safe random characters or percent-encode it consistently.

The server and worker containers run as an unprivileged user, with a read-only root filesystem, no Linux capabilities, no privilege escalation, a process limit, and a small temporary filesystem. They never mount the Docker socket or host directories. These use the [standard Compose service constraints](https://docs.docker.com/reference/compose-file/services/).

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
