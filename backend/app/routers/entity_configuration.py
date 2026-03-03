import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.authority_hint import AuthorityHintCreate, AuthorityHintResponse
from app.models.authority_hint import AuthorityHint
from app.models.entity_config import EntityConfigTrustMark, EntityConfigAdditionalClaim, EntityConfigSetting
from app.schemas.entity_config import (
    AddTrustMark, UpdateTrustMark, TrustMarkResponse,
    AddAdditionalClaim, AdditionalClaimResponse,
    LifetimeSeconds,
)
from app.auth.dependencies import get_current_user, require_feature_enabled

router = APIRouter(prefix="/api/v1/admin/entity-configuration", tags=["entity-configuration"])

_authority_hints_enabled = require_feature_enabled("authority_hints")
_ec_enabled = require_feature_enabled("entity_configuration")
_ec_tm_enabled = require_feature_enabled("entity_configuration_trust_marks")


# ── Base entity configuration ──────────────────────────────────────────────

@router.get("", tags=["Entity Configuration"])
def get_entity_configuration(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return the entity configuration as it would appear at /.well-known/openid-federation."""
    lifetime_row = db.query(EntityConfigSetting).filter(EntityConfigSetting.key == "lifetime").first()
    meta_row = db.query(EntityConfigSetting).filter(EntityConfigSetting.key == "metadata").first()
    claims = db.query(EntityConfigAdditionalClaim).all()
    hints = db.query(AuthorityHint).all()

    config: Dict[str, Any] = {
        "iss": "https://federation.example.org",
        "sub": "https://federation.example.org",
        "authority_hints": [h.entity_id for h in hints],
        "metadata": json.loads(meta_row.value) if meta_row else {},
    }
    if lifetime_row:
        config["lifetime_seconds"] = int(lifetime_row.value)
    for c in claims:
        try:
            config[c.claim_key] = json.loads(c.claim_value)
        except (json.JSONDecodeError, TypeError):
            config[c.claim_key] = c.claim_value
    return config


# ── Lifetime ───────────────────────────────────────────────────────────────

@router.get("/lifetime", response_model=LifetimeSeconds, tags=["Entity Configuration"])
def get_lifetime(db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigSetting).filter(EntityConfigSetting.key == "lifetime").first()
    return LifetimeSeconds(lifetime_seconds=int(row.value) if row else 86400)


@router.put("/lifetime", response_model=LifetimeSeconds, tags=["Entity Configuration"])
def update_lifetime(payload: LifetimeSeconds, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigSetting).filter(EntityConfigSetting.key == "lifetime").first()
    if row:
        row.value = str(payload.lifetime_seconds)
    else:
        db.add(EntityConfigSetting(key="lifetime", value=str(payload.lifetime_seconds)))
    db.commit()
    return payload


# ── Metadata ──────────────────────────────────────────────────────────────

@router.get("/metadata", tags=["Entity Configuration Metadata"])
def get_metadata(db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigSetting).filter(EntityConfigSetting.key == "metadata").first()
    return json.loads(row.value) if row else {}


@router.put("/metadata", tags=["Entity Configuration Metadata"])
def update_metadata(payload: Dict[str, Any], db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigSetting).filter(EntityConfigSetting.key == "metadata").first()
    encoded = json.dumps(payload)
    if row:
        row.value = encoded
    else:
        db.add(EntityConfigSetting(key="metadata", value=encoded))
    db.commit()
    return payload


# ── Trust Marks ────────────────────────────────────────────────────────────

@router.get("/trust-marks", response_model=List[TrustMarkResponse], tags=["Entity Configuration Trust Marks"])
def list_trust_marks(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    _fg=Depends(_ec_tm_enabled),
):
    return db.query(EntityConfigTrustMark).all()


@router.post("/trust-marks", response_model=TrustMarkResponse, status_code=201, tags=["Entity Configuration Trust Marks"])
def create_trust_mark(
    payload: AddTrustMark,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    _fg=Depends(_ec_tm_enabled),
):
    if not payload.trust_mark and not payload.trust_mark_type:
        raise HTTPException(status_code=400, detail="Provide trust_mark JWT or trust_mark_type")
    tm = EntityConfigTrustMark(
        id=f"tm-{uuid.uuid4().hex[:8]}",
        trust_mark_type=payload.trust_mark_type,
        trust_mark_issuer=payload.trust_mark_issuer,
        trust_mark=payload.trust_mark,
    )
    db.add(tm)
    db.commit()
    db.refresh(tm)
    return tm


@router.get("/trust-marks/{tm_id}", response_model=TrustMarkResponse, tags=["Entity Configuration Trust Marks"])
def get_trust_mark(tm_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tm = db.query(EntityConfigTrustMark).filter(EntityConfigTrustMark.id == tm_id).first()
    if not tm:
        raise HTTPException(status_code=404, detail="Not found")
    return tm


@router.put("/trust-marks/{tm_id}", response_model=TrustMarkResponse, tags=["Entity Configuration Trust Marks"])
def update_trust_mark(tm_id: str, payload: UpdateTrustMark, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tm = db.query(EntityConfigTrustMark).filter(EntityConfigTrustMark.id == tm_id).first()
    if not tm:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.trust_mark_issuer is not None:
        tm.trust_mark_issuer = payload.trust_mark_issuer
    if payload.trust_mark is not None:
        tm.trust_mark = payload.trust_mark
    db.commit()
    db.refresh(tm)
    return tm


@router.delete("/trust-marks/{tm_id}", status_code=204, tags=["Entity Configuration Trust Marks"])
def delete_trust_mark(tm_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tm = db.query(EntityConfigTrustMark).filter(EntityConfigTrustMark.id == tm_id).first()
    if not tm:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(tm)
    db.commit()
    return None


# ── Additional Claims ──────────────────────────────────────────────────────

@router.get("/additional-claims", response_model=List[AdditionalClaimResponse], tags=["Entity Configuration"])
def list_additional_claims(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(EntityConfigAdditionalClaim).all()
    return [
        AdditionalClaimResponse(id=r.id, claim_key=r.claim_key, claim_value=_decode_value(r.claim_value))
        for r in rows
    ]


@router.post("/additional-claims", response_model=AdditionalClaimResponse, status_code=201, tags=["Entity Configuration"])
def add_additional_claim(payload: AddAdditionalClaim, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = EntityConfigAdditionalClaim(
        id=f"ac-{uuid.uuid4().hex[:8]}",
        claim_key=payload.claim_key,
        claim_value=json.dumps(payload.claim_value),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AdditionalClaimResponse(id=row.id, claim_key=row.claim_key, claim_value=payload.claim_value)


@router.get("/additional-claims/{claim_id}", response_model=AdditionalClaimResponse, tags=["Entity Configuration"])
def get_additional_claim(claim_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigAdditionalClaim).filter(EntityConfigAdditionalClaim.id == claim_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return AdditionalClaimResponse(id=row.id, claim_key=row.claim_key, claim_value=_decode_value(row.claim_value))


@router.put("/additional-claims/{claim_id}", response_model=AdditionalClaimResponse, tags=["Entity Configuration"])
def update_additional_claim(claim_id: str, payload: AddAdditionalClaim, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigAdditionalClaim).filter(EntityConfigAdditionalClaim.id == claim_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.claim_key = payload.claim_key
    row.claim_value = json.dumps(payload.claim_value)
    db.commit()
    return AdditionalClaimResponse(id=row.id, claim_key=row.claim_key, claim_value=payload.claim_value)


@router.delete("/additional-claims/{claim_id}", status_code=204, tags=["Entity Configuration"])
def delete_additional_claim(claim_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(EntityConfigAdditionalClaim).filter(EntityConfigAdditionalClaim.id == claim_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return None


# ── Authority Hints ────────────────────────────────────────────────────────

@router.get("/authority-hints", response_model=list[AuthorityHintResponse])
def list_hints(db: Session = Depends(get_db), user=Depends(get_current_user), _fg=Depends(_authority_hints_enabled)):
    return db.query(AuthorityHint).all()


@router.post("/authority-hints", response_model=AuthorityHintResponse, status_code=201)
def create_hint(payload: AuthorityHintCreate, db: Session = Depends(get_db), user=Depends(get_current_user), _fg=Depends(_authority_hints_enabled)):
    hint = AuthorityHint(id=f"ah-{uuid.uuid4().hex[:8]}", entity_id=payload.entity_id, description=payload.description)
    db.add(hint)
    db.commit()
    db.refresh(hint)
    return hint


@router.delete("/authority-hints/{hint_id}", status_code=204)
def delete_hint(hint_id: str, db: Session = Depends(get_db), user=Depends(get_current_user), _fg=Depends(_authority_hints_enabled)):
    hint = db.query(AuthorityHint).filter(AuthorityHint.id == hint_id).first()
    if not hint:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(hint)
    db.commit()
    return None


# ── Helpers ────────────────────────────────────────────────────────────────

def _decode_value(raw: str) -> Any:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw
