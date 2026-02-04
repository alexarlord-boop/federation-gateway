from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class Subordinate(Base):
    __tablename__ = "subordinates"

    id = Column(String, primary_key=True, index=True)
    entity_id = Column(String, index=True, nullable=False)
    status = Column(String, index=True, nullable=False)
    registered_entity_types = Column(Text, nullable=False)
    jwks = Column(Text, nullable=True)
    metadata_json = Column("metadata", Text, nullable=True)
    owner_id = Column(String, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
