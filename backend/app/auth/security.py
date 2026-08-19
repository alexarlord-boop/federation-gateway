from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
import os

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


OIDC_STATE_EXPIRE_MINUTES = 5


def create_oidc_state_token(data: dict) -> str:
    """Signed, short-lived carrier for OIDC `state` — provider_id, nonce,
    and PKCE code_verifier, self-contained so no server-side session store
    is needed. Distinct `type` from access/refresh tokens so one can't be
    replayed as the other."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=OIDC_STATE_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "oidc_state"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_oidc_state_token(token: str) -> dict:
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if claims.get("type") != "oidc_state":
        raise JWTError("Not an OIDC state token")
    return claims
