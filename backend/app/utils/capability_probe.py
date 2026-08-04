"""
Live per-instance capability discovery.

The bundled OpenAPI spec describes what a *conforming* Admin API could
support — it says nothing about what a specific connected backend (this
LightHouse instance, or someone else's implementation) actually
implements. This probes each feature's safe, read-only endpoint (a `list`
operation with no path parameters — the only kind that's safe to call
without side effects) against a real instance and records whether it
responds like a real, implemented endpoint or a 404/405/501 "not here".

Mutating operations (create/update/delete/...) are never probed — there's
no way to verify them without risking a real side effect, so their
supported state is left None ("not independently verified") and the
manifest falls back to trusting the spec/policy layer for those.
"""
from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.rbac import InstanceCapability
from app.utils.openapi_parser import parse_openapi_spec

logger = logging.getLogger(__name__)

_PROBE_TIMEOUT = httpx.Timeout(5.0, connect=3.0)


def _safe_probe_paths() -> dict[str, str]:
    """feature_name -> a real, parameter-free GET (list) path to probe."""
    parser = parse_openapi_spec()
    result: dict[str, str] = {}
    for entry in parser.get_endpoint_operations():
        if entry["method"] != "GET" or entry["operation"] != "list":
            continue
        if "{" in entry["path"]:
            continue  # has path params — not a bare collection endpoint
        # First list endpoint found per feature wins; features rarely have
        # more than one true collection-level GET.
        result.setdefault(entry["feature"], entry["path"])
    return result


async def probe_instance_capabilities(
    db: Session,
    instance_id: str,
    base_url: str,
    basic_credentials: Optional[str],
) -> dict[str, Optional[bool]]:
    """
    Probe every feature's safe endpoint against one real instance and
    upsert the results into InstanceCapability. Returns {feature: supported}
    for whatever this run actually attempted.
    """
    probe_paths = _safe_probe_paths()
    now = datetime.now(timezone.utc).isoformat()
    results: dict[str, Optional[bool]] = {}

    headers = {"Authorization": f"Basic {basic_credentials}"} if basic_credentials else {}

    async with httpx.AsyncClient(timeout=_PROBE_TIMEOUT) as client:
        for feature_name, path in probe_paths.items():
            url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
            supported: Optional[bool]
            detail: str
            try:
                resp = await client.get(url, headers=headers)
                if resp.status_code in (404, 405, 501):
                    supported = False
                    detail = f"probe returned {resp.status_code} for {path}"
                elif resp.status_code < 500:
                    # 2xx/401/403 all mean "the route exists and is handled"
                    supported = True
                    detail = f"probe returned {resp.status_code} for {path}"
                else:
                    supported = None
                    detail = f"probe returned {resp.status_code} (inconclusive) for {path}"
            except httpx.HTTPError as exc:
                supported = None
                detail = f"probe failed: {exc}"
                logger.warning("Capability probe error for %s/%s: %s", instance_id, feature_name, exc)

            results[feature_name] = supported

            existing = (
                db.query(InstanceCapability)
                .filter_by(instance_id=instance_id, feature_name=feature_name)
                .first()
            )
            if existing:
                # Don't overwrite a previous definitive result with an
                # inconclusive one from a transient network blip.
                if supported is not None or existing.supported is None:
                    existing.supported = supported
                    existing.detail = detail
                    existing.last_probed_at = now
            else:
                db.add(InstanceCapability(
                    instance_id=instance_id,
                    feature_name=feature_name,
                    supported=supported,
                    detail=detail,
                    last_probed_at=now,
                ))

    db.commit()
    return results


def _decode_jwt_payload(jwt_text: str) -> dict:
    """Decode a compact JWT's payload without verifying its signature — used
    only to read an entity's self-asserted `sub`, never to trust the token
    for anything security-sensitive."""
    payload_b64 = jwt_text.split(".")[1]
    payload_b64 += "=" * (-len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


async def probe_entity_id(base_url: str) -> Optional[str]:
    """Fetch an instance's own entity configuration and return its real
    entity_id (the `sub` claim) — best-effort, returns None on any failure.

    Deployment config only says where an instance's admin API and public
    endpoint *should* be (public_base_url); it says nothing about the
    entity_id the instance actually signs its own statements with. For a
    plain single-instance setup those happen to be the same string, which is
    why this previously went unnoticed — but they're independent values in
    general (e.g. this app's own local multi-hop test mesh uses
    docker-network hostnames as entity_id, distinct from the host-published
    public_base_url used to reach it from outside).
    """
    url = f"{base_url.rstrip('/')}/.well-known/openid-federation"
    try:
        async with httpx.AsyncClient(timeout=_PROBE_TIMEOUT) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            logger.warning("entity_id probe got HTTP %s for %s", resp.status_code, url)
            return None
        payload = _decode_jwt_payload(resp.text)
        sub = payload.get("sub")
        return sub if isinstance(sub, str) and sub else None
    except Exception as exc:
        logger.warning("entity_id probe failed for %s: %s", base_url, exc)
        return None
