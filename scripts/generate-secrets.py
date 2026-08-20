#!/usr/bin/env python3
"""
Generate a real, git-ignored `.env` for local/demo use from `.env.example`
(PRODUCTION-READINESS.md #5 — docker-compose.yml now fails closed on
LIGHTHOUSE_ADMIN_*, LIGHTHOUSE2_ADMIN_*, OIDC_ENCRYPTION_KEY, and
JWT_SECRET instead of falling back to weak hardcoded defaults).

Copies `.env.example` line for line, replacing each `KEY=change-me`
placeholder with a freshly generated value appropriate for that key.
Everything else (comments, the VITE_* frontend section, usernames that
already have a real default) is copied through unchanged.

Run:  python3 scripts/generate-secrets.py [--force]
Requires only the Python standard library.
"""

import base64
import os
import secrets
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_EXAMPLE = REPO_ROOT / ".env.example"
ENV_FILE = REPO_ROOT / ".env"


def _generate_fernet_key() -> str:
    # A Fernet key is exactly `base64.urlsafe_b64encode(os.urandom(32))` —
    # cryptography.fernet.Fernet.generate_key()'s own implementation, right
    # down to the byte count. No need for the `cryptography` package just to
    # produce one; it's only needed to *use* the key (backend/app/auth/crypto.py),
    # not to generate it, and this script otherwise has zero dependencies.
    return base64.urlsafe_b64encode(os.urandom(32)).decode()


# Maps each placeholder KEY to a generator function producing its real value.
GENERATORS = {
    "LIGHTHOUSE_ADMIN_PASSWORD": lambda: secrets.token_urlsafe(24),
    "LIGHTHOUSE2_ADMIN_PASSWORD": lambda: secrets.token_urlsafe(24),
    "OIDC_ENCRYPTION_KEY": _generate_fernet_key,
    "JWT_SECRET": lambda: secrets.token_urlsafe(48),
}


def main() -> None:
    force = "--force" in sys.argv

    if not ENV_EXAMPLE.exists():
        print(f"!! {ENV_EXAMPLE} not found", file=sys.stderr)
        sys.exit(1)

    if ENV_FILE.exists() and not force:
        print(f".env already exists at {ENV_FILE} — leaving it alone.")
        print("Pass --force to regenerate (this overwrites existing secrets).")
        sys.exit(0)

    if ENV_FILE.exists() and force:
        print(
            "!! Regenerating LIGHTHOUSE_ADMIN_PASSWORD/LIGHTHOUSE2_ADMIN_PASSWORD on a\n"
            "   stack that's already been bootstrapped (PRODUCTION-READINESS.md #3)?\n"
            "   scripts/bootstrap-lighthouse-admin-users.py only ever CREATES a user\n"
            "   once — it will not update an existing one's password, so the backend\n"
            "   will start getting 401s from every LightHouse instance until you also\n"
            "   rotate the password there, e.g.:\n"
            "     curl -u gateway:OLD_PASSWORD -X PUT http://localhost:8081/api/v1/admin/users/gateway \\\n"
            "       -H 'Content-Type: application/json' -d '{\"password\": \"NEW_PASSWORD\"}'\n"
            "   ...repeated per instance/port, with LIGHTHOUSE2_ADMIN_* creds for the\n"
            "   mesh2-* instances. Same story for OIDC_ENCRYPTION_KEY — rotating it\n"
            "   makes any already-stored OIDC provider client secret unreadable.\n",
            file=sys.stderr,
        )

    generated_keys = []
    lines = ENV_EXAMPLE.read_text().splitlines()
    out_lines = []
    for line in lines:
        if "=change-me" in line:
            key = line.split("=", 1)[0]
            generator = GENERATORS.get(key)
            if generator is None:
                print(f"!! no generator registered for {key!r} — leaving placeholder as-is", file=sys.stderr)
                out_lines.append(line)
                continue
            out_lines.append(f"{key}={generator()}")
            generated_keys.append(key)
        else:
            out_lines.append(line)

    ENV_FILE.write_text("\n".join(out_lines) + "\n")
    print(f"Wrote {ENV_FILE} with freshly generated values for:")
    for key in generated_keys:
        print(f"  - {key}")
    print("\n.env is gitignored — never commit it. Run `docker compose up -d --build` next.")


if __name__ == "__main__":
    main()
