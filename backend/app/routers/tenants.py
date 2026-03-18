from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_permission
from app.db.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantResponse, TenantUpdate

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])


def _serialize(t: Tenant) -> TenantResponse:
    return TenantResponse(
        id=t.id,
        entity_id=t.entity_id,
        name=t.name,
        status=t.status,
        admin_api_base_url=t.admin_api_base_url,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.get("", response_model=List[TenantResponse])
def list_tenants(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Tenant)
    if status:
        q = q.filter(Tenant.status == status)
    return [_serialize(t) for t in q.all()]


@router.post("", response_model=TenantResponse, status_code=201)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("tenants", "create")),
):
    if db.query(Tenant).filter(Tenant.entity_id == payload.entity_id).first():
        raise HTTPException(status_code=409, detail="entity_id already registered")
    t = Tenant(
        id=f"tenant-{uuid.uuid4().hex[:8]}",
        entity_id=payload.entity_id,
        name=payload.name,
        status=payload.status,
        admin_api_base_url=payload.admin_api_base_url,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _serialize(t)


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _serialize(t)


@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("tenants", "update")),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return _serialize(t)


@router.delete("/{tenant_id}", status_code=204)
def delete_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("tenants", "delete")),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    db.delete(t)
    db.commit()
