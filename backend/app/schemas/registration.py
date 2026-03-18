from __future__ import annotations

from typing import Any, List, Optional
from datetime import datetime
from pydantic import BaseModel


class RegistrationCreate(BaseModel):
    tenant_id: str
    entity_id: str
    registered_entity_types: List[str]
    display_name: Optional[str] = None
    jwks: Optional[Any] = None
    metadata: Optional[Any] = None


class RegistrationReview(BaseModel):
    status: str  # approved | rejected
    notes: Optional[str] = None


class RegistrationResponse(BaseModel):
    id: str
    tenant_id: str
    entity_id: str
    status: str
    registered_entity_types: List[str]
    display_name: Optional[str] = None
    submitted_by_id: Optional[str] = None
    reviewed_by_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    admin_api_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
