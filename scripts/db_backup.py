#!/usr/bin/env python3
"""PostgreSQL 17 full/incremental backups using tools in the database container.

The repository must be mounted at /backups in that container. No passwords or
Docker socket are mounted into application containers. See docs/Backups.md.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time
import uuid


ID = re.compile(r"^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}$")


class BackupError(Exception):
    pass


def atomic_json(path, value):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    if os.name != "nt":
        descriptor = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


@contextmanager
def repository_lock(repository):
    repository.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = repository / ".backup.lock"
    try:
        lock.mkdir(mode=0o700)
    except FileExistsError:
        raise BackupError("Repository is locked; check .backup.lock/owner.json and the running backup before removing a stale lock")
    try:
        atomic_json(lock / "owner.json", {"pid": os.getpid(), "host": socket.gethostname(), "started": time.time()})
        yield
    finally:
        shutil.rmtree(lock)


class Backups:
    def __init__(self, repository, container, user="langwars"):
        self.repository = repository.resolve()
        self.container = container
        self.user = user

    def tool(self, *arguments, capture=False):
        result = subprocess.run(["docker", "exec", self.container, *arguments],
                                check=True, text=True, stdout=subprocess.PIPE if capture else None)
        return result.stdout.strip() if capture else ""

    def check_mount(self):
        marker = self.repository / ".repository-id"
        if not marker.exists():
            marker.write_text(uuid.uuid4().hex, encoding="ascii")
        if marker.is_symlink() or not re.fullmatch(r"[0-9a-f]{32}", marker.read_text(encoding="ascii")):
            raise BackupError("Invalid repository marker")
        actual = self.tool("cat", "/backups/.repository-id", capture=True)
        if actual != marker.read_text(encoding="ascii"):
            raise BackupError("Container /backups is not the selected host repository")
        version = self.tool("pg_basebackup", "--version", capture=True)
        if not re.search(r"\b17\.", version):
            raise BackupError("These backups require matching PostgreSQL 17 tools")

    def path(self, identifier):
        if not ID.fullmatch(identifier):
            raise BackupError("Invalid backup identifier")
        path = self.repository / identifier
        if path.is_symlink() or path.resolve().parent != self.repository:
            raise BackupError("Backup path escapes the repository")
        return path

    def records(self):
        records = {}
        for path in self.repository.iterdir():
            if not ID.fullmatch(path.name):
                continue
            self.path(path.name)
            metadata = path / "record.json"
            if not metadata.is_file():
                raise BackupError(f"Backup {path.name} has no completion record")
            record = json.loads(metadata.read_text(encoding="utf-8"))
            if (record.get("id") != path.name or record.get("type") not in ("full", "incremental")
                    or not isinstance(record.get("completed"), (int, float))
                    or not isinstance(record.get("systemIdentifier"), str)
                    or (record.get("parent") is not None and not ID.fullmatch(str(record["parent"])))
                    or not (path / "data" / "backup_manifest").is_file()):
                raise BackupError(f"Invalid completion record for {path.name}")
            records[path.name] = record
        for identifier in records:
            self.chain(identifier, records)
        return records

    def chain(self, identifier, records):
        chain, visited = [], set()
        while identifier:
            if identifier in visited or identifier not in records:
                raise BackupError("Backup chain is incomplete or circular")
            visited.add(identifier)
            record = records[identifier]
            chain.append(record)
            if record["type"] == "full":
                if record["parent"] is not None:
                    raise BackupError("A full backup cannot have a parent")
                break
            if not record["parent"]:
                raise BackupError("An incremental backup requires a parent")
            identifier = record["parent"]
        chain.reverse()
        if len({record["systemIdentifier"] for record in chain}) != 1:
            raise BackupError("Backup chain contains different database clusters")
        return chain

    def sql(self, query):
        return self.tool("psql", "--no-psqlrc", "--no-password", "-h", "/var/run/postgresql",
                         "-U", self.user, "-d", "postgres", "-At", "-c", query, capture=True)

    def verify(self, identifier, records):
        for record in self.chain(identifier, records):
            self.tool("pg_verifybackup", "--exit-on-error", f"/backups/{record['id']}/data")

    def select_parent(self, records, system, full_every_days, force_full=False, now=None):
        previous = max((record for record in records.values() if record["systemIdentifier"] == system),
                       key=lambda record: record["completed"], default=None)
        if force_full or previous is None:
            return None
        now = time.time() if now is None else now
        root = self.chain(previous["id"], records)[0]
        return previous if now - root["completed"] < full_every_days * 86400 else None

    def backup(self, full_every_days, keep_full, force_full=False):
        if self.sql("SHOW server_version_num")[:2] != "17":
            raise BackupError("Source database must be PostgreSQL 17")
        if self.sql("SHOW summarize_wal") != "on":
            raise BackupError("Enable summarize_wal=on before taking backups")
        if self.sql("SELECT count(*) FROM pg_tablespace WHERE spcname NOT IN ('pg_default','pg_global')") != "0":
            raise BackupError("Custom tablespaces are unsupported; configure a dedicated physical backup system")
        system = self.sql("SELECT system_identifier::text FROM pg_control_system()")
        records = self.records()
        previous = self.select_parent(records, system, full_every_days, force_full)
        full = previous is None
        identifier = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ-") + uuid.uuid4().hex[:8]
        partial = self.repository / (".partial-" + identifier)
        partial.mkdir(mode=0o700)
        command = ["pg_basebackup", "--no-password", "-h", "/var/run/postgresql", "-U", self.user,
                   "--pgdata", f"/backups/{partial.name}/data", "--format=plain", "--wal-method=stream",
                   "--checkpoint=fast", "--manifest-checksums=SHA256"]
        if not full:
            command.append(f"--incremental=/backups/{previous['id']}/data/backup_manifest")
        print(f"Taking {'full' if full else 'incremental'} backup {identifier}", flush=True)
        # A failed backup stays under .partial-* and is never a valid chain parent.
        self.tool(*command)
        self.tool("pg_verifybackup", "--exit-on-error", f"/backups/{partial.name}/data")
        record = {"id": identifier, "type": "full" if full else "incremental", "completed": time.time(),
                  "parent": None if full else previous["id"], "systemIdentifier": system}
        atomic_json(partial / "record.json", record)
        os.replace(partial, self.path(identifier))
        records[identifier] = record
        if full and keep_full:
            self.prune(records, keep_full)
        print(f"Completed and verified {identifier}", flush=True)

    def prune(self, records, keep_full):
        roots = sorted((r for r in records.values() if r["type"] == "full"),
                       key=lambda record: record["completed"], reverse=True)
        keep = {record["id"] for record in roots[:keep_full]}
        # Remove entire chains only, after a successful new full backup.
        for record in sorted(records.values(), key=lambda r: r["completed"], reverse=True):
            if self.chain(record["id"], records)[0]["id"] not in keep:
                shutil.rmtree(self.path(record["id"]))
                print(f"Expired {record['id']}", flush=True)

    def prepare(self, identifier, records, output):
        if not re.fullmatch(r"restore-[A-Za-z0-9_-]+", output):
            raise BackupError("Output must be a new repository directory named restore-NAME")
        destination = self.repository / output
        if destination.exists() or destination.is_symlink():
            raise BackupError("Restore output already exists; choose a new name")
        chain = self.chain(identifier, records)
        self.verify(identifier, records)
        self.tool("pg_combinebackup", "--manifest-checksums=SHA256", "--output", f"/backups/{output}",
                  *(f"/backups/{record['id']}/data" for record in chain))
        self.tool("pg_verifybackup", "--exit-on-error", f"/backups/{output}")
        print(f"Prepared and verified {destination}; start a separate PostgreSQL 17 instance to test recovery")


def positive(value):
    value = int(value)
    if value < 1:
        raise argparse.ArgumentTypeError("Must be at least 1")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", required=True, help="Database or recovery-tools container with /backups mounted")
    parser.add_argument("--repository", required=True, type=Path, help="Same backup directory on this Docker host")
    parser.add_argument("--user", default="langwars", help="Local PostgreSQL replication/superuser role")
    commands = parser.add_subparsers(dest="action", required=True)
    backup = commands.add_parser("backup", help="Take an incremental backup, or a full backup when due")
    backup.add_argument("--full-every-days", type=positive, default=7)
    backup.add_argument("--keep-full", type=positive, default=3, help="Retain this many complete full-backup chains")
    backup.add_argument("--full", action="store_true", help="Start a new full chain immediately")
    commands.add_parser("list", help="List completed backups")
    verify = commands.add_parser("verify", help="Verify every backup in the selected chain")
    verify.add_argument("backup", help="Backup identifier or latest")
    prepare = commands.add_parser("prepare", help="Verify and combine a chain into a fresh restore directory")
    prepare.add_argument("backup", help="Backup identifier or latest")
    prepare.add_argument("--output", required=True, help="New directory under repository, e.g. restore-test")
    args = parser.parse_args()
    if args.container.startswith("-"):
        parser.error("Invalid container name")
    try:
        with repository_lock(args.repository):
            backups = Backups(args.repository, args.container, args.user)
            backups.check_mount()
            if args.action == "backup":
                backups.backup(args.full_every_days, args.keep_full, args.full)
            else:
                records = backups.records()
                if args.action == "list":
                    for record in sorted(records.values(), key=lambda r: r["completed"]):
                        print(record["id"], record["type"], "parent=" + (record["parent"] or "-"))
                else:
                    if not records:
                        raise BackupError("Repository has no completed backups")
                    identifier = max(records, key=lambda key: records[key]["completed"]) if args.backup == "latest" else args.backup
                    if args.action == "verify":
                        backups.verify(identifier, records)
                    else:
                        backups.prepare(identifier, records, args.output)
    except (BackupError, subprocess.CalledProcessError, OSError, ValueError, KeyError) as error:
        # Connection commands contain no passwords. Docker/PG errors retain their diagnostics.
        print(f"Backup failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
