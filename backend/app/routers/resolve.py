"""BFF helper: resolve an entity configuration from a remote entity_id.

GET /api/v1/admin/resolve?entity_id=<url>

Fetches `${entity_id}/.well-known/openid-federation`, decodes the JWT
payload, and returns plain JSON so the frontend wizard can pre-fill
registration fields without hitting browser CORS restrictions.

Security
--------
  - Requires a valid Bearer token (same dependency as every other route).
  - entity_id must use the https scheme.
  - Private/loopback IPv4 and IPv6 ranges are blocked (SSRF guard).
"""

import base64
import ipaddress
import json
import socket
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["resolve"])

# ---------------------------------------------------------------------------
# SSRF blocklist — private IPv4 + IPv6 ranges and loopback
# ---------------------------------------------------------------------------
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local
    ipaddress.ip_network("100.64.0.0/10"),    # shared address space
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
    ipaddress.ip_network("fe80::/10"),         # IPv6 link-local
]


def _assert_safe_host(hostname: str) -> None:
    """Resolve hostname and reject if any address falls in a private range."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=422, detail="Cannot resolve entity_id hostname")

    for info in infos:
        addr_str = info[4][0]
        try:
            addr = ipaddress.ip_address(addr_str)
        except ValueError:
            continue
        for net in _BLOCKED_NETWORKS:
            if addr in net:
                raise HTTPException(
                    status_code=422,
                    detail="entity_id resolves to a private or loopback address",
                )


def _decode_jwt_payload(jwt: str) -> dict:
    """Decode the base64url payload part of a JWT (no signature verification)."""
    parts = jwt.split(".")
    if len(parts) < 2:
        raise ValueError("Not a valid JWT structure")
    b64 = parts[1].replace("-", "+").replace("_", "/")
    b64 += "=" * ((4 - len(b64) % 4) % 4)
    return json.loads(base64.b64decode(b64).decode("utf-8"))


@router.get("/resolve")
async def resolve_entity_configuration(
    entity_id: str = Query(..., description="The entity identifier URL to resolve"),
    _user=Depends(get_current_user),
):
    """
    Fetch and decode an entity configuration statement from its well-known endpoint.

    Returns the decoded JWT payload so the frontend registration wizard can
    pre-fill fields (organization name, contacts, entity types, JWKS key count).
    """
    parsed = urllib.parse.urlparse(entity_id)
    if parsed.scheme != "https":
        raise HTTPException(status_code=422, detail="entity_id must use the https scheme")
    if not parsed.hostname:
        raise HTTPException(status_code=422, detail="entity_id must include a hostname")

    _assert_safe_host(parsed.hostname)

    well_known_url = entity_id.rstrip("/") + "/.well-known/openid-federation"

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(
                well_known_url,
                headers={"Accept": "application/entity-statement+jwt, application/jwt, */*"},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timed out fetching entity configuration")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach entity endpoint: {exc}")

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="No entity configuration found at the well-known endpoint",
        )
    if not (200 <= response.status_code < 300):
        raise HTTPException(
            status_code=502,
            detail=f"Entity endpoint returned HTTP {response.status_code}",
        )

    raw_jwt = response.text.strip()

    try:
        payload = _decode_jwt_payload(raw_jwt)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not decode entity configuration JWT",
        )

    return JSONResponse({"payload": payload, "raw_jwt": raw_jwt})
