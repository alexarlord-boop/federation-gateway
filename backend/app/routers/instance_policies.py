"""
Local Metadata Policies Router
===============================

Handles:
  /api/v1/proxy/{instance_id}/api/v1/admin/subordinates/metadata-policies[/…]

The full policy document is stored as a JSON blob per instance.
Individual entity-type / claim / operator mutations are reflected in that blob.
"""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.instance_data import InstanceMetadataPolicies

router = APIRouter(prefix="/api/v1/proxy", tags=["local-policies"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_policies(instance_id: str, db: Session) -> InstanceMetadataPolicies:
    p = db.query(InstanceMetadataPolicies).filter_by(instance_id=instance_id).first()
    if not p:
        p = InstanceMetadataPolicies(instance_id=instance_id, policies_json="{}")
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def _load(p: InstanceMetadataPolicies) -> dict:
    return json.loads(p.policies_json or "{}")


def _save(p: InstanceMetadataPolicies, data: dict, db: Session) -> dict:
    p.policies_json = json.dumps(data)
    db.commit()
    db.refresh(p)
    return _load(p)


# ── GET /metadata-policies ────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/subordinates/metadata-policies")
async def get_policies(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    return _load(p)


# ── PUT /metadata-policies  (replace all) ────────────────────────────────────

@router.put("/{instance_id}/api/v1/admin/subordinates/metadata-policies")
async def update_all_policies(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    p = _get_or_create_policies(instance_id, db)
    return _save(p, body, db)


# ── Entity-type level ─────────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}")
async def get_entity_type_policy(
    instance_id: str,
    entity_type: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    if entity_type not in data:
        raise HTTPException(status_code=404, detail=f"No policy for entity type '{entity_type}'")
    return data[entity_type]


@router.put("/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}")
async def update_entity_type_policy(
    instance_id: str,
    entity_type: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    data[entity_type] = body
    _save(p, data, db)
    return body


@router.post(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}",
    status_code=201,
)
async def create_entity_type_policy(
    instance_id: str,
    entity_type: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    data[entity_type] = body
    _save(p, data, db)
    return body


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}",
    status_code=204,
)
async def delete_entity_type_policy(
    instance_id: str,
    entity_type: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    data.pop(entity_type, None)
    _save(p, data, db)


# ── Claim level ───────────────────────────────────────────────────────────────

@router.get(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}/{claim}"
)
async def get_claim_policy(
    instance_id: str,
    entity_type: str,
    claim: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    et = data.get(entity_type, {})
    if claim not in et:
        raise HTTPException(status_code=404, detail=f"No policy for claim '{claim}'")
    return et[claim]


@router.put(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}/{claim}"
)
async def update_claim_policy(
    instance_id: str,
    entity_type: str,
    claim: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    data.setdefault(entity_type, {})[claim] = body
    _save(p, data, db)
    return body


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}/{claim}",
    status_code=204,
)
async def delete_claim_policy(
    instance_id: str,
    entity_type: str,
    claim: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    if entity_type in data:
        data[entity_type].pop(claim, None)
        if not data[entity_type]:
            data.pop(entity_type)
    _save(p, data, db)


# ── Operator level ────────────────────────────────────────────────────────────

@router.get(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}/{claim}/{operator}"
)
async def get_operator(
    instance_id: str,
    entity_type: str,
    claim: str,
    operator: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    val = data.get(entity_type, {}).get(claim, {}).get(operator)
    if val is None:
        raise HTTPException(
            status_code=404,
            detail=f"No operator '{operator}' for {entity_type}/{claim}",
        )
    return val


@router.put(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}/{claim}/{operator}"
)
async def update_operator(
    instance_id: str,
    entity_type: str,
    claim: str,
    operator: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    body = await request.json()
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    data.setdefault(entity_type, {}).setdefault(claim, {})[operator] = body
    _save(p, data, db)
    return body


@router.delete(
    "/{instance_id}/api/v1/admin/subordinates/metadata-policies/{entity_type}/{claim}/{operator}",
    status_code=204,
)
async def delete_operator(
    instance_id: str,
    entity_type: str,
    claim: str,
    operator: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    p = _get_or_create_policies(instance_id, db)
    data = _load(p)
    if entity_type in data and claim in data[entity_type]:
        data[entity_type][claim].pop(operator, None)
        if not data[entity_type][claim]:
            data[entity_type].pop(claim, None)
        if not data[entity_type]:
            data.pop(entity_type)
    _save(p, data, db)
