"""Federation Trust Marks router.

Covers:
  - /api/v1/admin/trust-marks/types          (CRUD)
  - /api/v1/admin/trust-marks/types/{id}/issuers
  - /api/v1/admin/trust-marks/types/{id}/owner
  - /api/v1/admin/trust-marks/owners         (CRUD + type-links)
  - /api/v1/admin/trust-marks/issuers        (CRUD + type-links)
  - /api/v1/admin/trust-marks/issuance-spec  (CRUD)
  - /api/v1/admin/trust-marks/issuance-spec/{id}/subjects
"""
import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.db.database import get_db
from app.models.trust_marks import (
    TrustMarkIssuer,
    TrustMarkOwner,
    TrustMarkSpec,
    TrustMarkSubject,
    TrustMarkType,
)

router = APIRouter(prefix="/api/v1/admin/trust-marks", tags=["Federation Trust Marks"])


# ── Pydantic schemas ────────────────────────────────────────────────────────────

class AddTrustMarkType(BaseModel):
    identifier: str
    name: Optional[str] = None
    description: Optional[str] = None
    logo_uri: Optional[str] = None
    ref: Optional[str] = None


class TrustMarkTypeOut(BaseModel):
    id: int
    identifier: str
    name: Optional[str] = None
    description: Optional[str] = None
    logo_uri: Optional[str] = None
    ref: Optional[str] = None

    class Config:
        from_attributes = True


class AddIssuerBody(BaseModel):
    issuer: Optional[str] = None
    description: Optional[str] = None
    issuer_id: Optional[int] = None  # link existing


class IssuerOut(BaseModel):
    id: int
    issuer: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AddOwnerBody(BaseModel):
    owner: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None  # link existing


class OwnerOut(BaseModel):
    id: int
    owner: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AddTrustMarkSpec(BaseModel):
    trust_mark_type_id: Optional[int] = None
    trust_mark_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    lifetime_seconds: Optional[int] = None
    enabled: Optional[bool] = True


class PatchTrustMarkSpec(BaseModel):
    trust_mark_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    lifetime_seconds: Optional[int] = None
    enabled: Optional[bool] = None


class TrustMarkSpecOut(BaseModel):
    id: int
    trust_mark_type_id: Optional[int] = None
    trust_mark_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    lifetime_seconds: Optional[int] = None
    enabled: bool = True

    class Config:
        from_attributes = True


class AddTrustMarkSubject(BaseModel):
    subject: str
    status: Optional[str] = "active"
    organization: Optional[str] = None
    extra_claims: Optional[dict] = None


class TrustMarkSubjectOut(BaseModel):
    id: int
    spec_id: int
    subject: str
    status: str
    organization: Optional[str] = None
    extra_claims: Optional[dict] = None

    class Config:
        from_attributes = True


class StatusBody(BaseModel):
    status: str


# ── helpers ─────────────────────────────────────────────────────────────────────

def _type_or_404(db: Session, type_id: int) -> TrustMarkType:
    obj = db.query(TrustMarkType).filter(TrustMarkType.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="TrustMarkType not found")
    return obj


def _issuer_or_404(db: Session, issuer_id: int) -> TrustMarkIssuer:
    obj = db.query(TrustMarkIssuer).filter(TrustMarkIssuer.id == issuer_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="TrustMarkIssuer not found")
    return obj


def _owner_or_404(db: Session, owner_id: int) -> TrustMarkOwner:
    obj = db.query(TrustMarkOwner).filter(TrustMarkOwner.id == owner_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="TrustMarkOwner not found")
    return obj


def _spec_or_404(db: Session, spec_id: int) -> TrustMarkSpec:
    obj = db.query(TrustMarkSpec).filter(TrustMarkSpec.id == spec_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="TrustMarkSpec not found")
    return obj


