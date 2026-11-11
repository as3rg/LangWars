# Database backups and recovery

`scripts/db_backup.py` takes real PostgreSQL 17 physical incremental backups, with a
full backup every configurable number of days. It uses the PostgreSQL tools already
inside `postgres:17-alpine`; the host needs Python 3.10+ and Docker CLI access.
No additional image, Python dependency, database port or public endpoint is needed.

Each backup includes the WAL needed to start it. Recovery restores the whole
cluster to a completed backup, including accounts, jobs, submissions and world
state. It does not provide recovery to arbitrary timestamps between backups.
With the hourly example below, the normal recovery point is the last successful
hourly backup; monitor failures because an unsuccessful backup increases that gap.
PostgreSQL documents [incremental backups](https://www.postgresql.org/docs/17/continuous-archiving.html#BACKUP-INCREMENTAL-BACKUP),
[streamed WAL](https://www.postgresql.org/docs/17/app-pgbasebackup.html), and
[combining backup chains](https://www.postgresql.org/docs/17/app-pgcombinebackup.html).

## Enable

On the Docker host, create a directory outside the checkout and PostgreSQL data
volume. Prefer a separate disk. Backups contain private code and password/session
hashes; restrict the directory and encrypt the disk and off-host copies.

```sh
sudo install -d -m 700 /srv/langwars-backups
```

Set `BACKUP_DIR=/srv/langwars-backups` in `.env`, then add the backup overlay to
your usual Compose command (retain HTTPS/VPN overlays if used):

```sh
docker compose -f compose.yaml -f compose.backup.yaml up -d --scale worker=2
docker compose -f compose.yaml -f compose.backup.yaml ps db
```

The overlay mounts this directory at `/backups` and enables `summarize_wal` with
14-day WAL-summary retention. The database is briefly restarted when its command
changes. It does not reset the database. Use the backup overlay in future deploys
too. [WAL summaries](https://www.postgresql.org/docs/17/runtime-config-wal.html#RUNTIME-CONFIG-WAL-SUMMARIZATION)
must cover the interval since the previous backup. If summaries were disabled or
missing, fix the setting and take a new full backup using `--full`.

Use the actual database container name from `compose ps` in these commands. The
default project normally names it `langwars-db-1`:

```sh
sudo python3 scripts/db_backup.py --container langwars-db-1 --repository /srv/langwars-backups backup --full-every-days 7 --keep-full 3
sudo python3 scripts/db_backup.py --container langwars-db-1 --repository /srv/langwars-backups list
sudo python3 scripts/db_backup.py --container langwars-db-1 --repository /srv/langwars-backups verify latest
```

The first invocation takes a full backup. Subsequent invocations take incrementals
until the full backup is seven days old. `--full` starts a new chain immediately.
`--keep-full 3` keeps the newest three full backups **and every incremental belonging
to those chains**. Older complete chains are removed only after a new full backup
has finished and passed verification. Size storage for those chains, an in-progress
full backup and space for a reconstructed full backup during recovery. Frequent
incrementals still carry WAL and small files, so measure actual disk usage.

The script connects through the container's local PostgreSQL socket as the existing
`langwars` superuser (override with `--user`). Stock PostgreSQL-image local socket
authentication permits this; if you harden `pg_hba.conf`, allow a suitable local
backup role with replication access. It never passes passwords in command arguments.
Only PostgreSQL 17 and the default tablespaces are supported. For custom tablespaces,
cross-major upgrades or continuous PITR, use a dedicated backup system.

## Schedule

Install this in root's crontab on the same Docker host, using absolute paths. This
example runs hourly, full every seven days, retaining three complete full chains:

```cron
0 * * * * /usr/bin/python3 /opt/langwars/scripts/db_backup.py --container langwars-db-1 --repository /srv/langwars-backups backup --full-every-days 7 --keep-full 3 >> /var/log/langwars-backup.log 2>&1
```

Adjust the checkout path, container name and Python path. Cron determines the
invocation interval; the script determines whether a full backup is due. Backups
use a fast checkpoint, which can briefly increase database disk I/O. Prefer quieter
times for long full backups and use log rotation for the log file.

Monitor the exit status/log and the age of the newest completed `record.json`.
Failed backups exit nonzero and remain under `.partial-*` for inspection; they are
never selected as a parent or counted as complete. After confirming no process is
using them, remove only the failed partial directory. A repository lock prevents
overlapping backup, verification and restore-preparation commands. If the process
or host is killed, check `.backup.lock/owner.json` and ensure it is no longer
running before removing that stale lock directory.

Back up this directory to a second host using encrypted transport/storage after
successful runs. Preserve the whole selected chain, including every `record.json`,
`backup_manifest`, data directory and WAL file. Do not copy `.partial-*` or
`.backup.lock`, or prune individual incrementals. A backup on the database's disk
alone cannot recover from loss of that machine. Keep at least one independently
retained off-host full chain; do not let a local mistake immediately erase all
off-host history. Keep the release image tags and deployment secrets separately.

## Portainer

The published stack can use the same mechanism without rebuilding images. On the
Docker host create the restricted backup directory above. In the stack's `db`
service, replace `command` and add the bind mount alongside the existing data volume:

```yaml
services:
  db:
    command: [postgres, -c, shared_buffers=128MB, -c, max_connections=80, -c, summarize_wal=on, -c, wal_summary_keep_time=14d]
    volumes:
      - postgres:/var/lib/postgresql/data
      - type: bind
        source: /srv/langwars-backups
        target: /backups
        bind:
          create_host_path: false
```

Redeploy. Copy `scripts/db_backup.py` onto that Docker host, find the actual database
container name in Portainer, and use it in the script and cron commands. Run the
script on that host; the repository path and container mount must refer to the same
directory. No Docker socket needs to be mounted into any stack service.

## Recover into a new volume

Rehearse this before relying on backups. Work on a Docker host with the backup
repository and matching PostgreSQL 17 image. Keep original backup directories
unchanged. If the production database container is unavailable, start a tools-only
container with the repository mounted:

```sh
docker run -d --name langwars-recovery-tools --entrypoint sleep --mount type=bind,source=/srv/langwars-backups,target=/backups postgres:17-alpine infinity
sudo python3 scripts/db_backup.py --container langwars-recovery-tools --repository /srv/langwars-backups list
sudo python3 scripts/db_backup.py --container langwars-recovery-tools --repository /srv/langwars-backups prepare latest --output restore-check
```

Choose a specific backup identifier instead of `latest` to recover an earlier
completed backup. Preparation verifies every required backup with
[`pg_verifybackup`](https://www.postgresql.org/docs/17/app-pgverifybackup.html), combines
the full/incremental chain in the required order, then verifies the reconstructed
full backup. Existing output directories are refused. Choose another `restore-NAME`
for another attempt. It never writes to live `PGDATA`.

Create a **new, uniquely named** data volume, then copy the prepared cluster into
it. These commands refuse a nonempty target and leave the original database volume
and backups untouched:

```sh
docker volume create langwars_recovered_20261111
docker run --rm --entrypoint sh \
  --mount type=bind,source=/srv/langwars-backups,target=/backups,readonly \
  --mount type=volume,source=langwars_recovered_20261111,target=/restore \
  postgres:17-alpine -c 'test -z "$(ls -A /restore)" && cp -a /backups/restore-check/. /restore/ && chown -R postgres:postgres /restore && chmod 700 /restore'
docker run -d --name langwars-recovery-check --network none \
  --mount type=volume,source=langwars_recovered_20261111,target=/var/lib/postgresql/data \
  postgres:17-alpine
docker logs langwars-recovery-check
docker exec langwars-recovery-check psql -U langwars -d langwars -c "SELECT kind,count(*) FROM records WHERE kind IN ('users','submissions') GROUP BY kind;"
```

Verify representative users, submissions and shared state, not just row counts.
The restored database uses its backed-up roles/passwords; initialization environment
variables do not reset an existing database. Verification tools cannot replace
starting the database and checking real application data.

For a recovery drill, stop and remove only the temporary check/tools containers
when finished; keep or explicitly remove the disposable recovery volume according
to your drill policy. For production recovery:

1. Stop API and **all workers, including remote VPN workers**, then stop the old
   database. Stop `langwars-recovery-check` before using its volume elsewhere.
   Never attach two running database servers to one data volume.
2. Preserve the original volume for investigation or rollback. In a new
   `restore.compose.yaml`, point the `postgres` volume to the recovered external one:

   ```yaml
   volumes:
     postgres:
       external: true
       name: langwars_recovered_20261111
   ```

3. Add this file **last** to your usual Compose deployment command. For example:

   ```sh
   docker compose -f compose.yaml -f compose.backup.yaml -f restore.compose.yaml up -d --scale worker=2
   ```

   In Portainer, make the equivalent `volumes.postgres` change in the existing stack
   and redeploy with the matching application release. Retain the override on future
   redeploys so the stack continues using the recovered volume.
4. Check `/api/health`, sign in as an administrator, inspect tasks/world/rating and
   recent submissions, then restart remote workers with the same application release.
   Queued/in-progress jobs from the backup may be retried through normal leases.
5. Take a new `backup --full` after recovery to start a fresh backup chain before
   resuming the regular schedule. Do the same after changing checksum settings or
   replacing/reinitializing a cluster.

Do not use `docker compose down --volumes` as a recovery step.
