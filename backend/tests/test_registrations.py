import pytest


@pytest.fixture
def pending_reg(client, user_headers):
    """Submit a fresh pending registration for use in read-only tests."""
    resp = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-1",
            "entity_id": "https://rp.fixture.reg.test",
            "display_name": "Fixture RP",
            "registered_entity_types": ["openid_relying_party"],
        },
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_submit_registration(client, user_headers):
    resp = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-1",
            "entity_id": "https://rp.submit.reg.test",
            "display_name": "Submit RP",
            "registered_entity_types": ["openid_relying_party"],
        },
        headers=user_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert data["entity_id"] == "https://rp.submit.reg.test"
    assert data["tenant_id"] == "tenant-1"


def test_submit_unknown_tenant_returns_404(client, user_headers):
    resp = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-does-not-exist",
            "entity_id": "https://rp.x.reg.test",
            "display_name": "X",
            "registered_entity_types": ["openid_relying_party"],
        },
        headers=user_headers,
    )
    assert resp.status_code == 404


def test_list_all_registrations(client, admin_headers, pending_reg):
    resp = client.get("/api/v1/registrations", headers=admin_headers)
    assert resp.status_code == 200
    ids = [r["id"] for r in resp.json()]
    assert pending_reg["id"] in ids


def test_my_registrations_only_own(client, user_headers, pending_reg):
    resp = client.get("/api/v1/registrations/my", headers=user_headers)
    assert resp.status_code == 200
    ids = [r["id"] for r in resp.json()]
    assert pending_reg["id"] in ids


def test_get_single_registration(client, admin_headers, pending_reg):
    resp = client.get(f"/api/v1/registrations/{pending_reg['id']}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == pending_reg["id"]


def test_get_nonexistent_registration_returns_404(client, admin_headers):
    resp = client.get("/api/v1/registrations/reg-does-not-exist", headers=admin_headers)
    assert resp.status_code == 404


def test_approve_registration(client, admin_headers, user_headers):
    reg = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-1",
            "entity_id": "https://rp.approve.reg.test",
            "display_name": "Approve Me",
            "registered_entity_types": ["openid_relying_party"],
        },
        headers=user_headers,
    ).json()

    resp = client.post(
        f"/api/v1/registrations/{reg['id']}/review",
        json={"status": "approved", "notes": "looks good"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["review_notes"] == "looks good"


def test_reject_registration(client, admin_headers, user_headers):
    reg = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-1",
            "entity_id": "https://rp.reject.reg.test",
            "display_name": "Reject Me",
            "registered_entity_types": ["openid_relying_party"],
        },
        headers=user_headers,
    ).json()

    resp = client.post(
        f"/api/v1/registrations/{reg['id']}/review",
        json={"status": "rejected", "notes": "not ready"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_double_review_returns_409(client, admin_headers, user_headers):
    reg = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-1",
            "entity_id": "https://rp.double.reg.test",
            "display_name": "Double Review",
            "registered_entity_types": ["openid_relying_party"],
        },
        headers=user_headers,
    ).json()

    client.post(
        f"/api/v1/registrations/{reg['id']}/review",
        json={"status": "approved", "notes": "first"},
        headers=admin_headers,
    )
    resp = client.post(
        f"/api/v1/registrations/{reg['id']}/review",
        json={"status": "rejected", "notes": "second"},
        headers=admin_headers,
    )
    assert resp.status_code == 409


def test_review_requires_permission(client, viewer_headers, pending_reg):
    """Viewer role has no subordinates:update → review must be 403."""
    resp = client.post(
        f"/api/v1/registrations/{pending_reg['id']}/review",
        json={"status": "approved", "notes": ""},
        headers=viewer_headers,
    )
    assert resp.status_code == 403
