from __future__ import annotations

from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    id: str
    email: str
    name: str
    role: str
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: AuthUser


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
