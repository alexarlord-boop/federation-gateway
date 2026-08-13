"""
Thin httpx client for a single LightHouse node's public federation
endpoints + admin API, factored out of scripts/seed-mesh.py's helpers.

Runs on the host against published localhost ports (not inside the docker
network) — same convention scripts/seed-mesh.py already uses, so these
tests need only `docker compose up -d --build`, no extra network wiring.
"""
from __future__ import annotations

import base64
import json
import time
from typing import Any

import httpx


def decode_jwt_payload(jwt_text: str) -> dict[str, Any]:
    """Decode a compact JWT's payload without verifying its signature —
    tests only need the claims, and the signature is a separate concern
    (already exercised by scripts/seed-mesh.py's real-jwks wiring)."""
    payload_b64 = jwt_text.split(".")[1]
    payload_b64 += "=" * (-len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def wait_healthy(public_base: str, attempts: int = 30, delay: float = 1.0) -> None:
    url = f"{public_base}/.well-known/openid-federation"
    for _ in range(attempts):
        try:
            if httpx.get(url, timeout=2).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(delay)
    raise RuntimeError(f"{public_base} never became healthy")


class LightHouseAdmin:
    """Client for one LightHouse node's admin API + public federation
    endpoints (both live on the same base URL in this deployment)."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.admin_base = f"{base_url}/api/v1/admin"
        self._client = httpx.Client(
            headers={"X-Gateway-User-Email": "mesh-integration-tests@demo.local"},
            timeout=10,
        )

    # -- subordinates --

    def get_subordinates(self) -> list[dict[str, Any]]:
        resp = self._client.get(f"{self.admin_base}/subordinates")
        resp.raise_for_status()
        return resp.json()

    def find_subordinate(self, entity_id: str) -> dict[str, Any] | None:
        return next(
            (s for s in self.get_subordinates() if s["entity_id"] == entity_id),
            None,
        )

    def set_subordinate_status(self, subordinate_id: int, status: str) -> dict[str, Any]:
        resp = self._client.put(
            f"{self.admin_base}/subordinates/{subordinate_id}/status",
            content=status,
            headers={"Content-Type": "text/plain"},
        )
        resp.raise_for_status()
        return resp.json()

    # -- general metadata policy --

    def put_metadata_policy_claim(
        self, entity_type: str, claim: str, entry: dict[str, Any]
    ) -> dict[str, Any]:
        resp = self._client.put(
            f"{self.admin_base}/subordinates/metadata-policies/{entity_type}/{claim}",
            json=entry,
        )
        resp.raise_for_status()
        return resp.json()

    def delete_metadata_policy_claim(self, entity_type: str, claim: str) -> None:
        resp = self._client.delete(
            f"{self.admin_base}/subordinates/metadata-policies/{entity_type}/{claim}"
        )
        if resp.status_code not in (204, 404):
            resp.raise_for_status()

    # -- public federation endpoints --

    def fetch_statement(self, sub: str) -> dict[str, Any]:
        resp = self._client.get(f"{self.base_url}/fetch", params={"sub": sub})
        resp.raise_for_status()
        return decode_jwt_payload(resp.text)

    def list_subordinates_public(self) -> list[str]:
        resp = self._client.get(f"{self.base_url}/list")
        resp.raise_for_status()
        return resp.json()

    def resolve(
        self, sub: str, trust_anchor: str, entity_type: str | None = None
    ) -> httpx.Response:
        """Returns the raw response — callers decide whether to decode the
        JWT payload or assert on the HTTP status (e.g. a negative-path
        resolution isn't expected to return a JWT body at all)."""
        params = {"sub": sub, "trust_anchor": trust_anchor}
        if entity_type:
            params["type"] = entity_type
        return self._client.get(f"{self.base_url}/resolve", params=params)

    def close(self) -> None:
        self._client.close()
