from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import SessionLocal
from app.models.user import User
from app.models.trust_anchor import TrustAnchor
from app.models.tenant import Tenant
from app.auth.security import get_password_hash
from app.config.deployment import DeploymentConfig
import json


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
                password_hash=get_password_hash("admin123"),
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
                        description=f"Deployment-managed instance {item.name}",
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

            # Sync tenants (mirror of trust_anchors for new data model)
            tenant = db.query(Tenant).filter(Tenant.id == f"tenant-{item.id.split('-')[-1]}").first()
            if tenant is None:
                db.add(
                    Tenant(
                        id=f"tenant-{item.id.split('-')[-1]}",
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
