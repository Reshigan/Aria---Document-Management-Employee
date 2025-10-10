from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    key_prefix = Column(String(50), nullable=False)  # First few chars for identification
    description = Column(Text)
    
    # User and permissions
    user_id = Column(Integer, nullable=False, index=True)
    scopes = Column(JSON, default=list)  # List of allowed scopes/permissions
    
    # Rate limiting
    rate_limit_requests = Column(Integer, default=1000)  # Requests per hour
    rate_limit_window = Column(Integer, default=3600)  # Window in seconds
    
    # Status and lifecycle
    is_active = Column(Boolean, default=True, index=True)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=False)
    
    # Relationships
    usage_logs = relationship("APIUsageLog", back_populates="api_key", cascade="all, delete-orphan")
    rate_limits = relationship("RateLimitEntry", back_populates="api_key", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_api_keys_user_active', 'user_id', 'is_active'),
        Index('idx_api_keys_expires', 'expires_at'),
    )

class APIUsageLog(Base):
    __tablename__ = "api_usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False, index=True)
    
    # Request details
    endpoint = Column(String(500), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False, index=True)
    response_time_ms = Column(Float, nullable=False)
    
    # Request metadata
    ip_address = Column(String(45), nullable=False, index=True)  # IPv6 compatible
    user_agent = Column(Text)
    request_size = Column(Integer, default=0)
    response_size = Column(Integer, default=0)
    
    # Error tracking
    error_message = Column(Text)
    error_type = Column(String(100))
    
    # Timestamps
    timestamp = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    api_key = relationship("APIKey", back_populates="usage_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_usage_logs_key_timestamp', 'api_key_id', 'timestamp'),
        Index('idx_usage_logs_endpoint_timestamp', 'endpoint', 'timestamp'),
        Index('idx_usage_logs_status_timestamp', 'status_code', 'timestamp'),
    )

class RateLimitEntry(Base):
    __tablename__ = "rate_limit_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False, index=True)
    
    # Rate limiting details
    window_start = Column(DateTime, nullable=False, index=True)
    window_end = Column(DateTime, nullable=False, index=True)
    request_count = Column(Integer, default=0)
    limit_exceeded_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    api_key = relationship("APIKey", back_populates="rate_limits")
    
    # Indexes
    __table_args__ = (
        Index('idx_rate_limits_key_window', 'api_key_id', 'window_start', 'window_end'),
        Index('idx_rate_limits_window_end', 'window_end'),
    )

class APIEndpoint(Base):
    __tablename__ = "api_endpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    path = Column(String(500), nullable=False, unique=True, index=True)
    method = Column(String(10), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Configuration
    is_active = Column(Boolean, default=True, index=True)
    requires_auth = Column(Boolean, default=True)
    required_scopes = Column(JSON, default=list)  # Required scopes for access
    
    # Rate limiting overrides
    custom_rate_limit = Column(Integer, nullable=True)  # Override default rate limit
    custom_rate_window = Column(Integer, nullable=True)  # Override default window
    
    # Monitoring
    is_monitored = Column(Boolean, default=True)
    alert_on_errors = Column(Boolean, default=True)
    error_threshold = Column(Float, default=0.05)  # 5% error rate threshold
    
    # Documentation
    request_schema = Column(JSON)  # JSON schema for request validation
    response_schema = Column(JSON)  # JSON schema for response documentation
    examples = Column(JSON)  # Request/response examples
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=False)
    
    # Relationships
    usage_stats = relationship("EndpointUsageStats", back_populates="endpoint", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_endpoints_path_method', 'path', 'method'),
        Index('idx_endpoints_active_auth', 'is_active', 'requires_auth'),
    )

class EndpointUsageStats(Base):
    __tablename__ = "endpoint_usage_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("api_endpoints.id"), nullable=False, index=True)
    
    # Time period
    date = Column(DateTime, nullable=False, index=True)  # Daily stats
    hour = Column(Integer, nullable=False, index=True)  # Hour of day (0-23)
    
    # Usage metrics
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    error_requests = Column(Integer, default=0)
    
    # Performance metrics
    avg_response_time = Column(Float, default=0.0)
    min_response_time = Column(Float, default=0.0)
    max_response_time = Column(Float, default=0.0)
    p95_response_time = Column(Float, default=0.0)
    
    # Data transfer
    total_request_size = Column(Integer, default=0)
    total_response_size = Column(Integer, default=0)
    
    # Rate limiting
    rate_limited_requests = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    endpoint = relationship("APIEndpoint", back_populates="usage_stats")
    
    # Indexes
    __table_args__ = (
        Index('idx_usage_stats_endpoint_date', 'endpoint_id', 'date'),
        Index('idx_usage_stats_date_hour', 'date', 'hour'),
    )

class APIQuota(Base):
    __tablename__ = "api_quotas"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Quota limits
    requests_per_minute = Column(Integer, default=60)
    requests_per_hour = Column(Integer, default=1000)
    requests_per_day = Column(Integer, default=10000)
    requests_per_month = Column(Integer, default=100000)
    
    # Data transfer limits (in bytes)
    data_transfer_per_day = Column(Integer, default=1073741824)  # 1GB
    data_transfer_per_month = Column(Integer, default=10737418240)  # 10GB
    
    # Feature limits
    max_concurrent_requests = Column(Integer, default=10)
    max_request_size = Column(Integer, default=10485760)  # 10MB
    max_response_size = Column(Integer, default=52428800)  # 50MB
    
    # Allowed features
    allowed_endpoints = Column(JSON, default=list)  # Specific endpoints allowed
    blocked_endpoints = Column(JSON, default=list)  # Specific endpoints blocked
    allowed_methods = Column(JSON, default=["GET", "POST", "PUT", "DELETE"])
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=False)

class APIAlert(Base):
    __tablename__ = "api_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Alert conditions
    alert_type = Column(String(50), nullable=False, index=True)  # error_rate, response_time, usage_spike
    threshold_value = Column(Float, nullable=False)
    comparison_operator = Column(String(10), default=">=")  # >=, <=, ==, !=
    
    # Scope
    endpoint_id = Column(Integer, ForeignKey("api_endpoints.id"), nullable=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True, index=True)
    
    # Time window for evaluation
    evaluation_window = Column(Integer, default=300)  # 5 minutes in seconds
    
    # Notification settings
    notification_channels = Column(JSON, default=list)  # email, slack, webhook
    notification_recipients = Column(JSON, default=list)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    last_triggered_at = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=False)
    
    # Relationships
    endpoint = relationship("APIEndpoint", foreign_keys=[endpoint_id])
    api_key = relationship("APIKey", foreign_keys=[api_key_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_alerts_type_active', 'alert_type', 'is_active'),
        Index('idx_alerts_endpoint_active', 'endpoint_id', 'is_active'),
    )