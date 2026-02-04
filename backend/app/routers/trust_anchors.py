from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.db.database import get_db
from app.models.trust_anchor import TrustAnchor
from app.schemas.trust_anchor import TrustAnchorCreate, TrustAnchorResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/admin/trust-anchors", tags=["trust-anchors"])


@router.get("", response_model=list[TrustAnchorResponse])
def list_trust_anchors(db: Session = Depends(get_db), user=Depends(get_current_user)):
    anchors = db.query(TrustAnchor).all()
    return [
        TrustAnchorResponse(
            id=a.id,
            name=a.name,
            entity_id=a.entity_id,
            description=a.description,
            type=a.type,
            status=a.status,
            subordinate_count=a.subordinate_count,
            created_at=a.created_at.isoformat() if a.created_at else None,
            updated_at=a.updated_at.isoformat() if a.updated_at else None,
        )
        for a in anchors
    ]


@router.post("", response_model=TrustAnchorResponse, status_code=201)
def create_trust_anchor(
    payload: TrustAnchorCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    anchor = TrustAnchor(
        id=f"ta-{uuid.uuid4().hex[:6]}",
        name=payload.name,
        entity_id=payload.entity_id,
        description=payload.description,
        type=payload.type,
        status=payload.status,
        subordinate_count=0,
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
        created_at=anchor.created_at.isoformat() if anchor.created_at else None,
        updated_at=anchor.updated_at.isoformat() if anchor.updated_at else None,
    )


@router.delete("/{ta_id}", status_code=204)
def delete_trust_anchor(
    ta_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    anchor = db.query(TrustAnchor).filter(TrustAnchor.id == ta_id).first()
    if not anchor:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(anchor)
    db.commit()
    return None
