from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text

from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False, index=True)
    resource_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
