"""
Shared helper: load the repo-root .env into os.environ for scripts that
run on the host (docker compose auto-loads .env for containers; these
scripts don't get that for free).

PRODUCTION-READINESS.md #5 removed the LIGHTHOUSE_ADMIN_*/
LIGHTHOUSE2_ADMIN_* fallback defaults from docker-compose.yml in favor of
real generated values in .env (scripts/generate-secrets.py) — without
this, any host-run script reading os.environ.get(..., "gateway") would
silently keep using the old, no-longer-valid default the moment .env's
generated password diverges from it.
"""
from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def load_dotenv() -> None:
    """Best-effort: load KEY=value pairs from the repo-root .env into
    os.environ, without overriding anything already set (so an explicit
    `export FOO=bar` before running a script still wins)."""
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())
