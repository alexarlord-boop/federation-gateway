def test_list_users_as_admin(client, admin_headers):
    resp = client.get("/api/v1/users", headers=admin_headers)
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.json()]
    assert "admin@oidfed.org" in emails
    assert "tech@example.org" in emails


def test_list_users_requires_permission(client, user_headers):
    resp = client.get("/api/v1/users", headers=user_headers)
    assert resp.status_code == 403


def test_get_single_user(client, admin_headers):
    resp = client.get("/api/v1/users/1", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@oidfed.org"


def test_get_nonexistent_user_returns_404(client, admin_headers):
    resp = client.get("/api/v1/users/does-not-exist", headers=admin_headers)
    assert resp.status_code == 404


def test_create_and_delete_user(client, admin_headers):
    resp = client.post(
        "/api/v1/users",
        json={
            "name": "Temp User",
            "email": "tmpuser@bff.test",
            "password": "temppass123",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    user_id = resp.json()["id"]
    assert resp.json()["email"] == "tmpuser@bff.test"

    # Appears in list
    emails = [u["email"] for u in client.get("/api/v1/users", headers=admin_headers).json()]
    assert "tmpuser@bff.test" in emails

    # Delete
    assert client.delete(f"/api/v1/users/{user_id}", headers=admin_headers).status_code == 204

    # Gone
    emails_after = [u["email"] for u in client.get("/api/v1/users", headers=admin_headers).json()]
    assert "tmpuser@bff.test" not in emails_after


def test_duplicate_email_rejected(client, admin_headers):
    resp = client.post(
        "/api/v1/users",
        json={"name": "Dupe", "email": "admin@oidfed.org", "password": "pass"},
        headers=admin_headers,
    )
    assert resp.status_code == 409
