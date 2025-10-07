"""
User related database models
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel


# Association table for many-to-many relationship between users and roles
user_roles = Table(
    'user_roles',
    BaseModel.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

# Association table for many-to-many relationship between roles and permissions
role_permissions = Table(
    'role_permissions',
    BaseModel.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)


class User(BaseModel):
    """User model"""
    __tablename__ = "users"
    
    # Basic info
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    phone_number = Column(String(20))
    department = Column(String(100))
    job_title = Column(String(100))
    
    # Authentication
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    
    # Preferences
    email_notifications = Column(Boolean, default=True)
    slack_notifications = Column(Boolean, default=False)
    language = Column(String(10), default='en')
    timezone = Column(String(50), default='UTC')
    theme = Column(String(20), default='light')
    
    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    documents = relationship("Document", foreign_keys="[Document.uploaded_by]", back_populates="uploaded_by_user")
    
    @hybrid_property
    def role_names(self):
        """Get list of role names for this user"""
        return [role.name for role in self.roles]
    
    def has_permission(self, permission_name: str) -> bool:
        """Check if user has a specific permission"""
        for role in self.roles:
            for permission in role.permissions:
                if permission.name == permission_name:
                    return True
        return self.is_superuser
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has a specific role"""
        return role_name in self.role_names or self.is_superuser


class Role(BaseModel):
    """Role model"""
    __tablename__ = "roles"
    
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    
    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(BaseModel):
    """Permission model"""
    __tablename__ = "permissions"
    
    name = Column(String(100), unique=True, nullable=False)
    resource = Column(String(50), nullable=False)  # e.g., 'document', 'user'
    action = Column(String(50), nullable=False)    # e.g., 'read', 'write', 'delete'
    description = Column(Text)
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


# For backward compatibility
UserRole = user_roles