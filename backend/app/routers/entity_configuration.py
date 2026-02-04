from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.db.database import get_db
from app.schemas.authority_hint import AuthorityHintCreate, AuthorityHintResponse
from app.models.authority_hint import AuthorityHint
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/admin/entity-configuration", tags=["entity-configuration"])


@router.get("/authority-hints", response_model=list[AuthorityHintResponse])
def list_hints(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(AuthorityHint).all()


@router.post("/authority-hints", response_model=AuthorityHintResponse, status_code=201)
def create_hint(payload: AuthorityHintCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    hint = AuthorityHint(id=f"ah-{uuid.uuid4().hex[:8]}", entity_id=payload.entity_id, description=payload.description)
    db.add(hint)
    db.commit()
    db.refresh(hint)
    return hint


@router.delete("/authority-hints/{hint_id}", status_code=204)
def delete_hint(hint_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    hint = db.query(AuthorityHint).filter(AuthorityHint.id == hint_id).first()
    if not hint:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(hint)
    db.commit()
    return None
