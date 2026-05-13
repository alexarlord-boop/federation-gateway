from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
from app.db.database import get_db
from app.db.seed import DEPLOYMENT_MANAGED_DESCRIPTION_PREFIX
from app.models.trust_anchor import TrustAnchor
from app.models.tenant import Tenant
from app.models.entity_registration import EntityRegistration
from app.schemas.trust_anchor import TrustAnchorResponse
from app.auth.dependencies import require_permission

router = APIRouter(prefix="/api/v1/admin/trust-anchors", tags=["trust-anchors"])


def _build_subordinate_counts(
    db: Session, entity_ids: set[str] | None = None
) -> dict[str, int]:
    """Return a map of tenant entity_id -> non-rejected registration count.

    If *entity_ids* is given, only those entity_ids are included in the result,
    allowing callers to issue a targeted single-row query instead of a full scan.
    """
    # Invariant: the keyed lookup `counts.get(anchor.entity_id)` is only
    # meaningful because TrustAnchor.entity_id == Tenant.entity_id for every
    # anchor that owns subordinates.  If those values diverge the count will
    # silently return 0 for that anchor.
    q = (
        db.query(Tenant.entity_id, func.count(EntityRegistration.id))
        .join(EntityRegistration, EntityRegistration.tenant_id == Tenant.id)
        .filter(EntityRegistration.status != "rejected")
        .group_by(Tenant.entity_id)
    )
    if entity_ids is not None:
        q = q.filter(Tenant.entity_id.in_(entity_ids))
    return {entity_id: count for entity_id, count in q.all()}


@router.get("", response_model=list[TrustAnchorResponse])
def list_trust_anchors(db: Session = Depends(get_db), user=Depends(require_permission("trust_anchors", "list"))):
    anchors = db.query(TrustAnchor).all()
    counts_by_entity_id = _build_subordinate_counts(db)

    result = []
    for a in anchors:
        cfg = {}
        if a.config_json:
            try:
                cfg = json.loads(a.config_json)
            except Exception:
                cfg = {}

        deployment_managed = (a.description or "").startswith(DEPLOYMENT_MANAGED_DESCRIPTION_PREFIX)

        result.append(
            TrustAnchorResponse(
                id=a.id,
                name=a.name,
                entity_id=a.entity_id,
                description=a.description,
                type=a.type,
                status=a.status,
                subordinate_count=counts_by_entity_id.get(a.entity_id, 0),
                admin_api_base_url=cfg.get("admin_api_base_url"),
                deployment_managed=deployment_managed,
                created_at=a.created_at.isoformat() if a.created_at else None,
                updated_at=a.updated_at.isoformat() if a.updated_at else None,
            )
        )

    return result
