"""
Tests for the deployment instance registry route.
"""
import pytest


def test_instances_route_returns_sanitized_registry(client, admin_headers):
    """Verify that /api/v1/admin/instances returns deployment-managed instances."""
    resp = client.get("/api/v1/admin/instances", headers=admin_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert "instances" in body
    assert len(body["instances"]) > 0
    
    # Check the seeded instance from deployment config
    instance = body["instances"][0]
    assert instance["id"] == "ta-1"
    # HttpUrl normalizes URLs with trailing slash
    assert instance["admin_base_url"] == "http://lighthouse:8080/"
    assert "admin_auth" not in instance
    assert instance["deployment_managed"] is True
    assert instance["selected_by_default"] is False


def test_instances_route_is_empty_when_no_instances_configured(client, admin_headers, monkeypatch):
    """Verify that the route returns an empty list when no instances are configured."""
    monkeypatch.setattr("app.routers.instances.get_instance_registry", lambda request: [])

    resp = client.get("/api/v1/admin/instances", headers=admin_headers)

    assert resp.status_code == 200
    assert resp.json() == {"instances": []}
