"""
ARIA ERP - User & Role Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from .types import GUID, JSONType
from sqlalchemy.orm import relationship
from .base import BaseModel


class User(BaseModel):
    """User model"""
    
    __tablename__ = "users"
    
    # Company relationship
    company_id = Column(GUID, ForeignKey("companies.id"))
    company = relationship("Company", back_populates="users")
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Personal info
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(50))
    avatar_url = Column(Text)
    
    # Role & Permissions
    role = Column(String(50), default="user")  # admin, manager, user, viewer
    department = Column(String(100))
    job_title = Column(String(100))
    
    # Settings
    language = Column(String(10), default="en")
    theme = Column(String(20), default="light")
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    
    # Status
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    last_login_ip = Column(String(45))
    email_verified_at = Column(DateTime)
    
    @property
    def full_name(self):
        """Get full name"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def __repr__(self):
        return f"<User {self.email}>"


class Role(BaseModel):
    """Role model for RBAC"""
    
    __tablename__ = "roles"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    permissions = Column(JSONType)  # {"financial": ["read", "write"], "crm": ["read"]}
    is_system_role = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Role {self.name}>"
