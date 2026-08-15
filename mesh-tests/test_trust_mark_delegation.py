"""
OIDF Federation 1.0 §7.2 — Trust Mark Delegation: an issuer distinct from
a trust mark type's registered owner, proven via a delegation JWT the
owner signs and the issuer embeds in every mark it issues.

MESH-TESTING-PROGRESS.md item C4: "the Owners UI exists but has no
live-mesh proof it works." It does — this suite exercises the full chain:

1. Register a fabricated owner (entity_id + jwks — doesn't need to be a
   live server, same pattern as any fabricated subordinate) for the
   mesh-member trust mark type on mesh-ta, the instance that holds the
   type. This is what the app's Owners UI (OwnersTab.tsx) drives.
2. Confirm mesh-ta's own /.well-known/openid-federation now publishes a
   `trust_mark_owners` claim for that type — the spec's actual discovery
   mechanism, so a real relying party never needs local owner
   registration of its own.
3. Sign a delegation JWT ourselves with the fabricated owner's private
   key (see _delegation.py's docstring for why this can't come from
   LightHouse's admin API) and PATCH it onto mesh-ia's issuance spec for
   the same type — mesh-ia is the issuer, a different entity than the
   owner.
4. Fetch a freshly issued mark and confirm it embeds the delegation JWT
   verbatim under the `delegation` claim.
5. Verify the whole thing the way a real relying party would: discover
   the owner's jwks via mesh-ta's trust_mark_owners claim (not from our
   own in-memory keys), check delegation.sub == mark.iss and
   delegation.trust_mark_type == mark.trust_mark_type, then verify the
   delegation JWT's signature against the *discovered* key.

Cleans up (delete owner, clear delegation_jwt) regardless of outcome, so
the shared mesh-ta/mesh-ia containers aren't left issuing marks with a
stale fabricated delegation.
"""
from __future__ import annotations

import uuid

import pytest
from jose import jws

from _delegation import generate_owner_keypair, sign_delegation_jwt
from _lighthouse_client import LightHouseAdmin, decode_jwt_payload

MESH_TA_EID = "http://mesh-ta:8080"
MESH_IA_EID = "http://mesh-ia:8080"
MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"
TRUST_MARK_TYPE = "http://mesh-ta:8080/trustmarks/mesh-member"

OWNER_KID = "mesh-tm-owner-key-1"


@pytest.fixture
def delegated_issuance(mesh_ta: LightHouseAdmin, mesh_ia: LightHouseAdmin):
    """Registers a fabricated owner on mesh-ta and attaches a real
    delegation JWT to mesh-ia's issuance spec; yields (public_jwk,
    private_jwk, owner_entity_id); always cleans up both regardless of
    test outcome.

    owner_entity_id is generated fresh per test, not a shared constant:
    DELETE /trust-marks/types/{id}/owner doesn't fully release an
    entity_id for reuse (confirmed real bug, see docs/KNOWN-ISSUES.md) —
    a fixed id 409s the second time *any* test in this module runs it,
    even within the same session."""
    tm_type = mesh_ta.find_trust_mark_type(TRUST_MARK_TYPE)
    assert tm_type is not None, "expected scripts/seed-mesh.py to have created this type"

    spec = mesh_ia.find_issuance_spec(TRUST_MARK_TYPE)
    assert spec is not None, "expected scripts/seed-mesh.py to have created this spec"

    owner_entity_id = f"https://mesh-tm-owner-{uuid.uuid4().hex[:8]}.example.org"
    public_jwk, private_jwk = generate_owner_keypair(OWNER_KID)
    mesh_ta.create_trust_mark_owner(
        tm_type["id"], owner_entity_id, {"keys": [public_jwk]}
    )
    delegation_jwt = sign_delegation_jwt(
        private_jwk, owner_entity_id, MESH_IA_EID, TRUST_MARK_TYPE
    )
    mesh_ia.patch_issuance_spec(spec["id"], delegation_jwt=delegation_jwt)
    try:
        yield public_jwk, private_jwk, owner_entity_id
    finally:
        mesh_ia.patch_issuance_spec(spec["id"], delegation_jwt="")
        mesh_ta.delete_trust_mark_owner(tm_type["id"])


def test_owner_registration_published_in_entity_config(
    mesh_ta: LightHouseAdmin, delegated_issuance
) -> None:
    _, _, owner_entity_id = delegated_issuance
    cfg = mesh_ta.get_entity_configuration()
    owner_spec = cfg["trust_mark_owners"][TRUST_MARK_TYPE]
    assert owner_spec["sub"] == owner_entity_id


def test_issued_mark_embeds_delegation_jwt(
    mesh_ia: LightHouseAdmin, delegated_issuance
) -> None:
    mark_jwt = mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    mark = decode_jwt_payload(mark_jwt)
    assert "delegation" in mark

    delegation = decode_jwt_payload(mark["delegation"])
    assert delegation["sub"] == mark["iss"]
    assert delegation["trust_mark_type"] == mark["trust_mark_type"]


def test_delegation_verifies_against_owner_discovered_via_ta(
    mesh_ta: LightHouseAdmin, mesh_ia: LightHouseAdmin, delegated_issuance
) -> None:
    """The full relying-party check: don't trust our own in-memory keys —
    rediscover the owner's jwks from mesh-ta's published entity config,
    the same way an external verifier with no prior relationship to us
    would, and verify the delegation signature against *that*."""
    mark_jwt = mesh_ia.fetch_trust_mark(MESH_LEAF_OP_EID, TRUST_MARK_TYPE)
    mark = decode_jwt_payload(mark_jwt)
    delegation_jwt = mark["delegation"]

    cfg = mesh_ta.get_entity_configuration()
    discovered_owner = cfg["trust_mark_owners"][TRUST_MARK_TYPE]
    discovered_jwk = discovered_owner["jwks"]["keys"][0]

    # jws.verify raises on a bad signature — reaching this line is the check.
    verified_payload = jws.verify(delegation_jwt, discovered_jwk, algorithms=["ES256"])
    assert decode_jwt_payload(delegation_jwt)["iss"] == discovered_owner["sub"]
    assert verified_payload  # non-empty signed payload bytes
