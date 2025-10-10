from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc, text
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from models.analytics_models import (
    DocumentAnalytics, UserActivityLog, SystemMetrics, WorkflowAnalytics,
    ReportTemplate, GeneratedReport, DashboardWidget, AlertRule
)
from models.document import Document
from models.user import User
from models.advanced import Workflow
from schemas.analytics_schemas import (
    DocumentAnalyticsCreate, DocumentAnalyticsUpdate,
    UserActivityLogCreate, SystemMetricsCreate,
    WorkflowAnalyticsCreate, WorkflowAnalyticsUpdate,
    ReportTemplateCreate, ReportTemplateUpdate,
    GeneratedReportCreate, GeneratedReportUpdate,
    DashboardWidgetCreate, DashboardWidgetUpdate,
    AlertRuleCreate, AlertRuleUpdate,
    AnalyticsFilters, MetricsQuery, ReportGenerationRequest,
    DocumentAnalyticsSummary, UserActivitySummary,
    SystemMetricsSummary, WorkflowAnalyticsSummary
)
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    # Document Analytics Methods
    def create_document_analytics(self, analytics_data: DocumentAnalyticsCreate) -> DocumentAnalytics:
        """Create new document analytics record"""
        db_analytics = DocumentAnalytics(**analytics_data.model_dump())
        self.db.add(db_analytics)
        self.db.commit()
        self.db.refresh(db_analytics)
        return db_analytics

    def get_document_analytics(self, document_id: int) -> Optional[DocumentAnalytics]:
        """Get analytics for a specific document"""
        return self.db.query(DocumentAnalytics).filter(
            DocumentAnalytics.document_id == document_id
        ).first()

    def update_document_analytics(self, document_id: int, analytics_data: DocumentAnalyticsUpdate) -> Optional[DocumentAnalytics]:
        """Update document analytics"""
        db_analytics = self.get_document_analytics(document_id)
        if not db_analytics:
            return None
        
        update_data = analytics_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_analytics, field, value)
        
        self.db.commit()
        self.db.refresh(db_analytics)
        return db_analytics

    def increment_document_views(self, document_id: int, user_id: Optional[int] = None) -> DocumentAnalytics:
        """Increment view count for a document"""
        analytics = self.get_document_analytics(document_id)
        if not analytics:
            analytics = self.create_document_analytics(
                DocumentAnalyticsCreate(document_id=document_id, view_count=1, unique_viewers=1)
            )
        else:
            analytics.view_count += 1
            analytics.last_viewed_at = datetime.utcnow()
            
            # Update unique viewers if user_id provided
            if user_id:
                # Check if this user has viewed before
                existing_view = self.db.query(UserActivityLog).filter(
                    and_(
                        UserActivityLog.user_id == user_id,
                        UserActivityLog.action == "view",
                        UserActivityLog.resource_type == "document",
                        UserActivityLog.resource_id == document_id
                    )
                ).first()
                
                if not existing_view:
                    analytics.unique_viewers += 1
            
            self.db.commit()
            self.db.refresh(analytics)
        
        return analytics

    def increment_document_downloads(self, document_id: int, user_id: Optional[int] = None) -> DocumentAnalytics:
        """Increment download count for a document"""
        analytics = self.get_document_analytics(document_id)
        if not analytics:
            analytics = self.create_document_analytics(
                DocumentAnalyticsCreate(document_id=document_id, download_count=1, unique_downloaders=1)
            )
        else:
            analytics.download_count += 1
            analytics.last_downloaded_at = datetime.utcnow()
            
            # Update unique downloaders if user_id provided
            if user_id:
                existing_download = self.db.query(UserActivityLog).filter(
                    and_(
                        UserActivityLog.user_id == user_id,
                        UserActivityLog.action == "download",
                        UserActivityLog.resource_type == "document",
                        UserActivityLog.resource_id == document_id
                    )
                ).first()
                
                if not existing_download:
                    analytics.unique_downloaders += 1
            
            self.db.commit()
            self.db.refresh(analytics)
        
        return analytics

    def get_document_analytics_summary(self, filters: AnalyticsFilters) -> DocumentAnalyticsSummary:
        """Get summary of document analytics"""
        query = self.db.query(DocumentAnalytics)
        
        if filters.start_date:
            query = query.filter(DocumentAnalytics.created_at >= filters.start_date)
        if filters.end_date:
            query = query.filter(DocumentAnalytics.created_at <= filters.end_date)
        
        analytics = query.all()
        
        total_documents = len(analytics)
        total_views = sum(a.view_count for a in analytics)
        total_downloads = sum(a.download_count for a in analytics)
        
        # Calculate averages
        processing_times = [a.processing_time_seconds for a in analytics if a.processing_time_seconds]
        confidence_scores = [a.ocr_confidence_score for a in analytics if a.ocr_confidence_score]
        
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else None
        avg_confidence_score = sum(confidence_scores) / len(confidence_scores) if confidence_scores else None
        
        total_storage_size = sum(a.file_size_bytes or 0 for a in analytics)
        
        # Most viewed/downloaded documents
        most_viewed = sorted(analytics, key=lambda x: x.view_count, reverse=True)[:10]
        most_downloaded = sorted(analytics, key=lambda x: x.download_count, reverse=True)[:10]
        
        most_viewed_docs = [
            {"document_id": a.document_id, "views": a.view_count}
            for a in most_viewed
        ]
        
        most_downloaded_docs = [
            {"document_id": a.document_id, "downloads": a.download_count}
            for a in most_downloaded
        ]
        
        return DocumentAnalyticsSummary(
            total_documents=total_documents,
            total_views=total_views,
            total_downloads=total_downloads,
            average_processing_time=avg_processing_time,
            average_confidence_score=avg_confidence_score,
            total_storage_size=total_storage_size,
            most_viewed_documents=most_viewed_docs,
            most_downloaded_documents=most_downloaded_docs
        )

    # User Activity Methods
    def log_user_activity(self, activity_data: UserActivityLogCreate) -> UserActivityLog:
        """Log user activity"""
        db_activity = UserActivityLog(**activity_data.model_dump())
        self.db.add(db_activity)
        self.db.commit()
        self.db.refresh(db_activity)
        return db_activity

    def get_user_activities(self, filters: AnalyticsFilters) -> List[UserActivityLog]:
        """Get user activities with filters"""
        query = self.db.query(UserActivityLog)
        
        if filters.user_id:
            query = query.filter(UserActivityLog.user_id == filters.user_id)
        if filters.action:
            query = query.filter(UserActivityLog.action == filters.action)
        if filters.start_date:
            query = query.filter(UserActivityLog.timestamp >= filters.start_date)
        if filters.end_date:
            query = query.filter(UserActivityLog.timestamp <= filters.end_date)
        if filters.resource_type:
            query = query.filter(UserActivityLog.resource_type == filters.resource_type)
        
        return query.offset(filters.offset).limit(filters.limit).all()

    def get_user_activity_summary(self, filters: AnalyticsFilters) -> UserActivitySummary:
        """Get summary of user activities"""
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Total users
        total_users = self.db.query(User).count()
        
        # Active users
        active_today = self.db.query(UserActivityLog.user_id).filter(
            UserActivityLog.timestamp >= today
        ).distinct().count()
        
        active_week = self.db.query(UserActivityLog.user_id).filter(
            UserActivityLog.timestamp >= week_ago
        ).distinct().count()
        
        active_month = self.db.query(UserActivityLog.user_id).filter(
            UserActivityLog.timestamp >= month_ago
        ).distinct().count()
        
        # Most common actions
        action_counts = self.db.query(
            UserActivityLog.action,
            func.count(UserActivityLog.id).label('count')
        ).group_by(UserActivityLog.action).order_by(desc('count')).limit(10).all()
        
        most_common_actions = [
            {"action": action, "count": count}
            for action, count in action_counts
        ]
        
        # Peak activity hours (simplified)
        hour_counts = self.db.query(
            func.extract('hour', UserActivityLog.timestamp).label('hour'),
            func.count(UserActivityLog.id).label('count')
        ).filter(
            UserActivityLog.timestamp >= today - timedelta(days=7)
        ).group_by('hour').order_by(desc('count')).limit(5).all()
        
        peak_hours = [int(hour) for hour, count in hour_counts]
        
        return UserActivitySummary(
            total_users=total_users,
            active_users_today=active_today,
            active_users_week=active_week,
            active_users_month=active_month,
            most_common_actions=most_common_actions,
            peak_activity_hours=peak_hours
        )

    # System Metrics Methods
    def record_system_metric(self, metric_data: SystemMetricsCreate) -> SystemMetrics:
        """Record a system metric"""
        db_metric = SystemMetrics(**metric_data.model_dump())
        self.db.add(db_metric)
        self.db.commit()
        self.db.refresh(db_metric)
        return db_metric

    def get_system_metrics(self, query: MetricsQuery) -> List[SystemMetrics]:
        """Get system metrics based on query"""
        db_query = self.db.query(SystemMetrics).filter(
            and_(
                SystemMetrics.metric_name.in_(query.metric_names),
                SystemMetrics.timestamp >= query.start_time,
                SystemMetrics.timestamp <= query.end_time
            )
        )
        
        return db_query.order_by(SystemMetrics.timestamp).all()

    def get_system_metrics_summary(self, filters: AnalyticsFilters) -> SystemMetricsSummary:
        """Get summary of system metrics"""
        query = self.db.query(SystemMetrics)
        
        if filters.start_date:
            query = query.filter(SystemMetrics.timestamp >= filters.start_date)
        if filters.end_date:
            query = query.filter(SystemMetrics.timestamp <= filters.end_date)
        
        total_metrics = query.count()
        latest_metrics = query.order_by(desc(SystemMetrics.timestamp)).limit(10).all()
        
        # Get metric trends (simplified)
        metric_names = self.db.query(SystemMetrics.metric_name).distinct().all()
        metric_trends = {}
        
        for (metric_name,) in metric_names:
            trend_data = query.filter(SystemMetrics.metric_name == metric_name).order_by(
                SystemMetrics.timestamp
            ).limit(100).all()
            
            metric_trends[metric_name] = [
                {"timestamp": m.timestamp.isoformat(), "value": m.value}
                for m in trend_data
            ]
        
        # Calculate system health score (simplified)
        recent_errors = query.filter(
            and_(
                SystemMetrics.metric_name.like('%error%'),
                SystemMetrics.timestamp >= datetime.utcnow() - timedelta(hours=1)
            )
        ).count()
        
        health_score = max(0, 100 - (recent_errors * 10))
        
        # Count alerts triggered
        alerts_triggered = self.db.query(AlertRule).filter(
            AlertRule.last_triggered_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        return SystemMetricsSummary(
            total_metrics=total_metrics,
            latest_metrics=latest_metrics,
            metric_trends=metric_trends,
            system_health_score=health_score,
            alerts_triggered=alerts_triggered
        )

    # Workflow Analytics Methods
    def create_workflow_analytics(self, analytics_data: WorkflowAnalyticsCreate) -> WorkflowAnalytics:
        """Create workflow analytics record"""
        db_analytics = WorkflowAnalytics(**analytics_data.model_dump())
        self.db.add(db_analytics)
        self.db.commit()
        self.db.refresh(db_analytics)
        return db_analytics

    def get_workflow_analytics(self, workflow_id: int) -> Optional[WorkflowAnalytics]:
        """Get analytics for a specific workflow"""
        return self.db.query(WorkflowAnalytics).filter(
            WorkflowAnalytics.workflow_id == workflow_id
        ).first()

    def update_workflow_analytics(self, workflow_id: int, analytics_data: WorkflowAnalyticsUpdate) -> Optional[WorkflowAnalytics]:
        """Update workflow analytics"""
        db_analytics = self.get_workflow_analytics(workflow_id)
        if not db_analytics:
            return None
        
        update_data = analytics_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_analytics, field, value)
        
        self.db.commit()
        self.db.refresh(db_analytics)
        return db_analytics

    def record_workflow_execution(self, workflow_id: int, execution_time: float, success: bool, user_id: Optional[int] = None):
        """Record a workflow execution"""
        analytics = self.get_workflow_analytics(workflow_id)
        if not analytics:
            analytics = self.create_workflow_analytics(
                WorkflowAnalyticsCreate(
                    workflow_id=workflow_id,
                    total_executions=1,
                    successful_executions=1 if success else 0,
                    failed_executions=0 if success else 1,
                    average_execution_time=execution_time,
                    min_execution_time=execution_time,
                    max_execution_time=execution_time
                )
            )
        else:
            analytics.total_executions += 1
            if success:
                analytics.successful_executions += 1
            else:
                analytics.failed_executions += 1
            
            # Update execution time statistics
            if analytics.average_execution_time:
                analytics.average_execution_time = (
                    (analytics.average_execution_time * (analytics.total_executions - 1) + execution_time) /
                    analytics.total_executions
                )
            else:
                analytics.average_execution_time = execution_time
            
            if not analytics.min_execution_time or execution_time < analytics.min_execution_time:
                analytics.min_execution_time = execution_time
            
            if not analytics.max_execution_time or execution_time > analytics.max_execution_time:
                analytics.max_execution_time = execution_time
            
            analytics.last_execution_at = datetime.utcnow()
            
            # Update user interaction count
            if user_id:
                analytics.total_user_interactions += 1
                # Check if this is a unique user
                existing_interaction = self.db.query(UserActivityLog).filter(
                    and_(
                        UserActivityLog.user_id == user_id,
                        UserActivityLog.resource_type == "workflow",
                        UserActivityLog.resource_id == workflow_id
                    )
                ).first()
                
                if not existing_interaction:
                    analytics.unique_users += 1
            
            self.db.commit()
            self.db.refresh(analytics)
        
        return analytics

    def get_workflow_analytics_summary(self, filters: AnalyticsFilters) -> WorkflowAnalyticsSummary:
        """Get summary of workflow analytics"""
        query = self.db.query(WorkflowAnalytics)
        
        if filters.start_date:
            query = query.filter(WorkflowAnalytics.created_at >= filters.start_date)
        if filters.end_date:
            query = query.filter(WorkflowAnalytics.created_at <= filters.end_date)
        
        analytics = query.all()
        
        total_workflows = len(analytics)
        total_executions = sum(a.total_executions for a in analytics)
        successful_executions = sum(a.successful_executions for a in analytics)
        
        success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
        
        execution_times = [a.average_execution_time for a in analytics if a.average_execution_time]
        avg_execution_time = sum(execution_times) / len(execution_times) if execution_times else None
        
        # Most used workflows
        most_used = sorted(analytics, key=lambda x: x.total_executions, reverse=True)[:10]
        most_used_workflows = [
            {"workflow_id": a.workflow_id, "executions": a.total_executions}
            for a in most_used
        ]
        
        # Most failed workflows
        most_failed = sorted(analytics, key=lambda x: x.failed_executions, reverse=True)[:10]
        most_failed_workflows = [
            {"workflow_id": a.workflow_id, "failures": a.failed_executions}
            for a in most_failed if a.failed_executions > 0
        ]
        
        return WorkflowAnalyticsSummary(
            total_workflows=total_workflows,
            total_executions=total_executions,
            success_rate=success_rate,
            average_execution_time=avg_execution_time,
            most_used_workflows=most_used_workflows,
            most_failed_workflows=most_failed_workflows
        )

    # Report Template Methods
    def create_report_template(self, template_data: ReportTemplateCreate) -> ReportTemplate:
        """Create a new report template"""
        db_template = ReportTemplate(**template_data.model_dump())
        self.db.add(db_template)
        self.db.commit()
        self.db.refresh(db_template)
        return db_template

    def get_report_templates(self, user_id: Optional[int] = None, category: Optional[str] = None) -> List[ReportTemplate]:
        """Get report templates with optional filtering"""
        query = self.db.query(ReportTemplate).filter(ReportTemplate.is_active == True)
        
        if category:
            query = query.filter(ReportTemplate.category == category)
        
        if user_id:
            query = query.filter(
                or_(
                    ReportTemplate.is_public == True,
                    ReportTemplate.created_by == user_id,
                    ReportTemplate.allowed_users.contains([user_id])
                )
            )
        
        return query.all()

    def get_report_template(self, template_id: int) -> Optional[ReportTemplate]:
        """Get a specific report template"""
        return self.db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()

    def update_report_template(self, template_id: int, template_data: ReportTemplateUpdate) -> Optional[ReportTemplate]:
        """Update a report template"""
        db_template = self.get_report_template(template_id)
        if not db_template:
            return None
        
        update_data = template_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_template, field, value)
        
        self.db.commit()
        self.db.refresh(db_template)
        return db_template

    def delete_report_template(self, template_id: int) -> bool:
        """Delete a report template"""
        db_template = self.get_report_template(template_id)
        if not db_template:
            return False
        
        self.db.delete(db_template)
        self.db.commit()
        return True

    # Generated Report Methods
    def generate_report(self, request: ReportGenerationRequest, user_id: int) -> GeneratedReport:
        """Generate a report from a template"""
        template = self.get_report_template(request.template_id)
        if not template:
            raise ValueError("Report template not found")
        
        start_time = datetime.utcnow()
        
        try:
            # Execute the query from template configuration
            report_data = self._execute_report_query(template.query_config, request.filters)
            
            generation_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Create generated report record
            report_create = GeneratedReportCreate(
                template_id=request.template_id,
                title=request.title or template.name,
                description=request.description or template.description,
                generated_by=user_id,
                generation_time_seconds=generation_time,
                data=report_data,
                applied_filters=request.filters,
                date_range_start=request.date_range_start,
                date_range_end=request.date_range_end,
                file_format=request.file_format
            )
            
            db_report = GeneratedReport(**report_create.model_dump())
            
            # Set expiration date
            if request.expires_in_days:
                db_report.expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
            
            self.db.add(db_report)
            self.db.commit()
            self.db.refresh(db_report)
            
            return db_report
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            # Create failed report record
            report_create = GeneratedReportCreate(
                template_id=request.template_id,
                title=request.title or template.name,
                generated_by=user_id,
                data={},
                status="failed",
                error_message=str(e)
            )
            
            db_report = GeneratedReport(**report_create.model_dump())
            self.db.add(db_report)
            self.db.commit()
            self.db.refresh(db_report)
            
            return db_report

    def _execute_report_query(self, query_config: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a report query based on configuration"""
        # This is a simplified implementation
        # In a real system, you'd have more sophisticated query execution
        
        query_type = query_config.get("type", "sql")
        
        if query_type == "sql":
            sql_query = query_config.get("query", "")
            # Apply filters to the query
            if filters:
                # Simple filter application - in production, use proper SQL parameter binding
                for key, value in filters.items():
                    sql_query = sql_query.replace(f":{key}", str(value))
            
            result = self.db.execute(text(sql_query))
            rows = result.fetchall()
            
            # Convert to list of dictionaries
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in rows]
            
            return {"data": data, "total": len(data)}
        
        elif query_type == "aggregation":
            # Handle aggregation queries
            return self._execute_aggregation_query(query_config, filters)
        
        else:
            raise ValueError(f"Unsupported query type: {query_type}")

    def _execute_aggregation_query(self, query_config: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute aggregation-based queries"""
        # Simplified aggregation query execution
        # This would be more sophisticated in a real implementation
        
        table = query_config.get("table")
        aggregations = query_config.get("aggregations", [])
        group_by = query_config.get("group_by", [])
        
        # This is a placeholder - implement actual aggregation logic
        return {"data": [], "total": 0}

    # Dashboard Widget Methods
    def create_dashboard_widget(self, widget_data: DashboardWidgetCreate) -> DashboardWidget:
        """Create a new dashboard widget"""
        db_widget = DashboardWidget(**widget_data.model_dump())
        self.db.add(db_widget)
        self.db.commit()
        self.db.refresh(db_widget)
        return db_widget

    def get_dashboard_widgets(self, user_id: Optional[int] = None) -> List[DashboardWidget]:
        """Get dashboard widgets for a user"""
        query = self.db.query(DashboardWidget).filter(DashboardWidget.is_active == True)
        
        if user_id:
            query = query.filter(
                or_(
                    DashboardWidget.is_public == True,
                    DashboardWidget.created_by == user_id,
                    DashboardWidget.allowed_users.contains([user_id])
                )
            )
        
        return query.order_by(DashboardWidget.position_y, DashboardWidget.position_x).all()

    # Alert Rule Methods
    def create_alert_rule(self, rule_data: AlertRuleCreate) -> AlertRule:
        """Create a new alert rule"""
        db_rule = AlertRule(**rule_data.model_dump())
        self.db.add(db_rule)
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule

    def get_alert_rules(self, user_id: Optional[int] = None) -> List[AlertRule]:
        """Get alert rules"""
        query = self.db.query(AlertRule).filter(AlertRule.is_active == True)
        
        if user_id:
            query = query.filter(AlertRule.created_by == user_id)
        
        return query.all()

    def evaluate_alert_rules(self):
        """Evaluate all active alert rules"""
        rules = self.get_alert_rules()
        
        for rule in rules:
            try:
                self._evaluate_single_alert_rule(rule)
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule.id}: {str(e)}")

    def _evaluate_single_alert_rule(self, rule: AlertRule):
        """Evaluate a single alert rule"""
        # Get recent metrics for the rule
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(seconds=rule.evaluation_window)
        
        metrics = self.db.query(SystemMetrics).filter(
            and_(
                SystemMetrics.metric_name == rule.metric_name,
                SystemMetrics.timestamp >= start_time,
                SystemMetrics.timestamp <= end_time
            )
        ).all()
        
        if not metrics:
            return
        
        # Calculate the metric value based on condition type
        values = [m.value for m in metrics]
        
        if rule.condition_type == "greater_than":
            current_value = max(values)
            triggered = current_value > rule.threshold_value
        elif rule.condition_type == "less_than":
            current_value = min(values)
            triggered = current_value < rule.threshold_value
        elif rule.condition_type == "equals":
            current_value = values[-1]  # Latest value
            triggered = current_value == rule.threshold_value
        else:
            return
        
        if triggered:
            rule.last_triggered_at = datetime.utcnow()
            rule.trigger_count += 1
            self.db.commit()
            
            # Here you would send notifications based on rule.notification_channels
            logger.info(f"Alert rule {rule.name} triggered: {current_value} {rule.condition_type} {rule.threshold_value}")

    # Cleanup Methods
    def cleanup_expired_reports(self):
        """Clean up expired generated reports"""
        expired_reports = self.db.query(GeneratedReport).filter(
            and_(
                GeneratedReport.expires_at.isnot(None),
                GeneratedReport.expires_at < datetime.utcnow()
            )
        ).all()
        
        for report in expired_reports:
            # Delete associated files if they exist
            if report.file_path:
                try:
                    import os
                    if os.path.exists(report.file_path):
                        os.remove(report.file_path)
                except Exception as e:
                    logger.error(f"Error deleting report file {report.file_path}: {str(e)}")
            
            self.db.delete(report)
        
        self.db.commit()
        logger.info(f"Cleaned up {len(expired_reports)} expired reports")

    def cleanup_old_activity_logs(self, days_to_keep: int = 90):
        """Clean up old activity logs"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        deleted_count = self.db.query(UserActivityLog).filter(
            UserActivityLog.timestamp < cutoff_date
        ).delete()
        
        self.db.commit()
        logger.info(f"Cleaned up {deleted_count} old activity logs")

    def cleanup_old_metrics(self, days_to_keep: int = 30):
        """Clean up old system metrics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        deleted_count = self.db.query(SystemMetrics).filter(
            SystemMetrics.timestamp < cutoff_date
        ).delete()
        
        self.db.commit()
        logger.info(f"Cleaned up {deleted_count} old system metrics")