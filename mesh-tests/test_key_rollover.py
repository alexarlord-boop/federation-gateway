"""
OIDF Federation 1.0 §11 (Key Rollover/Revocation) and §8.7 (Federation
Historical Keys endpoint).

MESH-TESTING-PROGRESS.md items D1/D2: no key rollover had ever been
exercised anywhere in the mesh, so old-signature verification via
historical keys was completely untested.

Runs against mesh-leaf-rp specifically (least central to other demos —
see docs/FEDERATION-TOPOLOGY.md), chosen deliberately over mesh-ta (every
other test resolves through it) or adding a new dedicated node (heavier
than needed — rotation is a single-entity operation, no new hierarchy
level required, unlike the constraints tests' `max_path_length` gap).

The `federation_historical_keys_endpoint` (§8.7) was never enabled in any
config.yaml in this repo — a real, if minor, completeness gap of the same
shape as the trust_mark endpoints one documented in docs/KNOWN-ISSUES.md
history. Enabled it in mesh-leaf-rp/config.yaml as part of this work
(config key: `historical_keys`, confirmed against go-oidfed/lighthouse
source — not documented in the public config reference at all).

Key rotation (`POST /api/v1/admin/kms/rotate`) has a configurable overlap
window (`KMSRotationOptions.overlap`, default 3600s) during which both the
old and new key are valid but the OLD key keeps signing — the switch to
the new key only happens once the overlap elapses. Set to 2s here so the
suite doesn't need a real hour-long wait; this is a genuine LightHouse
admin knob (`PATCH /api/v1/admin/kms/rotation`), not a workaround.

After rotation, mesh-ia's stored subordinate record for mesh-leaf-rp
still has the pre-rotation jwks, so resolution genuinely fails until an
admin re-syncs it (`PUT /subordinates/{id}/jwks`) — this is the correct,
expected real-world rollover admin workflow, not a bug. Confirmed
`restart_mesh_ia` is still needed after the re-sync for resolution to
pick it up, consistent with the per-subordinate statement caching found
elsewhere in this suite.
"""
from __future__ import annotations

import time

from jose import jws

from _lighthouse_client import LightHouseAdmin, decode_jwt_header

MESH_TA_EID = "http://mesh-ta:8080"
MESH_LEAF_RP_EID = "http://mesh-leaf-rp:8080"
OVERLAP_SECONDS = 2


def _ensure_short_overlap(mesh_leaf_rp: LightHouseAdmin) -> None:
    mesh_leaf_rp.patch_kms_rotation_options(overlap=OVERLAP_SECONDS)


def test_rotation_publishes_new_key_and_marks_old_with_expiry(
    mesh_leaf_rp: LightHouseAdmin,
) -> None:
    _ensure_short_overlap(mesh_leaf_rp)
    before = {k["kid"] for k in mesh_leaf_rp.get_published_jwks()["keys"]}

    mesh_leaf_rp.trigger_kms_rotation()

    after_keys = mesh_leaf_rp.get_published_jwks()["keys"]
    after_kids = {k["kid"] for k in after_keys}
    new_kids = after_kids - before
    assert len(new_kids) == 1, "rotation should publish exactly one new key"

    old_kids = before & after_kids
    assert old_kids, "old key(s) should still be published during the overlap window"
    for kid in old_kids:
        old_key = next(k for k in after_keys if k["kid"] == kid)
        assert "exp" in old_key, "old key should now carry an expiry"


def test_active_signing_key_switches_after_overlap_elapses(
    mesh_leaf_rp: LightHouseAdmin,
) -> None:
    _ensure_short_overlap(mesh_leaf_rp)
    kid_before = mesh_leaf_rp.get_active_signing_kid()

    mesh_leaf_rp.trigger_kms_rotation()
    time.sleep(OVERLAP_SECONDS + 2)

    kid_after = mesh_leaf_rp.get_active_signing_kid()
    assert kid_after != kid_before


def test_old_signature_verifies_via_historical_keys(
    mesh_leaf_rp: LightHouseAdmin,
) -> None:
    _ensure_short_overlap(mesh_leaf_rp)

    pre_rotation_jwt = mesh_leaf_rp.get_entity_configuration_jwt()
    signing_kid = decode_jwt_header(pre_rotation_jwt)["kid"]

    mesh_leaf_rp.trigger_kms_rotation()
    time.sleep(OVERLAP_SECONDS + 2)

    historical = mesh_leaf_rp.get_historical_keys()
    historical_kids = {k["kid"] for k in historical["keys"]["keys"]}
    assert signing_kid in historical_kids, (
        "the key that signed the pre-rotation statement should now be "
        "discoverable via the historical keys endpoint"
    )
    historical_key = next(
        k for k in historical["keys"]["keys"] if k["kid"] == signing_kid
    )

    # jws.verify raises on a bad signature — reaching the assert is the check.
    verified_payload = jws.verify(
        pre_rotation_jwt, historical_key, algorithms=["ES512"]
    )
    assert verified_payload


def test_resolution_recovers_after_resyncing_rotated_jwks(
    mesh_ia: LightHouseAdmin, mesh_leaf_rp: LightHouseAdmin, restart_mesh_ia
) -> None:
    """The real admin workflow after a subordinate rotates its own key:
    re-sync its jwks on the authority side, then resolution works.

    (Right after rotation and before re-syncing, resolution was observed
    manually to fail with 404 invalid_trust_chain — mesh-ia's stored
    subordinate jwks was stale relative to the new active signing key.
    Not asserted here: across repeated rotations in the same run, the
    leaf's *published* jwks keeps accumulating not-yet-expired historical
    keys, and if one of those happens to already be on file with mesh-ia
    from an earlier re-sync in this same test session, resolution can
    keep succeeding without needing this test's own re-sync — a real
    property of the overlap window, not a bug, but it makes "assert it's
    broken first" order-dependent rather than a reliable, repeatable
    check. The recovery assertion below is not order-dependent.)
    """
    _ensure_short_overlap(mesh_leaf_rp)

    mesh_leaf_rp.trigger_kms_rotation()
    time.sleep(OVERLAP_SECONDS + 2)

    subordinate = mesh_ia.find_subordinate(MESH_LEAF_RP_EID)
    assert subordinate is not None
    current_jwks = mesh_leaf_rp.get_published_jwks()
    mesh_ia.put_subordinate_jwks(subordinate["id"], current_jwks)
    restart_mesh_ia()

    recovered_resp = mesh_ia.resolve(MESH_LEAF_RP_EID, MESH_TA_EID)
    assert recovered_resp.status_code == 200, recovered_resp.text
