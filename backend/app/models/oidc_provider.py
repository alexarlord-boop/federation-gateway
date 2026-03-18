from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.db.database import Base


class OIDCProvider(Base):
    """
    Configuration for an external OpenID Connect Provider that can be used
    to authenticate GatewayUsers. One row per trusted OP.

    The callback route maps (issuer_url, sub) → GatewayUser via
    users.oidc_issuer + users.oidc_sub. After a successful callback the
    gateway issues its own HS256 JWT, so the UI never sees the OP token.
    """

    __tablename__ = "oidc_providers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    issuer_url = Column(String, unique=True, nullable=False, index=True)
    client_id = Column(String, nullable=False)
    # Stored plaintext for dev; encrypt with Fernet env key for prod.
    client_secret = Column(String, nullable=False)
    scopes = Column(String, nullable=False, default="openid email profile")
    enabled = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
