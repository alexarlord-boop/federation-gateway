"""Tests for the /api/v1/admin/resolve and /api/v1/admin/trust-mark-status BFF endpoints."""
import base64
import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest


def _fake_response(status_code: int = 200, text: str = "", json_body=None):
    mock = MagicMock(spec=httpx.Response)
    mock.status_code = status_code
    mock.text = text
    if json_body is not None:
        mock.json.return_value = json_body
    else:
        # Match real httpx.Response.json() behavior on non-JSON bodies (e.g. a raw JWT).
        mock.json.side_effect = json.JSONDecodeError("mock: not JSON", text, 0)
    return mock


def _mock_async_client(response=None, *, side_effect=None, post_response=None, post_side_effect=None):
    """Build a mock that supports `async with httpx.AsyncClient(...) as client`."""
    instance = MagicMock()
    if side_effect is not None:
        instance.get = AsyncMock(side_effect=side_effect)
    else:
        instance.get = AsyncMock(return_value=response)

    if post_side_effect is not None:
        instance.post = AsyncMock(side_effect=post_side_effect)
    else:
        instance.post = AsyncMock(return_value=post_response)

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=instance)
    cm.__aexit__ = AsyncMock(return_value=False)

    factory = MagicMock(return_value=cm)
    return factory, instance


def _fake_jwt(payload: dict) -> str:
    """Build an unsigned-but-structurally-valid JWT string for testing decode logic."""
    def b64url(obj) -> str:
        raw = json.dumps(obj).encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")
    header = {"alg": "ES512", "typ": "trust-mark-status-response+jwt"}
    return f"{b64url(header)}.{b64url(payload)}.fakesig"


# A fake public-resolving hostname for SSRF-guard tests
_PUBLIC_ADDRINFO = [(None, None, None, None, ("93.184.216.34", 0))]
_PRIVATE_ADDRINFO = [(None, None, None, None, ("10.0.0.5", 0))]


# ── GET /resolve ─────────────────────────────────────────────────────────

def test_resolve_rejects_non_https_scheme(client, admin_headers):
    resp = client.get(
        "/api/v1/admin/resolve?entity_id=http://example.org",
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_resolve_blocks_private_address(client, admin_headers):
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PRIVATE_ADDRINFO):
        resp = client.get(
            "/api/v1/admin/resolve?entity_id=https://internal.example.org",
            headers=admin_headers,
        )
    assert resp.status_code == 422
    assert "private" in resp.json()["detail"].lower()


def test_resolve_returns_decoded_payload(client, admin_headers):
    jwt = "eyJhbGciOiJFUzUxMiJ9.eyJzdWIiOiJodHRwczovL2V4YW1wbGUub3JnIn0.sig"
    factory, instance = _mock_async_client(_fake_response(200, text=jwt))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/resolve?entity_id=https://example.org",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["payload"]["sub"] == "https://example.org"
    assert body["raw_jwt"] == jwt
    called_url = instance.get.call_args.args[0]
    assert called_url == "https://example.org/.well-known/openid-federation"


def test_resolve_404_when_no_entity_configuration(client, admin_headers):
    factory, _ = _mock_async_client(_fake_response(404, text="not found"))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/resolve?entity_id=https://example.org",
            headers=admin_headers,
        )
    assert resp.status_code == 404


def test_resolve_requires_auth(client):
    resp = client.get("/api/v1/admin/resolve?entity_id=https://example.org")
    assert resp.status_code in (401, 403)


# ── GET /trust-mark-status ───────────────────────────────────────────────

def test_trust_mark_status_rejects_non_https_endpoint(client, admin_headers):
    resp = client.get(
        "/api/v1/admin/trust-mark-status"
        "?status_endpoint=http://issuer.example.org/trust_mark/status"
        "&trust_mark_jwt=header.payload.sig",
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_trust_mark_status_blocks_private_address(client, admin_headers):
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PRIVATE_ADDRINFO):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://internal.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig",
            headers=admin_headers,
        )
    assert resp.status_code == 422


def test_trust_mark_status_requires_auth(client):
    resp = client.get(
        "/api/v1/admin/trust-mark-status"
        "?status_endpoint=https://issuer.example.org/trust_mark/status"
        "&trust_mark_jwt=header.payload.sig"
    )
    assert resp.status_code in (401, 403)


def test_trust_mark_status_missing_jwt_returns_422(client, admin_headers):
    """trust_mark_jwt is the spec's sole required parameter (§8.4.1) — omitting
    it is a validation error, not something the endpoint should try to route
    around."""
    resp = client.get(
        "/api/v1/admin/trust-mark-status?status_endpoint=https://issuer.example.org/trust_mark/status",
        headers=admin_headers,
    )
    assert resp.status_code == 422


# ── GET /trust-mark-status — POST is the spec-compliant primary path ───────
#
# Per OIDF §8.4.1/8.4.2 (verified against the normative spec text): the
# request MUST be POST, application/x-www-form-urlencoded, with a single
# required `trust_mark` parameter; the response MUST be a signed JWT with a
# `status` claim. LightHouse implements this correctly — it's the primary
# path here, not a fallback.

