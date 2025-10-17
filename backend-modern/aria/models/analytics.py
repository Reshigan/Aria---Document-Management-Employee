"""Analytics models for tracking usage and performance."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, DateTime, Enum, Float, ForeignKey, Integer, 
    JSON, String, Text
)
from sqlalchemy.orm import relationship

from aria.core.database import Base


class ActivityType(enum.Enum):
    """User activity type enumeration."""
    LOGIN = "login"
    LOGOUT = "logout"
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_VIEW = "document_view"
    DOCUMENT_DOWNLOAD = "document_download"
    DOCUMENT_DELETE = "document_delete"
    CHAT_START = "chat_start"
    CHAT_MESSAGE = "chat_message"
    SEARCH = "search"
    SETTINGS_UPDATE = "settings_update"


class DocumentAnalytics(Base):
    """Document analytics model."""
    
    __tablename__ = "document_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # View statistics
    view_count = Column(Integer, default=0, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    share_count = Column(Integer, default=0, nullable=False)
    
    # Processing metrics
    processing_time_ms = Column(Integer, nullable=True)
    ocr_accuracy = Column(Float, nullable=True)
    ai_processing_time_ms = Column(Integer, nullable=True)
    
    # Search and discovery
    search_hits = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Performance metrics
    average_rating = Column(Float, nullable=True)
    feedback_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Foreign keys
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Relationships
    document = relationship("Document", back_populates="analytics")
    
    def __repr__(self) -> str:
        return f"<DocumentAnalytics(id={self.id}, document_id={self.document_id}, views={self.view_count})>"
    
    @property
    def total_interactions(self) -> int:
        """Get total interactions with document."""
        return self.view_count + self.download_count + self.share_count
    
    def to_dict(self) -> dict:
        """Convert document analytics to dictionary."""
        return {
            "id": self.id,
            "view_count": self.view_count,
            "download_count": self.download_count,
            "share_count": self.share_count,
            "processing_time_ms": self.processing_time_ms,
            "ocr_accuracy": self.ocr_accuracy,
            "ai_processing_time_ms": self.ai_processing_time_ms,
            "search_hits": self.search_hits,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            "average_rating": self.average_rating,
            "feedback_count": self.feedback_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "document_id": self.document_id,
            "total_interactions": self.total_interactions,
        }


class UserActivity(Base):
    """User activity tracking model."""
    
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(Enum(ActivityType), nullable=False)
    
    # Activity details
    description = Column(String(500), nullable=True)
    activity_metadata = Column(JSON, nullable=True)  # Additional activity data
    
    # Context information
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    session_id = Column(String(255), nullable=True)
    
    # Performance metrics
    duration_ms = Column(Integer, nullable=True)  # Activity duration
    success = Column(Integer, default=1, nullable=False)  # 1 for success, 0 for failure
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # Optional document reference
    
    # Relationships
    user = relationship("User", back_populates="activities")
    
    def __repr__(self) -> str:
        return f"<UserActivity(id={self.id}, user_id={self.user_id}, type='{self.activity_type.value}')>"
    
    @property
    def is_successful(self) -> bool:
        """Check if activity was successful."""
        return self.success == 1
    
    def to_dict(self) -> dict:
        """Convert user activity to dictionary."""
        return {
            "id": self.id,
            "activity_type": self.activity_type.value,
            "description": self.description,
            "metadata": self.activity_metadata,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "session_id": self.session_id,
            "duration_ms": self.duration_ms,
            "success": self.success,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id,
            "document_id": self.document_id,
            "is_successful": self.is_successful,
        }