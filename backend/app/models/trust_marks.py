"""SQLAlchemy models for Federation Trust Marks."""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.database import Base

# ── Many-to-many association tables ────────────────────────────────────────────

type_issuer_association = Table(
    "trust_mark_type_issuers",
    Base.metadata,
    Column("type_id", Integer, ForeignKey("trust_mark_types.id"), primary_key=True),
    Column("issuer_id", Integer, ForeignKey("trust_mark_issuers.id"), primary_key=True),
)

type_owner_association = Table(
    "trust_mark_type_owners",
    Base.metadata,
    Column("type_id", Integer, ForeignKey("trust_mark_types.id"), primary_key=True),
    Column("owner_id", Integer, ForeignKey("trust_mark_owners.id"), primary_key=True),
)


# ── Core entities ───────────────────────────────────────────────────────────────

class TrustMarkType(Base):
    __tablename__ = "trust_mark_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    identifier = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    logo_uri = Column(String, nullable=True)
    ref = Column(String, nullable=True)

    issuers = relationship(
        "TrustMarkIssuer",
        secondary=type_issuer_association,
        back_populates="types",
    )
    owners = relationship(
        "TrustMarkOwner",
        secondary=type_owner_association,
        back_populates="types",
    )
    issuance_specs = relationship("TrustMarkSpec", back_populates="trust_mark_type", cascade="all, delete-orphan")


class TrustMarkIssuer(Base):
    __tablename__ = "trust_mark_issuers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    issuer = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)

    types = relationship(
        "TrustMarkType",
        secondary=type_issuer_association,
        back_populates="issuers",
    )


class TrustMarkOwner(Base):
    __tablename__ = "trust_mark_owners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)

    types = relationship(
        "TrustMarkType",
        secondary=type_owner_association,
        back_populates="owners",
    )


# ── Issuance Spec & Subjects ────────────────────────────────────────────────────

class TrustMarkSpec(Base):
    __tablename__ = "trust_mark_specs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trust_mark_type_id = Column(Integer, ForeignKey("trust_mark_types.id"), nullable=True)
    trust_mark_id = Column(String, nullable=True)  # URI identifier
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    lifetime_seconds = Column(Integer, nullable=True)
    enabled = Column(Integer, default=1)  # 1=True, 0=False

    trust_mark_type = relationship("TrustMarkType", back_populates="issuance_specs")
    subjects = relationship("TrustMarkSubject", back_populates="spec", cascade="all, delete-orphan")


class TrustMarkSubject(Base):
    __tablename__ = "trust_mark_subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spec_id = Column(Integer, ForeignKey("trust_mark_specs.id"), nullable=False)
    subject = Column(String, nullable=False)
    status = Column(String, default="active")  # active / suspended / revoked
    organization = Column(String, nullable=True)
    extra_claims = Column(Text, nullable=True)  # JSON blob

    spec = relationship("TrustMarkSpec", back_populates="subjects")
