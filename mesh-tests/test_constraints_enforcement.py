"""
OIDF Federation 1.0 §6.2 — Constraints (max_path_length, naming_constraints,
allowed_entity_types) actually enforced during resolution, not just
stored/displayed.

MESH-TESTING-PROGRESS.md item B2: the Settings "Constraints" tab exists in
the UI, but nothing previously confirmed a constraint actually blocks
resolution.

Only naming_constraints is exercised here. Investigated all three against
go-oidfed/lib's checkConstraints() (trustresolver.go) before writing this:
all three are genuinely implemented there. But two can't be meaningfully
proven against *this* mesh's current topology, not because of a product
bug:

- allowed_entity_types is checked against entity types *guessed from the
  entity's own published metadata claims* (GuessEntityTypes()), not
  LightHouse's admin-side `registered_entity_types` label. Every mesh-*
  leaf only ever publishes a federation_entity metadata block (confirmed:
  none run real openid_provider/openid_relying_party endpoints), and
  federation_entity is unconditionally allowed
  (`strset.New(append(constraints.AllowedEntityTypes, "federation_entity")...)`)
  — so this constraint trivially passes regardless of what's configured,
  on every entity currently in the mesh.
- max_path_length needs a 3-level hierarchy (TA -> IA -> IA2 -> leaf) to
  exceed any meaningful limit; the mesh is currently only 2 levels deep
  (TA -> IA -> leaf) — the planned mesh-ia2 addition (see PROGRESS.md)
  would unblock this.

naming_constraints has no such dependency — it matches directly against
an authority's own entity_id hostname, confirmed working: excluding
mesh-ia's hostname from mesh-ta's constraint on its mesh-ia subordinate
makes every resolution through mesh-ia fail with invalid_trust_chain.
"""
from __future__ import annotations

from _lighthouse_client import LightHouseAdmin

MESH_TA_EID = "http://mesh-ta:8080"
MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"


def test_naming_constraint_blocks_resolution_through_excluded_authority(
    mesh_ta: LightHouseAdmin,
    mesh_ia: LightHouseAdmin,
    restart_mesh_ta,
    restart_mesh_ia,
) -> None:
    mesh_ia_subordinate = mesh_ta.find_subordinate("http://mesh-ia:8080")
    assert mesh_ia_subordinate is not None

    mesh_ta.put_subordinate_constraints(
        mesh_ia_subordinate["id"], {"naming_constraints": {"excluded": ["mesh-ia"]}}
    )
    try:
        restart_mesh_ta()
        restart_mesh_ia()
        resp = mesh_ia.resolve(MESH_LEAF_OP_EID, MESH_TA_EID)
        assert resp.status_code == 404
        assert resp.json()["error"] == "invalid_trust_chain"
    finally:
        mesh_ta.delete_subordinate_constraints(mesh_ia_subordinate["id"])
        restart_mesh_ta()
        restart_mesh_ia()
