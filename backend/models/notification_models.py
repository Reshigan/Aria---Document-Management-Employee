from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
import enum


class NotificationType(str, enum.Enum):
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_APPROVED = "DOCUMENT_APPROVED"
    DOCUMENT_REJECTED = "DOCUMENT_REJECTED"
    WORKFLOW_STARTED = "WORKFLOW_STARTED"
    WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_COMPLETED = "TASK_COMPLETED"
    TASK_OVERDUE = "TASK_OVERDUE"
    SYSTEM_ALERT = "SYSTEM_ALERT"
    USER_MENTION = "USER_MENTION"
    COMMENT_ADDED = "COMMENT_ADDED"
    DEADLINE_REMINDER = "DEADLINE_REMINDER"


class NotificationPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class NotificationChannel(str, enum.Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"
    WEBHOOK = "WEBHOOK"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    
    # User relationships
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Status tracking
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Related entities
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("workflow_tasks.id"), nullable=True)
    
    # Metadata
    notification_metadata = Column(Text, nullable=True)  # JSON string for additional data
    action_url = Column(String(500), nullable=True)  # URL for notification action
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    scheduled_at = Column(DateTime, nullable=True)  # For scheduled notifications
    expires_at = Column(DateTime, nullable=True)  # For expiring notifications
    
    # Relationships
    # Relationship removed to avoid SQLAlchemy configuration errors with User model
    # recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_notifications")
    # sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_notifications")
    document = relationship("Document", back_populates="notifications")
    workflow = relationship("Workflow", back_populates="notifications")
    task = relationship("WorkflowTask", back_populates="notifications")
    
    # Delivery tracking
    delivery_attempts = relationship("NotificationDelivery", back_populates="notification", cascade="all, delete-orphan")


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    # Delivery status
    status = Column(String(50), default="PENDING")  # PENDING, SENT, DELIVERED, FAILED, BOUNCED
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    
    # Delivery details
    delivered_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Channel-specific data
    email_address = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    webhook_url = Column(String(500), nullable=True)
    push_token = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    next_attempt_at = Column(DateTime, nullable=True)
    
    # Relationships
    notification = relationship("Notification", back_populates="delivery_attempts")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    # Template content
    subject_template = Column(String(255), nullable=True)  # For email/SMS
    body_template = Column(Text, nullable=False)
    html_template = Column(Text, nullable=True)  # For email HTML
    
    # Template settings
    is_active = Column(Boolean, default=True)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    
    # Metadata
    variables = Column(Text, nullable=True)  # JSON string of available variables
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    # Preference settings
    is_enabled = Column(Boolean, default=True)
    minimum_priority = Column(Enum(NotificationPriority), default=NotificationPriority.LOW)
    
    # Schedule settings
    quiet_hours_start = Column(String(5), nullable=True)  # HH:MM format
    quiet_hours_end = Column(String(5), nullable=True)    # HH:MM format
    timezone = Column(String(50), default="UTC")
    
    # Frequency settings
    digest_frequency = Column(String(20), nullable=True)  # IMMEDIATE, HOURLY, DAILY, WEEKLY
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    # Relationship removed to avoid SQLAlchemy configuration errors with User model
    # user = relationship("User", back_populates="notification_preferences")


class NotificationSubscription(Base):
    __tablename__ = "notification_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Subscription target
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    
    # Subscription settings
    is_active = Column(Boolean, default=True)
    notification_types = Column(Text, nullable=True)  # JSON array of notification types
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    # Relationship removed to avoid SQLAlchemy configuration errors with User model
    # user = relationship("User", back_populates="notification_subscriptions")
    document = relationship("Document", back_populates="notification_subscriptions")
    workflow = relationship("Workflow", back_populates="notification_subscriptions")
