from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

# Enums
class MetricType(str, Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"

class ReportStatus(str, Enum):
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class WidgetType(str, Enum):
    CHART = "chart"
    TABLE = "table"
    METRIC = "metric"
    GAUGE = "gauge"
    PROGRESS = "progress"

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ConditionType(str, Enum):
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"

# Document Analytics Schemas
class DocumentAnalyticsBase(BaseModel):
    document_id: int
    view_count: int = 0
    unique_viewers: int = 0
    download_count: int = 0
    unique_downloaders: int = 0
    processing_time_seconds: Optional[float] = None
    ocr_confidence_score: Optional[float] = None
    extraction_accuracy: Optional[float] = None
    file_size_bytes: Optional[int] = None
    processing_cost: Optional[float] = None
    storage_cost: Optional[float] = None
    average_view_duration: Optional[float] = None
    bounce_rate: Optional[float] = None

class DocumentAnalyticsCreate(DocumentAnalyticsBase):
    pass

class DocumentAnalyticsUpdate(BaseModel):
    view_count: Optional[int] = None
    unique_viewers: Optional[int] = None
    download_count: Optional[int] = None
    unique_downloaders: Optional[int] = None
    processing_time_seconds: Optional[float] = None
    ocr_confidence_score: Optional[float] = None
    extraction_accuracy: Optional[float] = None
    file_size_bytes: Optional[int] = None
    processing_cost: Optional[float] = None
    storage_cost: Optional[float] = None
    average_view_duration: Optional[float] = None
    bounce_rate: Optional[float] = None
    last_viewed_at: Optional[datetime] = None
    last_downloaded_at: Optional[datetime] = None

class DocumentAnalytics(DocumentAnalyticsBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    last_viewed_at: Optional[datetime] = None
    last_downloaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# User Activity Log Schemas
class UserActivityLogBase(BaseModel):
    user_id: int
    action: str = Field(..., max_length=100)
    resource_type: Optional[str] = Field(None, max_length=50)
    resource_id: Optional[int] = None
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = None
    session_id: Optional[str] = Field(None, max_length=255)
    response_time_ms: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class UserActivityLogCreate(UserActivityLogBase):
    pass

class UserActivityLog(UserActivityLogBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    timestamp: datetime

# System Metrics Schemas
class SystemMetricsBase(BaseModel):
    metric_name: str = Field(..., max_length=100)
    metric_type: MetricType
    value: float
    unit: Optional[str] = Field(None, max_length=20)
    tags: Optional[Dict[str, Any]] = None

class SystemMetricsCreate(SystemMetricsBase):
    pass

class SystemMetrics(SystemMetricsBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    timestamp: datetime

# Workflow Analytics Schemas
class WorkflowAnalyticsBase(BaseModel):
    workflow_id: int
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    average_execution_time: Optional[float] = None
    min_execution_time: Optional[float] = None
    max_execution_time: Optional[float] = None
    total_steps: int = 0
    average_steps_per_execution: Optional[float] = None
    most_failed_step: Optional[str] = None
    unique_users: int = 0
    total_user_interactions: int = 0
    execution_cost: Optional[float] = None
    resource_usage: Optional[Dict[str, Any]] = None

class WorkflowAnalyticsCreate(WorkflowAnalyticsBase):
    pass

class WorkflowAnalyticsUpdate(BaseModel):
    total_executions: Optional[int] = None
    successful_executions: Optional[int] = None
    failed_executions: Optional[int] = None
    average_execution_time: Optional[float] = None
    min_execution_time: Optional[float] = None
    max_execution_time: Optional[float] = None
    total_steps: Optional[int] = None
    average_steps_per_execution: Optional[float] = None
    most_failed_step: Optional[str] = None
    unique_users: Optional[int] = None
    total_user_interactions: Optional[int] = None
    execution_cost: Optional[float] = None
    resource_usage: Optional[Dict[str, Any]] = None
    last_execution_at: Optional[datetime] = None

class WorkflowAnalytics(WorkflowAnalyticsBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime
    last_execution_at: Optional[datetime] = None

# Report Template Schemas
class ReportTemplateBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    query_config: Dict[str, Any]
    visualization_config: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    is_scheduled: bool = False
    schedule_cron: Optional[str] = Field(None, max_length=100)
    is_public: bool = False
    allowed_users: Optional[List[int]] = None
    allowed_roles: Optional[List[str]] = None
    is_active: bool = True

class ReportTemplateCreate(ReportTemplateBase):
    created_by: int

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    query_config: Optional[Dict[str, Any]] = None
    visualization_config: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    is_scheduled: Optional[bool] = None
    schedule_cron: Optional[str] = Field(None, max_length=100)
    is_public: Optional[bool] = None
    allowed_users: Optional[List[int]] = None
    allowed_roles: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ReportTemplate(ReportTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

# Generated Report Schemas
class GeneratedReportBase(BaseModel):
    template_id: int
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
    applied_filters: Optional[Dict[str, Any]] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    file_format: Optional[str] = Field(None, max_length=20)
    status: ReportStatus = ReportStatus.COMPLETED
    error_message: Optional[str] = None

class GeneratedReportCreate(GeneratedReportBase):
    generated_by: int
    generation_time_seconds: Optional[float] = None

class GeneratedReportUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = Field(None, max_length=500)
    file_size_bytes: Optional[int] = None
    status: Optional[ReportStatus] = None
    error_message: Optional[str] = None
    view_count: Optional[int] = None
    download_count: Optional[int] = None
    last_accessed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

class GeneratedReport(GeneratedReportBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    generated_by: int
    generation_time_seconds: Optional[float] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    view_count: int = 0
    download_count: int = 0
    last_accessed_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

# Dashboard Widget Schemas
class DashboardWidgetBase(BaseModel):
    name: str = Field(..., max_length=255)
    widget_type: WidgetType
    description: Optional[str] = None
    config: Dict[str, Any]
    data_source: str = Field(..., max_length=255)
    refresh_interval: int = 300
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 3
    is_public: bool = False
    allowed_users: Optional[List[int]] = None
    allowed_roles: Optional[List[str]] = None
    is_active: bool = True

class DashboardWidgetCreate(DashboardWidgetBase):
    created_by: int

class DashboardWidgetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    widget_type: Optional[WidgetType] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    data_source: Optional[str] = Field(None, max_length=255)
    refresh_interval: Optional[int] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_public: Optional[bool] = None
    allowed_users: Optional[List[int]] = None
    allowed_roles: Optional[List[str]] = None
    is_active: Optional[bool] = None

class DashboardWidget(DashboardWidgetBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

# Alert Rule Schemas
class AlertRuleBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    metric_name: str = Field(..., max_length=100)
    condition_type: ConditionType
    threshold_value: float
    evaluation_window: int = 300
    severity: AlertSeverity = AlertSeverity.MEDIUM
    notification_channels: Optional[Dict[str, Any]] = None
    is_active: bool = True

class AlertRuleCreate(AlertRuleBase):
    created_by: int

class AlertRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    metric_name: Optional[str] = Field(None, max_length=100)
    condition_type: Optional[ConditionType] = None
    threshold_value: Optional[float] = None
    evaluation_window: Optional[int] = None
    severity: Optional[AlertSeverity] = None
    notification_channels: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class AlertRule(AlertRuleBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_by: int
    last_triggered_at: Optional[datetime] = None
    trigger_count: int = 0
    created_at: datetime
    updated_at: datetime

# Analytics Summary Schemas
class DocumentAnalyticsSummary(BaseModel):
    total_documents: int
    total_views: int
    total_downloads: int
    average_processing_time: Optional[float] = None
    average_confidence_score: Optional[float] = None
    total_storage_size: int
    most_viewed_documents: List[Dict[str, Any]]
    most_downloaded_documents: List[Dict[str, Any]]

class UserActivitySummary(BaseModel):
    total_users: int
    active_users_today: int
    active_users_week: int
    active_users_month: int
    most_common_actions: List[Dict[str, Any]]
    average_session_duration: Optional[float] = None
    peak_activity_hours: List[int]

class SystemMetricsSummary(BaseModel):
    total_metrics: int
    latest_metrics: List[SystemMetrics]
    metric_trends: Dict[str, List[Dict[str, Any]]]
    system_health_score: float
    alerts_triggered: int

class WorkflowAnalyticsSummary(BaseModel):
    total_workflows: int
    total_executions: int
    success_rate: float
    average_execution_time: Optional[float] = None
    most_used_workflows: List[Dict[str, Any]]
    most_failed_workflows: List[Dict[str, Any]]

# Request/Response Schemas
class AnalyticsFilters(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[int] = None
    document_id: Optional[int] = None
    workflow_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)

class MetricsQuery(BaseModel):
    metric_names: List[str]
    start_time: datetime
    end_time: datetime
    aggregation: str = "avg"  # avg, sum, min, max, count
    group_by: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None

class ReportGenerationRequest(BaseModel):
    template_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    file_format: str = "json"  # json, pdf, xlsx, csv
    expires_in_days: Optional[int] = 30