"""
OIDF Federation 1.0 §6.1 — Metadata Policy applied by an intermediate to a
subordinate's metadata during resolution.

MESH-TESTING-PROGRESS.md item B1 flagged this as *untested*. Investigation
before and while writing this suite (see docs/KNOWN-ISSUES.md for full
detail) found the mechanism is NOT "general policy is computed live on
every /fetch" as originally assumed. Each subordinate has its OWN
`metadata_policy` column, materialized as a snapshot at some point (new
subordinates start with it unset, in which case /fetch does compute live
from the general policy — which is what made the very first manual test
against a brand-new subordinate look like live computation). The real,
intended sync mechanism is explicit: `POST
/subordinates/{id}/metadata-policies` ("copy general metadata policies to
subordinate") — the same pattern as constraints'
`copyGeneralConstraintsToSubordinate`. These tests call that explicitly
after every policy change rather than assuming propagation is automatic.

Also found (real bug, see docs/KNOWN-ISSUES.md): `PUT
/subordinates/{id}/constraints` has the *unintended* side effect of
freezing that subordinate's metadata_policy to a snapshot too, even
though constraints and metadata policy are conceptually unrelated
features — confirmed by isolating it against a throwaway subordinate
(toggling status alone did not trigger it; a constraints PUT did, every
time, immediately, and survived deleting the constraint again). Restarting
the container does not reset any of this — the snapshot is persisted in
LightHouse's own SQLite `lighthouse.db`, not an in-process cache — so
`restart_mesh_ia` is *not* used here (it doesn't help; the earlier
assumption that it did was itself an artifact of always having tested
against fresh, never-touched subjects up to that point).
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
        subject = mesh_ia.find_subordinate(MESH_LEAF_RP_EID)
        assert subject is not None
        mesh_ia.copy_general_metadata_policies_to_subordinate(subject["id"])

        stmt = mesh_ia.fetch_statement(MESH_LEAF_RP_EID)
        assert stmt["metadata_policy"][ENTITY_TYPE][CLAIM] == {"value": POLICY_VALUE}
    finally:
        mesh_ia.delete_metadata_policy_claim(ENTITY_TYPE, CLAIM)


def test_metadata_policy_applied_during_resolution(mesh_ia: LightHouseAdmin) -> None:
    mesh_ia.put_metadata_policy_claim(ENTITY_TYPE, CLAIM, {"value": POLICY_VALUE})
    try:
        subject = mesh_ia.find_subordinate(MESH_LEAF_RP_EID)
        assert subject is not None
        mesh_ia.copy_general_metadata_policies_to_subordinate(subject["id"])

        resp = mesh_ia.resolve(MESH_LEAF_RP_EID, MESH_TA_EID, entity_type=ENTITY_TYPE)
        assert resp.status_code == 200, resp.text
        resolved = decode_jwt_payload(resp.text)
        assert resolved["metadata"][ENTITY_TYPE][CLAIM] == POLICY_VALUE
    finally:
        mesh_ia.delete_metadata_policy_claim(ENTITY_TYPE, CLAIM)
