"""
Capability Discovery Endpoint

This module implements the /api/v1/capabilities endpoint that allows
the UI to discover what features this backend implementation supports.

This enables:
- Backend-agnostic UI design
- Dynamic feature enabling/disabling
- Automatic RBAC permission generation
- Flexible backend implementations
"""

from fastapi import APIRouter, Depends
from typing import Dict, List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.rbac import Role, Permission, FeatureConfig

router = APIRouter()


class ImplementationInfo(BaseModel):
    """Information about the backend implementation"""
    name: str
    version: str
    vendor: Optional[str] = None


class FeatureCapability(BaseModel):
    """Capability information for a specific feature"""
    enabled: bool
    operations: Optional[List[str]] = None
    endpoints: Optional[List[str]] = None
    reason: Optional[str] = None


class RoleDefinition(BaseModel):
    """Role definition for RBAC"""
    id: str
    name: str
    description: Optional[str] = None
    builtin: bool = False


class RBACInfo(BaseModel):
    """RBAC support information"""
    supported: bool
    roles: Optional[List[RoleDefinition]] = None
    permissions_model: Optional[str] = None


class CapabilityManifest(BaseModel):
    """Complete capability manifest for the backend"""
    version: str
    implementation: ImplementationInfo
    features: Dict[str, FeatureCapability]
    rbac: RBACInfo
    extensions: Optional[Dict[str, bool]] = None


@router.get("/api/v1/capabilities", response_model=CapabilityManifest, tags=["System"])
async def get_capabilities(db: Session = Depends(get_db)):
    """
    Get backend capability manifest.
    
    Returns information about which features and endpoints are supported
    by this backend implementation. The UI uses this to:
    - Enable/disable features dynamically
    - Show/hide navigation items
    - Generate RBAC permission lists
    - Display backend information to operators
    
    This allows the same UI to work with different backend implementations
    that may support different subsets of the full OpenAPI specification.
    
    Now reads from database for dynamic feature configuration and RBAC.
    """
    
    # Get feature configurations from database
    feature_configs = db.query(FeatureConfig).all()
    
    # Build features dict
    features = {}
    for config in feature_configs:
        if config.enabled:
            # Extract endpoints from config_metadata if available
            endpoints = []
            if config.config_metadata and "openapi_path" in config.config_metadata:
                # Generate standard endpoints based on operations
                base_path = config.config_metadata["openapi_path"]
                operation_to_endpoint = {
                    "list": f"GET {base_path}",
                    "create": f"POST {base_path}",
                    "view": f"GET {base_path}/{{id}}",
                    "read": f"GET {base_path}/{{id}}",
                    "update": f"PATCH {base_path}/{{id}}",
                    "delete": f"DELETE {base_path}/{{id}}",
                    "approve": f"POST {base_path}/{{id}}/approve",
                    "issue": f"POST {base_path}/{{id}}/issue",
                    "revoke": f"POST {base_path}/{{id}}/revoke",
                    "rotate": f"POST {base_path}/{{kid}}/rotate"
                }
                for op in config.operations or []:
                    if op in operation_to_endpoint:
                        endpoints.append(operation_to_endpoint[op])
            
            features[config.feature_name] = FeatureCapability(
                enabled=True,
                operations=config.operations or [],
                endpoints=endpoints,
                reason=None
            )
        else:
            features[config.feature_name] = FeatureCapability(
                enabled=False,
                operations=[],
                endpoints=[],
                reason=config.reason
            )
    
    # Get roles from database
    roles_from_db = db.query(Role).all()
    roles = []
    
    for role in roles_from_db:
        # Get permissions for this role
        role_permissions = []
        for permission in role.permissions:
            perm_str = f"{permission.feature}:{permission.operation}"
            if perm_str not in role_permissions:
                role_permissions.append(perm_str)
        
        roles.append(RoleDefinition(
            id=role.role_id,
            name=role.name,
            description=role.description,
            builtin=role.builtin
        ))
    
    return CapabilityManifest(
        version="1.0.0",
        implementation=ImplementationInfo(
            name="FastAPI Reference Implementation",
            version="0.2.0",
            vendor="NREN Federation Gateway"
        ),
        features=features,
        rbac=RBACInfo(
            supported=True,
            roles=roles,
            permissions_model="feature-based"
        ),
        extensions={
            "custom_metadata_fields": True,
            "webhook_notifications": False,
            "audit_logging": True,
            "bulk_operations": False
        }
    )
