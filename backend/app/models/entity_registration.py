from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class EntityRegistration(Base):
    """
    Tracks the full lifecycle of an entity joining the federation through
    this gateway — from initial submission to operator approval to Admin
    API synchronization.

    The legacy `subordinates` table is kept read-only. New registrations
    go here. When the Admin API is ready, the approve handler will call
    the proxy and set admin_api_synced_at.
    """

    __tablename__ = "entity_registrations"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(
        String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entity_id = Column(String, nullable=False, index=True)
    # pending | approved | rejected | active
    status = Column(String, nullable=False, default="pending", index=True)
    registered_entity_types = Column(Text, nullable=False)   # JSON array
    jwks = Column(Text, nullable=True)                        # JSON
    metadata_json = Column("metadata", Text, nullable=True)   # JSON

    display_name = Column(String, nullable=True)

    submitted_by_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    reviewed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)

    # NULL until successfully pushed to the Admin API after approval.
    admin_api_synced_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="registrations")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