def _subject_or_404(db: Session, spec_id: int, subject_id: int) -> TrustMarkSubject:
    obj = (
        db.query(TrustMarkSubject)
        .filter(TrustMarkSubject.spec_id == spec_id, TrustMarkSubject.id == subject_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="TrustMarkSubject not found")
    return obj


def _serialize_subject(s: TrustMarkSubject) -> dict:
    return {
        "id": s.id,
        "spec_id": s.spec_id,
        "subject": s.subject,
        "status": s.status,
        "organization": s.organization,
        "extra_claims": json.loads(s.extra_claims) if s.extra_claims else None,
    }


def _serialize_spec(s: TrustMarkSpec) -> dict:
    return {
        "id": s.id,
        "trust_mark_type_id": s.trust_mark_type_id,
        "trust_mark_id": s.trust_mark_id,
        "name": s.name,
        "description": s.description,
        "lifetime_seconds": s.lifetime_seconds,
        "enabled": bool(s.enabled),
    }


# ── Trust Mark Types ────────────────────────────────────────────────────────────

@router.get("/types")
def list_types(db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return db.query(TrustMarkType).all()


@router.post("/types", status_code=201)
def create_type(body: AddTrustMarkType, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = TrustMarkType(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/types/{type_id}")
def get_type(type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _type_or_404(db, type_id)


@router.put("/types/{type_id}")
def update_type(type_id: int, body: AddTrustMarkType, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _type_or_404(db, type_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/types/{type_id}", status_code=204)
def delete_type(type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _type_or_404(db, type_id)
    db.delete(obj)
    db.commit()


# ── Types → Issuers ─────────────────────────────────────────────────────────────

@router.get("/types/{type_id}/issuers")
def list_type_issuers(type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    t = _type_or_404(db, type_id)
    return t.issuers


@router.put("/types/{type_id}/issuers")
def set_type_issuers(type_id: int, issuer_ids: List[int], db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    t = _type_or_404(db, type_id)
    t.issuers = [_issuer_or_404(db, iid) for iid in issuer_ids]
    db.commit()
    db.refresh(t)
    return t.issuers


@router.post("/types/{type_id}/issuers", status_code=201)
def add_type_issuer(type_id: int, body: AddIssuerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    t = _type_or_404(db, type_id)
    if body.issuer_id:
        issuer = _issuer_or_404(db, body.issuer_id)
    else:
        issuer = TrustMarkIssuer(issuer=body.issuer, description=body.description)
        db.add(issuer)
        db.flush()
    if issuer not in t.issuers:
        t.issuers.append(issuer)
    db.commit()
    db.refresh(t)
    return t.issuers


@router.delete("/types/{type_id}/issuers/{issuer_id}", status_code=204)
def remove_type_issuer(type_id: int, issuer_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    t = _type_or_404(db, type_id)
    issuer = _issuer_or_404(db, issuer_id)
    if issuer in t.issuers:
        t.issuers.remove(issuer)
        db.commit()


# ── Types → Owner (singleton) ───────────────────────────────────────────────────

@router.get("/types/{type_id}/owner")
def get_type_owner(type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    t = _type_or_404(db, type_id)
    if not t.owners:
        raise HTTPException(status_code=404, detail="No owner set")
    return t.owners[0]


@router.post("/types/{type_id}/owner", status_code=201)
def create_type_owner(type_id: int, body: AddOwnerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    t = _type_or_404(db, type_id)
    if body.owner_id:
        owner = _owner_or_404(db, body.owner_id)
    else:
        owner = TrustMarkOwner(owner=body.owner, description=body.description)
        db.add(owner)
        db.flush()
    t.owners = [owner]
    db.commit()
    db.refresh(t)
    return t.owners[0]


@router.put("/types/{type_id}/owner")
def update_type_owner(type_id: int, body: AddOwnerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    t = _type_or_404(db, type_id)
    if body.owner_id:
        owner = _owner_or_404(db, body.owner_id)
    else:
        owner = TrustMarkOwner(owner=body.owner, description=body.description)
        db.add(owner)
        db.flush()
    t.owners = [owner]
    db.commit()
    db.refresh(t)
    return t.owners[0]


@router.delete("/types/{type_id}/owner", status_code=204)
def delete_type_owner(type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    t = _type_or_404(db, type_id)
    t.owners = []
    db.commit()


# ── Owners ──────────────────────────────────────────────────────────────────────

@router.get("/owners")
def list_owners(db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return db.query(TrustMarkOwner).all()


@router.post("/owners", status_code=201)
def create_owner(body: AddOwnerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = TrustMarkOwner(owner=body.owner, description=body.description)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/owners/{owner_id}")
def get_owner(owner_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _owner_or_404(db, owner_id)


@router.put("/owners/{owner_id}")
def update_owner(owner_id: int, body: AddOwnerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _owner_or_404(db, owner_id)
    if body.owner is not None:
        obj.owner = body.owner
    if body.description is not None:
        obj.description = body.description
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/owners/{owner_id}", status_code=204)
def delete_owner(owner_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _owner_or_404(db, owner_id)
    db.delete(obj)
    db.commit()


@router.get("/owners/{owner_id}/types")
def list_owner_types(owner_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _owner_or_404(db, owner_id).types


@router.put("/owners/{owner_id}/types")
def set_owner_types(owner_id: int, type_ids: List[int], db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _owner_or_404(db, owner_id)
    obj.types = [_type_or_404(db, tid) for tid in type_ids]
    db.commit()
    db.refresh(obj)
    return obj.types


@router.post("/owners/{owner_id}/types", status_code=201)
def add_owner_type(owner_id: int, type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _owner_or_404(db, owner_id)
    t = _type_or_404(db, type_id)
    if t not in obj.types:
        obj.types.append(t)
        db.commit()
    db.refresh(obj)
    return obj.types


@router.delete("/owners/{owner_id}/types/{type_id}", status_code=204)
def unlink_owner_type(owner_id: int, type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _owner_or_404(db, owner_id)
    t = _type_or_404(db, type_id)
    if t in obj.types:
        obj.types.remove(t)
        db.commit()


# ── Issuers ─────────────────────────────────────────────────────────────────────

@router.get("/issuers")
def list_issuers(db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return db.query(TrustMarkIssuer).all()


@router.post("/issuers", status_code=201)
def create_issuer(body: AddIssuerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = TrustMarkIssuer(issuer=body.issuer, description=body.description)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/issuers/{issuer_id}")
def get_issuer(issuer_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _issuer_or_404(db, issuer_id)


@router.put("/issuers/{issuer_id}")
def update_issuer(issuer_id: int, body: AddIssuerBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _issuer_or_404(db, issuer_id)
    if body.issuer is not None:
        obj.issuer = body.issuer
    if body.description is not None:
        obj.description = body.description
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/issuers/{issuer_id}", status_code=204)
def delete_issuer(issuer_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _issuer_or_404(db, issuer_id)
    db.delete(obj)
    db.commit()


@router.get("/issuers/{issuer_id}/types")
def list_issuer_types(issuer_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _issuer_or_404(db, issuer_id).types


@router.put("/issuers/{issuer_id}/types")
def set_issuer_types(issuer_id: int, type_ids: List[int], db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _issuer_or_404(db, issuer_id)
    obj.types = [_type_or_404(db, tid) for tid in type_ids]
    db.commit()
    db.refresh(obj)
    return obj.types


@router.post("/issuers/{issuer_id}/types", status_code=201)
def add_issuer_type(issuer_id: int, type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _issuer_or_404(db, issuer_id)
    t = _type_or_404(db, type_id)
    if t not in obj.types:
        obj.types.append(t)
        db.commit()
    db.refresh(obj)
    return obj.types


@router.delete("/issuers/{issuer_id}/types/{type_id}", status_code=204)
def unlink_issuer_type(issuer_id: int, type_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _issuer_or_404(db, issuer_id)
    t = _type_or_404(db, type_id)
    if t in obj.types:
        obj.types.remove(t)
        db.commit()


# ── Issuance Specs ──────────────────────────────────────────────────────────────

@router.get("/issuance-spec")
def list_specs(db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return [_serialize_spec(s) for s in db.query(TrustMarkSpec).all()]


@router.post("/issuance-spec", status_code=201)
def create_spec(body: AddTrustMarkSpec, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    data = body.model_dump()
    data["enabled"] = 1 if data.get("enabled", True) else 0
    obj = TrustMarkSpec(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _serialize_spec(obj)


@router.get("/issuance-spec/{spec_id}")
def get_spec(spec_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _serialize_spec(_spec_or_404(db, spec_id))


@router.put("/issuance-spec/{spec_id}")
def update_spec(spec_id: int, body: AddTrustMarkSpec, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _spec_or_404(db, spec_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "enabled":
            v = 1 if v else 0
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _serialize_spec(obj)


@router.patch("/issuance-spec/{spec_id}")
def patch_spec(spec_id: int, body: PatchTrustMarkSpec, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _spec_or_404(db, spec_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "enabled":
            v = 1 if v else 0
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _serialize_spec(obj)


@router.delete("/issuance-spec/{spec_id}", status_code=204)
def delete_spec(spec_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _spec_or_404(db, spec_id)
    db.delete(obj)
    db.commit()


# ── Subjects ────────────────────────────────────────────────────────────────────

@router.get("/issuance-spec/{spec_id}/subjects")
def list_subjects(spec_id: int, status: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    _spec_or_404(db, spec_id)
    q = db.query(TrustMarkSubject).filter(TrustMarkSubject.spec_id == spec_id)
    if status:
        q = q.filter(TrustMarkSubject.status == status)
    return [_serialize_subject(s) for s in q.all()]


@router.post("/issuance-spec/{spec_id}/subjects", status_code=201)
def create_subject(spec_id: int, body: AddTrustMarkSubject, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    _spec_or_404(db, spec_id)
    obj = TrustMarkSubject(
        spec_id=spec_id,
        subject=body.subject,
        status=body.status or "active",
        organization=body.organization,
        extra_claims=json.dumps(body.extra_claims) if body.extra_claims else None,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _serialize_subject(obj)


@router.get("/issuance-spec/{spec_id}/subjects/{subject_id}")
def get_subject(spec_id: int, subject_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    return _serialize_subject(_subject_or_404(db, spec_id, subject_id))


@router.put("/issuance-spec/{spec_id}/subjects/{subject_id}")
def update_subject(spec_id: int, subject_id: int, body: AddTrustMarkSubject, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _subject_or_404(db, spec_id, subject_id)
    obj.subject = body.subject
    obj.status = body.status or obj.status
    obj.organization = body.organization
    obj.extra_claims = json.dumps(body.extra_claims) if body.extra_claims else None
    db.commit()
    db.refresh(obj)
    return _serialize_subject(obj)


@router.delete("/issuance-spec/{spec_id}/subjects/{subject_id}", status_code=204)
def delete_subject(spec_id: int, subject_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _subject_or_404(db, spec_id, subject_id)
    db.delete(obj)
    db.commit()


@router.put("/issuance-spec/{spec_id}/subjects/{subject_id}/status")
def change_subject_status(spec_id: int, subject_id: int, body: StatusBody, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _subject_or_404(db, spec_id, subject_id)
    obj.status = body.status
    db.commit()
    db.refresh(obj)
    return _serialize_subject(obj)


@router.get("/issuance-spec/{spec_id}/subjects/{subject_id}/additional-claims")
def get_subject_claims(spec_id: int, subject_id: int, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "list"))):
    obj = _subject_or_404(db, spec_id, subject_id)
    return json.loads(obj.extra_claims) if obj.extra_claims else {}


@router.put("/issuance-spec/{spec_id}/subjects/{subject_id}/additional-claims")
def update_subject_claims(spec_id: int, subject_id: int, claims: dict, db: Session = Depends(get_db), _=Depends(require_permission("federation_trust_marks", "update"))):
    obj = _subject_or_404(db, spec_id, subject_id)
    obj.extra_claims = json.dumps(claims)
    db.commit()
    return claims
