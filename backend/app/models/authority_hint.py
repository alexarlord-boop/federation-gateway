from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class AuthorityHint(Base):
    __tablename__ = "authority_hints"

    id = Column(String, primary_key=True, index=True)
    entity_id = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
