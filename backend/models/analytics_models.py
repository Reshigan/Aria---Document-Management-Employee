from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base
from datetime import datetime
from typing import Optional, Dict, Any

class DocumentAnalytics(Base):
    """Analytics data for documents"""
    __tablename__ = "document_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # View metrics
    view_count = Column(Integer, default=0)
    unique_viewers = Column(Integer, default=0)
    last_viewed_at = Column(DateTime)
    
    # Download metrics
    download_count = Column(Integer, default=0)
    unique_downloaders = Column(Integer, default=0)
    last_downloaded_at = Column(DateTime)
    
    # Processing metrics
    processing_time_seconds = Column(Float)
    ocr_confidence_score = Column(Float)
    extraction_accuracy = Column(Float)
    
    # Size and performance metrics
    file_size_bytes = Column(Integer)
    processing_cost = Column(Float)
    storage_cost = Column(Float)
    
    # Engagement metrics
    average_view_duration = Column(Float)  # in seconds
    bounce_rate = Column(Float)  # percentage
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="analytics")
    
    # Indexes
    __table_args__ = (
        Index('idx_document_analytics_document_id', 'document_id'),
        Index('idx_document_analytics_created_at', 'created_at'),
    )

class UserActivityLog(Base):
    """Log of user activities for analytics"""
    __tablename__ = "user_activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Activity details
    action = Column(String(100), nullable=False)  # login, logout, upload, download, view, etc.
    resource_type = Column(String(50))  # document, workflow, user, etc.
    resource_id = Column(Integer)
    
    # Context information
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    session_id = Column(String(255))
    
    # Performance metrics
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Additional data
    activity_metadata = Column(JSON)  # Flexible storage for additional context
    
    # Timestamps
    timestamp = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="activity_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_activity_user_id', 'user_id'),
        Index('idx_user_activity_timestamp', 'timestamp'),
        Index('idx_user_activity_action', 'action'),
        Index('idx_user_activity_resource', 'resource_type', 'resource_id'),
    )

class SystemMetrics(Base):
    """System-wide metrics and performance data"""
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Metric identification
    metric_name = Column(String(100), nullable=False)
    metric_type = Column(String(50), nullable=False)  # counter, gauge, histogram, etc.
    
    # Metric values
    value = Column(Float, nullable=False)
    unit = Column(String(20))  # bytes, seconds, count, percentage, etc.
    
    # Dimensions/tags for grouping
    tags = Column(JSON)  # {"service": "api", "endpoint": "/documents", "method": "GET"}
    
    # Timestamps
    timestamp = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_system_metrics_name_timestamp', 'metric_name', 'timestamp'),
        Index('idx_system_metrics_type', 'metric_type'),
        Index('idx_system_metrics_timestamp', 'timestamp'),
    )

class WorkflowAnalytics(Base):
    """Analytics for workflow performance"""
    __tablename__ = "workflow_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    
    # Execution metrics
    total_executions = Column(Integer, default=0)
    successful_executions = Column(Integer, default=0)
    failed_executions = Column(Integer, default=0)
    
    # Performance metrics
    average_execution_time = Column(Float)  # in seconds
    min_execution_time = Column(Float)
    max_execution_time = Column(Float)
    
    # Step analytics
    total_steps = Column(Integer, default=0)
    average_steps_per_execution = Column(Float)
    most_failed_step = Column(String(255))
    
    # User engagement
    unique_users = Column(Integer, default=0)
    total_user_interactions = Column(Integer, default=0)
    
    # Cost metrics
    execution_cost = Column(Float)
    resource_usage = Column(JSON)  # CPU, memory, storage usage
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_execution_at = Column(DateTime)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="analytics")
    
    # Indexes
    __table_args__ = (
        Index('idx_workflow_analytics_workflow_id', 'workflow_id'),
        Index('idx_workflow_analytics_updated_at', 'updated_at'),
    )

