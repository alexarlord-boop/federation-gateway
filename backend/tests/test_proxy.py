import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.db.database import SessionLocal
from app.models.audit_log import AuditLog


def _fake_response(status_code: int = 200, body: bytes = b"[]"):
    mock = MagicMock(spec=httpx.Response)
    mock.status_code = status_code
    mock.content = body
    mock.headers = httpx.Headers({"content-type": "application/json"})
    return mock


def _mock_client(response=None, *, side_effect=None):
    mc = MagicMock()
    if side_effect is not None:
        mc.request = AsyncMock(side_effect=side_effect)
    else:
        mc.request = AsyncMock(return_value=response)
    return mc


# ── Routing ────────────────────────────────────────────────────────────────

def test_proxy_routes_to_correct_upstream(client, admin_headers):
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    called_url = mc.request.call_args.kwargs["url"]
    assert called_url == "http://lighthouse:8080/api/v1/admin/subordinates"


def test_proxy_normalizes_leading_slash_in_path(client, admin_headers):
    """Paths with leading slashes must be normalized to avoid double slashes."""
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        # FastAPI's path:path capture will include the leading slash
        resp = client.get(
            "/api/v1/proxy/ta-1//admin/subordinates",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    called_url = mc.request.call_args.kwargs["url"]
    # Should NOT produce http://lighthouse:8080//admin/subordinates
    assert called_url == "http://lighthouse:8080/admin/subordinates"
    assert "//" not in called_url.replace("http://", "")


def test_proxy_preserves_query_string(client, admin_headers):
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates?status=active&page=2",
            headers=admin_headers,
        )
    url = mc.request.call_args.kwargs["url"]
    assert "status=active" in url
    assert "page=2" in url


def test_proxy_forwards_method(client, admin_headers):
    mc = _mock_client(_fake_response(201, b'{"id":1}'))
    with patch("app.routers.proxy._get_client", return_value=mc):
        client.post(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            json={"entity_id": "https://rp.example.org"},
            headers=admin_headers,
        )
    assert mc.request.call_args.kwargs["method"] == "POST"


# ── Header injection ───────────────────────────────────────────────────────

def test_proxy_injects_gateway_identity_headers(client, admin_headers):
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )
    fwd = mc.request.call_args.kwargs["headers"]
    assert fwd.get("X-Gateway-User-Email") == "admin@oidfed.org"
    assert fwd.get("X-Gateway-User-Id") == "1"
    assert fwd.get("X-Gateway-User-Role") == "admin"


def test_proxy_strips_client_bearer_jwt(client, admin_headers):
    """The browser JWT must never reach LightHouse."""
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )
    fwd = mc.request.call_args.kwargs["headers"]
    # Client's Bearer JWT should be stripped
    # (Basic auth from registry is injected separately)
    auth_header = fwd.get("authorization", fwd.get("Authorization", ""))
    assert not auth_header.startswith("Bearer ") or "eyJ" not in auth_header


# ── Response tracing headers ───────────────────────────────────────────────

def test_proxy_adds_trace_headers(client, admin_headers):
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )
    assert resp.headers.get("x-proxied-to") == "http://lighthouse:8080"
    assert resp.headers.get("x-instance-name") == "LightHouse"


# ── Error paths ────────────────────────────────────────────────────────────

def test_proxy_requires_auth(client):
    resp = client.get("/api/v1/proxy/ta-1/api/v1/admin/subordinates")
    assert resp.status_code == 403


def test_proxy_unknown_instance_returns_404(client, admin_headers):
    resp = client.get(
        "/api/v1/proxy/no-such-instance/api/v1/admin/subordinates",
        headers=admin_headers,
    )
    assert resp.status_code == 404


def test_proxy_connect_error_returns_502(client, admin_headers):
    mc = _mock_client(side_effect=httpx.ConnectError("refused"))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )
    assert resp.status_code == 502


def test_proxy_timeout_returns_504(client, admin_headers):
    mc = _mock_client(side_effect=httpx.TimeoutException("timeout"))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )
    assert resp.status_code == 504


def test_proxy_instance_not_in_registry_returns_404(client, admin_headers):
    """Instance absent from the deployment registry → 404, not 500.
    Distinct from test_proxy_unknown_instance_returns_404: that test uses a
    completely unknown id; this test uses an id that is similarly absent but
    emphasises the registry-lookup code path."""
    resp = client.get(
        "/api/v1/proxy/not-in-registry/api/v1/admin/subordinates",
        headers=admin_headers,
    )
    assert resp.status_code == 404


# ── Deployment-managed instances ───────────────────────────────────────────

def test_proxy_uses_registry_admin_endpoint(client, admin_headers):
    """Proxy should use registry admin_base_url and inject basic auth."""
    called = {}

    async def capture_request(**kwargs):
        called.update(kwargs)
        return _fake_response()

    mc = MagicMock()
    mc.request = AsyncMock(side_effect=capture_request)

    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=admin_headers,
        )

    assert resp.status_code == 200
    assert called["url"] == "http://lighthouse:8080/api/v1/admin/subordinates"
    assert called["headers"].get("Authorization", "").startswith("Basic ")


