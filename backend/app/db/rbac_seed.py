"""
RBAC Seed Data

Seeds the database with default roles, permissions, and feature configurations
by parsing the OpenAPI specification. This makes the system truly backend-agnostic
and eliminates hardcoding.
"""

from sqlalchemy.orm import Session
from app.models.rbac import Role, Permission, FeatureConfig
from app.utils.openapi_parser import parse_openapi_spec


def seed_rbac_data(db: Session, spec_path: str = None):
    """
    Seed RBAC data including roles, permissions, and feature configurations.
    This should be called after database initialization.
    
    Args:
        db: Database session
        spec_path: Optional path to OpenAPI spec. If None, uses default location.
    """
    
    # Parse OpenAPI specification to extract features
    parser = parse_openapi_spec(spec_path)
    features_from_oas = parser.get_features()
    
    print(f"📋 Discovered {len(features_from_oas)} features from OpenAPI spec")
    
    # 1. Create feature configurations from OpenAPI spec
    # Backend admin can enable/disable these (HIGH-LEVEL RBAC)
    feature_configs = []
    
    for feature_name, feature_data in features_from_oas.items():
        # Check if feature should be enabled by default
        # You can customize this logic based on your backend capabilities
        enabled = True  # Enable all discovered features by default
        reason = None
        
        # Example: Disable features not yet implemented
        if feature_name in ['authority_hints', 'federation_discovery', 'entity_statements']:
            enabled = False
            reason = "Not implemented in this backend version"
        
        feature_configs.append({
            "feature_name": feature_name,
            "enabled": enabled,
            "reason": reason,
            "operations": feature_data["operations"],
            "config_metadata": {
                "description": feature_data["description"],
                "openapi_path": feature_data["openapi_path"],
                "endpoints": feature_data["endpoints"],
                "tag": feature_data["tag"]
            }
        })
    
    # Create or update feature configurations
    for config_data in feature_configs:
        existing = db.query(FeatureConfig).filter_by(
            feature_name=config_data["feature_name"]
        ).first()
        
        if existing:
            # Update existing (preserve enabled status set by admin)
            existing.operations = config_data["operations"]
            existing.config_metadata = config_data["config_metadata"]
            # Don't override enabled/reason if already set by admin
            if existing.reason is None:
                existing.reason = config_data["reason"]
        else:
            # Create new
            feature_config = FeatureConfig(**config_data)
            db.add(feature_config)
    
    # 2. Generate permissions from ALL features (enabled or not)
    # LOW-LEVEL RBAC: Granular permissions for role assignment
    permissions_data = []
    for config in feature_configs:
        for operation in config["operations"]:
            permissions_data.append({
                "feature": config["feature_name"],
                "operation": operation,
                "description": f"{operation.capitalize()} {config['feature_name'].replace('_', ' ')}"
            })
    
    # Create permissions (avoid duplicates)
    for perm_data in permissions_data:
        existing = db.query(Permission).filter_by(
            feature=perm_data["feature"],
            operation=perm_data["operation"]
        ).first()
        
        if not existing:
            permission = Permission(**perm_data)
            db.add(permission)
    
    db.flush()  # Flush to get IDs for relationships
    
    # 3. Define default roles with their permissions
    # Admins can create custom roles and assign any available permissions
    roles_data = [
        {
            "role_id": "super_admin",
            "name": "Super Administrator",
            "description": "Full system access with all permissions",
            "builtin": True,
            "permissions": "*"  # Special marker for all permissions
        },
        {
            "role_id": "fed_operator",
            "name": "Federation Operator",
            "description": "Can manage all federation entities but not system settings",
            "builtin": True,
            "permissions": [
                ("subordinates", ["list", "view", "create", "update", "delete"]),
                ("trust_anchors", ["list", "view", "create", "update", "delete"]),
                ("trust_marks", ["list", "view", "issue", "revoke"]),
                ("jwks_management", ["list", "create", "rotate"])
            ]
        },
        {
            "role_id": "tech_contact",
            "name": "Technical Contact",
            "description": "Can manage subordinates and view trust configuration",
            "builtin": True,
            "permissions": [
                ("subordinates", ["list", "view", "create", "update"]),
                ("trust_anchors", ["list", "view"]),
                ("trust_marks", ["list", "view"]),
                ("jwks_management", ["list"])
            ]
        },
        {
            "role_id": "viewer",
            "name": "Viewer",
            "description": "Read-only access to federation information",
            "builtin": True,
            "permissions": [
                ("subordinates", ["list", "view"]),
                ("trust_anchors", ["list", "view"]),
                ("trust_marks", ["list", "view"])
            ]
        }
    ]
    
    # Create roles and assign permissions
    for role_data in roles_data:
        existing_role = db.query(Role).filter_by(role_id=role_data["role_id"]).first()
        
        if existing_role:
            # Update existing role
            existing_role.name = role_data["name"]
            existing_role.description = role_data["description"]
            existing_role.builtin = role_data["builtin"]
            role = existing_role
        else:
            # Create new role
            role = Role(
                role_id=role_data["role_id"],
                name=role_data["name"],
                description=role_data["description"],
                builtin=role_data["builtin"]
            )
            db.add(role)
            db.flush()
        
        # Clear existing permissions and reassign
        role.permissions.clear()
        
        # Assign permissions
        if role_data["permissions"] == "*":
            # Super admin gets all permissions
            all_permissions = db.query(Permission).all()
            role.permissions.extend(all_permissions)
        else:
            # Add specific permissions
            for feature, operations in role_data["permissions"]:
                for operation in operations:
                    permission = db.query(Permission).filter_by(
                        feature=feature,
                        operation=operation
                    ).first()
                    if permission and permission not in role.permissions:
                        role.permissions.append(permission)
    
    db.commit()
    print("✅ RBAC data seeded successfully from OpenAPI specification")
    print(f"   - Features: {len(feature_configs)}")
    print(f"   - Permissions: {len(permissions_data)}")
    print(f"   - Roles: {len(roles_data)}")


def get_feature_permissions(db: Session, feature_name: str) -> list[Permission]:
    """Get all permissions for a specific feature"""
    return db.query(Permission).filter_by(feature=feature_name).all()


def get_role_permissions(db: Session, role_id: str) -> list[Permission]:
    """Get all permissions for a specific role"""
    role = db.query(Role).filter_by(role_id=role_id).first()
    return list(role.permissions) if role else []
