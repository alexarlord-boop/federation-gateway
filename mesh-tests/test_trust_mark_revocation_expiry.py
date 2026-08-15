"""
OIDF Federation 1.0 §8.4 — Trust Mark Status: revocation and expiry
transitions.

MESH-TESTING-PROGRESS.md item C6: every prior trust mark test only ever
checked `status: active`; nothing confirmed a revoked or expired mark's
status check actually reflects it.

Revocation works correctly (test_blocked_subject_*): blocking a
TrustMarkSubject flips an already-issued mark's status check to
`"revoked"` and blocks fresh issuance with 403.

Expiry does not (test_expired_mark_status_TODO_LIGHTHOUSE_BUG): per the
spec's normative text (§8.4.2), `expired` ("the Trust Mark has expired")
and `invalid` ("signature validation failed or another error was
detected") are distinct, defined status values. A genuinely expired mark
(valid signature, only `exp` has passed — confirmed by issuing with a 3s
`lifetime` and waiting it out) gets classified as `invalid`, not
`expired`. Real spec-compliance bug, not filed upstream yet (lower
priority than the /resolve one — see docs/KNOWN-ISSUES.md). Test asserts
today's actual value so the suite stays green until fixed, same pattern
as test_subordinate_revocation.py's TODO test.
"""
from __future__ import annotations

import time

import pytest

from _lighthouse_client import LightHouseAdmin

MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"
TRUST_MARK_TYPE = "http://mesh-ta:8080/trustmarks/mesh-member"


@pytest.fixture
def mesh_leaf_op_subject(mesh_ia: LightHouseAdmin):
    spec = mesh_ia.find_issuance_spec(TRUST_MARK_TYPE)
    assert spec is not None, "expected scripts/seed-mesh.py to have created this spec"
    subject = mesh_ia.find_issuance_subject(spec["id"], MESH_LEAF_OP_EID)
    assert subject is not None, "expected scripts/seed-mesh.py to have added this subject"
    return spec, subject


def test_blocked_subject_mark_status_reflects_revoked(
    mesh_ia: LightHouseAdmin, mesh_leaf_op_subject
) -> None:
    spec, subject = mesh_leaf_op_subject
    mark_jwt = mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    try:
        mesh_ia.set_trust_mark_subject_status(spec["id"], subject["id"], "blocked")
        status = mesh_ia.check_trust_mark_status(mark_jwt)
        assert status["status"] == "revoked"
    finally:
        mesh_ia.set_trust_mark_subject_status(spec["id"], subject["id"], "active")


def test_blocked_subject_cannot_get_fresh_mark(
    mesh_ia: LightHouseAdmin, mesh_leaf_op_subject
) -> None:
    spec, subject = mesh_leaf_op_subject
    try:
        mesh_ia.set_trust_mark_subject_status(spec["id"], subject["id"], "blocked")
        with pytest.raises(Exception):
            mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    finally:
        mesh_ia.set_trust_mark_subject_status(spec["id"], subject["id"], "active")


def test_expired_mark_status_TODO_LIGHTHOUSE_BUG(mesh_ia: LightHouseAdmin) -> None:
    spec = mesh_ia.find_issuance_spec(TRUST_MARK_TYPE)
    assert spec is not None

    mesh_ia.patch_issuance_spec(spec["id"], lifetime=2)
    try:
        mark_jwt = mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
        time.sleep(4)
        status = mesh_ia.check_trust_mark_status(mark_jwt)
        assert status["status"] == "invalid", (
            "if this starts failing with status == 'expired', LightHouse now "
            "correctly distinguishes expiry from signature/other errors per "
            "§8.4.2 — flip this test to expect 'expired' and close the "
            "docs/KNOWN-ISSUES.md entry"
        )
    finally:
        mesh_ia.patch_issuance_spec(spec["id"], lifetime=0)
