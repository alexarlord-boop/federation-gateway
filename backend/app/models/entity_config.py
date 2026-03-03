from sqlalchemy import Column, String, Integer, Text
from app.db.database import Base


class EntityConfigTrustMark(Base):
    __tablename__ = "entity_config_trust_marks"

    id = Column(String, primary_key=True, index=True)
    trust_mark_type = Column(String, nullable=True)
    trust_mark_issuer = Column(String, nullable=True)
    trust_mark = Column(Text, nullable=True)  # raw JWT


class EntityConfigAdditionalClaim(Base):
    __tablename__ = "entity_config_additional_claims"

    id = Column(String, primary_key=True, index=True)
    claim_key = Column(String, nullable=False)
    claim_value = Column(Text, nullable=False)  # JSON-encoded value


class EntityConfigSetting(Base):
    """Single-row key-value store for scalar entity-config settings (lifetime, metadata JSON)."""
    __tablename__ = "entity_config_settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
