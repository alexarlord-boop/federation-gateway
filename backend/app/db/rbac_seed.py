"""
RBAC Seed Data

Seeds the database with default roles, permissions, and feature configurations
by parsing the OpenAPI specification. This makes the system truly backend-agnostic
and eliminates hardcoding.
"""

from sqlalchemy.orm import Session
from app.models.rbac import Role, Permission, FeatureConfig
from app.models.user import User
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

    # Administrative permission used to manage RBAC itself
    permissions_data.append(
        {
            "feature": "rbac",
            "operation": "manage",
            "description": "Manage roles, permissions, and feature toggles",
        }
    )
    
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
    
    # 3. Define default roles with permissions derived from discovered operations
    # This keeps defaults aligned with varying backend implementations.
    roles_data = [
        {
            "role_id": "super_admin",
            "name": "Super Administrator",
            "description": "Full system access with all permissions",
            "builtin": True,
        },
        {
            "role_id": "fed_operator",
            "name": "Federation Operator",
            "description": "Can manage federation entities but not RBAC administration",
            "builtin": True,
        },
        {
            "role_id": "tech_contact",
            "name": "Technical Contact",
            "description": "Can read most data and update technical configuration",
            "builtin": True,
        },
        {
            "role_id": "viewer",
            "name": "Viewer",
            "description": "Read-only access to federation information",
            "builtin": True,
        },
    ]

    all_permissions = db.query(Permission).all()
    read_ops = {"list", "view", "read"}
    technical_feature_hints = ("subordinate", "key", "entity_configuration")
    
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
        
        # Assign permissions dynamically
        if role.role_id == "super_admin":
            role.permissions.extend(all_permissions)
        elif role.role_id == "fed_operator":
            role.permissions.extend([p for p in all_permissions if p.feature != "rbac"])
        elif role.role_id == "tech_contact":
            role.permissions.extend(
                [
                    p
                    for p in all_permissions
                    if p.feature != "rbac"
                    and (
                        p.operation in read_ops
                        or (
                            p.operation in {"create", "update"}
                            and any(h in p.feature for h in technical_feature_hints)
                        )
                    )
                ]
            )
        elif role.role_id == "viewer":
            role.permissions.extend([p for p in all_permissions if p.feature != "rbac" and p.operation in read_ops])
    
    db.commit()

    # 4. Map legacy users to new RBAC roles if they don't have any role assigned yet
    users = db.query(User).all()
    default_viewer = db.query(Role).filter(Role.role_id == "viewer").first()
    default_admin = db.query(Role).filter(Role.role_id == "super_admin").first()
    default_tech = db.query(Role).filter(Role.role_id == "tech_contact").first()

    for user in users:
        # legacy admin users should be super_admin
        if user.role == "admin":
            if default_admin and default_admin not in user.roles:
                user.roles.clear()
                user.roles.append(default_admin)
            continue

        # legacy standard users should be technical contacts by default
        if user.role == "user":
            if default_tech and default_tech not in user.roles:
                user.roles.clear()
                user.roles.append(default_tech)
            continue

        # unknown legacy roles fall back to viewer
        if not user.roles and default_viewer:
            user.roles.append(default_viewer)

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
