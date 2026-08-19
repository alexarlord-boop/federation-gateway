"""
OIDC Provider Management Router

Admin CRUD for external OpenID Connect providers used for real user login
(PRODUCTION-READINESS.md #1). Gated by `oidc_providers:manage`, granted
only to super_admin in rbac_seed.py — these rows hold IdP client secrets.

Client secrets are encrypted at rest (app.auth.crypto) and never returned
in API responses; PATCH treats an omitted/blank secret as "leave unchanged".
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.crypto import encrypt_secret
from app.auth.dependencies import require_permission
from app.db.database import get_db
from app.models.oidc_provider import OIDCProvider
from app.models.user import User

router = APIRouter(prefix="/api/v1/oidc/providers", tags=["oidc"])


class OIDCProviderOut(BaseModel):
    id: str
    name: str
    issuer_url: str
    client_id: str
    scopes: str
    enabled: bool
    created_at: Optional[str] = None


class CreateOIDCProviderRequest(BaseModel):
    name: str
    issuer_url: str
    client_id: str
    client_secret: str
    scopes: str = "openid email profile"
    enabled: bool = True


class UpdateOIDCProviderRequest(BaseModel):
    name: Optional[str] = None
    issuer_url: Optional[str] = None
    client_id: Optional[str] = None
    # Blank/omitted = leave the stored secret unchanged.
    client_secret: Optional[str] = None
    scopes: Optional[str] = None
    enabled: Optional[bool] = None


def _serialize(provider: OIDCProvider) -> OIDCProviderOut:
    return OIDCProviderOut(
        id=provider.id,
        name=provider.name,
        issuer_url=provider.issuer_url,
        client_id=provider.client_id,
        scopes=provider.scopes,
        enabled=provider.enabled,
        created_at=provider.created_at.isoformat() if provider.created_at else None,
    )


@router.get("", response_model=List[OIDCProviderOut])
def list_providers(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("oidc_providers", "manage")),
):
    providers = db.query(OIDCProvider).order_by(OIDCProvider.name.asc()).all()
    return [_serialize(p) for p in providers]


@router.post("", response_model=OIDCProviderOut, status_code=status.HTTP_201_CREATED)
def create_provider(
    payload: CreateOIDCProviderRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("oidc_providers", "manage")),
):
    existing = db.query(OIDCProvider).filter(OIDCProvider.issuer_url == payload.issuer_url).first()
    if existing:
        raise HTTPException(status_code=409, detail="A provider with this issuer URL already exists")

    provider = OIDCProvider(
        id=str(uuid.uuid4()),
        name=payload.name,
        issuer_url=payload.issuer_url,
        client_id=payload.client_id,
        client_secret=encrypt_secret(payload.client_secret),
        scopes=payload.scopes,
        enabled=payload.enabled,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return _serialize(provider)


@router.patch("/{provider_id}", response_model=OIDCProviderOut)
def update_provider(
    provider_id: str,
    payload: UpdateOIDCProviderRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("oidc_providers", "manage")),
):
    provider = db.query(OIDCProvider).filter(OIDCProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    if payload.name is not None:
        provider.name = payload.name
    if payload.issuer_url is not None:
        provider.issuer_url = payload.issuer_url
    if payload.client_id is not None:
        provider.client_id = payload.client_id
    if payload.client_secret:
        provider.client_secret = encrypt_secret(payload.client_secret)
    if payload.scopes is not None:
        provider.scopes = payload.scopes
    if payload.enabled is not None:
        provider.enabled = payload.enabled

    db.commit()
    db.refresh(provider)
    return _serialize(provider)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("oidc_providers", "manage")),
):
    provider = db.query(OIDCProvider).filter(OIDCProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    db.delete(provider)
    db.commit()
    return None
