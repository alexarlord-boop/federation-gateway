"""Tests for the audit log API endpoint."""
import pytest

from app.utils import audit as audit_utils
from app.db.database import SessionLocal


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def seed_audit_entries(db):
    """Write a couple of known audit entries before each test."""
    audit_utils.record(
        db,
        user_id="user-1",
        user_email="admin@oidfed.org",
        action="update_status",
        resource_type="subordinate",
        resource_id="sub-abc",
        tenant_id="tenant-1",
    )
    audit_utils.record(
        db,
        user_id="user-2",
        user_email="tech@example.org",
        action="create",
        resource_type="trust_mark_spec",
        resource_id="spec-xyz",
        tenant_id="tenant-1",
    )
    audit_utils.record(
        db,
        user_id="user-1",
        user_email="admin@oidfed.org",
        action="register",
        resource_type="subordinate",
        resource_id="sub-def",
        tenant_id="tenant-2",
    )


def test_list_audit_logs_requires_auth(client):
    resp = client.get("/api/v1/audit-logs")
    # HTTPBearer returns 403 when the Authorization header is missing entirely
    assert resp.status_code in (401, 403)


def test_list_audit_logs_returns_page(client, admin_headers):
    resp = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 3
    assert data["page"] == 1


def test_filter_by_tenant(client, admin_headers):
    resp = client.get("/api/v1/audit-logs?tenant_id=tenant-1", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["tenant_id"] == "tenant-1" for item in data["items"])
    assert data["total"] >= 2


def test_filter_by_action(client, admin_headers):
    resp = client.get("/api/v1/audit-logs?action=update_status", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["action"] == "update_status" for item in data["items"])
    assert data["total"] >= 1


def test_filter_by_resource_type(client, admin_headers):
    resp = client.get("/api/v1/audit-logs?resource_type=trust_mark_spec", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["resource_type"] == "trust_mark_spec" for item in data["items"])
    assert data["total"] >= 1


def test_pagination(client, admin_headers):
    resp = client.get("/api/v1/audit-logs?page=1&page_size=2", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 2
    assert data["page"] == 1
    assert data["page_size"] == 2


def test_classify_proxy_request():
    # Subordinate register
    assert audit_utils.classify_proxy_request("POST", "api/v1/admin/subordinates") == ("register", "subordinate")
    # Status change — path ends in /status, not bare ID
    assert audit_utils.classify_proxy_request("PATCH", "api/v1/admin/subordinates/123/status") == ("update_status", "subordinate")
    # Delete — path ends at the ID
    assert audit_utils.classify_proxy_request("DELETE", "api/v1/admin/subordinates/123") == ("delete", "subordinate")
    # JWKS update
    assert audit_utils.classify_proxy_request("POST", "api/v1/admin/subordinates/123/jwks") == ("update_jwks", "subordinate")
    # Trust mark spec — correct path is issuance-spec (hyphen, singular)
    assert audit_utils.classify_proxy_request("POST", "api/v1/admin/trust-marks/issuance-spec") == ("create", "trust_mark_spec")
    assert audit_utils.classify_proxy_request("DELETE", "api/v1/admin/trust-marks/issuance-spec/99") == ("delete", "trust_mark_spec")
    # Trust mark subject issue / revoke
    assert audit_utils.classify_proxy_request("POST", "api/v1/admin/trust-marks/issuance-spec/5/subjects") == ("issue", "trust_mark")
    assert audit_utils.classify_proxy_request("DELETE", "api/v1/admin/trust-marks/issuance-spec/5/subjects/7") == ("revoke", "trust_mark")
    # Non-mutating and unknown paths → None
    assert audit_utils.classify_proxy_request("GET", "api/v1/admin/subordinates") is None
    assert audit_utils.classify_proxy_request("POST", "api/v1/admin/unknown-endpoint") is None
