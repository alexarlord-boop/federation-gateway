import os
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import SessionLocal
from app.models.user import User
from app.models.trust_anchor import TrustAnchor
from app.models.tenant import Tenant
from app.auth.security import get_password_hash
from app.config.deployment import DeploymentConfig
import json

# Only a code-level fallback for non-docker-compose runs (LOCAL-DEVELOPMENT.md's
# direct `uvicorn` flow, tests) — docker-compose.yml itself has no fallback
# and fails closed if ADMIN_BOOTSTRAP_PASSWORD isn't set (PRODUCTION-READINESS.md
# #2), same split JWT_SECRET already uses in backend/app/auth/security.py.
_ADMIN_BOOTSTRAP_PASSWORD = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD", "admin123")

# Prefix used to flag trust anchors that are owned by the deployment config.
# The trust_anchors router reads this same prefix to compute deployment_managed.
DEPLOYMENT_MANAGED_DESCRIPTION_PREFIX = "Deployment-managed instance"


def seed_data(instance_config: Optional[DeploymentConfig] = None):
    db: Session = SessionLocal()
    try:
        # Always seed admin/user if they don't exist
        if db.query(User).count() == 0:
            admin = User(
                id="1",
                email="admin@oidfed.org",
                name="Federation Admin",
                role="admin",
                password_hash=get_password_hash(_ADMIN_BOOTSTRAP_PASSWORD),
            )
            user = User(
                id="2",
                email="tech@example.org",
                name="Technical Contact",
                role="user",
                organization_id="org-1",
                organization_name="Example University",
                password_hash=get_password_hash("user123"),
            )
            db.add_all([admin, user])
            db.commit()

        # If no instance config provided, return early
        if instance_config is None:
            return

        # Sync trust anchors from deployment config
        for item in instance_config.instances:
            anchor = db.query(TrustAnchor).filter(TrustAnchor.id == item.id).first()
            payload = json.dumps(
                {
                    "public_base_url": str(item.public_base_url),
                    "admin_api_base_url": str(item.admin_base_url),
                    "public_port": item.public_port,
                    "admin_port": item.admin_port,
                }
            )
            if anchor is None:
                db.add(
                    TrustAnchor(
                        id=item.id,
                        name=item.name,
                        entity_id=str(item.public_base_url),
                        description=f"{DEPLOYMENT_MANAGED_DESCRIPTION_PREFIX} {item.name}",
                        type="federation",
                        status="active",
                        subordinate_count=0,
                        config_json=payload,
                    )
                )
            else:
                anchor.name = item.name
                anchor.entity_id = str(item.public_base_url)
                anchor.config_json = payload

            # Sync tenants (mirror of trust_anchors for new data model).
            # Use the full instance id, not just its last hyphen segment —
            # truncating collided the moment two instance ids shared a
            # suffix (mesh-ta/mesh2-ta, mesh-ia/mesh2-ia both derived
            # "tenant-ta"/"tenant-ia"), silently overwriting one tenant's
            # entity_id/admin_api_base_url with the other's on every
            # startup — whichever config entry seeded last "won".
            tenant = db.query(Tenant).filter(Tenant.id == f"tenant-{item.id}").first()
            if tenant is None:
                db.add(
                    Tenant(
                        id=f"tenant-{item.id}",
                        entity_id=str(item.public_base_url),
                        name=item.name,
                        status="active",
                        admin_api_base_url=str(item.admin_base_url),
                    )
                )
            else:
                tenant.entity_id = str(item.public_base_url)
                tenant.name = item.name
                tenant.admin_api_base_url = str(item.admin_base_url)

        db.commit()
    finally:
        db.close()
