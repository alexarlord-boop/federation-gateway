#!/usr/bin/env python3
"""
Snapshot every SQLite DB and LightHouse signing key in this deployment
into one timestamped archive (PRODUCTION-READINESS.md #6).

Covers `backend/data/backend.db` (users, RBAC config, audit history,
instance registry) and, for every LightHouse instance
(`lighthouse`/`lighthouse2`/`mesh-*`/`mesh2-*`), `data/lighthouse.db` +
`data/keys/*.pem` — losing a signing key is a genuinely different
severity of loss than losing a database, since it can't be regenerated
to the same identity (a fresh key means a fresh entity, breaking every
already-established trust relationship).

Safe to run while the stack is up: every `.db` file is snapshotted via
SQLite's own online backup API (`sqlite3.Connection.backup()`), the same
mechanism the `sqlite3 <db> ".backup ..."` CLI command uses — safe
against concurrent writes, not a raw file copy of a possibly-mid-write
file. Key files are static once written (KMS rotation is infrequent and
not something normally happening mid-backup) so a plain copy is fine.

Run:  python3 scripts/backup.py [--out DIR]
Requires only the Python standard library. Writes to ./backups/ by
default (gitignored) — see scripts/restore.py to restore one.
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import tarfile
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# (archive-relative name, path to the data dir relative to REPO_ROOT,
# db filename within it — None for backend, which has no keys/ dir).
BACKEND = ("backend", "backend/data", "backend.db")
LIGHTHOUSE_INSTANCES = [
    "lighthouse", "lighthouse2",
    "mesh-ta", "mesh-ia", "mesh-ia2",
    "mesh-leaf-op", "mesh-leaf-rp", "mesh-leaf-multi",
    "mesh2-ta", "mesh2-ia", "mesh2-leaf-op",
]


def _backup_sqlite_db(src: Path, dst: Path) -> None:
    """Online backup — safe even if the source is open for writes by a
    running container right now."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    src_conn = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
    dst_conn = sqlite3.connect(dst)
    try:
        src_conn.backup(dst_conn)
    finally:
        dst_conn.close()
        src_conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(REPO_ROOT / "backups"), help="directory to write the archive into")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    staging = out_dir / f".staging-{timestamp}"
    staging.mkdir()

    try:
        print("Backing up:")

        name, data_dir, db_name = BACKEND
        db_path = REPO_ROOT / data_dir / db_name
        if db_path.exists():
            _backup_sqlite_db(db_path, staging / name / db_name)
            print(f"  ok {name}/{db_name} ({db_path.stat().st_size:,} bytes)")
        else:
            print(f"  .. {name}: no {db_name} found, skipping")

        for instance in LIGHTHOUSE_INSTANCES:
            data_dir = REPO_ROOT / instance / "data"
            db_path = data_dir / "lighthouse.db"
            keys_dir = data_dir / "keys"

            if db_path.exists():
                _backup_sqlite_db(db_path, staging / instance / "lighthouse.db")
                print(f"  ok {instance}/lighthouse.db ({db_path.stat().st_size:,} bytes)")
            else:
                print(f"  .. {instance}: no lighthouse.db found, skipping")

            if keys_dir.exists():
                key_files = [f for f in keys_dir.iterdir() if f.is_file()]
                dst_keys_dir = staging / instance / "keys"
                dst_keys_dir.mkdir(parents=True, exist_ok=True)
                for key_file in key_files:
                    shutil.copy2(key_file, dst_keys_dir / key_file.name)
                print(f"  ok {instance}/keys/ ({len(key_files)} key file(s))")

        archive_path = out_dir / f"backup-{timestamp}.tar.gz"
        with tarfile.open(archive_path, "w:gz") as tar:
            for child in staging.iterdir():
                tar.add(child, arcname=child.name)

        print(f"\nWrote {archive_path} ({archive_path.stat().st_size:,} bytes).")
        print(f"Restore with: python3 scripts/restore.py {archive_path}")
    finally:
        shutil.rmtree(staging, ignore_errors=True)


if __name__ == "__main__":
    main()
