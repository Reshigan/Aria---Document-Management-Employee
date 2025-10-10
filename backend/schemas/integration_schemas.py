from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums
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

# Base schemas
class IntegrationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: IntegrationType
    description: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    endpoint_url: Optional[str] = None
    api_version: Optional[str] = None
    timeout: int = Field(default=30, ge=1, le=300)
    retry_count: int = Field(default=3, ge=0, le=10)

class IntegrationCreate(IntegrationBase):
    credentials: Dict[str, Any] = Field(default_factory=dict)

class IntegrationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    credentials: Optional[Dict[str, Any]] = None
    endpoint_url: Optional[str] = None
    api_version: Optional[str] = None
    timeout: Optional[int] = Field(None, ge=1, le=300)
    retry_count: Optional[int] = Field(None, ge=0, le=10)
    status: Optional[IntegrationStatus] = None

class IntegrationResponse(IntegrationBase):
    id: int
    status: IntegrationStatus
    last_sync: Optional[datetime] = None
    last_error: Optional[str] = None
    error_count: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# SAP Integration
class SAPConnectionBase(BaseModel):
    system_id: str = Field(..., min_length=1, max_length=10)
    client: str = Field(..., min_length=3, max_length=3)
    host: str = Field(..., min_length=1, max_length=100)
    port: int = Field(default=3300, ge=1, le=65535)
    username: str = Field(..., min_length=1, max_length=50)
    language: str = Field(default="EN", min_length=2, max_length=2)
    pool_size: int = Field(default=5, ge=1, le=20)

class SAPConnectionCreate(SAPConnectionBase):
    password: str = Field(..., min_length=1)

class SAPConnectionUpdate(BaseModel):
    system_id: Optional[str] = Field(None, min_length=1, max_length=10)
    client: Optional[str] = Field(None, min_length=3, max_length=3)
    host: Optional[str] = Field(None, min_length=1, max_length=100)
    port: Optional[int] = Field(None, ge=1, le=65535)
    username: Optional[str] = Field(None, min_length=1, max_length=50)
    password: Optional[str] = Field(None, min_length=1)
    language: Optional[str] = Field(None, min_length=2, max_length=2)
    pool_size: Optional[int] = Field(None, ge=1, le=20)
    is_active: Optional[bool] = None

class SAPConnectionResponse(SAPConnectionBase):
    id: int
    integration_id: int
    is_active: bool
    last_connection: Optional[datetime] = None
    connection_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Email Integration
class EmailConfigurationBase(BaseModel):
    smtp_host: str = Field(..., min_length=1, max_length=100)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    use_tls: bool = Field(default=True)
    use_ssl: bool = Field(default=False)
    username: str = Field(..., min_length=1, max_length=100)
    from_email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    from_name: Optional[str] = Field(None, max_length=100)
    reply_to: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    templates: Dict[str, Any] = Field(default_factory=dict)

class EmailConfigurationCreate(EmailConfigurationBase):
    password: str = Field(..., min_length=1)

class EmailConfigurationUpdate(BaseModel):
    smtp_host: Optional[str] = Field(None, min_length=1, max_length=100)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    username: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=1)
    from_email: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    from_name: Optional[str] = Field(None, max_length=100)
    reply_to: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    templates: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class EmailConfigurationResponse(EmailConfigurationBase):
    id: int
    integration_id: int
    is_active: bool
    last_test: Optional[datetime] = None
    test_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Cloud Storage Integration
class CloudStorageConnectionBase(BaseModel):
    provider: str = Field(..., pattern=r'^(aws_s3|google_drive|onedrive)$')
    connection_config: Dict[str, Any] = Field(default_factory=dict)
    default_bucket: Optional[str] = Field(None, max_length=100)
    default_folder: Optional[str] = Field(None, max_length=200)
    sync_enabled: bool = Field(default=False)

class CloudStorageConnectionCreate(CloudStorageConnectionBase):
    auth_config: Dict[str, Any] = Field(default_factory=dict)

class CloudStorageConnectionUpdate(BaseModel):
    provider: Optional[str] = Field(None, pattern=r'^(aws_s3|google_drive|onedrive)$')
    connection_config: Optional[Dict[str, Any]] = None
    auth_config: Optional[Dict[str, Any]] = None
    default_bucket: Optional[str] = Field(None, max_length=100)
    default_folder: Optional[str] = Field(None, max_length=200)
    sync_enabled: Optional[bool] = None
    is_active: Optional[bool] = None

class CloudStorageConnectionResponse(CloudStorageConnectionBase):
    id: int
    integration_id: int
    is_active: bool
    last_sync: Optional[datetime] = None
    sync_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Slack/Teams Integration
