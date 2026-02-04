from pydantic import BaseModel
from typing import Optional


class TrustAnchorCreate(BaseModel):
    name: str
    entity_id: str
    description: Optional[str] = None
    type: str
    status: str = "active"


class TrustAnchorResponse(BaseModel):
    id: str
    name: str
    entity_id: str
    description: Optional[str] = None
    type: str
    status: str
    subordinate_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
