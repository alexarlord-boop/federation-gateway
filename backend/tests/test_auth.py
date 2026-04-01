def test_login_success(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@oidfed.org", "password": "admin123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@oidfed.org"
    assert data["user"]["role"] == "admin"


def test_login_wrong_password(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@oidfed.org", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "admin123"},
    )
    assert resp.status_code == 401


def test_me_with_valid_token(client, admin_headers):
    resp = client.get("/api/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@oidfed.org"


def test_me_without_token(client):
    # HTTPBearer raises 403 when no credentials present
    resp = client.get("/api/auth/me")
    assert resp.status_code == 403


def test_me_with_garbage_token(client):
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )
    assert resp.status_code == 401


def test_refresh_returns_new_tokens(client):
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@oidfed.org", "password": "admin123"},
    )
    refresh_token = login.json()["refresh_token"]

    resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

    # New access token must be usable
    me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me.status_code == 200


def test_refresh_with_access_token_rejected(client):
    """Sending an access token to /refresh must be rejected (wrong type claim)."""
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@oidfed.org", "password": "admin123"},
    )
    access_token = login.json()["access_token"]
    resp = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401
