"""
Gateway Proxy Router
====================

Forwards requests from the UI to the real Federation Admin API instance
selected by `instance_id`.

Flow:
  UI → POST /api/v1/proxy/{instance_id}/admin/subordinates
       ↓
  Gateway looks up instance_id in the deployment config registry,
  reads admin_base_url and attaches basic auth from the registry,
  injects RBAC / identity headers,
  forwards the request via httpx,
  and streams the response back.

This keeps the Admin API independent of our auth layer — it only
receives pre-authenticated requests from the gateway.
"""

import base64
import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.trust_anchor import TrustAnchor
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/proxy", tags=["proxy"])

# Re-usable async client — one per process, connection-pooled.
_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    """Lazy-init a module-level async httpx client."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
        )
    return _client


def _resolve_instance(instance_id: str, request: Request, db: Session) -> dict:
    """
    Look up an Admin API instance by its ID in the deployment registry.

    Returns a dict with:
      - base_url: str   (the admin API root, e.g. "http://lighthouse:8080")
      - basic_credentials: str | None  (base64-encoded "user:pass" for Basic auth)
      - name: str
    """
    registry = request.app.state.instance_registry
    match = next((item for item in registry.instances if item.id == instance_id), None)
    if match is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instance '{instance_id}' not found in the registry",
        )

    # Get name from DB if available, otherwise use registry name
    anchor = db.query(TrustAnchor).filter(TrustAnchor.id == instance_id).first()
    name = anchor.name if anchor else match.name

    # Build basic auth credentials if configured
    basic_credentials = None
    if match.admin_auth is not None:
        raw = f"{match.admin_auth.username}:{match.admin_auth.password}".encode()
        basic_credentials = base64.b64encode(raw).decode()

    return {
        "base_url": str(match.admin_base_url).rstrip("/"),
        "basic_credentials": basic_credentials,
        "name": name,
    }


# ---- Headers we never forward upstream ----
_HOP_BY_HOP = frozenset(
    {
        "host",
        "connection",
        "keep-alive",
        "transfer-encoding",
        "te",
        "trailer",
        "upgrade",
        "proxy-authorization",
        "proxy-authenticate",
        # Strip the client's BFF Bearer JWT — LightHouse doesn't use it.
        # Upstream auth (Basic or Bearer api_key) is injected below.
        "authorization",
        # Don't forward Accept-Encoding to upstream: httpx handles decoding
        # but brotli support may not be available, so upstream responses
        # compressed with brotli arrive as raw bytes while we strip the
        # Content-Encoding header — causing the browser to receive binary data
        # labeled as application/json.
        "accept-encoding",
    }
)

# Headers we never copy back to the client
_RESPONSE_STRIP = frozenset(
    {
        "transfer-encoding",
        "connection",
        "keep-alive",
        "content-encoding",  # httpx already decodes
        "content-length",    # recalculated by FastAPI
    }
)


def _build_upstream_headers(
    request: Request,
    user: User,
    instance: dict,
) -> dict[str, str]:
    """
    Build the header set for the upstream Admin API request.

    - Strips hop-by-hop and our own Authorization header.
    - Injects gateway identity headers so the Admin API knows *who* is acting.
    - Optionally attaches the instance's own API key as Authorization.
    """
    headers: dict[str, str] = {}

    # Forward safe headers from the original request
    for key, value in request.headers.items():
        if key.lower() not in _HOP_BY_HOP:
            headers[key] = value

    # ---- Gateway identity headers ----
    headers["X-Gateway-User-Id"] = str(user.id)
    headers["X-Gateway-User-Email"] = user.email or ""
    headers["X-Gateway-User-Name"] = user.name or ""
    headers["X-Gateway-User-Role"] = user.role or ""

    # Collect RBAC role names
    role_names = [r.name for r in (getattr(user, "roles", []) or [])]
    headers["X-Gateway-User-Roles"] = ",".join(role_names)

    # Collect permissions as "feature:operation" pairs
    permissions: list[str] = []
    for role in getattr(user, "roles", []) or []:
        for perm in getattr(role, "permissions", []) or []:
            permissions.append(f"{perm.feature}:{perm.operation}")
    headers["X-Gateway-User-Permissions"] = ",".join(permissions)

    # ---- Upstream auth ----
    if instance.get("basic_credentials"):
        headers["Authorization"] = f"Basic {instance['basic_credentials']}"

    return headers


@router.api_route(
    "/{instance_id}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    summary="Proxy to Admin API instance",
    description=(
        "Forwards any request to the Federation Admin API instance "
        "identified by `instance_id`. The gateway resolves the instance "
        "from the local trust-anchor registry, attaches RBAC identity "
        "headers, and returns the upstream response verbatim."
    ),
)
async def proxy(
    instance_id: str,
    path: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 1. Resolve instance
    instance = _resolve_instance(instance_id, request, db)

    # 2. Build upstream URL
    upstream_url = f"{instance['base_url']}/{path.lstrip('/')}"

    # Preserve query string
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"

    # 3. Read request body (empty for GET/HEAD/DELETE)
    body = await request.body()

    # 4. Build headers
    upstream_headers = _build_upstream_headers(request, user, instance)

    # 5. Forward
    client = _get_client()
    try:
        upstream_response = await client.request(
            method=request.method,
            url=upstream_url,
            headers=upstream_headers,
            content=body if body else None,
        )
    except httpx.ConnectError as exc:
        logger.error("Proxy connect error for %s: %s", instance["name"], exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cannot reach Admin API at {instance['base_url']}: connection refused",
        )
    except httpx.TimeoutException as exc:
        logger.error("Proxy timeout for %s: %s", instance["name"], exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Admin API at {instance['base_url']} timed out",
        )
    except httpx.HTTPError as exc:
        logger.error("Proxy HTTP error for %s: %s", instance["name"], exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with Admin API: {exc}",
        )

    # 6. Build response
    response_headers: dict[str, str] = {}
    for key, value in upstream_response.headers.items():
        if key.lower() not in _RESPONSE_STRIP:
            response_headers[key] = value

    # Add tracing header so the UI knows which instance answered
    response_headers["X-Proxied-To"] = instance["base_url"]
    response_headers["X-Instance-Name"] = instance["name"]

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
    )
