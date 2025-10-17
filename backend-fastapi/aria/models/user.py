"""
User-related database models.

This module defines user, role, and authentication models for the Aria system.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from aria.core.database import Base


# Association table for many-to-many relationship between users and roles - commented out for now
# user_roles = Table(
#     "user_roles",
#     Base.metadata,
#     Column("user_id", String(36), ForeignKey("users.id"), primary_key=True),
#     Column("role_id", String(36), ForeignKey("roles.id"), primary_key=True),
# )


class Role(Base):
    """
    Role model for role-based access control.
    
    Defines different roles that can be assigned to users,
    such as admin, manager, employee, etc.
    """
    
    __tablename__ = "roles"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permissions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string of permissions
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Relationships - simplified for now
    # users: Mapped[List["User"]] = relationship(
    #     "User", 
    #     secondary=user_roles, 
    #     back_populates="roles"
    # )
    
    def __repr__(self) -> str:
        return f"<Role(name={self.name})>"


class User(Base):
    """
    User model for authentication and user management.
    
    Stores user information, authentication details, and preferences.
    """
    
    __tablename__ = "users"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Basic Information
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Authentication
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Profile Information
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Security
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Two-Factor Authentication
    totp_secret: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    backup_codes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of backup codes
    
    # Preferences
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    theme: Mapped[str] = mapped_column(String(20), default="light", nullable=False)
    
    # Relationships - simplified for now
    # roles: Mapped[List[Role]] = relationship(
    #     "Role", 
    #     secondary=user_roles, 
    #     back_populates="users"
    # )
    
    documents: Mapped[List["Document"]] = relationship(
        "Document", 
        back_populates="uploaded_by_user",
        foreign_keys="Document.uploaded_by"
    )
    
    def __repr__(self) -> str:
        return f"<User(username={self.username}, email={self.email})>"
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.is_superuser or any(role.name == "admin" for role in self.roles)
    
    @property
    def role_names(self) -> List[str]:
        """Get list of role names for this user."""
        return [role.name for role in self.roles]


# class UserRole(Base):
#     """
#     User-Role assignment model with additional metadata.
#     
#     This model can store additional information about role assignments,
#     such as when they were granted and by whom.
#     """
#     
#     __tablename__ = "user_role_assignments"
#     
#     user_id: Mapped[str] = mapped_column(
#         UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
#         ForeignKey("users.id"),
#         nullable=False,
#         index=True
#     )
#     role_id: Mapped[str] = mapped_column(
#         UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
#         ForeignKey("roles.id"),
#         nullable=False,
#         index=True
#     )
#     granted_by: Mapped[Optional[str]] = mapped_column(
#         UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
#         ForeignKey("users.id"),
#         nullable=True
#     )
#     granted_at: Mapped[datetime] = mapped_column(
#         DateTime(timezone=True),
#         default=datetime.utcnow,
#         nullable=False
#     )
#     expires_at: Mapped[Optional[datetime]] = mapped_column(
#         DateTime(timezone=True),
#         nullable=True
#     )
#     is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
#     
#     # Relationships
#     user: Mapped[User] = relationship("User", foreign_keys=[user_id])
#     role: Mapped[Role] = relationship("Role", foreign_keys=[role_id])
#     granted_by_user: Mapped[Optional[User]] = relationship("User", foreign_keys=[granted_by])
#     
#     def __repr__(self) -> str:
#         return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"