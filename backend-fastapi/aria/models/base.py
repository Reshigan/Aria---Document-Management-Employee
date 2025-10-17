"""
Base model class with common fields and functionality.

This module provides a base model class that all other models inherit from,
ensuring consistent timestamps and common functionality across all models.
"""

from datetime import datetime
from typing import Any, Dict
from uuid import uuid4

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.sql import func


@as_declarative()
class BaseModel:
    """
    Base model class with common fields.
    
    All models inherit from this class to get:
    - UUID primary key
    - Created and updated timestamps
    - Consistent table naming
    """
    
    # Generate table name from class name
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"
    
    # Primary key as UUID
    id = Column(
        UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
        primary_key=True,
        default=uuid4,
        index=True,
    )
    
    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True,
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert model instance to dictionary.
        
        Returns:
            Dict containing all model fields
        """
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def update_from_dict(self, data: Dict[str, Any]) -> None:
        """
        Update model instance from dictionary.
        
        Args:
            data: Dictionary containing field updates
        """
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        """String representation of the model."""
        return f"<{self.__class__.__name__}(id={self.id})>"