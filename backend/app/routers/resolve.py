"""BFF helpers for querying arbitrary external OpenID Federation entities.

GET /api/v1/admin/resolve?entity_id=<url>
    Fetches `${entity_id}/.well-known/openid-federation`, decodes the JWT
    payload, and returns plain JSON — used both by the registration wizard
    (pre-fill) and the Chain Inspector's direct entity lookup.

GET /api/v1/admin/trust-mark-status?status_endpoint=<url>&sub=<url>&trust_mark_id=<url>&trust_mark_jwt=<jwt>
    Calls a trust mark issuer's own `federation_trust_mark_status_endpoint`
    (as advertised in that issuer's entity configuration) to check whether a
    specific mark is still active. This is the spec-defined verification
    mechanism (OIDF §8.3) — no local signature verification needed.

    Real implementations disagree on the wire contract, confirmed by hand
    against both a live testbed and a real LightHouse instance:
      - GET with `sub` + `trust_mark_id` query params, plain JSON
        `{"active": bool}` response (seen on testbed.oidf.lab.surf.nl).
      - POST with `{"trust_mark": "<jwt>"}` body, response is itself a
        *signed* JWT whose payload has a `status: "active"|"revoked"` claim
        (seen on LightHouse 0.21.0).
    We try GET first and fall back to POST if it fails.

Security
--------
  - Requires a valid Bearer token (same dependency as every other route).
  - All target URLs must use the https scheme.
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


def _assert_safe_https_url(url: str, *, param_name: str) -> urllib.parse.ParseResult:
    """Validate a URL is https, has a hostname, and doesn't resolve to a private
    or loopback address. Returns the parsed URL on success."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https":
        raise HTTPException(status_code=422, detail=f"{param_name} must use the https scheme")
    if not parsed.hostname:
        raise HTTPException(status_code=422, detail=f"{param_name} must include a hostname")
    _assert_safe_host(parsed.hostname)
    return parsed


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
    _assert_safe_https_url(entity_id, param_name="entity_id")

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


def _extract_active_from_jwt_response(response_text: str) -> bool:
    """LightHouse's POST status contract returns a signed JWT (not verified
    here — same trust model as the rest of this viewer) whose payload has a
    `status: "active" | "revoked"` claim."""
    payload = _decode_jwt_payload(response_text.strip())
    status_value = payload.get("status")
    if status_value not in ("active", "revoked"):
        raise ValueError(f"Unrecognized status value in JWT response: {status_value!r}")
    return status_value == "active"


@router.get("/trust-mark-status")
async def check_trust_mark_status(
    status_endpoint: str = Query(..., description="The issuer's federation_trust_mark_status_endpoint URL"),
    sub: str = Query(..., description="The subject entity_id the mark was issued to"),
    trust_mark_id: str = Query(..., description="The trust mark type identifier (trust_mark_id / trust_mark_type / id claim)"),
    trust_mark_jwt: str = Query(None, description="The raw trust mark JWT, required for issuers using the POST+JWT-body contract"),
    _user=Depends(get_current_user),
):
    """
    Call a trust mark issuer's own status endpoint (OIDF §8.3) to check whether
    a specific mark is still active — the spec-defined verification mechanism,
    server-side, no local signature check required.

    `status_endpoint` must be an https URL the issuer advertised in its own
    entity configuration (`federation_trust_mark_status_endpoint`) — the caller
    is expected to have fetched that via GET /resolve first.
    """
    _assert_safe_https_url(status_endpoint, param_name="status_endpoint")

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        # 1. Try the GET + query-param contract first.
        try:
            get_response = await client.get(
                status_endpoint,
                params={"sub": sub, "trust_mark_id": trust_mark_id},
                headers={"Accept": "application/json"},
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timed out checking trust mark status")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Failed to reach trust mark status endpoint: {exc}")

        if 200 <= get_response.status_code < 300:
            try:
                return JSONResponse(get_response.json())
            except Exception:
                pass  # fall through to POST — GET succeeded but didn't return JSON

        # 2. Fall back to the POST + JWT-body contract (LightHouse).
        if not trust_mark_jwt:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Trust mark status endpoint returned HTTP {get_response.status_code} for GET, "
                    "and no trust_mark_jwt was provided to retry with POST."
                ),
            )

        try:
            post_response = await client.post(
                status_endpoint,
                json={"trust_mark": trust_mark_jwt},
                headers={"Accept": "application/json"},
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timed out checking trust mark status (POST fallback)")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Failed to reach trust mark status endpoint (POST fallback): {exc}")

        if not (200 <= post_response.status_code < 300):
            raise HTTPException(
                status_code=502,
                detail=f"Trust mark status endpoint returned HTTP {post_response.status_code}: {post_response.text[:300]}",
            )

        # LightHouse's response is itself a JWT; some issuers might just return
        # plain JSON on POST too — handle both.
        try:
            return JSONResponse(post_response.json())
        except Exception:
            pass

        try:
            active = _extract_active_from_jwt_response(post_response.text)
        except Exception:
            raise HTTPException(
                status_code=502,
                detail="Trust mark status endpoint returned a response we could not parse as JSON or a JWT",
            )

        return JSONResponse({"active": active})
