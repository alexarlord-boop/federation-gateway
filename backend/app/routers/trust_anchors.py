from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json
from app.db.database import get_db
from app.models.trust_anchor import TrustAnchor
from app.models.subordinate import Subordinate
from app.schemas.trust_anchor import TrustAnchorCreate, TrustAnchorResponse, TrustAnchorConfig
from app.auth.dependencies import require_permission

router = APIRouter(prefix="/api/v1/admin/trust-anchors", tags=["trust-anchors"])


@router.get("", response_model=list[TrustAnchorResponse])
def list_trust_anchors(db: Session = Depends(get_db), user=Depends(require_permission("general_constraints", "list"))):
    anchors = db.query(TrustAnchor).all()
    result = []
    for a in anchors:
        cfg = {}
        if a.config_json:
            try:
                cfg = json.loads(a.config_json)
            except Exception:
                cfg = {}

        result.append(
            TrustAnchorResponse(
                id=a.id,
                name=a.name,
                entity_id=a.entity_id,
                description=a.description,
                type=a.type,
                status=a.status,
                subordinate_count=db.query(Subordinate)
                .filter(
                    Subordinate.trust_anchor_id == a.id,
                )
                .count(),
                admin_api_base_url=cfg.get("admin_api_base_url"),
                created_at=a.created_at.isoformat() if a.created_at else None,
                updated_at=a.updated_at.isoformat() if a.updated_at else None,
            )
        )

    return result


@router.post("", response_model=TrustAnchorResponse, status_code=201)
def create_trust_anchor(
    payload: TrustAnchorCreate,
    db: Session = Depends(get_db),
    user=Depends(require_permission("general_constraints", "create")),
):
    anchor = TrustAnchor(
        id=f"ta-{uuid.uuid4().hex[:6]}",
        name=payload.name,
        entity_id=payload.entity_id,
        description=payload.description,
        type=payload.type,
        status=payload.status,
        subordinate_count=0,
        config_json=json.dumps({"admin_api_base_url": payload.admin_api_base_url}) if payload.admin_api_base_url else None,
    )
    db.add(anchor)
    db.commit()
    db.refresh(anchor)
    return TrustAnchorResponse(
        id=anchor.id,
        name=anchor.name,
        entity_id=anchor.entity_id,
        description=anchor.description,
        type=anchor.type,
        status=anchor.status,
        subordinate_count=anchor.subordinate_count,
        admin_api_base_url=payload.admin_api_base_url,
        created_at=anchor.created_at.isoformat() if anchor.created_at else None,
        updated_at=anchor.updated_at.isoformat() if anchor.updated_at else None,
    )


@router.delete("/{ta_id}", status_code=204)
def delete_trust_anchor(
    ta_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("general_constraints", "delete")),
):
    anchor = db.query(TrustAnchor).filter(TrustAnchor.id == ta_id).first()
    if not anchor:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(anchor)
    db.commit()
    return None


@router.get("/{ta_id}/config", response_model=TrustAnchorConfig)
def get_trust_anchor_config(
    ta_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("general_constraints", "list")),
):
    anchor = db.query(TrustAnchor).filter(TrustAnchor.id == ta_id).first()
    if not anchor:
        raise HTTPException(status_code=404, detail="Not found")
    config = TrustAnchorConfig()
    if anchor.config_json:
        try:
            cfg = json.loads(anchor.config_json)
            config.organization_name = cfg.get("organization_name")
            config.homepage_uri = cfg.get("homepage_uri")
            config.contacts = cfg.get("contacts")
            config.admin_api_base_url = cfg.get("admin_api_base_url")
        except Exception:
            pass
    if anchor.jwks:
        try:
            import json
            config.jwks = json.loads(anchor.jwks)
        except Exception:
            pass
    return config


@router.put("/{ta_id}/config", response_model=TrustAnchorConfig)
def update_trust_anchor_config(
    ta_id: str,
    payload: TrustAnchorConfig,
    db: Session = Depends(get_db),
    user=Depends(require_permission("general_constraints", "update")),
):
    anchor = db.query(TrustAnchor).filter(TrustAnchor.id == ta_id).first()
    if not anchor:
        raise HTTPException(status_code=404, detail="Not found")

    prev_cfg = {}
    if anchor.config_json:
        try:
            prev_cfg = json.loads(anchor.config_json)
        except Exception:
            prev_cfg = {}

    anchor.config_json = json.dumps({
        "organization_name": payload.organization_name,
        "homepage_uri": payload.homepage_uri,
        "contacts": payload.contacts or [],
        "admin_api_base_url": payload.admin_api_base_url if payload.admin_api_base_url is not None else prev_cfg.get("admin_api_base_url"),
    })
    if payload.jwks is not None:
        anchor.jwks = json.dumps(payload.jwks)
    db.commit()
    return payload