class SlackTeamsConnectionBase(BaseModel):
    platform: str = Field(..., pattern=r'^(slack|teams)$')
    workspace_name: Optional[str] = Field(None, max_length=100)
    default_channel: Optional[str] = Field(None, max_length=50)
    notification_channels: List[str] = Field(default_factory=list)

class SlackTeamsConnectionCreate(SlackTeamsConnectionBase):
    access_token: str = Field(..., min_length=1)
    refresh_token: Optional[str] = None
    workspace_id: Optional[str] = Field(None, max_length=50)
    bot_user_id: Optional[str] = Field(None, max_length=50)
    app_id: Optional[str] = Field(None, max_length=50)

class SlackTeamsConnectionUpdate(BaseModel):
    workspace_name: Optional[str] = Field(None, max_length=100)
    access_token: Optional[str] = Field(None, min_length=1)
    refresh_token: Optional[str] = None
    workspace_id: Optional[str] = Field(None, max_length=50)
    bot_user_id: Optional[str] = Field(None, max_length=50)
    app_id: Optional[str] = Field(None, max_length=50)
    default_channel: Optional[str] = Field(None, max_length=50)
    notification_channels: Optional[List[str]] = None
    is_active: Optional[bool] = None

class SlackTeamsConnectionResponse(SlackTeamsConnectionBase):
    id: int
    integration_id: int
    workspace_id: Optional[str] = None
    bot_user_id: Optional[str] = None
    app_id: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    is_active: bool
    last_activity: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Webhook Integration
class WebhookEndpointBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    events: List[WebhookEventType] = Field(..., min_items=1)
    secret: Optional[str] = Field(None, max_length=100)
    retry_count: int = Field(default=3, ge=0, le=10)
    timeout: int = Field(default=30, ge=1, le=300)
    headers: Dict[str, str] = Field(default_factory=dict)
    auth_type: str = Field(default="none", pattern=r'^(none|basic|bearer|custom)$')
    auth_config: Dict[str, Any] = Field(default_factory=dict)

class WebhookEndpointCreate(WebhookEndpointBase):
    pass

class WebhookEndpointUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    events: Optional[List[WebhookEventType]] = Field(None, min_items=1)
    secret: Optional[str] = Field(None, max_length=100)
    retry_count: Optional[int] = Field(None, ge=0, le=10)
    timeout: Optional[int] = Field(None, ge=1, le=300)
    headers: Optional[Dict[str, str]] = None
    auth_type: Optional[str] = Field(None, pattern=r'^(none|basic|bearer|custom)$')
    auth_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class WebhookEndpointResponse(WebhookEndpointBase):
    id: int
    integration_id: int
    is_active: bool
    last_triggered: Optional[datetime] = None
    last_success: Optional[datetime] = None
    last_error: Optional[str] = None
    success_count: int
    error_count: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Sync Log
class IntegrationSyncLogResponse(BaseModel):
    id: int
    integration_id: int
    sync_type: str
    status: str
    records_processed: int
    records_created: int
    records_updated: int
    records_failed: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    triggered_by: Optional[int] = None
    
    class Config:
        from_attributes = True

# Webhook Delivery
class WebhookDeliveryResponse(BaseModel):
    id: int
    webhook_id: int
    event_type: WebhookEventType
    payload: Dict[str, Any]
    response_status: Optional[int] = None
    triggered_at: datetime
    delivered_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    status: str
    retry_count: int
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

# Test Connection Requests
class TestConnectionRequest(BaseModel):
    integration_type: IntegrationType
    config: Dict[str, Any]
    credentials: Dict[str, Any] = Field(default_factory=dict)

class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None
    response_time_ms: Optional[int] = None

# Sync Request
class SyncRequest(BaseModel):
    sync_type: str = Field(default="manual", pattern=r'^(full|incremental|manual)$')
    options: Dict[str, Any] = Field(default_factory=dict)

class SyncResponse(BaseModel):
    sync_id: int
    status: str
    message: str
    started_at: datetime

# Email Send Request
class EmailSendRequest(BaseModel):
    to: List[str] = Field(..., min_items=1)
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    html_body: Optional[str] = None
    template: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    attachments: Optional[List[str]] = None  # File paths or IDs

class EmailSendResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None
    recipients_accepted: List[str] = Field(default_factory=list)
    recipients_rejected: List[str] = Field(default_factory=list)

# Notification Send Request
class NotificationSendRequest(BaseModel):
    platform: str = Field(..., pattern=r'^(slack|teams)$')
    channel: Optional[str] = None
    message: str = Field(..., min_length=1)
    attachments: Optional[List[Dict[str, Any]]] = None
    thread_id: Optional[str] = None

class NotificationSendResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None
    channel: Optional[str] = None