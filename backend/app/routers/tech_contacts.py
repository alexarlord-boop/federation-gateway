from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_permission
from app.db.database import get_db
from app.models.tech_contact import TechContact
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tech_contact import TechContactCreate, TechContactResponse, TechContactUpdate

router = APIRouter(prefix="/api/v1/tenants/{tenant_id}/contacts", tags=["tech-contacts"])


def _serialize(c: TechContact) -> TechContactResponse:
    return TechContactResponse(
        id=c.id,
        tenant_id=c.tenant_id,
        user_id=c.user_id,
        role=c.role,
        created_at=c.created_at,
        user_email=c.user.email if c.user else None,
        user_name=c.user.name if c.user else None,
    )


def _get_tenant_or_404(tenant_id: str, db: Session) -> Tenant:
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return t


@router.get("", response_model=List[TechContactResponse])
def list_contacts(
    tenant_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    _get_tenant_or_404(tenant_id, db)
    contacts = (
        db.query(TechContact).filter(TechContact.tenant_id == tenant_id).all()
    )
    return [_serialize(c) for c in contacts]


@router.post("", response_model=TechContactResponse, status_code=201)
def add_contact(
    tenant_id: str,
    payload: TechContactCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("tenants", "update")),
):
    _get_tenant_or_404(tenant_id, db)
    if not db.query(User).filter(User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    if db.query(TechContact).filter(
        TechContact.tenant_id == tenant_id,
        TechContact.user_id == payload.user_id,
    ).first():
        raise HTTPException(status_code=409, detail="User is already a contact for this tenant")
    c = TechContact(
        id=f"tc-{uuid.uuid4().hex[:8]}",
        tenant_id=tenant_id,
        user_id=payload.user_id,
        role=payload.role,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.patch("/{contact_id}", response_model=TechContactResponse)
def update_contact(
    tenant_id: str,
    contact_id: str,
    payload: TechContactUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("tenants", "update")),
):
    c = db.query(TechContact).filter(
        TechContact.id == contact_id, TechContact.tenant_id == tenant_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    c.role = payload.role
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.delete("/{contact_id}", status_code=204)
def remove_contact(
    tenant_id: str,
    contact_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("tenants", "update")),
):
    c = db.query(TechContact).filter(
        TechContact.id == contact_id, TechContact.tenant_id == tenant_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(c)
    db.commit()
