"""
OIDF Federation 1.0 §10.6 and §17.3-17.4 — a "Resolver" is not a special
role or config: any entity offering a `/resolve` endpoint (§8.3) that a
relying party queries *instead of* walking the chain itself is acting as
a Resolver. §17.4 ("One Entity, One Service") explicitly endorses a
dedicated resolver-only entity, distinct from being a Trust Anchor, as
good practice — while §17.3 notes it's also fine for one entity to be
both.

MESH-TESTING-PROGRESS.md item E: "a standalone resolver entity is a
distinct spec concept we haven't stood up." Turns out it doesn't need
standing up — confirmed against the spec text (not recalled from memory)
that this is a usage pattern, not a deployment mode, and every mesh-*
LightHouse instance already implements the generic `/resolve` handler.

This test uses mesh-leaf-rp as the resolver: it has zero authority
relationship to either the trust anchor (mesh-ta) or the subject
(mesh-leaf-op) being resolved — it is not their TA, not an intermediate
in their chain, and never registered either as its own subordinate. If
its own `/resolve` endpoint can still correctly resolve *that* chain, it
is functioning exactly as §10.6 describes: doing the resolution work
"that otherwise the Entity ... wanting to establish trust would have to
do for itself."
"""
from __future__ import annotations

from _lighthouse_client import LightHouseAdmin, decode_jwt_payload

MESH_TA_EID = "http://mesh-ta:8080"
MESH_IA_EID = "http://mesh-ia:8080"
MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"
MESH_LEAF_RP_EID = "http://mesh-leaf-rp:8080"


def test_uninvolved_entity_resolves_third_party_chain(
    mesh_ta: LightHouseAdmin, mesh_leaf_rp: LightHouseAdmin
) -> None:
    # Control: mesh-leaf-rp has no authority relationship to mesh-leaf-op
    # or mesh-ta at all — confirm it's genuinely not part of this chain.
    mesh_ta_subordinates = {s["entity_id"] for s in mesh_ta.get_subordinates()}
    assert MESH_LEAF_RP_EID not in mesh_ta_subordinates

    resp = mesh_leaf_rp.resolve(MESH_LEAF_OP_EID, MESH_TA_EID)
    assert resp.status_code == 200, resp.text

    resolved = decode_jwt_payload(resp.text)
    assert resolved["sub"] == MESH_LEAF_OP_EID
    assert resolved["iss"] == MESH_LEAF_RP_EID, (
        "the resolve-response envelope is signed by whoever answered the "
        "query — the resolver itself — not by an intermediate in the "
        "underlying chain; confirmed live, not assumed"
    )

    # The *inner* trust_chain is still the real chain, signed by the real
    # parties — the resolver vouches for the resolution, it doesn't insert
    # itself into the chain of custody it's reporting on.
    chain_issuers = {
        decode_jwt_payload(stmt)["iss"] for stmt in resolved["trust_chain"]
    }
    assert chain_issuers == {MESH_LEAF_OP_EID, MESH_IA_EID, MESH_TA_EID}
    assert MESH_LEAF_RP_EID not in chain_issuers
