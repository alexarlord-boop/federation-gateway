from pydantic import BaseModel
from typing import Optional, Any


# ── Trust Marks ────────────────────────────────────────────────────────────

class AddTrustMark(BaseModel):
    trust_mark_type: Optional[str] = None
    trust_mark_issuer: Optional[str] = None
    trust_mark: Optional[str] = None  # JWT


class UpdateTrustMark(BaseModel):
    trust_mark_issuer: Optional[str] = None
    trust_mark: Optional[str] = None


class TrustMarkResponse(BaseModel):
    id: str
    trust_mark_type: Optional[str] = None
    trust_mark_issuer: Optional[str] = None
    trust_mark: Optional[str] = None

    class Config:
        from_attributes = True


# ── Additional Claims ──────────────────────────────────────────────────────

class AddAdditionalClaim(BaseModel):
    claim_key: str
    claim_value: Any  # any JSON-serialisable value


class AdditionalClaimResponse(BaseModel):
    id: str
    claim_key: str
    claim_value: Any

    class Config:
        from_attributes = True


# ── Lifetime ───────────────────────────────────────────────────────────────

class LifetimeSeconds(BaseModel):
    lifetime_seconds: int
