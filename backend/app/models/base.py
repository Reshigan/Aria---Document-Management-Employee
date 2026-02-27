"""
ARIA ERP - Base Model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from .types import GUID
from core.database import Base


class BaseModel(Base):
    """Base model with common fields"""
    
    __abstract__ = True
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
