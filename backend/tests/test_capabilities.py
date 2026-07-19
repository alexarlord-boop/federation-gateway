"""
Tests for per-instance capability discovery: the live probe
(app.utils.capability_probe), the refresh endpoint, and the
GET /api/v1/capabilities?instance_id=... merge behavior.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.db.database import SessionLocal
from app.models.rbac import InstanceCapability
from app.utils.capability_probe import probe_instance_capabilities


def _fake_get_response(status_code: int):
    mock = MagicMock(spec=httpx.Response)
    mock.status_code = status_code
    return mock


class _FakeAsyncClient:
    """Minimal stand-in for httpx.AsyncClient supporting `async with` + .get()."""

    def __init__(self, status_by_path: dict[str, int] | None = None, *, raise_error: bool = False):
        self._status_by_path = status_by_path or {}
        self._raise_error = raise_error
        self.get = AsyncMock(side_effect=self._get)

    async def _get(self, url, headers=None):
        if self._raise_error:
            raise httpx.ConnectError("refused")
        for path, status_code in self._status_by_path.items():
            if url.endswith(path):
                return _fake_get_response(status_code)
        return _fake_get_response(200)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


def _cleanup_probes(db, instance_id):
    db.query(InstanceCapability).filter_by(instance_id=instance_id).delete()
    db.commit()


@pytest.mark.asyncio
async def test_probe_marks_working_endpoint_supported():
    db = SessionLocal()
    try:
        _cleanup_probes(db, "test-probe-1")
        fake_client = _FakeAsyncClient(status_by_path={"/api/v1/admin/subordinates": 200})
        with patch("app.utils.capability_probe.httpx.AsyncClient", return_value=fake_client):
            await probe_instance_capabilities(db, "test-probe-1", "http://fake-lighthouse:8080", None)

        row = db.query(InstanceCapability).filter_by(
            instance_id="test-probe-1", feature_name="subordinates",
        ).first()
        assert row is not None
        assert row.supported is True
    finally:
        _cleanup_probes(db, "test-probe-1")
        db.close()


@pytest.mark.asyncio
async def test_probe_marks_404_as_unsupported():
    db = SessionLocal()
    try:
        _cleanup_probes(db, "test-probe-2")
        fake_client = _FakeAsyncClient(status_by_path={"/api/v1/admin/subordinates/constraints": 404})
        with patch("app.utils.capability_probe.httpx.AsyncClient", return_value=fake_client):
            await probe_instance_capabilities(db, "test-probe-2", "http://fake-lighthouse:8080", None)

        row = db.query(InstanceCapability).filter_by(
            instance_id="test-probe-2", feature_name="general_constraints",
        ).first()
        assert row is not None
        assert row.supported is False
    finally:
        _cleanup_probes(db, "test-probe-2")
        db.close()


@pytest.mark.asyncio
async def test_probe_network_error_does_not_overwrite_previous_good_result():
    db = SessionLocal()
    try:
        _cleanup_probes(db, "test-probe-3")
        db.add(InstanceCapability(
            instance_id="test-probe-3", feature_name="subordinates",
            supported=True, detail="previously fine", last_probed_at="2026-01-01T00:00:00Z",
        ))
        db.commit()

        fake_client = _FakeAsyncClient(raise_error=True)
        with patch("app.utils.capability_probe.httpx.AsyncClient", return_value=fake_client):
            await probe_instance_capabilities(db, "test-probe-3", "http://fake-lighthouse:8080", None)

        row = db.query(InstanceCapability).filter_by(
            instance_id="test-probe-3", feature_name="subordinates",
        ).first()
        # A transient network blip must not erase a previously confirmed result.
        assert row.supported is True
    finally:
        _cleanup_probes(db, "test-probe-3")
        db.close()


def test_refresh_endpoint_requires_permission(client, viewer_headers):
    resp = client.post("/api/v1/admin/instances/ta-1/capabilities/refresh", headers=viewer_headers)
    assert resp.status_code == 403


def test_refresh_endpoint_unknown_instance_returns_404(client, admin_headers):
    resp = client.post("/api/v1/admin/instances/does-not-exist/capabilities/refresh", headers=admin_headers)
    assert resp.status_code == 404


def test_refresh_endpoint_probes_and_returns_results(client, admin_headers):
    async def fake_probe(db, instance_id, base_url, basic_credentials):
        return {"subordinates": True, "general_constraints": False}

    with patch("app.routers.instances.probe_instance_capabilities", side_effect=fake_probe):
        resp = client.post("/api/v1/admin/instances/ta-1/capabilities/refresh", headers=admin_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["instance_id"] == "ta-1"
    assert body["probed"] == {"subordinates": True, "general_constraints": False}


def test_capabilities_without_instance_id_has_no_instance_supported_field(client, admin_headers):
    resp = client.get("/api/v1/capabilities", headers=admin_headers)
    assert resp.status_code == 200
    features = resp.json()["features"]
    assert features["subordinates"]["instance_supported"] is None


def test_capabilities_with_instance_id_merges_probe_result_without_disabling_feature(client, admin_headers):
    db = SessionLocal()
    try:
        _cleanup_probes(db, "test-manifest-merge")
        db.add(InstanceCapability(
            instance_id="test-manifest-merge", feature_name="general_constraints",
            supported=False, detail="probe returned 404", last_probed_at="2026-01-01T00:00:00Z",
        ))
        db.commit()

        resp = client.get(
            "/api/v1/capabilities", params={"instance_id": "test-manifest-merge"}, headers=admin_headers,
        )
        assert resp.status_code == 200
        feature = resp.json()["features"]["general_constraints"]

        # instance_supported surfaces the probe result...
        assert feature["instance_supported"] is False
        # ...but must never silently flip `enabled` — a single probed
        # endpoint failing doesn't prove the whole feature is unusable
        # (see general_constraints: it bundles a combined GET plus several
        # sub-resource endpoints the probe never touches). The admin
        # decides whether to disable it via the policy toggle, not the probe.
        assert feature["enabled"] is True
    finally:
        _cleanup_probes(db, "test-manifest-merge")
        db.close()
