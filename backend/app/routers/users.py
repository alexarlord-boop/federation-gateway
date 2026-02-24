"""
User Management Router

CRUD endpoints for gateway user management.
Admin-only — requires `rbac:manage` permission.
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_permission
from app.auth.security import get_password_hash
from app.db.database import get_db
from app.models.rbac import Role
from app.models.user import User

router = APIRouter(prefix="/api/v1/users", tags=["users"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    status: str = "active"
    created_at: Optional[str] = None
    rbac_roles: List[str] = []


class CreateUserRequest(BaseModel):
    name: str
    email: str
    role: str = "user"  # legacy role field
    organization_name: Optional[str] = None
    password: Optional[str] = None  # auto-generated if omitted


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    organization_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    password: str


class AssignRBACRoleRequest(BaseModel):
    role_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _serialize_user(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=user.organization_name,
        status="active",
        created_at=user.created_at.isoformat() if user.created_at else None,
        rbac_roles=[r.role_id for r in (user.roles or [])],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """List all gateway users."""
    users = db.query(User).order_by(User.name.asc()).all()
    return [_serialize_user(u) for u in users]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """Create a new gateway user."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    password = payload.password or uuid.uuid4().hex[:12]

    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        name=payload.name,
        role=payload.role,
        password_hash=get_password_hash(password),
        organization_name=payload.organization_name,
    )

    # Map legacy role to RBAC role
    role_mapping = {"admin": "super_admin", "user": "tech_contact"}
    rbac_role_id = role_mapping.get(payload.role, "viewer")
    rbac_role = db.query(Role).filter(Role.role_id == rbac_role_id).first()
    if rbac_role:
        user.roles.append(rbac_role)

    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """Get a single user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """Update a user's profile fields (name, organization, legacy role)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.organization_name is not None:
        user.organization_name = payload.organization_name
    if payload.role is not None:
        user.role = payload.role
        # Also update RBAC role to stay in sync
        role_mapping = {"admin": "super_admin", "user": "tech_contact"}
        rbac_role_id = role_mapping.get(payload.role, "viewer")
        rbac_role = db.query(Role).filter(Role.role_id == rbac_role_id).first()
        if rbac_role:
            user.roles.clear()
            user.roles.append(rbac_role)

    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("rbac", "manage")),
):
    """Delete a user. Cannot delete yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return None


@router.put("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: str,
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """Reset a user's password."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(payload.password)
    db.commit()
    return None


@router.put("/{user_id}/rbac-role", response_model=UserOut)
def assign_rbac_role(
    user_id: str,
    payload: AssignRBACRoleRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("rbac", "manage")),
):
    """Replace user's RBAC roles with a single role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.role_id == payload.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="RBAC role not found")

    user.roles.clear()
    user.roles.append(role)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)
