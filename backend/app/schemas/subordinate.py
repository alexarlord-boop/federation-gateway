from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, List, Optional


class SubordinateBase(BaseModel):
    entity_id: str
    status: str
    registered_entity_types: List[str] = Field(default_factory=list)
    jwks: Optional[Any] = None
    metadata: Optional[Any] = None
    description: Optional[str] = None


class SubordinateCreate(SubordinateBase):
    pass


class SubordinateUpdateStatus(BaseModel):
    status: str


class SubordinateResponse(SubordinateBase):
    id: str

    class Config:
        from_attributes = True
