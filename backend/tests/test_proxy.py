from unittest.mock import AsyncMock, MagicMock, patch

import httpx


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
    assert "authorization" not in {k.lower() for k in fwd}


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


def test_proxy_instance_without_base_url_returns_422(client, admin_headers):
    """TA with no admin_api_base_url → 422, not 500."""
    ta = client.post(
        "/api/v1/admin/trust-anchors",
        json={
            "name": "No URL TA",
            "entity_id": "http://nourl.proxy.test",
            "type": "intermediate",
            "status": "active",
            # admin_api_base_url intentionally omitted
        },
        headers=admin_headers,
    ).json()
    ta_id = ta["id"]
    try:
        resp = client.get(
            f"/api/v1/proxy/{ta_id}/api/v1/admin/subordinates",
            headers=admin_headers,
        )
        assert resp.status_code == 422
    finally:
        client.delete(f"/api/v1/admin/trust-anchors/{ta_id}", headers=admin_headers)
