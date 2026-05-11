from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.sql import func
from app.db.database import Base


class TrustAnchor(Base):
    __tablename__ = "trust_anchors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # entity_id is treated as unique: the subordinate-count logic keys on it.
    # New databases get the constraint via create_all; existing deployments should
    # ensure no duplicate entity_id rows are present.
    entity_id = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    subordinate_count = Column(Integer, default=0)
    config_json = Column(Text, nullable=True)
    jwks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
