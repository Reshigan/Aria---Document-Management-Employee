from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from .base import Base

class IntegrationType(str, Enum):
    SAP = "sap"
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"
    AWS_S3 = "aws_s3"
    GOOGLE_DRIVE = "google_drive"
    ONEDRIVE = "onedrive"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

class IntegrationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"
    TESTING = "testing"

class WebhookEventType(str, Enum):
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_UPDATED = "document_updated"
    DOCUMENT_DELETED = "document_deleted"
    DOCUMENT_SHARED = "document_shared"
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_COMPLETED = "workflow_completed"
    USER_REGISTERED = "user_registered"
    SECURITY_ALERT = "security_alert"
    SYSTEM_ERROR = "system_error"

class Integration(Base):
    __tablename__ = "integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(SQLEnum(IntegrationType), nullable=False)
    status = Column(SQLEnum(IntegrationStatus), default=IntegrationStatus.INACTIVE)
    description = Column(Text)
    
    # Configuration stored as JSON
    config = Column(JSON, nullable=False, default={})
    
    # Authentication/credentials (encrypted)
    credentials = Column(JSON, default={})
    
    # Connection settings
    endpoint_url = Column(String(500))
    api_version = Column(String(20))
    timeout = Column(Integer, default=30)
    retry_count = Column(Integer, default=3)
    
    # Status tracking
    last_sync = Column(DateTime)
    last_error = Column(Text)
    error_count = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    # Relationship removed to avoid SQLAlchemy configuration errors with User model
    # creator = relationship("User", back_populates="created_integrations")
    sync_logs = relationship("IntegrationSyncLog", back_populates="integration", cascade="all, delete-orphan")
    webhooks = relationship("WebhookEndpoint", back_populates="integration", cascade="all, delete-orphan")

class IntegrationSyncLog(Base):
    __tablename__ = "integration_sync_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    
    # Sync details
    sync_type = Column(String(50), nullable=False)  # full, incremental, manual
    status = Column(String(20), nullable=False)  # success, error, partial
    
    # Statistics
    records_processed = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # Error details
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # Metadata
    triggered_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    integration = relationship("Integration", back_populates="sync_logs")
    triggered_by_user = relationship("User")

class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"))
    
    # Webhook details
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    secret = Column(String(100))  # For signature verification
    
    # Event configuration
    events = Column(JSON, nullable=False, default=[])  # List of WebhookEventType
    
    # Settings
    is_active = Column(Boolean, default=True)
    retry_count = Column(Integer, default=3)
    timeout = Column(Integer, default=30)
    
    # Headers and authentication
    headers = Column(JSON, default={})
    auth_type = Column(String(20))  # none, basic, bearer, custom
    auth_config = Column(JSON, default={})
    
    # Status tracking
    last_triggered = Column(DateTime)
    last_success = Column(DateTime)
    last_error = Column(Text)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    integration = relationship("Integration", back_populates="webhooks")
    creator = relationship("User")
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")

class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    
    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, ForeignKey("webhook_endpoints.id"), nullable=False)
    
    # Delivery details
    event_type = Column(SQLEnum(WebhookEventType), nullable=False)
    payload = Column(JSON, nullable=False)
    
    # Request details
    request_headers = Column(JSON)
    request_body = Column(Text)
    
    # Response details
    response_status = Column(Integer)
    response_headers = Column(JSON)
    response_body = Column(Text)
    
    # Timing
    triggered_at = Column(DateTime, nullable=False)
    delivered_at = Column(DateTime)
    duration_ms = Column(Integer)
    
    # Status
    status = Column(String(20), nullable=False)  # pending, success, failed, retrying
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    
    # Relationships
    webhook = relationship("WebhookEndpoint", back_populates="deliveries")

class SAPConnection(Base):
    __tablename__ = "sap_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    
    # SAP connection details
    system_id = Column(String(10), nullable=False)
    client = Column(String(3), nullable=False)
    host = Column(String(100), nullable=False)
    port = Column(Integer, default=3300)
    
    # Authentication
    username = Column(String(50), nullable=False)
    password_encrypted = Column(String(500))  # Encrypted password
    
    # Connection settings
    language = Column(String(2), default="EN")
    pool_size = Column(Integer, default=5)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_connection = Column(DateTime)
    connection_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    integration = relationship("Integration")

class EmailConfiguration(Base):
    __tablename__ = "email_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    
    # Email server settings
    smtp_host = Column(String(100), nullable=False)
    smtp_port = Column(Integer, default=587)
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    
    # Authentication
    username = Column(String(100), nullable=False)
    password_encrypted = Column(String(500))  # Encrypted password
    
    # Default settings
    from_email = Column(String(100), nullable=False)
    from_name = Column(String(100))
    reply_to = Column(String(100))
    
    # Templates
    templates = Column(JSON, default={})
    
    # Status
    is_active = Column(Boolean, default=True)
    last_test = Column(DateTime)
    test_status = Column(String(20))
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    integration = relationship("Integration")

class CloudStorageConnection(Base):
    __tablename__ = "cloud_storage_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    
    # Storage provider
    provider = Column(String(20), nullable=False)  # aws_s3, google_drive, onedrive
    
    # Connection details (provider-specific)
    connection_config = Column(JSON, nullable=False, default={})
    
    # Authentication (encrypted)
    auth_config = Column(JSON, nullable=False, default={})
    
    # Settings
    default_bucket = Column(String(100))
    default_folder = Column(String(200))
    sync_enabled = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime)
    sync_status = Column(String(20))
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    integration = relationship("Integration")

class SlackTeamsConnection(Base):
    __tablename__ = "slack_teams_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    
    # Platform
    platform = Column(String(10), nullable=False)  # slack, teams
    
    # Connection details
    workspace_id = Column(String(50))
    workspace_name = Column(String(100))
    
    # Authentication
    access_token = Column(String(500))  # Encrypted
    refresh_token = Column(String(500))  # Encrypted
    token_expires_at = Column(DateTime)
    
    # Bot/App details
    bot_user_id = Column(String(50))
    app_id = Column(String(50))
    
    # Settings
    default_channel = Column(String(50))
    notification_channels = Column(JSON, default=[])
    
    # Status
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    integration = relationship("Integration")
