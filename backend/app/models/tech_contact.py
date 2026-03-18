from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class TechContact(Base):
    """
    Links a GatewayUser to a Tenant with a specific role.

    A user with is_operator=True has cross-tenant access regardless
    of this table. Non-operator users can only access tenants where
    they appear as a TechContact.
    """

    __tablename__ = "tech_contacts"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # owner | admin | readonly
    role = Column(String, nullable=False, default="admin")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_tech_contact_tenant_user"),
    )

    tenant = relationship("Tenant", back_populates="tech_contacts")
    user = relationship("User")
