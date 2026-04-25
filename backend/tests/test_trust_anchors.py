def test_list_includes_lighthouse(client, admin_headers):
    resp = client.get("/api/v1/admin/trust-anchors", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ta = next((t for t in data if t["id"] == "ta-1"), None)
    assert ta is not None, "Seeded ta-1 not found"
    assert ta["name"] == "LightHouse"
    # HttpUrl normalizes URLs with trailing slash
    assert ta["admin_api_base_url"] == "http://lighthouse:8080/"
    assert ta["status"] == "active"


def test_list_requires_auth(client):
    resp = client.get("/api/v1/admin/trust-anchors")
    assert resp.status_code == 403


def test_create_and_delete_round_trip(client, admin_headers):
    payload = {
        "name": "Temp Anchor",
        "entity_id": "http://temp.ta.test",
        "type": "federation",
        "status": "active",
        "admin_api_base_url": "http://temp-lh:8080",
    }
    create_resp = client.post(
        "/api/v1/admin/trust-anchors", json=payload, headers=admin_headers
    )
    assert create_resp.status_code == 201
    ta_id = create_resp.json()["id"]
    assert create_resp.json()["admin_api_base_url"] == "http://temp-lh:8080"

    # Appears in list
    ids = [t["id"] for t in client.get("/api/v1/admin/trust-anchors", headers=admin_headers).json()]
    assert ta_id in ids

    # Delete
    del_resp = client.delete(f"/api/v1/admin/trust-anchors/{ta_id}", headers=admin_headers)
    assert del_resp.status_code == 204

    # Gone
    ids_after = [t["id"] for t in client.get("/api/v1/admin/trust-anchors", headers=admin_headers).json()]
    assert ta_id not in ids_after


def test_create_requires_admin_permission(client, user_headers):
    resp = client.post(
        "/api/v1/admin/trust-anchors",
        json={
            "name": "Unauthorized",
            "entity_id": "http://unauth.ta.test",
            "type": "federation",
            "status": "active",
        },
        headers=user_headers,
    )
    assert resp.status_code == 403


def test_delete_nonexistent_returns_404(client, admin_headers):
    resp = client.delete("/api/v1/admin/trust-anchors/does-not-exist", headers=admin_headers)
    assert resp.status_code == 404


def test_get_config(client, admin_headers):
    resp = client.get("/api/v1/admin/trust-anchors/ta-1/config", headers=admin_headers)
    assert resp.status_code == 200
    # HttpUrl normalizes URLs with trailing slash
    assert resp.json()["admin_api_base_url"] == "http://lighthouse:8080/"


def test_deployment_managed_flag_distinguishes_seeded_from_manual(client, admin_headers):
    """Regression test: deployment_managed should be True for seeded anchors, False for manual ones."""
    # Create a manual trust anchor
    manual_payload = {
        "name": "Manual Anchor",
        "entity_id": "http://manual.ta.test",
        "description": "This is a manually created anchor",
        "type": "federation",
        "status": "active",
        "admin_api_base_url": "http://manual-lh:8080",
    }
    create_resp = client.post(
        "/api/v1/admin/trust-anchors", json=manual_payload, headers=admin_headers
    )
    assert create_resp.status_code == 201
    manual_ta_id = create_resp.json()["id"]

    # List all trust anchors
    list_resp = client.get("/api/v1/admin/trust-anchors", headers=admin_headers)
    assert list_resp.status_code == 200
    anchors = list_resp.json()

    # Find the seeded deployment-managed anchor (ta-1 / LightHouse)
    seeded_anchor = next((t for t in anchors if t["id"] == "ta-1"), None)
    assert seeded_anchor is not None, "Seeded ta-1 not found"
    # Seeded anchors should be marked as deployment_managed
    assert seeded_anchor["deployment_managed"] is True, "Seeded anchor should have deployment_managed=True"

    # Find the manually created anchor
    manual_anchor = next((t for t in anchors if t["id"] == manual_ta_id), None)
    assert manual_anchor is not None, "Manual anchor not found in list"
    # Manually created anchors should NOT be marked as deployment_managed
    assert manual_anchor["deployment_managed"] is False, "Manual anchor should have deployment_managed=False"

    # Clean up
    client.delete(f"/api/v1/admin/trust-anchors/{manual_ta_id}", headers=admin_headers)
