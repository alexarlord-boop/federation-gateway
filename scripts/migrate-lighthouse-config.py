#!/usr/bin/env python3
"""
One-time migration for LightHouse 0.22.x's config storage model
(PRODUCTION-READINESS.md handover section — "Upgrading to 0.22.x is not
a drop-in image swap"; docs/KNOWN-ISSUES.md Bugs 5-8).

LightHouse 0.22.x moved federation endpoint config (and several other
config.yaml sections) from being read live from the file to being read
from its own database, seeded once via `lhmigrate config2db` — a tool
bundled in the LightHouse image itself, not something this repo ships.
Without running it, every public federation endpoint 404s on a fresh
0.22.x+ container even with an already-valid config.yaml — confirmed
empirically, undocumented anywhere upstream. The admin API is
unaffected either way (still read live from config.yaml).

This script, for each LightHouse instance:
  1. Runs `lhmigrate config2db` in a throwaway container against that
     instance's bind-mounted config.yaml + data directory (host-side —
     no need to stop the instance's own container first; it's a quick
     write against otherwise-idle tables, not a held transaction).
  2. Restarts every successfully-migrated instance so it picks up the
     newly-seeded config (a plain `docker compose restart`, not
     `--build` — the change lives in the bind-mounted data volume, not
     the image).

Idempotent — lhmigrate config2db reports [SKIPPED] for anything already
migrated and never overwrites without --force, so safe to re-run.

Run once after `docker compose up` and
scripts/bootstrap-lighthouse-admin-users.py, before any seed script.

Run:  python3 scripts/migrate-lighthouse-config.py
      python3 scripts/migrate-lighthouse-config.py --single-instance
      # ^ minimal footprint: only migrates `lighthouse` (see README.md's
      # "Minimal setup" section). Skipping this flag when other instances
      # aren't running is harmless too — this script works directly
      # against each instance's bind-mounted data dir via a throwaway
      # container, not the running service, so it doesn't actually need
      # those containers up. The flag just avoids the pointless work.
Requires: the `docker` CLI. Otherwise Python standard library only.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

INSTANCES = [
    "lighthouse", "lighthouse2",
    "mesh-ta", "mesh-ia", "mesh-ia2",
    "mesh-leaf-op", "mesh-leaf-rp", "mesh-leaf-multi",
    "mesh2-ta", "mesh2-ia", "mesh2-leaf-op",
]


def _lighthouse_image() -> str:
    """Read the pinned LightHouse image straight from docker-compose.yml —
    single source of truth, so this never drifts from whatever's actually
    running."""
    compose_text = (REPO_ROOT / "docker-compose.yml").read_text()
    match = re.search(r"image:\s*(oidfed/lighthouse@sha256:\S+)", compose_text)
    if not match:
        print("!! could not find a pinned oidfed/lighthouse image in docker-compose.yml", file=sys.stderr)
        sys.exit(1)
    return match.group(1)


def migrate(instance: str, image: str) -> bool:
    config_path = REPO_ROOT / instance / "config.yaml"
    data_path = REPO_ROOT / instance / "data"
    if not config_path.exists():
        print(f"  !! {instance}: no config.yaml found at {config_path}, skipping")
        return False

    result = subprocess.run(
        [
            "docker", "run", "--rm",
            "-v", f"{config_path}:/config/config.yaml:ro",
            "-v", f"{data_path}:/data",
            "--entrypoint", "/lhmigrate",
            image,
            "config2db", "--config=/config/config.yaml", "--db-dir=/data",
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"  !! {instance}: lhmigrate config2db failed:\n{result.stderr[:500]}")
        return False

    total_line = next((line for line in result.stdout.splitlines() if line.startswith("Total:")), "migrated")
    print(f"  ok {instance}: {total_line}")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--single-instance",
        action="store_true",
        help="Only migrate `lighthouse` — for the minimal ui+backend+lighthouse footprint (see README.md).",
    )
    args = parser.parse_args()

    instances = INSTANCES[:1] if args.single_instance else INSTANCES

    image = _lighthouse_image()
    print(f"Migrating LightHouse config to the database model ({image})...")

    migrated = [instance for instance in instances if migrate(instance, image)]
    failed = [instance for instance in instances if instance not in migrated]

    if migrated:
        print(f"\nRestarting {len(migrated)} instance(s) to pick up the migrated config...")
        subprocess.run(["docker", "compose", "restart", *migrated], cwd=REPO_ROOT)

    if failed:
        print(f"\nFailed to migrate: {', '.join(failed)} — see above.")
        sys.exit(1)
    print("\nDone.")


if __name__ == "__main__":
    main()
