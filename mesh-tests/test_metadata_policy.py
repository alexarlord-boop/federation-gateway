"""
OIDF Federation 1.0 §6.1 — Metadata Policy applied by an intermediate to a
subordinate's metadata during resolution.

MESH-TESTING-PROGRESS.md item B1 flagged this as *untested*. Manual
investigation before writing this suite found two distinct layers:

1. Setting a general policy on mesh-ia (`PUT
   /api/v1/admin/subordinates/metadata-policies/{entityType}/{claim}`) is
   reflected immediately in every matching-entity-type subordinate
   statement mesh-ia issues via `/fetch` — no caching involved, live at
   issuance time.
2. A subordinate's *resolved* metadata (`/resolve`) only reflects a policy
   change once LightHouse's in-process cache for that subordinate's
   fetched statement naturally rolls over — confirmed against
   go-oidfed/lib's `TrustChain.Metadata()` (which does correctly implement
   policy merging) and live behavior: a never-before-resolved subject
   picks up a policy set moments earlier; an already-resolved one does
   not, until the intermediate container is restarted. Not a product bug
   — see docs/KNOWN-ISSUES.md for the one real bug this investigation did
   turn up (blocked subordinates still resolving).

These tests explicitly restart mesh-ia (`restart_mesh_ia` fixture) rather
than assuming a fresh PUT is instantly visible in resolution, and restart
it again in teardown so the shared mesh-ia container isn't left serving a
stale cached value to the rest of the demo/e2e suite.
"""
from __future__ import annotations

from _lighthouse_client import LightHouseAdmin, decode_jwt_payload

MESH_TA_EID = "http://mesh-ta:8080"
MESH_LEAF_RP_EID = "http://mesh-leaf-rp:8080"

ENTITY_TYPE = "federation_entity"
CLAIM = "organization_name"
POLICY_VALUE = "Mesh Integration Test Co"


def test_metadata_policy_embedded_in_fetch_statement(mesh_ia: LightHouseAdmin) -> None:
    mesh_ia.put_metadata_policy_claim(ENTITY_TYPE, CLAIM, {"value": POLICY_VALUE})
    try:
        stmt = mesh_ia.fetch_statement(MESH_LEAF_RP_EID)
        assert stmt["metadata_policy"][ENTITY_TYPE][CLAIM] == {"value": POLICY_VALUE}
    finally:
        mesh_ia.delete_metadata_policy_claim(ENTITY_TYPE, CLAIM)


def test_metadata_policy_applied_during_resolution(
    mesh_ia: LightHouseAdmin, restart_mesh_ia
) -> None:
    mesh_ia.put_metadata_policy_claim(ENTITY_TYPE, CLAIM, {"value": POLICY_VALUE})
    try:
        restart_mesh_ia()
        resp = mesh_ia.resolve(MESH_LEAF_RP_EID, MESH_TA_EID, entity_type=ENTITY_TYPE)
        assert resp.status_code == 200, resp.text
        resolved = decode_jwt_payload(resp.text)
        assert resolved["metadata"][ENTITY_TYPE][CLAIM] == POLICY_VALUE
    finally:
        mesh_ia.delete_metadata_policy_claim(ENTITY_TYPE, CLAIM)
        restart_mesh_ia()
