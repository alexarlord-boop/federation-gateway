"""
Integration tests against the REAL running mesh-* LightHouse containers
(see docker-compose.yml, docs/FEDERATION-TOPOLOGY.md, MESH-TESTING-PROGRESS.md).

Unlike backend/tests/ (mocked httpx, runs against the built backend image,
no network needed), these hit live HTTP endpoints on published localhost
ports and require `docker compose up -d --build` to already be running —
same split as e2e's @bff vs @proxy tags. Deliberately a top-level sibling
of backend/tests/, not nested inside it: nesting would pull in
backend/tests/conftest.py, which imports the full FastAPI app (Python
3.10+ syntax) — fine via the built image, but this suite runs on the HOST
(see below), where backend/.venv is the stale, pinned-3.9 environment
CLAUDE.md warns about. This suite never imports `app.*`, so that
constraint doesn't apply to it as long as it stays out of that conftest's
reach.

Un-reachability is handled by skipping the whole package at collection
time (rather than a pytest marker) — robust regardless of how pytest is
invoked.

Run on the HOST — some tests need `docker compose restart mesh-ia` to
deterministically bust LightHouse's in-process entity-statement cache (see
test_metadata_policy.py's docstring), which needs the host's docker CLI.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent))
from _lighthouse_client import LightHouseAdmin, wait_healthy  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_dotenv() -> None:
    """Best-effort: load KEY=value pairs from the repo-root .env into
    os.environ (without overriding anything already set). docker compose
    auto-loads .env for the containers; this suite runs on the host, so
    without this it would silently fall back to stale/wrong credentials
    the moment .env's values diverge from any hardcoded fallback here —
    exactly what generate-secrets.py's random passwords do on purpose
    (PRODUCTION-READINESS.md #5)."""
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()

# All mesh-* instances share one admin credential pair (see
# backend/config/gateway.yaml) — run scripts/bootstrap-lighthouse-admin-users.py
# first if you haven't (PRODUCTION-READINESS.md #3).
_MESH_AUTH = (
    os.environ.get("LIGHTHOUSE_ADMIN_USERNAME", "gateway"),
    os.environ.get("LIGHTHOUSE_ADMIN_PASSWORD", "gateway"),
)

MESH_TA = LightHouseAdmin("http://localhost:8090", auth=_MESH_AUTH)
MESH_IA = LightHouseAdmin("http://localhost:8091", auth=_MESH_AUTH)
MESH_LEAF_OP = LightHouseAdmin("http://localhost:8092", auth=_MESH_AUTH)
MESH_LEAF_RP = LightHouseAdmin("http://localhost:8093", auth=_MESH_AUTH)
MESH_IA2 = LightHouseAdmin("http://localhost:8097", auth=_MESH_AUTH)
MESH_LEAF_MULTI = LightHouseAdmin("http://localhost:8098", auth=_MESH_AUTH)

MESH_TA_EID = "http://mesh-ta:8080"
MESH_IA_EID = "http://mesh-ia:8080"
MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"
MESH_LEAF_RP_EID = "http://mesh-leaf-rp:8080"
MESH_IA2_EID = "http://mesh-ia2:8080"
MESH_LEAF_MULTI_EID = "http://mesh-leaf-multi:8080"


def _mesh_reachable() -> bool:
    try:
        resp = httpx.get(
            "http://localhost:8090/.well-known/openid-federation", timeout=1.5
        )
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


if not _mesh_reachable():
    pytest.skip(
        "mesh stack not reachable at localhost:8090 — run "
        "`docker compose up -d --build` (and `python3 scripts/seed-mesh.py` "
        "if the chain isn't wired yet) before running mesh_integration "
        "tests. See docs/TESTING.md.",
        allow_module_level=True,
    )


@pytest.fixture(scope="session")
def mesh_ta() -> LightHouseAdmin:
    return MESH_TA


@pytest.fixture(scope="session")
def mesh_ia() -> LightHouseAdmin:
    return MESH_IA


@pytest.fixture(scope="session")
def mesh_leaf_op() -> LightHouseAdmin:
    return MESH_LEAF_OP


@pytest.fixture(scope="session")
def mesh_leaf_rp() -> LightHouseAdmin:
    return MESH_LEAF_RP


@pytest.fixture(scope="session")
def mesh_ia2() -> LightHouseAdmin:
    return MESH_IA2


@pytest.fixture(scope="session")
def mesh_leaf_multi() -> LightHouseAdmin:
    return MESH_LEAF_MULTI


@pytest.fixture(scope="session", autouse=True)
def _close_clients_at_session_end():
    yield
    for client in (MESH_TA, MESH_IA, MESH_LEAF_OP, MESH_LEAF_RP, MESH_IA2, MESH_LEAF_MULTI):
        client.close()


def _restart_container(name: str, public_base: str) -> None:
    subprocess.run(
        ["docker", "compose", "restart", name],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    )
    wait_healthy(public_base)


@pytest.fixture
def restart_mesh_ia():
    """Bust mesh-ia's in-process entity-statement cache by restarting the
    container.

    Confirmed live (see docs/KNOWN-ISSUES.md investigation notes):
    LightHouse caches a subordinate's fetched entity statement for a
    while (tied to the statement's own `exp`, ~1 day in this mesh), so a
    metadata policy change or a status change doesn't affect an
    already-resolved subject until that cache entry naturally expires.
    There is no admin cache-purge endpoint (checked
    `Federation Admin OpenAPI.yaml`) — restarting is the only reset lever.
    """
    return lambda: _restart_container("mesh-ia", "http://localhost:8091")


@pytest.fixture
def restart_mesh_ta():
    """Same as restart_mesh_ia, for mesh-ta — needed when a constraint or
    other statement mesh-ta itself issues (about mesh-ia) needs a fresh,
    uncached re-fetch during resolution."""
    return lambda: _restart_container("mesh-ta", "http://localhost:8090")


@pytest.fixture
def restart_mesh_ia2():
    """Same as restart_mesh_ia, for mesh-ia2."""
    return lambda: _restart_container("mesh-ia2", "http://localhost:8097")
