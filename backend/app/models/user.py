from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Legacy - kept for backwards compat
    password_hash = Column(String, nullable=False)
    organization_id = Column(String, nullable=True)    # Legacy
    organization_name = Column(String, nullable=True)  # Legacy
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # OIDC identity — NULL for credentials-only users
    oidc_sub = Column(String, nullable=True, index=True)
    oidc_issuer = Column(String, nullable=True)

    # Gateway-level operator: bypasses TechContact scope checks
    is_operator = Column(Boolean, nullable=False, default=False)

    # RBAC relationships
    roles = relationship("Role", secondary="user_roles", back_populates="users")
