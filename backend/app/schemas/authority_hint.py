from __future__ import annotations

from pydantic import BaseModel
from typing import Optional


class AuthorityHintCreate(BaseModel):
    entity_id: str
    description: Optional[str] = None


class AuthorityHintResponse(BaseModel):
    id: str
    entity_id: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
