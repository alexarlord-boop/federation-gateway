from pydantic import BaseModel
from typing import Optional


class InstanceSummary(BaseModel):
    id: str
    name: str
    public_base_url: str
    admin_base_url: str
    public_port: Optional[int] = None
    admin_port: Optional[int] = None
    deployment_managed: bool = True
    selected_by_default: bool = False


class InstanceRegistryResponse(BaseModel):
    instances: list[InstanceSummary]
