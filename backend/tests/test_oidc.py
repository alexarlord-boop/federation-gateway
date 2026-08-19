"""
Tests for real user login via OIDC (PRODUCTION-READINESS.md #1).

Uses respx to mock the external IdP (discovery doc, token endpoint, JWKS)
and authlib to forge a validly-signed ID token — no live IdP needed to
exercise the full authorization-code+PKCE+ID-token-validation path.
"""
import time
import urllib.parse

import pytest
import respx
import httpx
from authlib.jose import JsonWebKey, jwt as authlib_jwt

from app.auth.security import create_oidc_state_token
from app.db.database import SessionLocal
from app.models.user import User

ISSUER = "https://mock-idp.test"
DISCOVERY_URL = f"{ISSUER}/.well-known/openid-configuration"
AUTHORIZATION_ENDPOINT = f"{ISSUER}/authorize"
TOKEN_ENDPOINT = f"{ISSUER}/token"
JWKS_URI = f"{ISSUER}/jwks"

_KEY = JsonWebKey.generate_key("RSA", 2048, is_private=True, options={"kid": "test-key"})
_PRIVATE_JWK = _KEY.as_dict(is_private=True)
_PUBLIC_JWK = _KEY.as_dict(is_private=False)


def _discovery_response():
    return httpx.Response(
        200,
        json={
            "issuer": ISSUER,
            "authorization_endpoint": AUTHORIZATION_ENDPOINT,
            "token_endpoint": TOKEN_ENDPOINT,
            "jwks_uri": JWKS_URI,
        },
    )


def _jwks_response():
    return httpx.Response(200, json={"keys": [_PUBLIC_JWK]})


def _make_id_token(**claim_overrides) -> str:
    now = int(time.time())
    payload = {
        "iss": ISSUER,
        "sub": "idp-user-1",
        "aud": "test-client-id",
        "exp": now + 300,
        "iat": now,
        "email": "sso.person@example.org",
        "name": "SSO Person",
    }
    payload.update(claim_overrides)
    header = {"alg": "RS256", "kid": _PUBLIC_JWK["kid"]}
    token = authlib_jwt.encode(header, payload, _PRIVATE_JWK)
    return token.decode()


