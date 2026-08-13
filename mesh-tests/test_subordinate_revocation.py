"""
OIDF Federation 1.0 §8 — subordinate status changes and whether trust chain
resolution actually honors them.

MESH-TESTING-PROGRESS.md item D3: status can be changed via the admin API
(and the UI), but nothing previously confirmed that a blocked subordinate's
chain actually fails to resolve afterward. It does not — see
docs/KNOWN-ISSUES.md ("`/resolve` returns a valid trust chain for a
`blocked` subordinate"), filed upstream against go-oidfed/lighthouse.

test_blocked_subordinate_excluded_from_list documents the one part of this
that *does* work today (status is honored by `/list`) so a future fix to
`/resolve` doesn't silently also break the working half.

test_blocked_subordinate_still_resolves_TODO_LIGHTHOUSE_BUG asserts
*today's actual* (wrong) behavior, not the spec-correct behavior — so this
suite is green until the upstream fix ships, rather than permanently red.
The moment `/resolve` correctly rejects a blocked subordinate, this test's
`assert resp.status_code == 200` starts failing — that failure is the
signal to flip it to asserting the spec-correct (4xx) behavior and close
out the KNOWN-ISSUES.md entry.
"""
from __future__ import annotations

import pytest

from _lighthouse_client import LightHouseAdmin, decode_jwt_payload

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


def test_blocked_subordinate_still_resolves_TODO_LIGHTHOUSE_BUG(
    mesh_ia: LightHouseAdmin, blocked_leaf_rp
) -> None:
    resp = mesh_ia.resolve(MESH_LEAF_RP_EID, MESH_TA_EID)
    assert resp.status_code == 200, (
        "if this starts failing, LightHouse's /resolve now honors "
        "subordinate status — flip this test to expect an error and close "
        "the docs/KNOWN-ISSUES.md entry"
    )
    resolved = decode_jwt_payload(resp.text)
    assert "trust_chain" in resolved
