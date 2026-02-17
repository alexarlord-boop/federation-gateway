from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_permission
from app.db.database import get_db
from app.models.rbac import FeatureConfig, Permission, Role
from app.models.user import User

router = APIRouter(prefix="/api/v1/rbac", tags=["rbac"])


class PermissionOut(BaseModel):
    id: int
    feature: str
    operation: str
    description: Optional[str] = None


class RoleOut(BaseModel):
    id: int
    role_id: str
    name: str
    description: Optional[str] = None
    builtin: bool
    permissions: List[str]


class CreateRoleRequest(BaseModel):
    role_id: str
    name: str
    description: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AssignPermissionRequest(BaseModel):
    feature: str
    operation: str


class FeatureConfigOut(BaseModel):
    feature_name: str
    enabled: bool
    reason: Optional[str] = None
    operations: List[str]


class UpdateFeatureRequest(BaseModel):
    enabled: bool
    reason: Optional[str] = None


def _serialize_role(role: Role) -> RoleOut:
    return RoleOut(
        id=role.id,
        role_id=role.role_id,
        name=role.name,
        description=role.description,
        builtin=role.builtin,
        permissions=[f"{p.feature}:{p.operation}" for p in role.permissions],
    )


@router.get("/permissions", response_model=List[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    permissions = db.query(Permission).order_by(Permission.feature.asc(), Permission.operation.asc()).all()
    return [
        PermissionOut(
            id=p.id,
            feature=p.feature,
            operation=p.operation,
            description=p.description,
        )
        for p in permissions
    ]


@router.get("/roles", response_model=List[RoleOut])
def list_roles(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    roles = db.query(Role).order_by(Role.name.asc()).all()
    return [_serialize_role(role) for role in roles]


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: CreateRoleRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    existing = db.query(Role).filter(Role.role_id == payload.role_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Role already exists")

    role = Role(
        role_id=payload.role_id,
        name=payload.name,
        description=payload.description,
        builtin=False,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return _serialize_role(role)


@router.patch("/roles/{role_id}", response_model=RoleOut)
def update_role(
    role_id: str,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description

    db.commit()
    db.refresh(role)
    return _serialize_role(role)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.builtin:
        raise HTTPException(status_code=400, detail="Builtin roles cannot be deleted")

    db.delete(role)
    db.commit()
    return None


@router.post("/roles/{role_id}/permissions", response_model=RoleOut)
def assign_permission(
    role_id: str,
    payload: AssignPermissionRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    permission = db.query(Permission).filter(
        Permission.feature == payload.feature,
        Permission.operation == payload.operation,
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    if permission not in role.permissions:
        role.permissions.append(permission)
        db.commit()
        db.refresh(role)

    return _serialize_role(role)


@router.delete("/roles/{role_id}/permissions", response_model=RoleOut)
def remove_permission(
    role_id: str,
    payload: AssignPermissionRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    permission = db.query(Permission).filter(
        Permission.feature == payload.feature,
        Permission.operation == payload.operation,
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    if permission in role.permissions:
        role.permissions.remove(permission)
        db.commit()
        db.refresh(role)

    return _serialize_role(role)


@router.get("/features", response_model=List[FeatureConfigOut])
def list_features(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    configs = db.query(FeatureConfig).order_by(FeatureConfig.feature_name.asc()).all()
    return [
        FeatureConfigOut(
            feature_name=cfg.feature_name,
            enabled=cfg.enabled,
            reason=cfg.reason,
            operations=cfg.operations or [],
        )
        for cfg in configs
    ]


@router.patch("/features/{feature_name}", response_model=FeatureConfigOut)
def update_feature(
    feature_name: str,
    payload: UpdateFeatureRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    config = db.query(FeatureConfig).filter(FeatureConfig.feature_name == feature_name).first()
    if not config:
        raise HTTPException(status_code=404, detail="Feature not found")

    config.enabled = payload.enabled
    config.reason = payload.reason if not payload.enabled else None
    db.commit()
    db.refresh(config)

    return FeatureConfigOut(
        feature_name=config.feature_name,
        enabled=config.enabled,
        reason=config.reason,
        operations=config.operations or [],
    )
