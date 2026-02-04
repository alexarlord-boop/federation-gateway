from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    organization_id = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
