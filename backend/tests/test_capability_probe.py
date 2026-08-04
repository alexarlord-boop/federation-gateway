"""Tests for app.utils.capability_probe.probe_entity_id.

seed_data() defaults a deployment-managed instance's stored entity_id to its
public_base_url, which is only correct by coincidence (true for ta-1/ta-2,
false for the local test mesh's docker-hostname entity_ids). probe_entity_id
is the best-effort startup correction: fetch the instance's own entity
configuration and read its real self-asserted `sub`.
"""
import base64
import json
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.utils.capability_probe import probe_entity_id


def _fake_jwt(payload: dict) -> str:
    def b64(obj) -> str:
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
    return f"{b64({'alg': 'ES256'})}.{b64(payload)}.fake-signature"


def _fake_response(status_code: int = 200, text: str = ""):
    mock = MagicMock(spec=httpx.Response)
    mock.status_code = status_code
    mock.text = text
    return mock


def _mock_async_client(response=None, *, side_effect=None):
    instance = MagicMock()
    if side_effect is not None:
        instance.get = AsyncMock(side_effect=side_effect)
    else:
        instance.get = AsyncMock(return_value=response)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=instance)
    cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=cm), instance


async def test_probe_entity_id_returns_sub_claim(monkeypatch):
    jwt = _fake_jwt({"sub": "http://mesh-ta:8080", "iss": "http://mesh-ta:8080"})
    factory, instance = _mock_async_client(_fake_response(200, jwt))
    monkeypatch.setattr("app.utils.capability_probe.httpx.AsyncClient", factory)

    result = await probe_entity_id("http://mesh-ta:8080")

    assert result == "http://mesh-ta:8080"
    instance.get.assert_awaited_once_with("http://mesh-ta:8080/.well-known/openid-federation")


async def test_probe_entity_id_strips_trailing_slash_from_base_url(monkeypatch):
    jwt = _fake_jwt({"sub": "http://mesh-ia:8080"})
    factory, instance = _mock_async_client(_fake_response(200, jwt))
    monkeypatch.setattr("app.utils.capability_probe.httpx.AsyncClient", factory)

    await probe_entity_id("http://mesh-ia:8080/")

    instance.get.assert_awaited_once_with("http://mesh-ia:8080/.well-known/openid-federation")


async def test_probe_entity_id_returns_none_on_non_200(monkeypatch):
    factory, _ = _mock_async_client(_fake_response(404, ""))
    monkeypatch.setattr("app.utils.capability_probe.httpx.AsyncClient", factory)

    assert await probe_entity_id("http://unreachable:8080") is None


async def test_probe_entity_id_returns_none_on_network_error(monkeypatch):
    factory, _ = _mock_async_client(side_effect=httpx.ConnectError("refused"))
    monkeypatch.setattr("app.utils.capability_probe.httpx.AsyncClient", factory)

    assert await probe_entity_id("http://not-up-yet:8080") is None


async def test_probe_entity_id_returns_none_on_malformed_jwt(monkeypatch):
    factory, _ = _mock_async_client(_fake_response(200, "not-a-jwt"))
    monkeypatch.setattr("app.utils.capability_probe.httpx.AsyncClient", factory)

    assert await probe_entity_id("http://mesh-ta:8080") is None


async def test_probe_entity_id_returns_none_when_sub_missing(monkeypatch):
    jwt = _fake_jwt({"iss": "http://mesh-ta:8080"})  # no "sub" claim
    factory, _ = _mock_async_client(_fake_response(200, jwt))
    monkeypatch.setattr("app.utils.capability_probe.httpx.AsyncClient", factory)

    assert await probe_entity_id("http://mesh-ta:8080") is None
