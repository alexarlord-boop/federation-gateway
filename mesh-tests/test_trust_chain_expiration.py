"""
OIDF Federation 1.0 §10.4 — a resolved trust chain's expiration is the
minimum of every entity statement's own `exp` in the chain, not e.g. the
leaf's own, or the last-fetched statement's.

MESH-TESTING-PROGRESS.md item A (§10.4): never asserted directly against
a resolved chain. No new mesh topology needed — testable against the
existing mesh-ta -> mesh-ia -> mesh-leaf-op chain as-is.

Computes the expected value from the live chain itself (min of the four
statements' own exp claims) rather than a hardcoded expectation, so the
test stays correct regardless of which entity's statement happens to have
the shortest exp at any given time — confirmed live before writing this
that it's a genuine minimum, not a coincidental match to the
last-in-array or leaf statement (all four differed).
"""
from __future__ import annotations

from _lighthouse_client import LightHouseAdmin, decode_jwt_payload

MESH_TA_EID = "http://mesh-ta:8080"
MESH_LEAF_OP_EID = "http://mesh-leaf-op:8080"


def test_resolved_chain_exp_is_minimum_of_all_statement_exps(
    mesh_ia: LightHouseAdmin,
) -> None:
    resp = mesh_ia.resolve(MESH_LEAF_OP_EID, MESH_TA_EID)
    assert resp.status_code == 200, resp.text
    resolved = decode_jwt_payload(resp.text)

    statement_exps = [
        decode_jwt_payload(stmt_jwt)["exp"] for stmt_jwt in resolved["trust_chain"]
    ]
    assert len(set(statement_exps)) > 1, (
        "test fixture assumption broken: expected the chain's statements to "
        "have genuinely different exp values so this proves a real minimum, "
        "not a coincidence"
    )
    assert resolved["exp"] == min(statement_exps)
