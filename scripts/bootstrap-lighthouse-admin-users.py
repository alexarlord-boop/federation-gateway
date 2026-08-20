#!/usr/bin/env python3
"""
One-time bootstrap for LightHouse's admin API auth (`api.admin.users_enabled:
true` in every config.yaml — see PRODUCTION-READINESS.md #3).

LightHouse enforces nothing on its admin API until at least one user
exists in its own per-instance user store; while zero users exist,
`POST /api/v1/admin/users/` is itself unauthenticated. So this script:

  1. GETs /api/v1/admin/users/ unauthenticated — 200 means "not yet
     bootstrapped" (create the user), 401 means "already done" (skip,
     safe to re-run).
  2. On not-yet-bootstrapped, POSTs a user using the SAME credentials
     already flowing through this deployment (LIGHTHOUSE_ADMIN_USERNAME/
     PASSWORD, LIGHTHOUSE2_ADMIN_USERNAME/PASSWORD) — the backend's own
     proxy (backend/app/routers/proxy.py) and every seed script already
     send exactly these on every request, so nothing else needs to
     change once this has run.

Run once after `docker compose up`, before scripts/seed-demo.py,
scripts/seed-mesh.py, or scripts/seed-mesh2.py (they now need real auth
too — see docs/FEDERATION-TOPOLOGY.md).

Run:  python3 scripts/bootstrap-lighthouse-admin-users.py
Requires only the Python standard library.
"""

import json
import os
import sys
import urllib.error
import urllib.request

from _dotenv import load_dotenv

load_dotenv()

LIGHTHOUSE_USER = os.environ.get("LIGHTHOUSE_ADMIN_USERNAME", "gateway")
LIGHTHOUSE_PASS = os.environ.get("LIGHTHOUSE_ADMIN_PASSWORD", "gateway")
LIGHTHOUSE2_USER = os.environ.get("LIGHTHOUSE2_ADMIN_USERNAME", "gateway2")
LIGHTHOUSE2_PASS = os.environ.get("LIGHTHOUSE2_ADMIN_PASSWORD", "gateway2")

# (display name, admin base URL, username, password) — published host
# ports, same convention as scripts/seed-mesh.py (this script runs on
# the host, not inside the docker network).
INSTANCES = [
    ("lighthouse", "http://localhost:8081/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("lighthouse2", "http://localhost:8082/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh-ta", "http://localhost:8090/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh-ia", "http://localhost:8091/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh-leaf-op", "http://localhost:8092/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh-leaf-rp", "http://localhost:8093/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh-ia2", "http://localhost:8097/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh-leaf-multi", "http://localhost:8098/api/v1/admin", LIGHTHOUSE_USER, LIGHTHOUSE_PASS),
    ("mesh2-ta", "http://localhost:8094/api/v1/admin", LIGHTHOUSE2_USER, LIGHTHOUSE2_PASS),
    ("mesh2-ia", "http://localhost:8095/api/v1/admin", LIGHTHOUSE2_USER, LIGHTHOUSE2_PASS),
    ("mesh2-leaf-op", "http://localhost:8096/api/v1/admin", LIGHTHOUSE2_USER, LIGHTHOUSE2_PASS),
]


def bootstrap(name, admin_base, username, password):
    users_url = f"{admin_base}/users/"

    # Unauthenticated probe: 200 = no users yet, 401 = already bootstrapped.
    try:
        urllib.request.urlopen(urllib.request.Request(users_url, method="GET"))
        already_done = False
    except urllib.error.HTTPError as e:
        if e.code == 401:
            already_done = True
        else:
            print(f"  !! {name}: unexpected {e.code} probing {users_url}")
            return False

    if already_done:
        print(f"  .. {name}: already bootstrapped, skipping")
        return True

    body = json.dumps(
        {"username": username, "password": password, "display_name": "Gateway Backend"}
    ).encode()
    req = urllib.request.Request(
        users_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
        print(f"  ok {name}: bootstrap admin user created")
        return True
    except urllib.error.HTTPError as e:
        print(f"  !! {name}: POST {users_url} -> HTTP {e.code}: {e.read().decode()[:200]}")
        return False


def main():
    print("Bootstrapping LightHouse admin API users...")
    ok = True
    for name, admin_base, username, password in INSTANCES:
        ok = bootstrap(name, admin_base, username, password) and ok
    if not ok:
        print("One or more instances failed to bootstrap — see above.")
        sys.exit(1)
    print("Done.")


if __name__ == "__main__":
    main()
