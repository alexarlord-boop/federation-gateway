import logging
import os
import secrets
import uuid
from urllib.parse import urlencode

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.jose import jwt as jose_jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import JWTError
from app.db.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, AuthUser, RefreshRequest, RefreshResponse
from app.auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    create_oidc_state_token,
    decode_oidc_state_token,
)
from app.auth.crypto import decrypt_secret
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.oidc_provider import OIDCProvider

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user and user.oidc_sub:
        provider = db.query(OIDCProvider).filter(OIDCProvider.issuer_url == user.oidc_issuer).first()
        provider_name = provider.name if provider else "your identity provider"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This account uses single sign-on — use the \"Sign in with {provider_name}\" button instead.",
        )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token({"sub": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.id})
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        user=AuthUser(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            organization_id=user.organization_id,
            organization_name=user.organization_name,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    try:
        claims = decode_access_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if claims.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token is not a refresh token")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access = create_access_token({"sub": user.id, "role": user.role})
    new_refresh = create_refresh_token({"sub": user.id})
    return RefreshResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


@router.get("/me", response_model=AuthUser)
def me(current_user: User = Depends(get_current_user)):
    return AuthUser(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        organization_id=current_user.organization_id,
        organization_name=current_user.organization_name,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
    )


# ---------------------------------------------------------------------------
# OIDC — real user login via an external IdP (PRODUCTION-READINESS.md #1).
#
# Authorization-code + PKCE flow. `state` is a signed, short-lived JWT
# (app.auth.security.create_oidc_state_token) carrying provider_id, nonce,
# and the PKCE code_verifier — self-contained CSRF protection, no
# server-side session store. On success the gateway issues its *own*
# HS256 JWTs (the same create_access_token/create_refresh_token password
# login uses) — the IdP's tokens never reach the frontend.
# ---------------------------------------------------------------------------


async def _discover(issuer_url: str) -> dict:
    discovery_url = issuer_url.rstrip("/") + "/.well-known/openid-configuration"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(discovery_url)
        resp.raise_for_status()
        return resp.json()


def _oidc_error_redirect(message: str) -> RedirectResponse:
    query = urlencode({"error": message})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback#{query}")


@router.get("/oidc/providers")
def list_public_oidc_providers(db: Session = Depends(get_db)):
    """Unauthenticated — backs the login page's provider buttons. Never
    exposes issuer/client details, only what a picker UI needs."""
    providers = db.query(OIDCProvider).filter(OIDCProvider.enabled == True).order_by(OIDCProvider.name.asc()).all()  # noqa: E712
    return [{"id": p.id, "name": p.name} for p in providers]


@router.get("/oidc/{provider_id}/login")
async def oidc_login(provider_id: str, request: Request, db: Session = Depends(get_db)):
    provider = db.query(OIDCProvider).filter(OIDCProvider.id == provider_id, OIDCProvider.enabled == True).first()  # noqa: E712
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown or disabled OIDC provider")

    try:
        metadata = await _discover(provider.issuer_url)
    except httpx.HTTPError:
        logger.warning("OIDC discovery failed for provider %s", provider_id, exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not reach identity provider")

    redirect_uri = str(request.url_for("oidc_callback", provider_id=provider_id))
    code_verifier = secrets.token_urlsafe(48)
    nonce = secrets.token_urlsafe(24)
    state = create_oidc_state_token(
        {"provider_id": provider_id, "nonce": nonce, "code_verifier": code_verifier}
    )

    async with AsyncOAuth2Client(
        client_id=provider.client_id,
        redirect_uri=redirect_uri,
        scope=provider.scopes,
        code_challenge_method="S256",
    ) as client:
        authorization_url, _ = client.create_authorization_url(
            metadata["authorization_endpoint"],
            state=state,
            code_verifier=code_verifier,
            nonce=nonce,
        )
    return RedirectResponse(authorization_url)


@router.get("/oidc/{provider_id}/callback", name="oidc_callback")
async def oidc_callback(
    provider_id: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        return _oidc_error_redirect(f"Identity provider returned an error: {error}")
    if not code or not state:
        return _oidc_error_redirect("Missing authorization code")

    try:
        state_claims = decode_oidc_state_token(state)
    except JWTError:
        return _oidc_error_redirect("Login session expired or invalid — please try again")

    if state_claims.get("provider_id") != provider_id:
        return _oidc_error_redirect("Login session does not match provider")

    provider = db.query(OIDCProvider).filter(OIDCProvider.id == provider_id, OIDCProvider.enabled == True).first()  # noqa: E712
    if not provider:
        return _oidc_error_redirect("Unknown or disabled OIDC provider")

    try:
        metadata = await _discover(provider.issuer_url)
    except httpx.HTTPError:
        logger.warning("OIDC discovery failed for provider %s", provider_id, exc_info=True)
        return _oidc_error_redirect("Could not reach identity provider")

    redirect_uri = str(request.url_for("oidc_callback", provider_id=provider_id))
    client_secret = decrypt_secret(provider.client_secret)

    try:
        async with AsyncOAuth2Client(
            client_id=provider.client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        ) as client:
            token = await client.fetch_token(
                url=metadata["token_endpoint"],
                code=code,
                code_verifier=state_claims["code_verifier"],
                grant_type="authorization_code",
            )
    except Exception:
        logger.warning("OIDC token exchange failed for provider %s", provider_id, exc_info=True)
        return _oidc_error_redirect("Could not complete sign-in with identity provider")

    id_token = token.get("id_token")
    if not id_token:
        return _oidc_error_redirect("Identity provider did not return an ID token")

    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            jwks_resp = await http_client.get(metadata["jwks_uri"])
            jwks_resp.raise_for_status()
            jwks = jwks_resp.json()

        claims = jose_jwt.decode(
            id_token,
            jwks,
            claims_options={
                "iss": {"essential": True, "value": metadata["issuer"]},
                "aud": {"essential": True, "value": provider.client_id},
                "exp": {"essential": True},
            },
        )
        claims.validate(leeway=60)
    except Exception:
        logger.warning("OIDC ID token validation failed for provider %s", provider_id, exc_info=True)
        return _oidc_error_redirect("Identity provider response could not be verified")

    if claims.get("nonce") != state_claims.get("nonce"):
        return _oidc_error_redirect("Identity provider response could not be verified")

    sub = claims.get("sub")
    if not sub:
        return _oidc_error_redirect("Identity provider did not identify the user")

    issuer = metadata["issuer"]
    user = db.query(User).filter(User.oidc_issuer == issuer, User.oidc_sub == sub).first()

    if not user:
        email = claims.get("email") or f"{sub}@{provider_id}.oidc.local"
        existing_by_email = db.query(User).filter(User.email == email).first()
        if existing_by_email:
            # Don't silently take over an existing local/other-IdP account —
            # only (issuer, sub) identifies "the same user" here.
            return _oidc_error_redirect(
                "An account with this email already exists. Contact an administrator."
            )

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=claims.get("name") or email,
            role="viewer",  # legacy field only — real access is via RBAC roles, left empty below
            password_hash=get_password_hash(secrets.token_urlsafe(32)),  # unusable local password
            oidc_sub=sub,
            oidc_issuer=issuer,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("JIT-provisioned new SSO user %s via provider %s — no RBAC role assigned yet", user.id, provider_id)

    access = create_access_token({"sub": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.id})
    query = urlencode({"access_token": access, "refresh_token": refresh})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback#{query}")
