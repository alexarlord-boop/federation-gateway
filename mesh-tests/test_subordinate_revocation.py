"""
OIDF Federation 1.0 §8 — subordinate status changes and whether trust chain
resolution actually honors them.

MESH-TESTING-PROGRESS.md item D3: status can be changed via the admin API
(and the UI), and (as of LightHouse 0.22.3, verified 2026-08-26) a blocked
subordinate's chain now correctly fails to resolve — see
docs/KNOWN-ISSUES.md Bug 5 for the full history (filed upstream against
go-oidfed/lighthouse, fixed in `/fetch`'s status check).

test_blocked_subordinate_excluded_from_list documents the other half of
this (status honored by `/list`) that was already working before the fix.

test_blocked_subordinate_no_longer_resolves used to assert the pre-fix
(wrong) HTTP 200 behavior — this repo's pinned image was still the buggy
one until Bug 5 was verified fixed and this pin was updated. Flipped to
assert the spec-correct rejection now that it's real.
"""
from __future__ import annotations

import pytest

from _lighthouse_client import LightHouseAdmin

MESH_TA_EID = "http://mesh-ta:8080"
MESH_LEAF_RP_EID = "http://mesh-leaf-rp:8080"


@pytest.fixture
def blocked_leaf_rp(mesh_ia: LightHouseAdmin, restart_mesh_ia):
    """Blocks mesh-leaf-rp for the duration of a test, restoring it to
    active (and busting the cache both times) regardless of outcome."""
    sub = mesh_ia.find_subordinate(MESH_LEAF_RP_EID)
    assert sub is not None, (
        "mesh-leaf-rp should already be registered by scripts/seed-mesh.py "
        "— run it first if this is a fresh stack"
    )
    mesh_ia.set_subordinate_status(sub["id"], "blocked")
    restart_mesh_ia()
    try:
        yield sub
    finally:
        mesh_ia.set_subordinate_status(sub["id"], "active")
        restart_mesh_ia()


def test_blocked_subordinate_status_change_is_persisted(mesh_ia: LightHouseAdmin) -> None:
    sub = mesh_ia.find_subordinate(MESH_LEAF_RP_EID)
    assert sub is not None
    try:
        updated = mesh_ia.set_subordinate_status(sub["id"], "blocked")
        assert updated["status"] == "blocked"
    finally:
        mesh_ia.set_subordinate_status(sub["id"], "active")


def test_blocked_subordinate_excluded_from_list(
    mesh_ia: LightHouseAdmin, blocked_leaf_rp
) -> None:
    assert MESH_LEAF_RP_EID not in mesh_ia.list_subordinates_public()


def test_blocked_subordinate_no_longer_resolves(
    mesh_ia: LightHouseAdmin, blocked_leaf_rp
) -> None:
    resp = mesh_ia.resolve(MESH_LEAF_RP_EID, MESH_TA_EID)
    assert resp.status_code == 404, (
        "LightHouse 0.22.3's /fetch now checks subordinate status "
        "(docs/KNOWN-ISSUES.md Bug 5) — a blocked subordinate's chain "
        "should fail to resolve, not return 200 with a valid trust_chain"
    )
