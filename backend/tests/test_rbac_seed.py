"""
Tests for seed_rbac_data()'s idempotency. It runs unconditionally on every
backend startup (see main.py), so calling it a second time against data
that already exists — manually-assigned RBAC roles, JIT-provisioned SSO
users — must never silently revert what an admin (or the OIDC callback)
already set up.
"""
import uuid

from app.auth.security import get_password_hash
from app.db.database import SessionLocal
from app.db.rbac_seed import seed_rbac_data
from app.models.user import User


def test_reseeding_does_not_revert_a_manually_assigned_rbac_role(client, admin_headers):
    """A legacy role="user" account whose RBAC role was manually changed to
    something other than the default (tech_contact) must keep it across a
    re-seed — this is exactly what a backend restart triggers in production."""
    resp = client.post(
        "/api/v1/users",
        json={"name": "Reseed Test", "email": "reseed.test@example.org", "password": "pw123456", "role": "user"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    user_id = resp.json()["id"]

    reassign = client.put(
        f"/api/v1/users/{user_id}/rbac-role",
        json={"role_id": "viewer"},
        headers=admin_headers,
    )
    assert reassign.status_code == 200
    assert reassign.json()["rbac_roles"] == ["viewer"]

    db = SessionLocal()
    try:
        seed_rbac_data(db)
    finally:
        db.close()

    after = client.get(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert after.json()["rbac_roles"] == ["viewer"], (
        "re-seeding reverted a manually-assigned RBAC role back to the legacy default"
    )

    client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)


def test_reseeding_does_not_assign_a_role_to_a_roleless_sso_user(admin_headers):
    """Companion to the OIDC JIT-provisioning tests in test_oidc.py — a
    fresh account with no legacy-mappable role and oidc_sub set must stay
    roleless across a re-seed, not get silently defaulted to viewer."""
    db = SessionLocal()
    try:
        user = User(
            id=str(uuid.uuid4()),
            email="reseed.sso@example.org",
            name="Reseed SSO",
            role="viewer",
            password_hash=get_password_hash(uuid.uuid4().hex),
            oidc_sub="some-sub",
            oidc_issuer="https://idp.example.org",
        )
        db.add(user)
        db.commit()
        user_id = user.id

        seed_rbac_data(db)
        db.refresh(user)
        assert list(user.roles) == []
    finally:
        db.query(User).filter(User.id == user_id).delete()
        db.commit()
        db.close()
