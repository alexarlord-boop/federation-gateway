import base64

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.db.database import get_db
from app.models.user import User
from app.schemas.instance import InstanceSummary, InstanceRegistryResponse
from app.utils.capability_probe import probe_instance_capabilities

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


@router.post("/{instance_id}/capabilities/refresh")
async def refresh_instance_capabilities(
    instance_id: str,
    request: Request,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """Live-probe this instance's safe (read-only) endpoints and update the
    capability manifest returned by GET /api/v1/capabilities?instance_id=...
    Same permission as toggling features — this is an admin/discovery action."""
    match = next((item for item in get_instance_registry(request) if item.id == instance_id), None)
    if match is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instance '{instance_id}' not found in the registry",
        )

    basic_credentials = None
    if match.admin_auth is not None:
        raw = f"{match.admin_auth.username}:{match.admin_auth.password}".encode()
        basic_credentials = base64.b64encode(raw).decode()

    results = await probe_instance_capabilities(
        db, instance_id, str(match.admin_base_url), basic_credentials,
    )
    return {"instance_id": instance_id, "probed": results}
