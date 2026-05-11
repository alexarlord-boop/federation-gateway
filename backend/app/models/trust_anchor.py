from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.sql import func
from app.db.database import Base


class TrustAnchor(Base):
    __tablename__ = "trust_anchors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # unique=True is enforced automatically only on fresh databases created via
    # create_all. Existing deployments upgraded in-place do NOT gain this DB-level
    # constraint without an explicit ALTER TABLE / migration step.
    entity_id = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    # DEPRECATED: this column is no longer written or read for business logic;
    # subordinate counts are derived live from EntityRegistration joins.
    # Remove via a dedicated migration once all existing deployments are confirmed
    # to no longer reference this column directly.
    subordinate_count = Column(Integer, default=0)
    config_json = Column(Text, nullable=True)
    jwks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