def test_trust_mark_status_post_sends_form_urlencoded_trust_mark(client, admin_headers):
    status_jwt = _fake_jwt({"iss": "https://issuer.example.org", "status": "active"})
    factory, instance = _mock_async_client(post_response=_fake_response(200, text=status_jwt))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert resp.json() == {"active": True}
    post_call = instance.post.call_args
    assert post_call.args[0] == "https://issuer.example.org/trust_mark/status"
    # `data=`, not `json=` — application/x-www-form-urlencoded per §8.4.1,
    # not application/json.
    assert post_call.kwargs["data"] == {"trust_mark": "header.payload.sig"}
    assert "json" not in post_call.kwargs
    instance.get.assert_not_called()  # GET is a fallback, never tried when POST succeeds


def test_trust_mark_status_post_revoked_mark(client, admin_headers):
    status_jwt = _fake_jwt({"iss": "https://issuer.example.org", "status": "revoked"})
    factory, _ = _mock_async_client(post_response=_fake_response(200, text=status_jwt))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert resp.json() == {"active": False}


@pytest.mark.parametrize("status_value", ["expired", "invalid"])
def test_trust_mark_status_post_handles_all_spec_status_values(client, admin_headers, status_value):
    """§8.4.2 defines four status values (active/expired/revoked/invalid) —
    only "active" means the mark is currently valid; the other three
    (including ones not covered by the old active/revoked-only check) must
    all resolve to active: false, not a parse error."""
    status_jwt = _fake_jwt({"iss": "https://issuer.example.org", "status": status_value})
    factory, _ = _mock_async_client(post_response=_fake_response(200, text=status_jwt))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert resp.json() == {"active": False}


def test_trust_mark_status_post_primary_accepts_plain_json_response(client, admin_headers):
    """A lenient issuer that returns plain JSON on POST (instead of the
    spec-mandated signed JWT) should still work."""
    factory, _ = _mock_async_client(post_response=_fake_response(200, json_body={"active": True}))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert resp.json() == {"active": True}


# ── GET /trust-mark-status — GET fallback for non-compliant issuers ────────
#
# Confirmed by reading the current OpenID Federation 1.0 spec text directly:
# POST is the *only* normative request method (§8.4.1) — GET isn't part of
# the finalized spec at all. The real eduGAIN testbed root
# (testbed.oidf.lab.surf.nl) only accepts GET + `sub`/`trust_mark_id` query
# params, returning plain JSON `{"active": bool}` — an older, non-final
# draft contract. This fallback exists for issuers like that one, not
# because both forms are equally valid.

def test_trust_mark_status_falls_back_to_get_when_post_rejected(client, admin_headers):
    """POST → 405 (a non-compliant issuer like the eduGAIN testbed) should
    trigger a GET retry using sub/trust_mark_id."""
    factory, instance = _mock_async_client(
        response=_fake_response(200, json_body={"active": True}),
        post_response=_fake_response(405, text='{"error":"Method Not Allowed"}'),
    )
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig"
            "&sub=https://holder.example.org&trust_mark_id=https://issuer.example.org/member",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert resp.json() == {"active": True}
    get_call = instance.get.call_args
    assert get_call.args[0] == "https://issuer.example.org/trust_mark/status"
    assert get_call.kwargs["params"] == {
        "sub": "https://holder.example.org",
        "trust_mark_id": "https://issuer.example.org/member",
    }


def test_trust_mark_status_get_fallback_revoked(client, admin_headers):
    factory, _ = _mock_async_client(
        response=_fake_response(200, json_body={"active": False}),
        post_response=_fake_response(405, text="Method Not Allowed"),
    )
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig"
            "&sub=https://holder.example.org&trust_mark_id=https://issuer.example.org/member",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert resp.json() == {"active": False}


def test_trust_mark_status_no_sub_for_fallback_returns_502(client, admin_headers):
    """POST fails and no sub/trust_mark_id was supplied to retry with GET."""
    factory, instance = _mock_async_client(post_response=_fake_response(405, text="Method Not Allowed"))
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig",
            headers=admin_headers,
        )
    assert resp.status_code == 502
    instance.get.assert_not_called()


def test_trust_mark_status_both_post_and_get_fail_returns_502(client, admin_headers):
    factory, _ = _mock_async_client(
        response=_fake_response(500, text="boom"),
        post_response=_fake_response(405, text="Method Not Allowed"),
    )
    with patch("app.routers.resolve.socket.getaddrinfo", return_value=_PUBLIC_ADDRINFO), \
         patch("app.routers.resolve.httpx.AsyncClient", factory):
        resp = client.get(
            "/api/v1/admin/trust-mark-status"
            "?status_endpoint=https://issuer.example.org/trust_mark/status"
            "&trust_mark_jwt=header.payload.sig"
            "&sub=https://holder.example.org&trust_mark_id=https://issuer.example.org/member",
            headers=admin_headers,
        )
    assert resp.status_code == 502
