from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    user_id: str
    user_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPage(BaseModel):
    items: List[AuditLogEntry]
    total: int
    page: int
    page_size: int
