from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums
class AlertType(str, Enum):
    ERROR_RATE = "error_rate"
    RESPONSE_TIME = "response_time"
    USAGE_SPIKE = "usage_spike"
    QUOTA_EXCEEDED = "quota_exceeded"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

class ComparisonOperator(str, Enum):
    GREATER_THAN_EQUAL = ">="
    LESS_THAN_EQUAL = "<="
    EQUAL = "=="
    NOT_EQUAL = "!="
    GREATER_THAN = ">"
    LESS_THAN = "<"

class HTTPMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"

# API Key Schemas
class APIKeyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)
    rate_limit_requests: int = Field(default=1000, ge=1)
    rate_limit_window: int = Field(default=3600, ge=60)
    expires_at: Optional[datetime] = None

class APIKeyCreate(APIKeyBase):
    user_id: int = Field(..., gt=0)

    @validator('scopes')
    def validate_scopes(cls, v):
        valid_scopes = [
            'documents:read', 'documents:write', 'documents:delete',
            'users:read', 'users:write', 'analytics:read',
            'admin:read', 'admin:write'
        ]
        for scope in v:
            if scope not in valid_scopes:
                raise ValueError(f'Invalid scope: {scope}')
        return v

class APIKeyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    scopes: Optional[List[str]] = None
    rate_limit_requests: Optional[int] = Field(None, ge=1)
    rate_limit_window: Optional[int] = Field(None, ge=60)
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None

class APIKeyResponse(APIKeyBase):
    id: int
    key_prefix: str
    user_id: int
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

class APIKeyWithSecret(APIKeyResponse):
    api_key: str  # Only returned on creation

# API Usage Log Schemas
class APIUsageLogBase(BaseModel):
    endpoint: str = Field(..., max_length=500)
    method: HTTPMethod
    status_code: int = Field(..., ge=100, le=599)
    response_time_ms: float = Field(..., ge=0)
    ip_address: str = Field(..., max_length=45)
    user_agent: Optional[str] = None
    request_size: int = Field(default=0, ge=0)
    response_size: int = Field(default=0, ge=0)
    error_message: Optional[str] = None
    error_type: Optional[str] = Field(None, max_length=100)

class APIUsageLogCreate(APIUsageLogBase):
    api_key_id: int = Field(..., gt=0)

class APIUsageLogResponse(APIUsageLogBase):
    id: int
    api_key_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Rate Limit Schemas
class RateLimitEntryBase(BaseModel):
    window_start: datetime
    window_end: datetime
    request_count: int = Field(default=0, ge=0)
    limit_exceeded_count: int = Field(default=0, ge=0)

class RateLimitEntryCreate(RateLimitEntryBase):
    api_key_id: int = Field(..., gt=0)

class RateLimitEntryResponse(RateLimitEntryBase):
    id: int
    api_key_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# API Endpoint Schemas
class APIEndpointBase(BaseModel):
    path: str = Field(..., max_length=500)
    method: HTTPMethod
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    requires_auth: bool = Field(default=True)
    required_scopes: List[str] = Field(default_factory=list)
    custom_rate_limit: Optional[int] = Field(None, ge=1)
    custom_rate_window: Optional[int] = Field(None, ge=60)
    is_monitored: bool = Field(default=True)
    alert_on_errors: bool = Field(default=True)
    error_threshold: float = Field(default=0.05, ge=0.0, le=1.0)
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    examples: Optional[Dict[str, Any]] = None

class APIEndpointCreate(APIEndpointBase):
    created_by: int = Field(..., gt=0)

    @validator('path')
    def validate_path(cls, v):
        if not v.startswith('/'):
            raise ValueError('Path must start with /')
        return v

class APIEndpointUpdate(BaseModel):
    path: Optional[str] = Field(None, max_length=500)
    method: Optional[HTTPMethod] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    requires_auth: Optional[bool] = None
    required_scopes: Optional[List[str]] = None
    custom_rate_limit: Optional[int] = Field(None, ge=1)
    custom_rate_window: Optional[int] = Field(None, ge=60)
    is_monitored: Optional[bool] = None
    alert_on_errors: Optional[bool] = None
    error_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    examples: Optional[Dict[str, Any]] = None