# ── Audit details (response body capture + redaction) ──────────────────────

def _latest_audit_entry(resource_id: str) -> AuditLog:
    session = SessionLocal()
    try:
        return (
            session.query(AuditLog)
            .filter(AuditLog.resource_id == resource_id)
            .order_by(AuditLog.created_at.desc())
            .first()
        )
    finally:
        session.close()


def test_audit_details_captures_response_body(client, admin_headers):
    mc = _mock_client(_fake_response(201, json.dumps({"id": "audit-detail-1", "entity_id": "https://rp.example.org"}).encode()))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.post(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            json={"entity_id": "https://rp.example.org"},
            headers=admin_headers,
        )
    assert resp.status_code == 201

    entry = _latest_audit_entry("audit-detail-1")
    assert entry is not None
    details = json.loads(entry.details)
    assert details == {"id": "audit-detail-1", "entity_id": "https://rp.example.org"}


def test_audit_details_redacts_sensitive_fields_in_response(client, admin_headers):
    body = json.dumps({"id": "audit-detail-2", "delegation_jwt": "eyJhbGciOiJI...", "trust_mark_type": "https://x.example.org"}).encode()
    mc = _mock_client(_fake_response(201, body))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.post(
            "/api/v1/proxy/ta-1/api/v1/admin/trust-marks/issuance-spec",
            json={"trust_mark_type": "https://x.example.org"},
            headers=admin_headers,
        )
    assert resp.status_code == 201

    entry = _latest_audit_entry("audit-detail-2")
    assert entry is not None
    details = json.loads(entry.details)
    assert details["delegation_jwt"] == "[REDACTED]"
    assert details["trust_mark_type"] == "https://x.example.org"


def test_audit_resource_id_prefers_response_body_id_over_path_segment(client, admin_headers):
    """A POST to the collection path has no ID in the URL — the real ID only
    exists in the response body, so that must win over the path-segment
    fallback (which would otherwise record resource_id="subordinates")."""
    mc = _mock_client(_fake_response(201, json.dumps({"id": "server-assigned-77"}).encode()))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.post(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            json={"entity_id": "https://rp2.example.org"},
            headers=admin_headers,
        )
    assert resp.status_code == 201
    assert _latest_audit_entry("server-assigned-77") is not None


def test_audit_details_none_for_non_json_response(client, admin_headers):
    """A 204 No Content (or any non-JSON body) must not crash audit recording
    — it should simply result in no `details`, not an error swallowed silently
    into a 500."""
    mc = _mock_client(_fake_response(204, b""))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.delete(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates/no-body-del-1",
            headers=admin_headers,
        )
    assert resp.status_code == 204
    entry = _latest_audit_entry("no-body-del-1")
    assert entry is not None
    assert entry.details is None


# ── RBAC enforcement ─────────────────────────────────────────────────────
# Previously the proxy forwarded every authenticated request regardless of
# role — RBAC was enforced only by the UI hiding buttons. A viewer-role
# user with a valid token could call the proxy directly and mutate data.

def test_proxy_denies_mutation_without_permission(client, viewer_headers):
    mc = _mock_client(_fake_response(201, b'{"id":1}'))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.post(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            json={"entity_id": "https://viewer-should-not-create.example.org"},
            headers=viewer_headers,
        )
    assert resp.status_code == 403
    mc.request.assert_not_called()


def test_proxy_allows_read_within_permission(client, viewer_headers):
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            headers=viewer_headers,
        )
    assert resp.status_code == 200
    mc.request.assert_called_once()


def test_proxy_allows_mutation_with_permission(client, admin_headers):
    """Sanity check that the new RBAC gate doesn't block a role that legitimately
    has the permission — admin_headers is super_admin, which has every
    permission, so this must still reach the upstream call."""
    mc = _mock_client(_fake_response(201, b'{"id":1}'))
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.post(
            "/api/v1/proxy/ta-1/api/v1/admin/subordinates",
            json={"entity_id": "https://admin-can-create.example.org"},
            headers=admin_headers,
        )
    assert resp.status_code == 201
    mc.request.assert_called_once()


def test_proxy_fails_open_for_unmatched_path(client, viewer_headers):
    """A path that doesn't match any known (feature, operation) — e.g. not
    yet described in the OpenAPI spec — isn't blocked by RBAC, since the
    permission model has no opinion on it. It's still forwarded upstream."""
    mc = _mock_client(_fake_response())
    with patch("app.routers.proxy._get_client", return_value=mc):
        resp = client.get(
            "/api/v1/proxy/ta-1/some/undocumented/route",
            headers=viewer_headers,
        )
    assert resp.status_code == 200
    mc.request.assert_called_once()
