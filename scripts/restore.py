#!/usr/bin/env python3
"""
Restore a backup made by scripts/backup.py (PRODUCTION-READINESS.md #6).

Refuses to run while any part of the docker compose stack is up — no
override for this check. Overwriting a SQLite DB or a signing-key file
out from under a container that has it open is exactly the kind of
mistake that makes this feature exist in the first place; `docker
compose down` first is one extra step, not an unreasonable one.

DB files are fully replaced (a database is one atomic unit — there's no
meaningful way to "merge" two). Signing keys are copied in additively:
a file already on disk that isn't in the backup is left alone, so
restoring an older backup can't silently destroy newer key material
that happens to exist locally.

Run:  python3 scripts/restore.py path/to/backup-<timestamp>.tar.gz --force
Requires only the Python standard library.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

LIGHTHOUSE_INSTANCES = [
    "lighthouse", "lighthouse2",
    "mesh-ta", "mesh-ia", "mesh-ia2",
    "mesh-leaf-op", "mesh-leaf-rp", "mesh-leaf-multi",
    "mesh2-ta", "mesh2-ia", "mesh2-leaf-op",
]


def _stack_is_up() -> bool:
    try:
        result = subprocess.run(
            ["docker", "compose", "ps", "--format", "json"],
            cwd=REPO_ROOT, check=True, capture_output=True, text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Can't tell — err on the side of caution and treat as "up" so a
        # broken `docker compose ps` doesn't turn into a bypass.
        return True

    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("State") == "running":
            return True
    return False


def _restore_db(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _restore_keys(src_dir: Path, dst_dir: Path) -> int:
    dst_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for key_file in src_dir.iterdir():
        if key_file.is_file():
            shutil.copy2(key_file, dst_dir / key_file.name)
            count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", help="path to a backup-<timestamp>.tar.gz from scripts/backup.py")
    parser.add_argument("--force", action="store_true", help="required — this overwrites current data")
    args = parser.parse_args()

    archive_path = Path(args.archive)
    if not archive_path.exists():
        print(f"!! {archive_path} not found", file=sys.stderr)
        sys.exit(1)

    if _stack_is_up():
        print(
            "!! The docker compose stack is currently up. Restoring into a live\n"
            "   container's open database/key files can corrupt them. Run\n"
            "   `docker compose down` first, then re-run this.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not args.force:
        print("This will overwrite backend/data/backend.db and every LightHouse")
        print("instance's data/lighthouse.db + data/keys/* with the contents of:")
        print(f"  {archive_path}")
        print("\nPass --force to actually do it.")
        sys.exit(0)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(tmp_path)

        print("Restoring:")

        backend_db = tmp_path / "backend" / "backend.db"
        if backend_db.exists():
            _restore_db(backend_db, REPO_ROOT / "backend" / "data" / "backend.db")
            print("  ok backend/backend.db")

        for instance in LIGHTHOUSE_INSTANCES:
            src_dir = tmp_path / instance
            if not src_dir.exists():
                continue

            db_src = src_dir / "lighthouse.db"
            if db_src.exists():
                _restore_db(db_src, REPO_ROOT / instance / "data" / "lighthouse.db")
                print(f"  ok {instance}/lighthouse.db")

            keys_src = src_dir / "keys"
            if keys_src.exists():
                count = _restore_keys(keys_src, REPO_ROOT / instance / "data" / "keys")
                print(f"  ok {instance}/keys/ ({count} key file(s))")

    print("\nDone. Run `docker compose up -d --build` next.")


if __name__ == "__main__":
    main()
