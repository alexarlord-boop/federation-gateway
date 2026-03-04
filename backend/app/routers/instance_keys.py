"""
Local Keys / KMS Router
=======================

Handles key-management and KMS endpoints for each federation instance
stored locally in the gateway DB.  These routes are registered *before*
the proxy catch-all so they shadow any missing upstream implementation.

Matched URL pattern (as seen by FastAPI):
  /api/v1/proxy/{instance_id}/api/v1/admin/entity-configuration/keys[/…]
  /api/v1/proxy/{instance_id}/api/v1/admin/kms[/…]
"""

import json
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.instance_data import InstancePublicKey, InstanceKmsConfig

router = APIRouter(prefix="/api/v1/proxy", tags=["local-keys"])


# ── Pydantic schemas ────────────────────────────────────────────────────────

class AddKeyRequest(BaseModel):
    key: dict
    iat: Optional[int] = None
    nbf: Optional[int] = None
    exp: Optional[int] = None


class UpdateKeyMetaRequest(BaseModel):
    exp: Optional[int] = None


class UpdateAlgRequest(BaseModel):
    alg: str


class UpdateRsaKeyLenRequest(BaseModel):
    rsa_key_length: int


class KmsRotationOptions(BaseModel):
    auto_rotate: Optional[bool] = None
    rotation_interval_seconds: Optional[int] = None


class RotateRequest(BaseModel):
    revoke: Optional[bool] = False
    reason: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_kms(instance_id: str, db: Session) -> InstanceKmsConfig:
    kms = db.query(InstanceKmsConfig).filter_by(instance_id=instance_id).first()
    if not kms:
        kms = InstanceKmsConfig(instance_id=instance_id)
        db.add(kms)
        db.commit()
        db.refresh(kms)
    return kms


def _key_to_dict(k: InstancePublicKey) -> dict:
    jwk = json.loads(k.key_json)
    return {
        "kid": k.kid,
        "key": jwk,
        "iat": k.iat,
        "nbf": k.nbf,
        "exp": k.exp,
        # Expose flat JWK fields too (convenient for the table display)
        "alg": jwk.get("alg"),
        "kty": jwk.get("kty"),
        "use": jwk.get("use"),
    }


# ── JWKS (published) ─────────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/entity-configuration/jwks")
async def get_jwks(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    keys = db.query(InstancePublicKey).filter_by(instance_id=instance_id).all()
    return {"keys": [json.loads(k.key_json) for k in keys]}


# ── Public keys CRUD ─────────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/entity-configuration/keys")
async def list_keys(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    keys = db.query(InstancePublicKey).filter_by(instance_id=instance_id).all()
    return [_key_to_dict(k) for k in keys]


@router.post("/{instance_id}/api/v1/admin/entity-configuration/keys", status_code=201)
async def add_key(
    instance_id: str,
    body: AddKeyRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    jwk = body.key
    kid = jwk.get("kid")
    if not kid:
        raise HTTPException(status_code=400, detail="JWK must contain a 'kid' field")

    existing = (
        db.query(InstancePublicKey)
        .filter_by(instance_id=instance_id, kid=kid)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Key '{kid}' already exists")

    k = InstancePublicKey(
        instance_id=instance_id,
        kid=kid,
        key_json=json.dumps(jwk),
        iat=body.iat or int(time.time()),
        nbf=body.nbf,
        exp=body.exp,
    )
    db.add(k)
    db.commit()
    db.refresh(k)
    return _key_to_dict(k)


@router.delete(
    "/{instance_id}/api/v1/admin/entity-configuration/keys/{kid}",
    status_code=204,
)
async def delete_key(
    instance_id: str,
    kid: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    k = (
        db.query(InstancePublicKey)
        .filter_by(instance_id=instance_id, kid=kid)
        .first()
    )
    if not k:
        raise HTTPException(status_code=404, detail=f"Key '{kid}' not found")
    db.delete(k)
    db.commit()


@router.put("/{instance_id}/api/v1/admin/entity-configuration/keys/{kid}")
async def update_key_metadata(
    instance_id: str,
    kid: str,
    body: UpdateKeyMetaRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    k = (
        db.query(InstancePublicKey)
        .filter_by(instance_id=instance_id, kid=kid)
        .first()
    )
    if not k:
        raise HTTPException(status_code=404, detail=f"Key '{kid}' not found")
    if body.exp is not None:
        k.exp = body.exp
    db.commit()
    db.refresh(k)
    return _key_to_dict(k)


@router.post("/{instance_id}/api/v1/admin/entity-configuration/keys/{kid}")
async def rotate_key(
    instance_id: str,
    kid: str,
    _user=Depends(get_current_user),
):
    """Stub — rotation would re-key; returns 200 with a message."""
    return {"detail": f"Rotation of key '{kid}' acknowledged (stub)"}


# ── KMS info ──────────────────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/kms")
async def get_kms_info(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    kms = _get_or_create_kms(instance_id, db)
    return {
        "alg": kms.alg,
        "rsa_key_length": kms.rsa_key_length,
    }


@router.put("/{instance_id}/api/v1/admin/kms/alg")
async def update_alg(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Body is a plain JSON string — the algorithm name (SignatureAlgorithm enum)."""
    alg = await request.json()
    if not isinstance(alg, str):
        raise HTTPException(status_code=400, detail="Body must be a JSON string")
    kms = _get_or_create_kms(instance_id, db)
    kms.alg = alg
    db.commit()
    db.refresh(kms)
    return {"alg": kms.alg, "rsa_key_length": kms.rsa_key_length}


@router.put("/{instance_id}/api/v1/admin/kms/rsa-key-len")
async def update_rsa_key_len(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Body is a plain JSON number."""
    val = await request.json()
    if not isinstance(val, (int, float)):
        raise HTTPException(status_code=400, detail="Body must be a JSON number")
    kms = _get_or_create_kms(instance_id, db)
    kms.rsa_key_length = int(val)
    db.commit()
    db.refresh(kms)
    return {"alg": kms.alg, "rsa_key_length": kms.rsa_key_length}


# ── Rotation options ──────────────────────────────────────────────────────────

@router.get("/{instance_id}/api/v1/admin/kms/rotation")
async def get_rotation_options(
    instance_id: str,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    kms = _get_or_create_kms(instance_id, db)
    return {
        "auto_rotate": kms.auto_rotate,
        "rotation_interval_seconds": kms.rotation_interval_seconds,
    }


@router.put("/{instance_id}/api/v1/admin/kms/rotation")
async def update_rotation_options(
    instance_id: str,
    body: KmsRotationOptions,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    kms = _get_or_create_kms(instance_id, db)
    if body.auto_rotate is not None:
        kms.auto_rotate = body.auto_rotate
    if body.rotation_interval_seconds is not None:
        kms.rotation_interval_seconds = body.rotation_interval_seconds
    db.commit()
    db.refresh(kms)
    return {
        "auto_rotate": kms.auto_rotate,
        "rotation_interval_seconds": kms.rotation_interval_seconds,
    }


@router.patch("/{instance_id}/api/v1/admin/kms/rotation")
async def patch_rotation_options(
    instance_id: str,
    body: KmsRotationOptions,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return await update_rotation_options(instance_id, body, db, _user)


@router.post("/{instance_id}/api/v1/admin/kms/rotate")
async def trigger_rotation(
    instance_id: str,
    body: RotateRequest = RotateRequest(),
    _user=Depends(get_current_user),
):
    """Stub — a real implementation would generate a new key pair."""
    return {"detail": "Key rotation triggered (stub implementation)"}
