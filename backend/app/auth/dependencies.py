from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.db.database import get_db
from app.auth.security import decode_access_token
from app.models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def user_has_permission(user: User, feature: str, operation: str) -> bool:
    """
    Check whether a user has a given feature/operation permission.

    RBAC behavior:
    - evaluate assigned role permissions only
    """
    def _normalize(name: str) -> str:
        value = name.replace('-', '_').strip().lower()
        return value

    def _feature_matches(candidate: str, required: str) -> bool:
        c = _normalize(candidate)
        r = _normalize(required)
        if c == r:
            return True
        # naive singular/plural compatibility for feature ids
        if c.endswith('s') and c[:-1] == r:
            return True
        if r.endswith('s') and r[:-1] == c:
            return True
        return False

    for role in getattr(user, "roles", []) or []:
        for permission in getattr(role, "permissions", []) or []:
            if _feature_matches(permission.feature, feature) and permission.operation == operation:
                return True
            if _feature_matches(permission.feature, feature) and permission.operation == "*":
                return True
            if permission.feature == "*" and permission.operation == "*":
                return True

    return False


def require_permission(feature: str, operation: str):
    def _require_permission(current_user: User = Depends(get_current_user)) -> User:
        if user_has_permission(current_user, feature, operation):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {feature}:{operation}",
        )

    return _require_permission
