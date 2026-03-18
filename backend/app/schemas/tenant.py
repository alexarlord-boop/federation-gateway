from __future__ import annotations

from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class TenantBase(BaseModel):
    entity_id: str
    name: str
    status: str = "active"
    admin_api_base_url: Optional[str] = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    admin_api_base_url: Optional[str] = None
    admin_api_key: Optional[str] = None


class TenantResponse(TenantBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
