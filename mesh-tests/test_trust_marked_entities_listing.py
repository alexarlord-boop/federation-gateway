"""
OIDF Federation 1.0 §8.5 — Trust Marked Entities Listing: a public endpoint
that lists every entity currently holding a still-valid mark of a given
type, optionally filtered to one subject.

MESH-TESTING-PROGRESS.md item C5: enabled in every config.yaml
(federation_trust_mark_list_endpoint), never actually called/verified.
It works correctly, including the parts that cross-check against C6's
revocation finding: a blocked subject is immediately excluded from the
list, same as its status check flips to "revoked" and fresh issuance
403s — the listing endpoint isn't a separate code path that could
silently disagree with those.

Fetches a fresh mark before asserting inclusion, since listing reflects
the last issued mark's validity, not just current subject status (a mark
that expired since it was last fetched won't reappear in the list until
a new one is issued — confirmed manually before writing this, consistent
with the spec's "still valid" wording).
"""
from __future__ import annotations

import pytest

from _lighthouse_client import LightHouseAdmin

MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"
MESH2_LEAF_OP_EID = "http://mesh2-leaf-op:8080"
TRUST_MARK_TYPE = "http://mesh-ta:8080/trustmarks/mesh-member"


def test_listing_includes_active_subject(mesh_ia: LightHouseAdmin) -> None:
    mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    entities = mesh_ia.list_trust_marked_entities(TRUST_MARK_TYPE)
    assert MESH_LEAF_OP_EID in entities


def test_listing_sub_filter(mesh_ia: LightHouseAdmin) -> None:
    mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    entities = mesh_ia.list_trust_marked_entities(TRUST_MARK_TYPE, sub=MESH_LEAF_OP_EID)
    assert entities == [MESH_LEAF_OP_EID]


@pytest.fixture
def mesh_leaf_op_subject(mesh_ia: LightHouseAdmin):
    spec = mesh_ia.find_issuance_spec(TRUST_MARK_TYPE)
    assert spec is not None
    subject = mesh_ia.find_issuance_subject(spec["id"], MESH_LEAF_OP_EID)
    assert subject is not None
    return spec, subject


def test_listing_excludes_blocked_subject(
    mesh_ia: LightHouseAdmin, mesh_leaf_op_subject
) -> None:
    spec, subject = mesh_leaf_op_subject
    mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    try:
        mesh_ia.set_trust_mark_subject_status(spec["id"], subject["id"], "blocked")
        entities = mesh_ia.list_trust_marked_entities(TRUST_MARK_TYPE)
        assert MESH_LEAF_OP_EID not in entities
    finally:
        mesh_ia.set_trust_mark_subject_status(spec["id"], subject["id"], "active")
