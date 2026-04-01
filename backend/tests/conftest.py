"""
Shared fixtures for the BFF test suite.

The DATABASE_URL env var must be set before any app module is imported
so SQLAlchemy binds to a test database, not the production file.
We use a fresh in-memory SQLite DB per test session.
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_bff.db"

import pytest
from fastapi.testclient import TestClient

# Import app *after* DATABASE_URL is set
from app.main import app  # noqa: E402 — triggers create_all + seed


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@oidfed.org", "password": "admin123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def user_token(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "tech@example.org", "password": "user123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture(scope="session")
def viewer_headers(client, admin_headers):
    """A user with the viewer RBAC role — read-only, no subordinates:update."""
    # Create a throw-away viewer account
    resp = client.post(
        "/api/v1/users",
        json={
            "name": "Viewer Test",
            "email": "viewer.test@example.org",
            "password": "viewer123",
            "role": "user",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    user_id = resp.json()["id"]

    # Assign viewer RBAC role (read-only — no subordinates:update)
    client.put(
        f"/api/v1/users/{user_id}/rbac-role",
        json={"role_id": "viewer"},
        headers=admin_headers,
    )

    token_resp = client.post(
        "/api/auth/login",
        json={"email": "viewer.test@example.org", "password": "viewer123"},
    )
    assert token_resp.status_code == 200, token_resp.text
    return {"Authorization": f"Bearer {token_resp.json()['access_token']}"}