class ReportTemplate(Base):
    """Templates for generating reports"""
    __tablename__ = "report_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Template details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # document, user, system, workflow, etc.
    
    # Template configuration
    query_config = Column(JSON, nullable=False)  # SQL query or aggregation config
    visualization_config = Column(JSON)  # Chart type, colors, layout, etc.
    filters = Column(JSON)  # Available filters for the report
    
    # Scheduling
    is_scheduled = Column(Boolean, default=False)
    schedule_cron = Column(String(100))  # Cron expression for scheduling
    
    # Access control
    is_public = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    allowed_users = Column(JSON)  # List of user IDs who can access this template
    allowed_roles = Column(JSON)  # List of roles that can access this template
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    generated_reports = relationship("GeneratedReport", back_populates="template")
    
    # Indexes
    __table_args__ = (
        Index('idx_report_templates_category', 'category'),
        Index('idx_report_templates_created_by', 'created_by'),
        Index('idx_report_templates_active', 'is_active'),
    )

class GeneratedReport(Base):
    """Generated reports from templates"""
    __tablename__ = "generated_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=False)
    
    # Report details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Generation info
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    generation_time_seconds = Column(Float)
    
    # Report data
    data = Column(JSON, nullable=False)  # The actual report data
    report_metadata = Column(JSON)  # Additional metadata about the report
    
    # Filters applied
    applied_filters = Column(JSON)
    date_range_start = Column(DateTime)
    date_range_end = Column(DateTime)
    
    # File storage
    file_path = Column(String(500))  # Path to generated file (PDF, Excel, etc.)
    file_format = Column(String(20))  # pdf, xlsx, csv, json
    file_size_bytes = Column(Integer)
    
    # Status
    status = Column(String(50), default='completed')  # generating, completed, failed
    error_message = Column(Text)
    
    # Access tracking
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)  # When this report should be automatically deleted
    
    # Relationships
    template = relationship("ReportTemplate", back_populates="generated_reports")
    generator = relationship("User", foreign_keys=[generated_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_generated_reports_template_id', 'template_id'),
        Index('idx_generated_reports_generated_by', 'generated_by'),
        Index('idx_generated_reports_created_at', 'created_at'),
        Index('idx_generated_reports_status', 'status'),
    )

class DashboardWidget(Base):
    """Configurable dashboard widgets"""
    __tablename__ = "dashboard_widgets"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Widget details
    name = Column(String(255), nullable=False)
    widget_type = Column(String(100), nullable=False)  # chart, table, metric, etc.
    description = Column(Text)
    
    # Configuration
    config = Column(JSON, nullable=False)  # Widget-specific configuration
    data_source = Column(String(255), nullable=False)  # API endpoint or query identifier
    refresh_interval = Column(Integer, default=300)  # Refresh interval in seconds
    
    # Layout
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=4)
    height = Column(Integer, default=3)
    
    # Access control
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False)
    allowed_users = Column(JSON)
    allowed_roles = Column(JSON)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_dashboard_widgets_created_by', 'created_by'),
        Index('idx_dashboard_widgets_type', 'widget_type'),
        Index('idx_dashboard_widgets_active', 'is_active'),
    )

class AlertRule(Base):
    """Rules for generating alerts based on metrics"""
    __tablename__ = "alert_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Rule details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Condition
    metric_name = Column(String(100), nullable=False)
    condition_type = Column(String(50), nullable=False)  # greater_than, less_than, equals, etc.
    threshold_value = Column(Float, nullable=False)
    
    # Time window
    evaluation_window = Column(Integer, default=300)  # Evaluation window in seconds
    
    # Alert configuration
    severity = Column(String(20), default='medium')  # low, medium, high, critical
    notification_channels = Column(JSON)  # email, slack, webhook, etc.
    
    # Status
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime)
    trigger_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_alert_rules_metric_name', 'metric_name'),
        Index('idx_alert_rules_active', 'is_active'),
        Index('idx_alert_rules_created_by', 'created_by'),
    )