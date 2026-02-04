from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid
from app.db.database import get_db
from app.schemas.subordinate import SubordinateCreate, SubordinateResponse, SubordinateUpdateStatus
from app.models.subordinate import Subordinate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/admin/subordinates", tags=["subordinates"])


def serialize_subordinate(sub: Subordinate) -> SubordinateResponse:
    return SubordinateResponse(
        id=sub.id,
        entity_id=sub.entity_id,
        status=sub.status,
        registered_entity_types=json.loads(sub.registered_entity_types),
        jwks=json.loads(sub.jwks) if sub.jwks else {"keys": []},
        metadata=json.loads(sub.metadata_json) if sub.metadata_json else None,
        description=sub.description,
    )


@router.get("", response_model=List[SubordinateResponse])
def list_subordinates(
    entity_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Subordinate)
    if entity_type:
        query = query.filter(Subordinate.registered_entity_types.like(f"%{entity_type}%"))
    if status:
        query = query.filter(Subordinate.status == status)
    return [serialize_subordinate(s) for s in query.all()]


@router.post("", response_model=SubordinateResponse, status_code=201)
def create_subordinate(payload: SubordinateCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = Subordinate(
        id=f"sub-{uuid.uuid4().hex[:8]}",
        entity_id=payload.entity_id,
        status=payload.status,
        description=payload.description,
        registered_entity_types=json.dumps(payload.registered_entity_types),
        jwks=json.dumps(payload.jwks) if payload.jwks is not None else None,
        metadata_json=json.dumps(payload.metadata) if payload.metadata is not None else None,
        owner_id=user.id,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return serialize_subordinate(sub)


@router.get("/{sub_id}", response_model=SubordinateResponse)
def get_subordinate(sub_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = db.query(Subordinate).filter(Subordinate.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_subordinate(sub)


@router.put("/{sub_id}/status", response_model=SubordinateResponse)
def update_status(sub_id: str, payload: SubordinateUpdateStatus, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = db.query(Subordinate).filter(Subordinate.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    sub.status = payload.status
    db.commit()
    db.refresh(sub)
    return serialize_subordinate(sub)


@router.put("/{sub_id}/metadata", response_model=dict)
def update_metadata(sub_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = db.query(Subordinate).filter(Subordinate.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    sub.metadata_json = json.dumps(payload)
    db.commit()
    return payload


@router.delete("/{sub_id}", status_code=204)
def delete_subordinate(sub_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = db.query(Subordinate).filter(Subordinate.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(sub)
    db.commit()
    return None


@router.post("/{sub_id}/jwks", response_model=dict)
def add_jwk(sub_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = db.query(Subordinate).filter(Subordinate.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    jwks = json.loads(sub.jwks) if sub.jwks else {"keys": []}
    jwks["keys"].append(payload)
    sub.jwks = json.dumps(jwks)
    db.commit()
    return jwks


@router.put("/{sub_id}/jwks", response_model=dict)
def set_jwks(sub_id: str, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sub = db.query(Subordinate).filter(Subordinate.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    sub.jwks = json.dumps(payload)
    db.commit()
    return payload
