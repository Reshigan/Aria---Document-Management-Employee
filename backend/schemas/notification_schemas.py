from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
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


class NotificationPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class NotificationChannel(str, Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"
    WEBHOOK = "WEBHOOK"


# Base schemas
class NotificationBase(BaseModel):
    title: str = Field(..., max_length=255)
    message: str
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    recipient_id: int
    sender_id: Optional[int] = None
    document_id: Optional[int] = None
    workflow_id: Optional[int] = None
    task_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = Field(None, max_length=500)
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = None
    priority: Optional[NotificationPriority] = None
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = Field(None, max_length=500)
    expires_at: Optional[datetime] = None


class NotificationResponse(NotificationBase):
    id: int
    is_read: bool
    is_archived: bool
    read_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Related entity names for display
    sender_name: Optional[str] = None
    document_title: Optional[str] = None
    workflow_name: Optional[str] = None
    task_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    per_page: int
    total_pages: int


# Notification Delivery schemas
class NotificationDeliveryBase(BaseModel):
    notification_id: int
    channel: NotificationChannel
    status: str = "PENDING"
    max_attempts: int = 3
    email_address: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    webhook_url: Optional[str] = Field(None, max_length=500)
    push_token: Optional[str] = Field(None, max_length=500)


class NotificationDeliveryCreate(NotificationDeliveryBase):
    pass


class NotificationDeliveryResponse(NotificationDeliveryBase):
    id: int
    attempt_count: int
    delivered_at: Optional[datetime]
    failed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    next_attempt_at: Optional[datetime]

    class Config:
        from_attributes = True


# Notification Template schemas
class NotificationTemplateBase(BaseModel):
    name: str = Field(..., max_length=100)
    type: NotificationType
    channel: NotificationChannel
    subject_template: Optional[str] = Field(None, max_length=255)
    body_template: str
    html_template: Optional[str] = None
    is_active: bool = True
    priority: NotificationPriority = NotificationPriority.MEDIUM
    variables: Optional[List[str]] = None
    description: Optional[str] = None


class NotificationTemplateCreate(NotificationTemplateBase):
    pass


class NotificationTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    subject_template: Optional[str] = Field(None, max_length=255)
    body_template: Optional[str] = None
    html_template: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[NotificationPriority] = None
    variables: Optional[List[str]] = None
    description: Optional[str] = None


class NotificationTemplateResponse(NotificationTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Notification Preference schemas
class NotificationPreferenceBase(BaseModel):
    user_id: int
    notification_type: NotificationType
    channel: NotificationChannel
    is_enabled: bool = True
    minimum_priority: NotificationPriority = NotificationPriority.LOW
    quiet_hours_start: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    quiet_hours_end: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    timezone: str = "UTC"
    digest_frequency: Optional[str] = Field(None, pattern=r'^(IMMEDIATE|HOURLY|DAILY|WEEKLY)$')


class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass


class NotificationPreferenceUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    minimum_priority: Optional[NotificationPriority] = None
    quiet_hours_start: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    quiet_hours_end: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    timezone: Optional[str] = None
    digest_frequency: Optional[str] = Field(None, pattern=r'^(IMMEDIATE|HOURLY|DAILY|WEEKLY)$')


class NotificationPreferenceResponse(NotificationPreferenceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Notification Subscription schemas
class NotificationSubscriptionBase(BaseModel):
    user_id: int
    document_id: Optional[int] = None
    workflow_id: Optional[int] = None
    folder_id: Optional[int] = None
    is_active: bool = True
    notification_types: Optional[List[NotificationType]] = None


class NotificationSubscriptionCreate(NotificationSubscriptionBase):
    @validator('notification_types', pre=True)
    def validate_at_least_one_target(cls, v, values):
        if not any([values.get('document_id'), values.get('workflow_id'), values.get('folder_id')]):
            raise ValueError('At least one target (document_id, workflow_id, or folder_id) must be specified')
        return v


class NotificationSubscriptionUpdate(BaseModel):
    is_active: Optional[bool] = None
    notification_types: Optional[List[NotificationType]] = None


class NotificationSubscriptionResponse(NotificationSubscriptionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Related entity names for display
    document_title: Optional[str] = None
    workflow_name: Optional[str] = None
    folder_name: Optional[str] = None

    class Config:
        from_attributes = True


# Bulk operations
class BulkNotificationCreate(BaseModel):
    notifications: List[NotificationCreate]


class BulkNotificationUpdate(BaseModel):
    notification_ids: List[int]
    updates: NotificationUpdate


class NotificationMarkAsReadRequest(BaseModel):
    notification_ids: List[int]


class NotificationStatsResponse(BaseModel):
    total_notifications: int
    unread_count: int
    by_type: Dict[NotificationType, int]
    by_priority: Dict[NotificationPriority, int]
    recent_activity: List[NotificationResponse]


# WebSocket message schemas
class WebSocketNotificationMessage(BaseModel):
    type: str = "notification"
    action: str  # "new", "updated", "deleted"
    notification: NotificationResponse


class WebSocketConnectionMessage(BaseModel):
    type: str = "connection"
    status: str  # "connected", "disconnected"
    user_id: int
    timestamp: datetime


# Email notification schemas
class EmailNotificationData(BaseModel):
    to_email: str
    subject: str
    body_text: str
    body_html: Optional[str] = None
    template_name: Optional[str] = None
    template_variables: Optional[Dict[str, Any]] = None


# Push notification schemas
class PushNotificationData(BaseModel):
    title: str
    body: str
    icon: Optional[str] = None
    badge: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, str]]] = None