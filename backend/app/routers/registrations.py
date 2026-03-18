from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_permission
from app.db.database import get_db
from app.models.entity_registration import EntityRegistration
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.registration import (
    RegistrationCreate,
    RegistrationResponse,
    RegistrationReview,
)

router = APIRouter(prefix="/api/v1/registrations", tags=["registrations"])


def _serialize(r: EntityRegistration) -> RegistrationResponse:
    return RegistrationResponse(
        id=r.id,
        tenant_id=r.tenant_id,
        entity_id=r.entity_id,
        status=r.status,
        registered_entity_types=json.loads(r.registered_entity_types),
        display_name=r.display_name,
        submitted_by_id=r.submitted_by_id,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_at=r.reviewed_at,
        review_notes=r.review_notes,
        admin_api_synced_at=r.admin_api_synced_at,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# ── /my must appear before /{reg_id} so FastAPI doesn't treat it as a param ──

@router.get("/my", response_model=List[RegistrationResponse])
def my_registrations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Registrations submitted by the currently authenticated user."""
    rows = (
        db.query(EntityRegistration)
        .filter(EntityRegistration.submitted_by_id == user.id)
        .order_by(EntityRegistration.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in rows]


@router.get("", response_model=List[RegistrationResponse])
def list_registrations(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(EntityRegistration)
    if tenant_id:
        q = q.filter(EntityRegistration.tenant_id == tenant_id)
    if status:
        q = q.filter(EntityRegistration.status == status)
    return [_serialize(r) for r in q.order_by(EntityRegistration.created_at.desc()).all()]


@router.post("", response_model=RegistrationResponse, status_code=201)
def submit_registration(
    payload: RegistrationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.query(Tenant).filter(Tenant.id == payload.tenant_id).first():
        raise HTTPException(status_code=404, detail="Tenant not found")
    r = EntityRegistration(
        id=f"reg-{uuid.uuid4().hex[:8]}",
        tenant_id=payload.tenant_id,
        entity_id=payload.entity_id,
        status="pending",
        registered_entity_types=json.dumps(payload.registered_entity_types),
        display_name=payload.display_name,
        jwks=json.dumps(payload.jwks) if payload.jwks is not None else None,
        metadata_json=json.dumps(payload.metadata) if payload.metadata is not None else None,
        submitted_by_id=user.id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _serialize(r)


@router.get("/{reg_id}", response_model=RegistrationResponse)
def get_registration(
    reg_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    r = db.query(EntityRegistration).filter(EntityRegistration.id == reg_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registration not found")
    return _serialize(r)


@router.post("/{reg_id}/review", response_model=RegistrationResponse)
def review_registration(
    reg_id: str,
    payload: RegistrationReview,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("subordinates", "update")),
):
    r = db.query(EntityRegistration).filter(EntityRegistration.id == reg_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registration not found")
    if r.status != "pending":
        raise HTTPException(status_code=409, detail=f"Registration is already '{r.status}'")
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="status must be 'approved' or 'rejected'")

    r.status = payload.status
    r.reviewed_by_id = user.id
    r.reviewed_at = datetime.now(timezone.utc)
    r.review_notes = payload.notes

    # TODO: when Admin API is ready, delegate here:
    # await proxy_to_admin_api(tenant_id=r.tenant_id, payload=r)
    # r.admin_api_synced_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(r)
    return _serialize(r)
