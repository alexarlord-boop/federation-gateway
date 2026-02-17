"""
RBAC Database Models

Stores user roles, permissions, and capability configuration.
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base

# Many-to-many: users to roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

# Many-to-many: roles to permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)


class Role(Base):
    """User roles (e.g., super_admin, fed_operator)"""
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(String, unique=True, nullable=False, index=True)  # e.g., "super_admin"
    name = Column(String, nullable=False)  # e.g., "Super Administrator"
    description = Column(String)
    builtin = Column(Boolean, default=False)  # Cannot be deleted if true
    
    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    """Granular permissions (feature + operation)"""
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True, index=True)
    feature = Column(String, nullable=False, index=True)  # e.g., "subordinates"
    operation = Column(String, nullable=False, index=True)  # e.g., "create"
    description = Column(String)
    
    # Unique constraint on feature + operation
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class FeatureConfig(Base):
    """Configuration for which features are enabled"""
    __tablename__ = 'feature_config'

    id = Column(Integer, primary_key=True, index=True)
    feature_name = Column(String, unique=True, nullable=False, index=True)
    enabled = Column(Boolean, default=True)
    reason = Column(String, nullable=True)  # Reason if disabled
    operations = Column(JSON, nullable=True)  # List of enabled operations
    config_metadata = Column(JSON, nullable=True)  # Additional config
