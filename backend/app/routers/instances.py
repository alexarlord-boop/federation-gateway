from fastapi import APIRouter, Request
from app.schemas.instance import InstanceSummary, InstanceRegistryResponse

router = APIRouter(prefix="/api/v1/admin/instances", tags=["instances"])


def get_instance_registry(request: Request):
    """Retrieve the deployment instance registry from app state."""
    return request.app.state.instance_registry.instances


@router.get("", response_model=InstanceRegistryResponse)
def list_instances(request: Request):
    """List all deployment-managed backend instances with sanitized config."""
    instances = [
        InstanceSummary(
            id=item.id,
            name=item.name,
            public_base_url=str(item.public_base_url),
            admin_base_url=str(item.admin_base_url),
            public_port=item.public_port,
            admin_port=item.admin_port,
            deployment_managed=True,
            selected_by_default=False,
        )
        for item in get_instance_registry(request)
    ]
    return InstanceRegistryResponse(instances=instances)
