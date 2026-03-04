"""
Local Constraints / Critical-Operator Router
=============================================

Handles:
  /api/v1/proxy/{instance_id}/api/v1/admin/subordinates/constraints[/…]
  /api/v1/proxy/{instance_id}/api/v1/admin/subordinates/metadata-policy-crit[/…]

Data is stored locally per instance in the gateway DB.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.instance_data import InstanceConstraints, InstanceCritOperator

router = APIRouter(prefix="/api/v1/proxy", tags=["local-constraints"])


# ── Pydantic schemas ────────────────────────────────────────────────────────

class NamingConstraints(BaseModel):
    permitted: Optional[List[str]] = None
    excluded: Optional[List[str]] = None


class AllowedEntityTypes(BaseModel):
    entity_types: List[str]


class AddEntityType(BaseModel):
    entity_type: str


class ConstraintsUpdate(BaseModel):
    max_path_length: Optional[int] = None
    naming_constraints: Optional[NamingConstraints] = None
    allowed_entity_types: Optional[List[str]] = None


class MaxPathLengthUpdate(BaseModel):
    max_path_length: int


class AddCritOperator(BaseModel):
    operator: str


class MaxPathLengthBody(BaseModel):
    max_path_length: int


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_constraints(instance_id: str, db: Session) -> InstanceConstraints:
    c = db.query(InstanceConstraints).filter_by(instance_id=instance_id).first()
    if not c:
        c = InstanceConstraints(instance_id=instance_id)
        db.add(c)
        db.commit()
        db.refresh(c)
    return c


def _constraints_to_dict(c: InstanceConstraints) -> dict:
    naming = json.loads(c.naming_constraints_json) if c.naming_constraints_json else None
    allowed = json.loads(c.allowed_entity_types_json) if c.allowed_entity_types_json else []
    result: dict = {}
    if c.max_path_length is not None:
        result["max_path_length"] = c.max_path_length
    if naming:
        result["naming_constraints"] = naming
    result["allowed_entity_types"] = allowed
    return result


# ── GET /subordinates/constraints ────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/subordinates/constraints")
async def get_constraints(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    return _constraints_to_dict(c)


# ── PUT /subordinates/constraints ────────────────────────────────────────────

@router.put("/{instance_id}/api/v1/admin/subordinates/constraints")
async def update_constraints(
    instance_id: str,
    body: ConstraintsUpdate,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    if body.max_path_length is not None:
        c.max_path_length = body.max_path_length
    if body.naming_constraints is not None:
        c.naming_constraints_json = json.dumps(body.naming_constraints.model_dump(exclude_none=True))
    if body.allowed_entity_types is not None:
        c.allowed_entity_types_json = json.dumps(body.allowed_entity_types)
    db.commit()
    db.refresh(c)
    return _constraints_to_dict(c)


# ── max-path-length ───────────────────────────────────────────────────────────

@router.put("/{instance_id}/api/v1/admin/subordinates/constraints/max-path-length")
async def set_max_path_length(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Body is a plain JSON number."""
    val = await request.json()
    if not isinstance(val, (int, float)):
        raise HTTPException(status_code=400, detail="Body must be a JSON number")
    c = _get_or_create_constraints(instance_id, db)
    c.max_path_length = int(val)
    db.commit()
    db.refresh(c)
    return _constraints_to_dict(c)


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/constraints/max-path-length",
    status_code=204,
)
async def delete_max_path_length(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    c.max_path_length = None
    db.commit()


# ── naming-constraints ───────────────────────────────────────────────────────

@router.put("/{instance_id}/api/v1/admin/subordinates/constraints/naming-constraints")
async def set_naming_constraints(
    instance_id: str,
    body: NamingConstraints,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    c.naming_constraints_json = json.dumps(body.model_dump(exclude_none=True))
    db.commit()
    db.refresh(c)
    return _constraints_to_dict(c)


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/constraints/naming-constraints",
    status_code=204,
)
async def delete_naming_constraints(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    c.naming_constraints_json = None
    db.commit()


# ── allowed-entity-types ─────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/subordinates/constraints/allowed-entity-types")
async def get_allowed_entity_types(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    return json.loads(c.allowed_entity_types_json) if c.allowed_entity_types_json else []


@router.put("/{instance_id}/api/v1/admin/subordinates/constraints/allowed-entity-types")
async def set_allowed_entity_types(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Body is a plain JSON array of strings."""
    entity_types = await request.json()
    if not isinstance(entity_types, list):
        raise HTTPException(status_code=400, detail="Body must be a JSON array")
    c = _get_or_create_constraints(instance_id, db)
    c.allowed_entity_types_json = json.dumps(entity_types)
    db.commit()
    db.refresh(c)
    return json.loads(c.allowed_entity_types_json)


@router.post(
    "/{instance_id}/api/v1/admin/subordinates/constraints/allowed-entity-types",
    status_code=201,
)
async def add_allowed_entity_type(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Body is a plain JSON string — the entity type name."""
    entity_type = await request.json()
    if not isinstance(entity_type, str):
        raise HTTPException(status_code=400, detail="Body must be a JSON string")
    c = _get_or_create_constraints(instance_id, db)
    current: List[str] = json.loads(c.allowed_entity_types_json) if c.allowed_entity_types_json else []
    if entity_type not in current:
        current.append(entity_type)
        c.allowed_entity_types_json = json.dumps(current)
        db.commit()
    return current


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/constraints/allowed-entity-types/{entity_type}",
    status_code=204,
)
async def delete_allowed_entity_type(
    instance_id: str,
    entity_type: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    c = _get_or_create_constraints(instance_id, db)
    current: List[str] = json.loads(c.allowed_entity_types_json) if c.allowed_entity_types_json else []
    if entity_type in current:
        current.remove(entity_type)
        c.allowed_entity_types_json = json.dumps(current)
        db.commit()


# ── metadata-policy-crit ─────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/subordinates/metadata-policy-crit")
async def list_crit_operators(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    ops = db.query(InstanceCritOperator).filter_by(instance_id=instance_id).all()
    return [op.operator for op in ops]


@router.put("/{instance_id}/api/v1/admin/subordinates/metadata-policy-crit")
async def set_crit_operators(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Replace the full list of critical operators."""
    operators: List[str] = await request.json()
    if not isinstance(operators, list):
        raise HTTPException(status_code=400, detail="Body must be a JSON array")
    db.query(InstanceCritOperator).filter_by(instance_id=instance_id).delete()
    for op_name in operators:
        db.add(InstanceCritOperator(instance_id=instance_id, operator=str(op_name)))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    ops = db.query(InstanceCritOperator).filter_by(instance_id=instance_id).all()
    return [o.operator for o in ops]


@router.post(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policy-crit",
    status_code=201,
)
async def add_crit_operator(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Body is a plain JSON string — the operator name."""
    operator_name: str = await request.json()
    if not isinstance(operator_name, str):
        raise HTTPException(status_code=400, detail="Body must be a JSON string")
    op = InstanceCritOperator(instance_id=instance_id, operator=operator_name)
    db.add(op)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # already exists — idempotent
    ops = db.query(InstanceCritOperator).filter_by(instance_id=instance_id).all()
    return [o.operator for o in ops]


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policy-crit/{operator}",
    status_code=204,
)
async def delete_crit_operator(
    instance_id: str,
    operator: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    op = (
        db.query(InstanceCritOperator)
        .filter_by(instance_id=instance_id, operator=operator)
        .first()
    )
    if op:
        db.delete(op)
        db.commit()
