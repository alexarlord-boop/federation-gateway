from __future__ import annotations

from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class TechContactCreate(BaseModel):
    user_id: str
    role: str = "admin"  # owner | admin | readonly


class TechContactUpdate(BaseModel):
    role: str


class TechContactResponse(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    role: str
    created_at: Optional[datetime] = None
    # Denormalised from the related User for convenience in the UI
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
