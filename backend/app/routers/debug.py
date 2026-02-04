from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.debug import DebugContext
from app.models.context import DemoContext

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.get("/context", response_model=DebugContext)
def get_context(db: Session = Depends(get_db)):
    ctx = db.query(DemoContext).first()
    if not ctx:
        ctx = DemoContext(id="ctx-1", context_id="ta-1")
        db.add(ctx)
        db.commit()
        db.refresh(ctx)
    return DebugContext(contextId=ctx.context_id)


@router.post("/context", response_model=DebugContext)
def set_context(payload: DebugContext, db: Session = Depends(get_db)):
    ctx = db.query(DemoContext).first()
    if not ctx:
        ctx = DemoContext(id="ctx-1", context_id=payload.contextId)
        db.add(ctx)
    else:
        ctx.context_id = payload.contextId
    db.commit()
    return DebugContext(contextId=ctx.context_id)
