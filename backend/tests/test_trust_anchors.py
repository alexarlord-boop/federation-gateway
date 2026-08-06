def test_subordinate_count_reflects_tenant_registrations(client, admin_headers):
    """ta-1 subordinate_count must increase by 1 after adding a registration for tenant-ta-1."""
    # Baseline count before adding a registration
    before = client.get("/api/v1/admin/trust-anchors", headers=admin_headers).json()
    ta_before = next((t for t in before if t["id"] == "ta-1"), None)
    assert ta_before is not None, "Seeded ta-1 not found"
    count_before = ta_before["subordinate_count"]

    # Create one registration for tenant-ta-1
    reg_resp = client.post(
        "/api/v1/registrations",
        json={
            "tenant_id": "tenant-ta-1",
            "entity_id": "http://sub-count-test.example.org",
            "registered_entity_types": ["openid_provider"],
            "display_name": "Sub Entity Count Test",
        },
        headers=admin_headers,
    )
    assert reg_resp.status_code == 201, reg_resp.text
    reg_id = reg_resp.json()["id"]

    try:
        # ta-1 must now report one more subordinate
        after = client.get("/api/v1/admin/trust-anchors", headers=admin_headers).json()
        ta_after = next((t for t in after if t["id"] == "ta-1"), None)
        assert ta_after is not None, "Seeded ta-1 not found"
        assert ta_after["subordinate_count"] == count_before + 1, (
            f"Expected subordinate_count={count_before + 1}, got {ta_after['subordinate_count']}"
        )
    finally:
        # Reject the registration so it is excluded from future count queries,
        # keeping subsequent tests hermetic.
        cleanup_resp = client.post(
            f"/api/v1/registrations/{reg_id}/review",
            json={"status": "rejected", "notes": "cleanup"},
            headers=admin_headers,
        )
        assert cleanup_resp.status_code == 200, (
            f"Cleanup review failed with status {cleanup_resp.status_code}: {cleanup_resp.text}"
        )


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


def test_seeded_anchor_is_deployment_managed(client, admin_headers):
    """Seeded (config-backed) ta-1 must be flagged deployment_managed=True."""
    resp = client.get("/api/v1/admin/trust-anchors", headers=admin_headers)
    assert resp.status_code == 200
    anchors = resp.json()
    ta = next((t for t in anchors if t["id"] == "ta-1"), None)
    assert ta is not None, "Seeded ta-1 not found"
    assert ta["deployment_managed"] is True, "Seeded anchor must have deployment_managed=True"


def test_manual_trust_anchor_create_route_is_not_supported(client, admin_headers):
    """POST to the collection path must return 405 — the only supported method is GET."""
    resp = client.post(
        "/api/v1/admin/trust-anchors",
        json={
            "name": "Manual Anchor",
            "entity_id": "http://manual.ta.test",
            "type": "federation",
            "status": "active",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 405


def test_manual_trust_anchor_delete_route_is_not_supported(client, admin_headers):
    """DELETE on a known anchor must return 404 — no per-anchor routes exist, proving
    the route itself is absent rather than just missing-resource 404."""
    resp = client.delete("/api/v1/admin/trust-anchors/ta-1", headers=admin_headers)
    assert resp.status_code == 404


def test_trust_anchor_config_route_is_not_supported(client, admin_headers):
    """The /config sub-path must be absent (404) — config is deployment-managed only."""
    resp = client.get("/api/v1/admin/trust-anchors/ta-1/config", headers=admin_headers)
    assert resp.status_code == 404


def test_capabilities_trust_anchors_only_exposes_list_operation(client):
    """The capabilities manifest must advertise only the 'list' operation for
    trust_anchors — create/read/update/delete routes have been removed."""
    resp = client.get("/api/v1/capabilities")
    assert resp.status_code == 200
    data = resp.json()
    ta = data["features"].get("trust_anchors")
    assert ta is not None, "trust_anchors must appear in capabilities"
    assert ta["enabled"] is True
    ops = set(ta["operations"])
    assert ops == {"list"}, (
        f"trust_anchors should expose only ['list'], got {sorted(ops)}"
    )
    # No CRUD endpoints should be advertised
    endpoints = ta.get("endpoints", [])
    for ep in endpoints:
        assert not any(
            method in ep for method in ["POST", "DELETE", "PUT", "PATCH"]
        ), f"Unexpected mutating endpoint in capabilities: {ep}"
