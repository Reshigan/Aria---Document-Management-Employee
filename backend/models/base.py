"""
Base model for all database models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, func, text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class BaseModel(Base):
    """
    Base model with common fields
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=text("(datetime('now'))"), nullable=False)
    updated_at = Column(DateTime, server_default=text("(datetime('now'))"), onupdate=datetime.utcnow, nullable=False)