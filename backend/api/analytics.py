from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from database import get_db
from services.analytics_service import AnalyticsService
from schemas.analytics_schemas import (
    DocumentAnalytics, DocumentAnalyticsCreate, DocumentAnalyticsUpdate,
    UserActivityLog, UserActivityLogCreate,
    SystemMetrics, SystemMetricsCreate,
    WorkflowAnalytics, WorkflowAnalyticsCreate, WorkflowAnalyticsUpdate,
    ReportTemplate, ReportTemplateCreate, ReportTemplateUpdate,
    GeneratedReport, GeneratedReportCreate, GeneratedReportUpdate,
    DashboardWidget, DashboardWidgetCreate, DashboardWidgetUpdate,
    AlertRule, AlertRuleCreate, AlertRuleUpdate,
    AnalyticsFilters, MetricsQuery, ReportGenerationRequest,
    DocumentAnalyticsSummary, UserActivitySummary,
    SystemMetricsSummary, WorkflowAnalyticsSummary
)
from auth import get_current_user
from models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)

# Document Analytics Endpoints
@router.post("/documents", response_model=DocumentAnalytics)
async def create_document_analytics(
    analytics_data: DocumentAnalyticsCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Create document analytics record"""
    return service.create_document_analytics(analytics_data)

@router.get("/documents/{document_id}", response_model=Optional[DocumentAnalytics])
async def get_document_analytics(
    document_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific document"""
    return service.get_document_analytics(document_id)

@router.put("/documents/{document_id}", response_model=Optional[DocumentAnalytics])
async def update_document_analytics(
    document_id: int,
    analytics_data: DocumentAnalyticsUpdate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Update document analytics"""
    result = service.update_document_analytics(document_id, analytics_data)
    if not result:
        raise HTTPException(status_code=404, detail="Document analytics not found")
    return result

@router.post("/documents/{document_id}/view")
async def increment_document_views(
    document_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Increment view count for a document"""
    analytics = service.increment_document_views(document_id, current_user.id)
    
    # Log the activity
    service.log_user_activity(UserActivityLogCreate(
        user_id=current_user.id,
        action="view",
        resource_type="document",
        resource_id=document_id,
        success=True
    ))
    
    return {"message": "View count incremented", "analytics": analytics}

@router.post("/documents/{document_id}/download")
async def increment_document_downloads(
    document_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Increment download count for a document"""
    analytics = service.increment_document_downloads(document_id, current_user.id)
    
    # Log the activity
    service.log_user_activity(UserActivityLogCreate(
        user_id=current_user.id,
        action="download",
        resource_type="document",
        resource_id=document_id,
        success=True
    ))
    
    return {"message": "Download count incremented", "analytics": analytics}

@router.get("/documents/summary", response_model=DocumentAnalyticsSummary)
async def get_document_analytics_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get document analytics summary"""
    filters = AnalyticsFilters(start_date=start_date, end_date=end_date)
    return service.get_document_analytics_summary(filters)

# User Activity Endpoints
@router.post("/activities", response_model=UserActivityLog)
async def log_user_activity(
    activity_data: UserActivityLogCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Log user activity"""
    return service.log_user_activity(activity_data)

@router.get("/activities", response_model=List[UserActivityLog])
async def get_user_activities(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get user activities with filters"""
    filters = AnalyticsFilters(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    return service.get_user_activities(filters)

@router.get("/activities/summary", response_model=UserActivitySummary)
async def get_user_activity_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get user activity summary"""
    filters = AnalyticsFilters(start_date=start_date, end_date=end_date)
    return service.get_user_activity_summary(filters)

# System Metrics Endpoints
@router.post("/metrics", response_model=SystemMetrics)
async def record_system_metric(
    metric_data: SystemMetricsCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Record a system metric"""
    return service.record_system_metric(metric_data)

@router.post("/metrics/query", response_model=List[SystemMetrics])
async def query_system_metrics(
    query: MetricsQuery,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Query system metrics"""
    return service.get_system_metrics(query)

@router.get("/metrics/summary", response_model=SystemMetricsSummary)
async def get_system_metrics_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get system metrics summary"""
    filters = AnalyticsFilters(start_date=start_date, end_date=end_date)
    return service.get_system_metrics_summary(filters)

# Workflow Analytics Endpoints
@router.post("/workflows", response_model=WorkflowAnalytics)
async def create_workflow_analytics(
    analytics_data: WorkflowAnalyticsCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Create workflow analytics record"""
    return service.create_workflow_analytics(analytics_data)

@router.get("/workflows/{workflow_id}", response_model=Optional[WorkflowAnalytics])
async def get_workflow_analytics(
    workflow_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific workflow"""
    return service.get_workflow_analytics(workflow_id)

@router.put("/workflows/{workflow_id}", response_model=Optional[WorkflowAnalytics])
async def update_workflow_analytics(
    workflow_id: int,
    analytics_data: WorkflowAnalyticsUpdate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Update workflow analytics"""
    result = service.update_workflow_analytics(workflow_id, analytics_data)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow analytics not found")
    return result

@router.post("/workflows/{workflow_id}/execution")
async def record_workflow_execution(
    workflow_id: int,
    execution_time: float = Query(..., description="Execution time in seconds"),
    success: bool = Query(..., description="Whether the execution was successful"),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Record a workflow execution"""
    analytics = service.record_workflow_execution(workflow_id, execution_time, success, current_user.id)
    
    # Log the activity
    service.log_user_activity(UserActivityLogCreate(
        user_id=current_user.id,
        action="execute",
        resource_type="workflow",
        resource_id=workflow_id,
        success=success,
        response_time_ms=int(execution_time * 1000)
    ))
    
    return {"message": "Workflow execution recorded", "analytics": analytics}

@router.get("/workflows/summary", response_model=WorkflowAnalyticsSummary)
async def get_workflow_analytics_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get workflow analytics summary"""
    filters = AnalyticsFilters(start_date=start_date, end_date=end_date)
    return service.get_workflow_analytics_summary(filters)

# Report Template Endpoints
@router.post("/report-templates", response_model=ReportTemplate)
async def create_report_template(
    template_data: ReportTemplateCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new report template"""
    template_data.created_by = current_user.id
    return service.create_report_template(template_data)

@router.get("/report-templates", response_model=List[ReportTemplate])
async def get_report_templates(
    category: Optional[str] = Query(None),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get report templates"""
    return service.get_report_templates(current_user.id, category)

@router.get("/report-templates/{template_id}", response_model=Optional[ReportTemplate])
async def get_report_template(
    template_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get a specific report template"""
    template = service.get_report_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Report template not found")
    
    # Check access permissions
    if not template.is_public and template.created_by != current_user.id:
        if not template.allowed_users or current_user.id not in template.allowed_users:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return template

@router.put("/report-templates/{template_id}", response_model=Optional[ReportTemplate])
async def update_report_template(
    template_id: int,
    template_data: ReportTemplateUpdate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Update a report template"""
    template = service.get_report_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Report template not found")
    
    # Check permissions
    if template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = service.update_report_template(template_id, template_data)
    return result

@router.delete("/report-templates/{template_id}")
async def delete_report_template(
    template_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Delete a report template"""
    template = service.get_report_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Report template not found")
    
    # Check permissions
    if template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = service.delete_report_template(template_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete template")
    
    return {"message": "Report template deleted successfully"}

# Generated Report Endpoints
@router.post("/reports/generate", response_model=GeneratedReport)
async def generate_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Generate a report from a template"""
    # Check template access
    template = service.get_report_template(request.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Report template not found")
    
    if not template.is_public and template.created_by != current_user.id:
        if not template.allowed_users or current_user.id not in template.allowed_users:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate report
    report = service.generate_report(request, current_user.id)
    
    # Log the activity
    service.log_user_activity(UserActivityLogCreate(
        user_id=current_user.id,
        action="generate_report",
        resource_type="report_template",
        resource_id=request.template_id,
        success=report.status == "completed"
    ))
    
    return report

@router.get("/reports", response_model=List[GeneratedReport])
async def get_generated_reports(
    template_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get generated reports for the current user"""
    # This would need to be implemented in the service
    # For now, return empty list
    return []

@router.get("/reports/{report_id}", response_model=Optional[GeneratedReport])
async def get_generated_report(
    report_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get a specific generated report"""
    # This would need to be implemented in the service
    raise HTTPException(status_code=501, detail="Not implemented")

@router.delete("/reports/{report_id}")
async def delete_generated_report(
    report_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Delete a generated report"""
    # This would need to be implemented in the service
    raise HTTPException(status_code=501, detail="Not implemented")

# Dashboard Widget Endpoints
@router.post("/dashboard/widgets", response_model=DashboardWidget)
async def create_dashboard_widget(
    widget_data: DashboardWidgetCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new dashboard widget"""
    widget_data.created_by = current_user.id
    return service.create_dashboard_widget(widget_data)

@router.get("/dashboard/widgets", response_model=List[DashboardWidget])
async def get_dashboard_widgets(
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard widgets for the current user"""
    return service.get_dashboard_widgets(current_user.id)

@router.get("/dashboard/widgets/{widget_id}/data")
async def get_widget_data(
    widget_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get data for a specific widget"""
    # This would fetch data based on the widget's data_source configuration
    # For now, return sample data
    return {
        "data": [],
        "timestamp": datetime.utcnow(),
        "status": "success"
    }

# Alert Rule Endpoints
@router.post("/alerts/rules", response_model=AlertRule)
async def create_alert_rule(
    rule_data: AlertRuleCreate,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new alert rule"""
    rule_data.created_by = current_user.id
    return service.create_alert_rule(rule_data)

@router.get("/alerts/rules", response_model=List[AlertRule])
async def get_alert_rules(
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Get alert rules for the current user"""
    return service.get_alert_rules(current_user.id)

@router.post("/alerts/evaluate")
async def evaluate_alert_rules(
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger alert rule evaluation"""
    background_tasks.add_task(service.evaluate_alert_rules)
    return {"message": "Alert rule evaluation started"}

# Utility Endpoints
@router.post("/cleanup/reports")
async def cleanup_expired_reports(
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Clean up expired reports"""
    background_tasks.add_task(service.cleanup_expired_reports)
    return {"message": "Report cleanup started"}

@router.post("/cleanup/activities")
async def cleanup_old_activities(
    days_to_keep: int = Query(90, ge=1, le=365),
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Clean up old activity logs"""
    background_tasks.add_task(service.cleanup_old_activity_logs, days_to_keep)
    return {"message": f"Activity log cleanup started (keeping {days_to_keep} days)"}

@router.post("/cleanup/metrics")
async def cleanup_old_metrics(
    days_to_keep: int = Query(30, ge=1, le=365),
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """Clean up old system metrics"""
    background_tasks.add_task(service.cleanup_old_metrics, days_to_keep)
    return {"message": f"Metrics cleanup started (keeping {days_to_keep} days)"}

# Health Check Endpoint
@router.get("/health")
async def analytics_health_check(
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Health check for analytics system"""
    try:
        # Simple health check - count recent metrics
        recent_metrics_count = service.db.query(SystemMetrics).filter(
            SystemMetrics.timestamp >= datetime.utcnow() - timedelta(hours=1)
        ).count()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "recent_metrics_count": recent_metrics_count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow(),
            "error": str(e)
        }