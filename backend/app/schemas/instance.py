from pydantic import BaseModel


class InstanceSummary(BaseModel):
    id: str
    name: str
    public_base_url: str
    admin_base_url: str
    deployment_managed: bool = True
    selected_by_default: bool = False


class InstanceRegistryResponse(BaseModel):
    instances: list[InstanceSummary]
