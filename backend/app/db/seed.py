from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.models.trust_anchor import TrustAnchor
from app.models.tenant import Tenant
from app.auth.security import get_password_hash
import json


def seed_data():
    db: Session = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

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

        trust_anchors = [
            TrustAnchor(
                id="ta-1",
                name="LightHouse",
                entity_id="http://localhost:8080",
                description="LightHouse federation node (oidfed/lighthouse)",
                type="federation",
                status="active",
                subordinate_count=0,
                config_json=json.dumps({"admin_api_base_url": "http://lighthouse:8080"}),
                jwks=None,
            ),
            TrustAnchor(
                id="ta-2",
                name="Test Federation",
                entity_id="https://ta.test.org",
                description="Testing environment",
                type="test",
                status="active",
                subordinate_count=1,
                config_json=json.dumps({"admin_api_base_url": "http://localhost:8765"}),
                jwks=None,
            ),
        ]
        db.add_all(trust_anchors)

        # ── Tenants (mirror of trust_anchors for new data model) ──────────
        tenants = [
            Tenant(
                id="tenant-1",
                entity_id="http://localhost:8080",
                name="LightHouse",
                status="active",
                admin_api_base_url="http://lighthouse:8080",
            ),
            Tenant(
                id="tenant-2",
                entity_id="https://ta.test.org",
                name="Test Federation",
                status="active",
                admin_api_base_url="http://localhost:8765",
            ),
        ]
        db.add_all(tenants)

        db.commit()
    finally:
        db.close()
