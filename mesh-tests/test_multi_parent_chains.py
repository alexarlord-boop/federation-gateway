"""
OIDF Federation 1.0 §10.3 (choosing among multiple valid trust chains) and
"entity with redundant/multiple parents" (§17.1-17.2 topology patterns,
MESH-TESTING-PROGRESS.md §E) — the one item that genuinely needed new mesh
topology, unlike everything else in that checklist.

Adds mesh-ia2 (a second Intermediate, sibling of mesh-ia, both direct
subordinates of mesh-ta — see docker-compose.yml) and mesh-leaf-multi (a
leaf registered as a subordinate of BOTH, with BOTH as authority_hints —
see scripts/seed-mesh.py). Two independent, equally valid 2-hop paths to
the same anchor exist for the first time in this mesh.

Confirmed live before writing this, correcting an initial wrong
assumption: resolution is *subject-rooted*, not restricted to "only the
path through whoever you happened to ask" — querying mesh-ia2 directly
does not force the mesh-ia2 path to be chosen; every resolver (mesh-ia,
mesh-ia2, the anchor itself, or a completely uninvolved third party)
independently walks mesh-leaf-multi's own authority_hints and converges
on the same globally-preferred chain. What actually distinguishes
"choosing among multiple valid chains" from "always finding the same one
regardless" is the fallback test: constrain the preferred path (mesh-ia)
out and confirm resolution genuinely switches to the other still-valid
path (mesh-ia2) rather than failing outright or (per the pre-existing D3
bug) ignoring the invalidity.
"""
from __future__ import annotations

from _lighthouse_client import LightHouseAdmin, decode_jwt_payload

MESH_TA_EID = "http://mesh-ta:8080"
MESH_IA_EID = "http://mesh-ia:8080"
MESH_IA2_EID = "http://mesh-ia2:8080"
MESH_LEAF_MULTI_EID = "http://mesh-leaf-multi:8080"


def _chain_issuers(resolved: dict) -> list[str]:
    return [decode_jwt_payload(stmt)["iss"] for stmt in resolved["trust_chain"]]


def test_leaf_has_both_authority_hints(mesh_leaf_multi: LightHouseAdmin) -> None:
    cfg = mesh_leaf_multi.get_entity_configuration()
    assert set(cfg["authority_hints"]) == {MESH_IA_EID, MESH_IA2_EID}


def test_asking_either_parent_still_resolves(
    mesh_ia: LightHouseAdmin, mesh_ia2: LightHouseAdmin
) -> None:
    """Confirmed live, not assumed: resolution is *subject-rooted* — it
    walks mesh-leaf-multi's own authority_hints (both of them), not
    restricted to "only the path through whoever you happened to ask."
    Querying mesh-ia2 directly does NOT force the mesh-ia2 path to be
    chosen; both endpoints independently discover the same
    globally-preferred chain (mesh-ia, the first authority_hint) here."""
    for resolver in (mesh_ia, mesh_ia2):
        resp = resolver.resolve(MESH_LEAF_MULTI_EID, MESH_TA_EID)
        assert resp.status_code == 200, resp.text
        issuers = set(_chain_issuers(decode_jwt_payload(resp.text)))
        assert issuers & {MESH_IA_EID, MESH_IA2_EID}


def test_uninvolved_third_party_discovers_a_valid_chain(
    mesh_leaf_rp: LightHouseAdmin,
) -> None:
    """mesh-leaf-rp has no authority relationship to mesh-leaf-multi, its
    parents, or mesh-ta — same "any entity can act as a Resolver" pattern
    as test_resolver_role.py, but now against a subject with two possible
    paths instead of one."""
    resp = mesh_leaf_rp.resolve(MESH_LEAF_MULTI_EID, MESH_TA_EID)
    assert resp.status_code == 200, resp.text
    issuers = _chain_issuers(decode_jwt_payload(resp.text))
    assert MESH_IA_EID in issuers or MESH_IA2_EID in issuers


def test_resolution_falls_back_to_the_other_parent_when_one_path_is_constrained(
    mesh_ta: LightHouseAdmin,
    mesh_ia: LightHouseAdmin,
    mesh_ia2: LightHouseAdmin,
    restart_mesh_ta,
    restart_mesh_ia,
    restart_mesh_ia2,
) -> None:
    mesh_ia_subordinate = mesh_ta.find_subordinate(MESH_IA_EID)
    assert mesh_ia_subordinate is not None

    mesh_ta.put_subordinate_constraints(
        mesh_ia_subordinate["id"],
        {"naming_constraints": {"excluded": ["mesh-leaf-multi"]}},
    )
    try:
        restart_mesh_ta()
        restart_mesh_ia()
        restart_mesh_ia2()

        resp = mesh_ta.resolve(MESH_LEAF_MULTI_EID, MESH_TA_EID)
        assert resp.status_code == 200, (
            "resolution should still succeed via the still-valid mesh-ia2 "
            "path, not fail outright just because one of two paths broke"
        )
        issuers = _chain_issuers(decode_jwt_payload(resp.text))
        assert MESH_IA2_EID in issuers
        assert MESH_IA_EID not in issuers, (
            "the constrained-out mesh-ia path should genuinely not be the "
            "one chosen, not just coincidentally absent"
        )
    finally:
        mesh_ta.delete_subordinate_constraints(mesh_ia_subordinate["id"])
        restart_mesh_ta()
        restart_mesh_ia()
        restart_mesh_ia2()
