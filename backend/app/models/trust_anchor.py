from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from app.db.database import Base


class TrustAnchor(Base):
    __tablename__ = "trust_anchors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    description = Column(String, nullable=True)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    subordinate_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
