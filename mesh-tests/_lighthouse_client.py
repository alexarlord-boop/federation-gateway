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

    # -- trust marks --

    def get_trust_mark_types(self) -> list[dict[str, Any]]:
        resp = self._client.get(f"{self.admin_base}/trust-marks/types")
        resp.raise_for_status()
        return resp.json()

    def find_trust_mark_type(self, trust_mark_type: str) -> dict[str, Any] | None:
        return next(
            (
                t
                for t in self.get_trust_mark_types()
                if t["trust_mark_type"] == trust_mark_type
            ),
            None,
        )

    def create_trust_mark_owner(
        self, trust_mark_type_id: int, entity_id: str, jwks: dict[str, Any]
    ) -> dict[str, Any]:
        resp = self._client.post(
            f"{self.admin_base}/trust-marks/types/{trust_mark_type_id}/owner",
            json={"entity_id": entity_id, "jwks": jwks},
        )
        resp.raise_for_status()
        return resp.json()

    def delete_trust_mark_owner(self, trust_mark_type_id: int) -> None:
        resp = self._client.delete(
            f"{self.admin_base}/trust-marks/types/{trust_mark_type_id}/owner"
        )
        if resp.status_code not in (204, 404):
            resp.raise_for_status()

    def get_issuance_specs(self) -> list[dict[str, Any]]:
        resp = self._client.get(f"{self.admin_base}/trust-marks/issuance-spec")
        resp.raise_for_status()
        return resp.json()

    def get_issuance_subjects(self, spec_id: int) -> list[dict[str, Any]]:
        resp = self._client.get(
            f"{self.admin_base}/trust-marks/issuance-spec/{spec_id}/subjects"
        )
        resp.raise_for_status()
        return resp.json()

    def find_issuance_subject(self, spec_id: int, entity_id: str) -> dict[str, Any] | None:
        return next(
            (
                s
                for s in self.get_issuance_subjects(spec_id)
                if s["entity_id"] == entity_id
            ),
            None,
        )

    def set_trust_mark_subject_status(
        self, spec_id: int, subject_id: int, status: str
    ) -> dict[str, Any]:
        resp = self._client.put(
            f"{self.admin_base}/trust-marks/issuance-spec/{spec_id}/subjects/{subject_id}/status",
            content=status,
            headers={"Content-Type": "text/plain"},
        )
        resp.raise_for_status()
        return resp.json()

    def find_issuance_spec(self, trust_mark_type: str) -> dict[str, Any] | None:
        return next(
            (
                s
                for s in self.get_issuance_specs()
                if s["trust_mark_type"] == trust_mark_type
            ),
            None,
        )

    def patch_issuance_spec(self, spec_id: int, **fields: Any) -> dict[str, Any]:
        resp = self._client.patch(
            f"{self.admin_base}/trust-marks/issuance-spec/{spec_id}",
            json=fields,
        )
        resp.raise_for_status()
        return resp.json()

    def fetch_trust_mark(self, sub: str, trust_mark_type: str) -> str:
        """Returns the raw compact JWT text (not decoded — callers decode
        with decode_jwt_payload, or verify the signature directly)."""
        resp = self._client.get(
            f"{self.base_url}/trust_mark",
            params={"sub": sub, "trust_mark_type": trust_mark_type},
        )
        resp.raise_for_status()
        return resp.text

    def check_trust_mark_status(self, mark_jwt: str) -> dict[str, Any]:
        """POST + application/x-www-form-urlencoded per the OIDF spec's
        normative text (§8.4) — not GET. See docs/KNOWN-ISSUES.md for the
        story of this being gotten backwards once already."""
        resp = self._client.post(
            f"{self.base_url}/trust_mark/status",
            data={"trust_mark": mark_jwt},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return decode_jwt_payload(resp.text)

    # -- public federation endpoints --

    def get_entity_configuration(self) -> dict[str, Any]:
        resp = self._client.get(f"{self.base_url}/.well-known/openid-federation")
        resp.raise_for_status()
        return decode_jwt_payload(resp.text)

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
