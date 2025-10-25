"""
Conversation and Bot Message Models
"""
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base

class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"

class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Conversation(Base):
    """AI Bot Conversations"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bot_template_id = Column(String, nullable=True)
    title = Column(String(255), nullable=True)
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    metadata = Column(JSON, default=dict)
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    user = relationship("User", back_populates="conversations")

class Message(Base):
    """Conversation Messages"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(SQLEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    tokens = Column(Integer, default=0)
    model = Column(String(100), nullable=True)
    provider = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON, default=dict)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

class BotUsageStats(Base):
    """Bot Usage Statistics"""
    __tablename__ = "bot_usage_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bot_template_id = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    message_count = Column(Integer, default=0)
    token_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    avg_response_time = Column(Float, default=0.0)
    
    # Relationships
    user = relationship("User")
