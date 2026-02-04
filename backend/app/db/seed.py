import json
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.models.trust_anchor import TrustAnchor
from app.models.subordinate import Subordinate
from app.models.authority_hint import AuthorityHint
from app.auth.security import get_password_hash


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
            ),
            TrustAnchor(
                id="ta-2",
                name="Test Federation",
                entity_id="https://ta.test.org",
                description="Testing environment",
                type="federation",
                status="active",
                subordinate_count=1,
            ),
        ]
        db.add_all(trust_anchors)

        subordinates = [
            Subordinate(
                id="sub-1",
                entity_id="https://idp.example.edu",
                status="active",
                description="Example Intermediate Authority",
                registered_entity_types=json.dumps(["openid_provider", "federation_entity"]),
                jwks=json.dumps({"keys": []}),
                metadata_json=json.dumps({
                    "openid_provider": {"organization_name": "Example University"},
                    "federation_entity": {"organization_name": "Example University"},
                }),
                owner_id="1",
            ),
            Subordinate(
                id="sub-2",
                entity_id="https://ia.example.org",
                status="draft",
                registered_entity_types=json.dumps(["federation_entity"]),
                jwks=json.dumps({"keys": []}),
                metadata_json=json.dumps({
                    "federation_entity": {"organization_name": "Example IA"},
                }),
                owner_id="1",
            ),
        ]
        db.add_all(subordinates)

        authority_hints = [
            AuthorityHint(id="ah-1", entity_id="https://edugain.org", description="eduGAIN Interfederation"),
        ]
        db.add_all(authority_hints)

        db.commit()
    finally:
        db.close()