@pytest.fixture()
def oidc_provider(client, admin_headers):
    resp = client.post(
        "/api/v1/oidc/providers",
        json={
            "name": "Mock IdP",
            "issuer_url": ISSUER,
            "client_id": "test-client-id",
            "client_secret": "super-secret-value",
            "scopes": "openid email profile",
            "enabled": True,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    provider = resp.json()
    yield provider
    client.delete(f"/api/v1/oidc/providers/{provider['id']}", headers=admin_headers)


def _cleanup_user_by_email(email: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            db.delete(user)
            db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Provider CRUD — admin-only
# ---------------------------------------------------------------------------


def test_provider_crud_requires_permission(client, user_headers):
    resp = client.get("/api/v1/oidc/providers", headers=user_headers)
    assert resp.status_code == 403


def test_provider_create_list_update_delete(client, admin_headers):
    create = client.post(
        "/api/v1/oidc/providers",
        json={
            "name": "Temp Provider",
            "issuer_url": "https://temp-idp.test",
            "client_id": "cid",
            "client_secret": "shh",
        },
        headers=admin_headers,
    )
    assert create.status_code == 201, create.text
    body = create.json()
    assert "client_secret" not in body
    provider_id = body["id"]

    listing = client.get("/api/v1/oidc/providers", headers=admin_headers)
    assert any(p["id"] == provider_id for p in listing.json())

    updated = client.patch(
        f"/api/v1/oidc/providers/{provider_id}",
        json={"enabled": False},
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["enabled"] is False
    assert "client_secret" not in updated.json()

    deleted = client.delete(f"/api/v1/oidc/providers/{provider_id}", headers=admin_headers)
    assert deleted.status_code == 204


def test_duplicate_issuer_rejected(client, admin_headers, oidc_provider):
    resp = client.post(
        "/api/v1/oidc/providers",
        json={
            "name": "Dupe",
            "issuer_url": oidc_provider["issuer_url"],
            "client_id": "other",
            "client_secret": "shh",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Public provider listing — unauthenticated, backs the login page
# ---------------------------------------------------------------------------


def test_public_provider_list_hides_disabled_and_secrets(client, admin_headers, oidc_provider):
    resp = client.get("/api/auth/oidc/providers")
    assert resp.status_code == 200
    entries = resp.json()
    assert all(set(e.keys()) == {"id", "name"} for e in entries)
    assert any(e["id"] == oidc_provider["id"] for e in entries)

    client.patch(
        f"/api/v1/oidc/providers/{oidc_provider['id']}",
        json={"enabled": False},
        headers=admin_headers,
    )
    resp2 = client.get("/api/auth/oidc/providers")
    assert not any(e["id"] == oidc_provider["id"] for e in resp2.json())
    # re-enable so the fixture teardown / other tests see it enabled
    client.patch(
        f"/api/v1/oidc/providers/{oidc_provider['id']}",
        json={"enabled": True},
        headers=admin_headers,
    )


# ---------------------------------------------------------------------------
# /login — builds the authorization redirect
# ---------------------------------------------------------------------------


@respx.mock
def test_login_redirect_builds_authorization_url(client, oidc_provider):
    respx.get(DISCOVERY_URL).mock(return_value=_discovery_response())

    resp = client.get(f"/api/auth/oidc/{oidc_provider['id']}/login", follow_redirects=False)
    assert resp.status_code in (302, 307)
    location = resp.headers["location"]
    assert location.startswith(AUTHORIZATION_ENDPOINT)

    params = urllib.parse.parse_qs(urllib.parse.urlparse(location).query)
    assert params["client_id"] == [oidc_provider["client_id"]]
    assert params["response_type"] == ["code"]
    assert "state" in params
    assert "nonce" in params
    assert params["code_challenge_method"] == ["S256"]
    assert "code_challenge" in params


def test_login_unknown_provider_404s(client):
    resp = client.get("/api/auth/oidc/does-not-exist/login", follow_redirects=False)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# /callback — state validation, ID-token validation, JIT provisioning
# ---------------------------------------------------------------------------


def test_callback_rejects_tampered_state(client, oidc_provider):
    resp = client.get(
        f"/api/auth/oidc/{oidc_provider['id']}/callback",
        params={"code": "authcode", "state": "not-a-real-token"},
        follow_redirects=False,
    )
    assert resp.status_code in (302, 307)
    assert "error=" in resp.headers["location"]


def test_callback_rejects_state_for_wrong_provider(client, oidc_provider):
    state = create_oidc_state_token(
        {"provider_id": "some-other-provider", "nonce": "n", "code_verifier": "v"}
    )
    resp = client.get(
        f"/api/auth/oidc/{oidc_provider['id']}/callback",
        params={"code": "authcode", "state": state},
        follow_redirects=False,
    )
    assert resp.status_code in (302, 307)
    assert "error=" in resp.headers["location"]


@respx.mock
def test_callback_happy_path_jit_provisions_user_with_no_role(client, oidc_provider):
    respx.get(DISCOVERY_URL).mock(return_value=_discovery_response())
    respx.get(JWKS_URI).mock(return_value=_jwks_response())

    email = "sso.person@example.org"
    _cleanup_user_by_email(email)

    # Drive /login first so the state token carries a real nonce/code_verifier
    # our forged id_token can match.
    login_resp = client.get(f"/api/auth/oidc/{oidc_provider['id']}/login", follow_redirects=False)
    location = login_resp.headers["location"]
    params = urllib.parse.parse_qs(urllib.parse.urlparse(location).query)
    state = params["state"][0]
    nonce = params["nonce"][0]

    id_token = _make_id_token(nonce=nonce)
    respx.post(TOKEN_ENDPOINT).mock(
        return_value=httpx.Response(
            200,
            json={"access_token": "idp-access-token", "token_type": "Bearer", "id_token": id_token},
        )
    )

    resp = client.get(
        f"/api/auth/oidc/{oidc_provider['id']}/callback",
        params={"code": "authcode", "state": state},
        follow_redirects=False,
    )
    assert resp.status_code in (302, 307)
    location = resp.headers["location"]
    assert location.startswith("http://frontend.test/auth/callback#")
    fragment = urllib.parse.parse_qs(urllib.parse.urlparse(location).fragment)
    assert "access_token" in fragment
    assert "refresh_token" in fragment
    assert "error" not in fragment

    # New user JIT-provisioned, no RBAC role assigned.
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.oidc_sub == "idp-user-1"
        assert user.oidc_issuer == ISSUER
        assert list(user.roles) == []

        # Regression: seed_rbac_data() re-runs on every backend restart and
        # back-fills a role for any *legacy* roleless user — it must not
        # paper over a deliberately-roleless SSO account when that happens.
        from app.db.rbac_seed import seed_rbac_data
        seed_rbac_data(db)
        db.refresh(user)
        assert list(user.roles) == []
    finally:
        db.close()

    # The freshly-issued access token is usable against /api/auth/me.
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fragment['access_token'][0]}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

    _cleanup_user_by_email(email)


@respx.mock
def test_callback_rejects_nonce_mismatch(client, oidc_provider):
    respx.get(DISCOVERY_URL).mock(return_value=_discovery_response())
    respx.get(JWKS_URI).mock(return_value=_jwks_response())

    login_resp = client.get(f"/api/auth/oidc/{oidc_provider['id']}/login", follow_redirects=False)
    params = urllib.parse.parse_qs(urllib.parse.urlparse(login_resp.headers["location"]).query)
    state = params["state"][0]

    # Sign the ID token with a *different* nonce than the one embedded in state.
    id_token = _make_id_token(nonce="wrong-nonce")
    respx.post(TOKEN_ENDPOINT).mock(
        return_value=httpx.Response(
            200,
            json={"access_token": "idp-access-token", "token_type": "Bearer", "id_token": id_token},
        )
    )

    resp = client.get(
        f"/api/auth/oidc/{oidc_provider['id']}/callback",
        params={"code": "authcode", "state": state},
        follow_redirects=False,
    )
    assert "error=" in resp.headers["location"]


# ---------------------------------------------------------------------------
# Local login rejection for SSO accounts
# ---------------------------------------------------------------------------


@respx.mock
def test_local_login_rejected_for_sso_account(client, oidc_provider):
    respx.get(DISCOVERY_URL).mock(return_value=_discovery_response())
    respx.get(JWKS_URI).mock(return_value=_jwks_response())

    email = "sso.person@example.org"
    _cleanup_user_by_email(email)

    login_resp = client.get(f"/api/auth/oidc/{oidc_provider['id']}/login", follow_redirects=False)
    params = urllib.parse.parse_qs(urllib.parse.urlparse(login_resp.headers["location"]).query)
    state = params["state"][0]
    nonce = params["nonce"][0]
    id_token = _make_id_token(nonce=nonce)
    respx.post(TOKEN_ENDPOINT).mock(
        return_value=httpx.Response(
            200,
            json={"access_token": "idp-access-token", "token_type": "Bearer", "id_token": id_token},
        )
    )
    client.get(
        f"/api/auth/oidc/{oidc_provider['id']}/callback",
        params={"code": "authcode", "state": state},
        follow_redirects=False,
    )

    resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "anything"},
    )
    assert resp.status_code == 400
    assert "single sign-on" in resp.json()["detail"]

    _cleanup_user_by_email(email)
