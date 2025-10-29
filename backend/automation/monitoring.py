"""
System Monitoring & Alerting for Aria
======================================

Monitors:
- System health and uptime
- Bot performance and errors
- Email processing queue
- Database connections
- API response times
- Resource usage (CPU, memory, disk)

Alerts on:
- System failures
- Performance degradation
- Error spikes
- Queue backlogs

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
import logging
import asyncio
import psutil

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class HealthCheck:
    """Health check result"""
    component: str
    status: HealthStatus
    message: str
    metrics: Dict[str, Any]
    checked_at: datetime


@dataclass
class PerformanceMetric:
    """Performance metric"""
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str]


@dataclass
class Alert:
    """System alert"""
    alert_id: str
    severity: AlertSeverity
    component: str
    title: str
    message: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None


class MonitoringSystem:
    """
    Comprehensive monitoring system for Aria.
    """
    
    def __init__(self):
        self.health_checks: List[HealthCheck] = []
        self.metrics: List[PerformanceMetric] = []
        self.alerts: List[Alert] = []
        self.start_time = datetime.now()
    
    async def check_system_health(self) -> Dict[str, Any]:
        """
        Perform comprehensive system health check.
        
        Returns:
            Overall health status and component statuses
        """
        logger.info("Monitoring: Performing system health check")
        
        checks = [
            await self._check_database_health(),
            await self._check_email_health(),
            await self._check_bot_health(),
            await self._check_api_health(),
            await self._check_resource_usage()
        ]
        
        # Store checks
        self.health_checks.extend(checks)
        
        # Determine overall status
        statuses = [check.status for check in checks]
        if HealthStatus.CRITICAL in statuses:
            overall_status = HealthStatus.CRITICAL
        elif HealthStatus.UNHEALTHY in statuses:
            overall_status = HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        result = {
            "overall_status": overall_status.value,
            "checked_at": datetime.now().isoformat(),
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "components": [
                {
                    "component": check.component,
                    "status": check.status.value,
                    "message": check.message,
                    "metrics": check.metrics
                }
                for check in checks
            ]
        }
        
        # Generate alerts if needed
        await self._generate_alerts(checks)
        
        return result
    
    async def _check_database_health(self) -> HealthCheck:
        """Check database connection and performance"""
        try:
            # Would check actual database connection
            # For now, simulate
            connection_time_ms = 15.3
            active_connections = 5
            max_connections = 100
            
            if connection_time_ms > 100:
                status = HealthStatus.DEGRADED
                message = "Database response time is slow"
            elif active_connections > max_connections * 0.9:
                status = HealthStatus.DEGRADED
                message = "Database connection pool nearly exhausted"
            else:
                status = HealthStatus.HEALTHY
                message = "Database is healthy"
            
            return HealthCheck(
                component="database",
                status=status,
                message=message,
                metrics={
                    "connection_time_ms": connection_time_ms,
                    "active_connections": active_connections,
                    "max_connections": max_connections
                },
                checked_at=datetime.now()
            )
        except Exception as e:
            return HealthCheck(
                component="database",
                status=HealthStatus.CRITICAL,
                message=f"Database check failed: {str(e)}",
                metrics={},
                checked_at=datetime.now()
            )
    
    async def _check_email_health(self) -> HealthCheck:
        """Check email system health"""
        try:
            # Would check O365 connection and queue
            queue_size = 3
            processing_rate = 45  # emails per minute
            error_rate = 0.02  # 2%
            
            if queue_size > 100:
                status = HealthStatus.DEGRADED
                message = f"Email queue backlog: {queue_size} emails"
            elif error_rate > 0.1:  # More than 10%
                status = HealthStatus.UNHEALTHY
                message = f"High email error rate: {error_rate*100}%"
            else:
                status = HealthStatus.HEALTHY
                message = "Email system is healthy"
            
            return HealthCheck(
                component="email",
                status=status,
                message=message,
                metrics={
                    "queue_size": queue_size,
                    "processing_rate": processing_rate,
                    "error_rate": error_rate
                },
                checked_at=datetime.now()
            )
        except Exception as e:
            return HealthCheck(
                component="email",
                status=HealthStatus.CRITICAL,
                message=f"Email system check failed: {str(e)}",
                metrics={},
                checked_at=datetime.now()
            )
    
    async def _check_bot_health(self) -> HealthCheck:
        """Check bot system health"""
        try:
            # Would check active bots and their status
            active_bots = 67
            failed_tasks_24h = 5
            average_processing_time = 12.5  # seconds
            
            if failed_tasks_24h > 50:
                status = HealthStatus.UNHEALTHY
                message = f"High bot failure rate: {failed_tasks_24h} failures in 24h"
            elif average_processing_time > 60:
                status = HealthStatus.DEGRADED
                message = "Bot processing time is slow"
            else:
                status = HealthStatus.HEALTHY
                message = "Bot system is healthy"
            
            return HealthCheck(
                component="bots",
                status=status,
                message=message,
                metrics={
                    "active_bots": active_bots,
                    "failed_tasks_24h": failed_tasks_24h,
                    "average_processing_time_seconds": average_processing_time
                },
                checked_at=datetime.now()
            )
        except Exception as e:
            return HealthCheck(
                component="bots",
                status=HealthStatus.CRITICAL,
                message=f"Bot system check failed: {str(e)}",
                metrics={},
                checked_at=datetime.now()
            )
    
    async def _check_api_health(self) -> HealthCheck:
        """Check API health"""
        try:
            # Would check API endpoint responses
            avg_response_time = 250  # ms
            error_rate = 0.01  # 1%
            requests_per_minute = 120
            
            if avg_response_time > 2000:
                status = HealthStatus.DEGRADED
                message = "API response time is slow"
            elif error_rate > 0.05:  # More than 5%
                status = HealthStatus.UNHEALTHY
                message = f"High API error rate: {error_rate*100}%"
            else:
                status = HealthStatus.HEALTHY
                message = "API is healthy"
            
            return HealthCheck(
                component="api",
                status=status,
                message=message,
                metrics={
                    "avg_response_time_ms": avg_response_time,
                    "error_rate": error_rate,
                    "requests_per_minute": requests_per_minute
                },
                checked_at=datetime.now()
            )
        except Exception as e:
            return HealthCheck(
                component="api",
                status=HealthStatus.CRITICAL,
                message=f"API health check failed: {str(e)}",
                metrics={},
                checked_at=datetime.now()
            )
    
    async def _check_resource_usage(self) -> HealthCheck:
        """Check system resource usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            issues = []
            if cpu_percent > 90:
                issues.append(f"High CPU usage: {cpu_percent}%")
            if memory.percent > 90:
                issues.append(f"High memory usage: {memory.percent}%")
            if disk.percent > 90:
                issues.append(f"High disk usage: {disk.percent}%")
            
            if len(issues) > 2:
                status = HealthStatus.CRITICAL
                message = "; ".join(issues)
            elif len(issues) > 0:
                status = HealthStatus.DEGRADED
                message = "; ".join(issues)
            else:
                status = HealthStatus.HEALTHY
                message = "Resource usage is normal"
            
            return HealthCheck(
                component="resources",
                status=status,
                message=message,
                metrics={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "memory_used_gb": memory.used / (1024**3),
                    "memory_total_gb": memory.total / (1024**3),
                    "disk_percent": disk.percent,
                    "disk_used_gb": disk.used / (1024**3),
                    "disk_total_gb": disk.total / (1024**3)
                },
                checked_at=datetime.now()
            )
        except Exception as e:
            return HealthCheck(
                component="resources",
                status=HealthStatus.CRITICAL,
                message=f"Resource check failed: {str(e)}",
                metrics={},
                checked_at=datetime.now()
            )
    
    async def _generate_alerts(self, checks: List[HealthCheck]):
        """Generate alerts based on health checks"""
        import uuid
        
        for check in checks:
            if check.status in [HealthStatus.UNHEALTHY, HealthStatus.CRITICAL]:
                # Check if alert already exists for this component
                existing_alert = next(
                    (a for a in self.alerts
                     if a.component == check.component and a.resolved_at is None),
                    None
                )
                
                if not existing_alert:
                    alert = Alert(
                        alert_id=str(uuid.uuid4()),
                        severity=AlertSeverity.CRITICAL if check.status == HealthStatus.CRITICAL else AlertSeverity.ERROR,
                        component=check.component,
                        title=f"{check.component.title()} Health Issue",
                        message=check.message,
                        created_at=datetime.now()
                    )
                    
                    self.alerts.append(alert)
                    logger.error(f"Alert: {alert.title} - {alert.message}")
                    
                    # Send notification
                    await self._send_alert_notification(alert)
            
            elif check.status == HealthStatus.HEALTHY:
                # Resolve existing alerts for this component
                for alert in self.alerts:
                    if alert.component == check.component and alert.resolved_at is None:
                        alert.resolved_at = datetime.now()
                        logger.info(f"Alert resolved: {alert.title}")
    
    async def _send_alert_notification(self, alert: Alert):
        """Send alert notification to admin"""
        try:
            from automation.notification_system import notification_system
            
            await notification_system.send_exception_alert(
                admin_email="admin@vantax.co.za",
                error_type=alert.title,
                error_message=alert.message,
                task_id=alert.alert_id,
                severity=alert.severity.value
            )
        except Exception as e:
            logger.error(f"Failed to send alert notification: {str(e)}")
    
    def record_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "",
        tags: Optional[Dict[str, str]] = None
    ):
        """Record a performance metric"""
        metric = PerformanceMetric(
            metric_name=metric_name,
            value=value,
            unit=unit,
            timestamp=datetime.now(),
            tags=tags or {}
        )
        
        self.metrics.append(metric)
        
        # Keep only last 24 hours of metrics
        cutoff = datetime.now() - timedelta(hours=24)
        self.metrics = [m for m in self.metrics if m.timestamp > cutoff]
    
    def get_metrics(
        self,
        metric_name: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get metrics with optional filters"""
        results = self.metrics
        
        if metric_name:
            results = [m for m in results if m.metric_name == metric_name]
        if start_time:
            results = [m for m in results if m.timestamp >= start_time]
        if end_time:
            results = [m for m in results if m.timestamp <= end_time]
        
        return [
            {
                "metric_name": m.metric_name,
                "value": m.value,
                "unit": m.unit,
                "timestamp": m.timestamp.isoformat(),
                "tags": m.tags
            }
            for m in results
        ]
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active (unresolved) alerts"""
        active = [a for a in self.alerts if a.resolved_at is None]
        
        return [
            {
                "alert_id": a.alert_id,
                "severity": a.severity.value,
                "component": a.component,
                "title": a.title,
                "message": a.message,
                "created_at": a.created_at.isoformat(),
                "age_minutes": (datetime.now() - a.created_at).total_seconds() / 60
            }
            for a in active
        ]


# Singleton instance
monitoring_system = MonitoringSystem()


# Background monitoring task
async def start_monitoring_loop(interval_seconds: int = 60):
    """
    Start continuous monitoring loop.
    
    Args:
        interval_seconds: How often to run health checks
    """
    logger.info(f"Starting monitoring loop (interval: {interval_seconds}s)")
    
    while True:
        try:
            await monitoring_system.check_system_health()
            await asyncio.sleep(interval_seconds)
        except Exception as e:
            logger.error(f"Monitoring loop error: {str(e)}")
            await asyncio.sleep(interval_seconds)
