from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Tenant(Base):
    """
    A federation node managed through this gateway.

    Replaces the dual-purpose TrustAnchor for the registration/proxy
    workflow. TrustAnchor is kept for backward-compat and the
    TrustAnchorContext in the UI; new code should write here.
    """

    __tablename__ = "tenants"

    id = Column(String, primary_key=True, index=True)
    entity_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    # active | suspended | pending
    status = Column(String, nullable=False, default="active")
    # URL of the Federation Admin API instance for this tenant.
    # NULL means the Admin API is not yet deployed/configured.
    admin_api_base_url = Column(String, nullable=True)
    # Optional bearer token / API key forwarded to the upstream Admin API.
    # Stored in plaintext for now; encrypt with Fernet when moving to prod.
    admin_api_key = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tech_contacts = relationship(
        "TechContact",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    registrations = relationship(
        "EntityRegistration",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
