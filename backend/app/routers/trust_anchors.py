from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.trust_anchor import TrustAnchor
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/admin/trust-anchors", tags=["trust-anchors"])


@router.get("", response_model=list[dict])
def list_trust_anchors(db: Session = Depends(get_db), user=Depends(get_current_user)):
    anchors = db.query(TrustAnchor).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "entityId": a.entity_id,
            "description": a.description,
            "type": a.type,
            "status": a.status,
            "subordinateCount": a.subordinate_count,
            "createdAt": a.created_at.isoformat() if a.created_at else None,
            "updatedAt": a.updated_at.isoformat() if a.updated_at else None,
        }
        for a in anchors
    ]
