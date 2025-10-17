"""Chat models for AI bot interactions."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, 
    JSON, String, Text
)
from sqlalchemy.orm import relationship

from aria.core.database import Base


class MessageType(enum.Enum):
    """Message type enumeration."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class SessionType(enum.Enum):
    """Chat session type enumeration."""
    GENERAL = "general"
    DOCUMENT_ANALYSIS = "document_analysis"
    SUPPORT = "support"


class ChatSession(Base):
    """Chat session model."""
    
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    session_type = Column(Enum(SessionType), default=SessionType.GENERAL, nullable=False)
    
    # Session metadata
    is_active = Column(Boolean, default=True, nullable=False)
    context = Column(JSON, nullable=True)  # Session context and settings
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_message_at = Column(DateTime, nullable=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, title='{self.title}')>"
    
    @property
    def message_count(self) -> int:
        """Get number of messages in session."""
        return len(self.messages) if self.messages else 0
    
    def to_dict(self) -> dict:
        """Convert chat session to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "is_active": self.is_active,
            "context": self.context,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
            "user_id": self.user_id,
            "message_count": self.message_count,
        }


class ChatMessage(Base):
    """Chat message model."""
    
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), nullable=False)
    
    # Message metadata
    msg_metadata = Column(JSON, nullable=True)  # Additional message data
    tokens_used = Column(Integer, nullable=True)  # For AI responses
    processing_time = Column(Integer, nullable=True)  # Processing time in milliseconds
    
    # Document references
    referenced_documents = Column(JSON, nullable=True)  # List of document IDs
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign keys
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, type='{self.message_type.value}', session_id={self.session_id})>"
    
    @property
    def is_user_message(self) -> bool:
        """Check if message is from user."""
        return self.message_type == MessageType.USER
    
    @property
    def is_assistant_message(self) -> bool:
        """Check if message is from assistant."""
        return self.message_type == MessageType.ASSISTANT
    
    @property
    def content_preview(self) -> str:
        """Get content preview (first 100 characters)."""
        return self.content[:100] + "..." if len(self.content) > 100 else self.content
    
    def to_dict(self) -> dict:
        """Convert chat message to dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "message_type": self.message_type.value,
            "metadata": self.msg_metadata,
            "tokens_used": self.tokens_used,
            "processing_time": self.processing_time,
            "referenced_documents": self.referenced_documents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "session_id": self.session_id,
        }