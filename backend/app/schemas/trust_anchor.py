from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class TrustAnchorCreate(BaseModel):
    name: str
    entity_id: str
    description: Optional[str] = None
    type: str
    status: str = "active"
    admin_api_base_url: Optional[str] = None


class TrustAnchorResponse(BaseModel):
    id: str
    name: str
    entity_id: str
    description: Optional[str] = None
    type: str
    status: str
    subordinate_count: int = 0
    admin_api_base_url: Optional[str] = None
    deployment_managed: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class TrustAnchorConfig(BaseModel):
    organization_name: Optional[str] = None
    homepage_uri: Optional[str] = None
    contacts: Optional[List[str]] = None
    admin_api_base_url: Optional[str] = None
    jwks: Optional[Dict[str, Any]] = None
