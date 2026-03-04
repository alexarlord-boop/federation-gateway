"""
Per-instance data models

Stores Keys/KMS, Constraints, Crit Operators, and Metadata Policies
for each federation instance (trust anchor) locally in the gateway DB.
These are served by local routers mounted *before* the proxy catch-all,
so they shadow any upstream endpoint that may not be implemented.
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, UniqueConstraint
from app.db.database import Base


class InstancePublicKey(Base):
    __tablename__ = "instance_public_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    instance_id = Column(String, nullable=False, index=True)
    kid = Column(String, nullable=False)
    key_json = Column(Text, nullable=False)   # full JWK as JSON string
    iat = Column(Integer, nullable=True)
    nbf = Column(Integer, nullable=True)
    exp = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("instance_id", "kid", name="uq_instance_key_kid"),
    )


class InstanceKmsConfig(Base):
    """One row per instance — upserted on first access."""
    __tablename__ = "instance_kms_config"

    instance_id = Column(String, primary_key=True)
    alg = Column(String, nullable=False, default="ES256")
    rsa_key_length = Column(Integer, nullable=True, default=2048)
    auto_rotate = Column(Boolean, nullable=False, default=False)
    rotation_interval_seconds = Column(Integer, nullable=True, default=2592000)


class InstanceConstraints(Base):
    """One row per instance — upserted on first access."""
    __tablename__ = "instance_constraints"

    instance_id = Column(String, primary_key=True)
    max_path_length = Column(Integer, nullable=True)
    naming_constraints_json = Column(Text, nullable=True)    # JSON: {permitted:[…], excluded:[…]}
    allowed_entity_types_json = Column(Text, nullable=True)  # JSON: ["openid_rp", …]


class InstanceCritOperator(Base):
    __tablename__ = "instance_crit_operators"

    id = Column(Integer, primary_key=True, autoincrement=True)
    instance_id = Column(String, nullable=False, index=True)
    operator = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("instance_id", "operator", name="uq_instance_crit_op"),
    )


class InstanceMetadataPolicies(Base):
    """One row per instance storing the full policies JSON blob."""
    __tablename__ = "instance_metadata_policies"

    instance_id = Column(String, primary_key=True)
    policies_json = Column(Text, nullable=False, default="{}")
