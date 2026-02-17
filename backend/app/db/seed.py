from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.models.trust_anchor import TrustAnchor
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
                name="Local Federation",
                entity_id="https://ta.local.org",
                description="Primary federation instance",
                type="federation",
                status="active",
                subordinate_count=3,
                config_json=json.dumps({"admin_api_base_url": "http://localhost:8765"}),
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

        db.commit()
    finally:
        db.close()