class APIEndpointResponse(APIEndpointBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# Endpoint Usage Stats Schemas
class EndpointUsageStatsBase(BaseModel):
    date: datetime
    hour: int = Field(..., ge=0, le=23)
    total_requests: int = Field(default=0, ge=0)
    successful_requests: int = Field(default=0, ge=0)
    failed_requests: int = Field(default=0, ge=0)
    error_requests: int = Field(default=0, ge=0)
    avg_response_time: float = Field(default=0.0, ge=0)
    min_response_time: float = Field(default=0.0, ge=0)
    max_response_time: float = Field(default=0.0, ge=0)
    p95_response_time: float = Field(default=0.0, ge=0)
    total_request_size: int = Field(default=0, ge=0)
    total_response_size: int = Field(default=0, ge=0)
    rate_limited_requests: int = Field(default=0, ge=0)

class EndpointUsageStatsCreate(EndpointUsageStatsBase):
    endpoint_id: int = Field(..., gt=0)

class EndpointUsageStatsResponse(EndpointUsageStatsBase):
    id: int
    endpoint_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# API Quota Schemas
class APIQuotaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    requests_per_minute: int = Field(default=60, ge=1)
    requests_per_hour: int = Field(default=1000, ge=1)
    requests_per_day: int = Field(default=10000, ge=1)
    requests_per_month: int = Field(default=100000, ge=1)
    data_transfer_per_day: int = Field(default=1073741824, ge=0)  # 1GB
    data_transfer_per_month: int = Field(default=10737418240, ge=0)  # 10GB
    max_concurrent_requests: int = Field(default=10, ge=1)
    max_request_size: int = Field(default=10485760, ge=0)  # 10MB
    max_response_size: int = Field(default=52428800, ge=0)  # 50MB
    allowed_endpoints: List[str] = Field(default_factory=list)
    blocked_endpoints: List[str] = Field(default_factory=list)
    allowed_methods: List[HTTPMethod] = Field(default_factory=lambda: [HTTPMethod.GET, HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.DELETE])
    is_active: bool = Field(default=True)

class APIQuotaCreate(APIQuotaBase):
    created_by: int = Field(..., gt=0)

class APIQuotaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    requests_per_minute: Optional[int] = Field(None, ge=1)
    requests_per_hour: Optional[int] = Field(None, ge=1)
    requests_per_day: Optional[int] = Field(None, ge=1)
    requests_per_month: Optional[int] = Field(None, ge=1)
    data_transfer_per_day: Optional[int] = Field(None, ge=0)
    data_transfer_per_month: Optional[int] = Field(None, ge=0)
    max_concurrent_requests: Optional[int] = Field(None, ge=1)
    max_request_size: Optional[int] = Field(None, ge=0)
    max_response_size: Optional[int] = Field(None, ge=0)
    allowed_endpoints: Optional[List[str]] = None
    blocked_endpoints: Optional[List[str]] = None
    allowed_methods: Optional[List[HTTPMethod]] = None
    is_active: Optional[bool] = None

class APIQuotaResponse(APIQuotaBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# API Alert Schemas
class APIAlertBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    alert_type: AlertType
    threshold_value: float = Field(..., ge=0)
    comparison_operator: ComparisonOperator = Field(default=ComparisonOperator.GREATER_THAN_EQUAL)
    endpoint_id: Optional[int] = Field(None, gt=0)
    api_key_id: Optional[int] = Field(None, gt=0)
    evaluation_window: int = Field(default=300, ge=60)  # 5 minutes minimum
    notification_channels: List[str] = Field(default_factory=list)
    notification_recipients: List[str] = Field(default_factory=list)
    is_active: bool = Field(default=True)

class APIAlertCreate(APIAlertBase):
    created_by: int = Field(..., gt=0)

class APIAlertUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    alert_type: Optional[AlertType] = None
    threshold_value: Optional[float] = Field(None, ge=0)
    comparison_operator: Optional[ComparisonOperator] = None
    endpoint_id: Optional[int] = Field(None, gt=0)
    api_key_id: Optional[int] = Field(None, gt=0)
    evaluation_window: Optional[int] = Field(None, ge=60)
    notification_channels: Optional[List[str]] = None
    notification_recipients: Optional[List[str]] = None
    is_active: Optional[bool] = None

class APIAlertResponse(APIAlertBase):
    id: int
    last_triggered_at: Optional[datetime]
    trigger_count: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# Analytics and Statistics Schemas
class APIUsageAnalytics(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    error_rate: float
    avg_response_time: float
    p95_response_time: float
    total_data_transfer: int
    unique_api_keys: int
    top_endpoints: List[Dict[str, Any]]
    hourly_usage: List[Dict[str, Any]]
    daily_usage: List[Dict[str, Any]]

class RateLimitStatus(BaseModel):
    api_key_id: int
    current_window_start: datetime
    current_window_end: datetime
    requests_in_window: int
    limit: int
    remaining: int
    reset_time: datetime
    is_exceeded: bool

class APIHealthStatus(BaseModel):
    total_endpoints: int
    active_endpoints: int
    monitored_endpoints: int
    endpoints_with_errors: int
    avg_response_time: float
    error_rate: float
    total_api_keys: int
    active_api_keys: int
    rate_limited_keys: int

# Request/Response wrapper schemas
class APIKeyListResponse(BaseModel):
    items: List[APIKeyResponse]
    total: int
    page: int
    size: int
    pages: int

class APIUsageLogListResponse(BaseModel):
    items: List[APIUsageLogResponse]
    total: int
    page: int
    size: int
    pages: int

class APIEndpointListResponse(BaseModel):
    items: List[APIEndpointResponse]
    total: int
    page: int
    size: int
    pages: int

class APIAlertListResponse(BaseModel):
    items: List[APIAlertResponse]
    total: int
    page: int
    size: int
    pages: int