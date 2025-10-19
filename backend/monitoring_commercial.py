"""
Commercial Monitoring and Alerting System
Comprehensive logging, metrics collection, health checks, and alerting
"""

import asyncio
import json
import logging
import time
import os
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from dataclasses import dataclass, asdict
from enum import Enum
import psutil
import aiohttp
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class Alert:
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime
    source: str
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level.value,
            "title": self.title,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "source": self.source,
            "metadata": self.metadata or {}
        }

class SystemHealthChecker:
    """System health monitoring"""
    
    def __init__(self):
        self.health_checks = {}
        self.last_check_time = None
        self.health_history = []
    
    def register_health_check(self, name: str, check_func: Callable, critical: bool = False):
        """Register a health check function"""
        self.health_checks[name] = {
            "func": check_func,
            "critical": critical,
            "last_result": None,
            "last_check": None
        }
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all registered health checks"""
        results = {}
        overall_status = "healthy"
        
        for name, check_info in self.health_checks.items():
            try:
                start_time = time.time()
                
                if asyncio.iscoroutinefunction(check_info["func"]):
                    result = await check_info["func"]()
                else:
                    result = check_info["func"]()
                
                execution_time = time.time() - start_time
                
                check_result = {
                    "status": "healthy" if result.get("healthy", True) else "unhealthy",
                    "message": result.get("message", "OK"),
                    "execution_time": execution_time,
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": result.get("details", {})
                }
                
                # Update overall status
                if not result.get("healthy", True):
                    if check_info["critical"]:
                        overall_status = "critical"
                    elif overall_status == "healthy":
                        overall_status = "degraded"
                
                results[name] = check_result
                check_info["last_result"] = check_result
                check_info["last_check"] = datetime.utcnow()
                
            except Exception as e:
                error_result = {
                    "status": "error",
                    "message": f"Health check failed: {str(e)}",
                    "execution_time": 0,
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": {"error": str(e)}
                }
                
                results[name] = error_result
                check_info["last_result"] = error_result
                
                if check_info["critical"]:
                    overall_status = "critical"
                elif overall_status == "healthy":
                    overall_status = "degraded"
        
        health_report = {
            "overall_status": overall_status,
            "checks": results,
            "timestamp": datetime.utcnow().isoformat(),
            "check_count": len(results)
        }
        
        # Store in history
        self.health_history.append(health_report)
        if len(self.health_history) > 100:  # Keep last 100 checks
            self.health_history = self.health_history[-100:]
        
        self.last_check_time = datetime.utcnow()
        return health_report
    
    def get_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health check history"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [
            check for check in self.health_history
            if datetime.fromisoformat(check["timestamp"]) > cutoff_time
        ]

class MetricsCollector:
    """System metrics collection"""
    
    def __init__(self):
        self.metrics_history = []
        self.custom_metrics = {}
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect system-level metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            
            # Network metrics (if available)
            try:
                network = psutil.net_io_counters()
                network_metrics = {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv
                }
            except:
                network_metrics = {}
            
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used,
                    "free": memory.free
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": (disk.used / disk.total) * 100
                },
                "network": network_metrics
            }
            
            # Store in history
            self.metrics_history.append(metrics)
            if len(self.metrics_history) > 1000:  # Keep last 1000 metrics
                self.metrics_history = self.metrics_history[-1000:]
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}
    
    def add_custom_metric(self, name: str, value: Any, tags: Dict[str, str] = None):
        """Add custom application metric"""
        metric = {
            "value": value,
            "timestamp": datetime.utcnow().isoformat(),
            "tags": tags or {}
        }
        
        if name not in self.custom_metrics:
            self.custom_metrics[name] = []
        
        self.custom_metrics[name].append(metric)
        
        # Keep only last 100 values per metric
        if len(self.custom_metrics[name]) > 100:
            self.custom_metrics[name] = self.custom_metrics[name][-100:]
    
    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get metrics summary for the specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent metrics
        recent_metrics = [
            m for m in self.metrics_history
            if datetime.fromisoformat(m["timestamp"]) > cutoff_time
        ]
        
        if not recent_metrics:
            return {"error": "No metrics available for the specified period"}
        
        # Calculate averages
        avg_cpu = sum(m["cpu"]["percent"] for m in recent_metrics) / len(recent_metrics)
        avg_memory = sum(m["memory"]["percent"] for m in recent_metrics) / len(recent_metrics)
        avg_disk = sum(m["disk"]["percent"] for m in recent_metrics) / len(recent_metrics)
        
        return {
            "period_hours": hours,
            "sample_count": len(recent_metrics),
            "averages": {
                "cpu_percent": avg_cpu,
                "memory_percent": avg_memory,
                "disk_percent": avg_disk
            },
            "latest": recent_metrics[-1] if recent_metrics else None,
            "custom_metrics": self.custom_metrics
        }

class AlertManager:
    """Alert management and notification system"""
    
    def __init__(self):
        self.alerts = []
        self.alert_rules = []
        self.notification_channels = {}
        self.alert_history = []
    
    def add_alert_rule(self, name: str, condition: Callable, level: AlertLevel, 
                      message_template: str, cooldown_minutes: int = 5):
        """Add an alert rule"""
        self.alert_rules.append({
            "name": name,
            "condition": condition,
            "level": level,
            "message_template": message_template,
            "cooldown_minutes": cooldown_minutes,
            "last_triggered": None
        })
    
    def add_notification_channel(self, name: str, channel_type: str, config: Dict[str, Any]):
        """Add notification channel (email, webhook, etc.)"""
        self.notification_channels[name] = {
            "type": channel_type,
            "config": config,
            "enabled": True
        }
    
    async def check_alert_rules(self, metrics: Dict[str, Any], health_status: Dict[str, Any]):
        """Check all alert rules against current metrics and health status"""
        current_time = datetime.utcnow()
        
        for rule in self.alert_rules:
            try:
                # Check cooldown
                if rule["last_triggered"]:
                    time_since_last = current_time - rule["last_triggered"]
                    if time_since_last.total_seconds() < rule["cooldown_minutes"] * 60:
                        continue
                
                # Evaluate condition
                context = {
                    "metrics": metrics,
                    "health": health_status,
                    "time": current_time
                }
                
                if rule["condition"](context):
                    # Create alert
                    alert = Alert(
                        level=rule["level"],
                        title=rule["name"],
                        message=rule["message_template"].format(**context),
                        timestamp=current_time,
                        source="alert_manager",
                        metadata={"rule": rule["name"], "context": context}
                    )
                    
                    await self.trigger_alert(alert)
                    rule["last_triggered"] = current_time
                    
            except Exception as e:
                logger.error(f"Error checking alert rule {rule['name']}: {e}")
    
    async def trigger_alert(self, alert: Alert):
        """Trigger an alert and send notifications"""
        self.alerts.append(alert)
        self.alert_history.append(alert)
        
        # Keep only last 1000 alerts in memory
        if len(self.alerts) > 1000:
            self.alerts = self.alerts[-1000:]
        
        logger.warning(f"Alert triggered: {alert.title} - {alert.message}")
        
        # Send notifications
        for channel_name, channel in self.notification_channels.items():
            if channel["enabled"]:
                try:
                    await self._send_notification(channel, alert)
                except Exception as e:
                    logger.error(f"Failed to send notification via {channel_name}: {e}")
    
    async def _send_notification(self, channel: Dict[str, Any], alert: Alert):
        """Send notification through specified channel"""
        if channel["type"] == "email":
            await self._send_email_notification(channel["config"], alert)
        elif channel["type"] == "webhook":
            await self._send_webhook_notification(channel["config"], alert)
        elif channel["type"] == "slack":
            await self._send_slack_notification(channel["config"], alert)
    
    async def _send_email_notification(self, config: Dict[str, Any], alert: Alert):
        """Send email notification"""
        try:
            msg = MimeMultipart()
            msg['From'] = config["from_email"]
            msg['To'] = config["to_email"]
            msg['Subject'] = f"[{alert.level.value.upper()}] {alert.title}"
            
            body = f"""
            Alert Level: {alert.level.value.upper()}
            Title: {alert.title}
            Message: {alert.message}
            Time: {alert.timestamp}
            Source: {alert.source}
            
            Metadata: {json.dumps(alert.metadata, indent=2)}
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(config["smtp_server"], config["smtp_port"])
            if config.get("use_tls"):
                server.starttls()
            if config.get("username"):
                server.login(config["username"], config["password"])
            
            server.send_message(msg)
            server.quit()
            
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
    
    async def _send_webhook_notification(self, config: Dict[str, Any], alert: Alert):
        """Send webhook notification"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "alert": alert.to_dict(),
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                async with session.post(
                    config["url"],
                    json=payload,
                    headers=config.get("headers", {}),
                    timeout=10
                ) as response:
                    if response.status >= 400:
                        logger.error(f"Webhook notification failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Webhook notification failed: {e}")
    
    async def _send_slack_notification(self, config: Dict[str, Any], alert: Alert):
        """Send Slack notification"""
        try:
            color_map = {
                AlertLevel.INFO: "good",
                AlertLevel.WARNING: "warning", 
                AlertLevel.ERROR: "danger",
                AlertLevel.CRITICAL: "danger"
            }
            
            payload = {
                "text": f"Alert: {alert.title}",
                "attachments": [{
                    "color": color_map.get(alert.level, "warning"),
                    "fields": [
                        {"title": "Level", "value": alert.level.value.upper(), "short": True},
                        {"title": "Source", "value": alert.source, "short": True},
                        {"title": "Message", "value": alert.message, "short": False},
                        {"title": "Time", "value": alert.timestamp.isoformat(), "short": True}
                    ]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    config["webhook_url"],
                    json=payload,
                    timeout=10
                ) as response:
                    if response.status >= 400:
                        logger.error(f"Slack notification failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Slack notification failed: {e}")
    
    def get_active_alerts(self, level: Optional[AlertLevel] = None) -> List[Dict[str, Any]]:
        """Get active alerts, optionally filtered by level"""
        alerts = self.alerts
        if level:
            alerts = [a for a in alerts if a.level == level]
        return [alert.to_dict() for alert in alerts]
    
    def clear_alerts(self, level: Optional[AlertLevel] = None):
        """Clear alerts, optionally filtered by level"""
        if level:
            self.alerts = [a for a in self.alerts if a.level != level]
        else:
            self.alerts = []

class LogAnalyzer:
    """Log analysis and anomaly detection"""
    
    def __init__(self):
        self.log_patterns = {}
        self.error_counts = {}
        self.log_history = []
    
    def analyze_logs(self, log_entries: List[str]) -> Dict[str, Any]:
        """Analyze log entries for patterns and anomalies"""
        analysis = {
            "total_entries": len(log_entries),
            "error_count": 0,
            "warning_count": 0,
            "patterns": {},
            "anomalies": [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        for entry in log_entries:
            # Count log levels
            if "ERROR" in entry.upper():
                analysis["error_count"] += 1
            elif "WARNING" in entry.upper():
                analysis["warning_count"] += 1
            
            # Pattern detection (simple keyword matching)
            for pattern, count in self.log_patterns.items():
                if pattern in entry:
                    analysis["patterns"][pattern] = analysis["patterns"].get(pattern, 0) + 1
        
        # Detect anomalies (simple threshold-based)
        if analysis["error_count"] > 10:
            analysis["anomalies"].append("High error rate detected")
        
        if analysis["warning_count"] > 50:
            analysis["anomalies"].append("High warning rate detected")
        
        return analysis

# Global instances
health_checker = SystemHealthChecker()
metrics_collector = MetricsCollector()
alert_manager = AlertManager()
log_analyzer = LogAnalyzer()

# Default health checks
async def database_health_check():
    """Check database connectivity"""
    try:
        from database_commercial import db_config
        return {"healthy": db_config.test_connection(), "message": "Database connection OK"}
    except Exception as e:
        return {"healthy": False, "message": f"Database check failed: {e}"}

async def redis_health_check():
    """Check Redis connectivity"""
    try:
        from performance_commercial import cache_manager
        stats = cache_manager.get_stats()
        return {"healthy": stats.get("status") == "connected", "message": "Redis connection OK", "details": stats}
    except Exception as e:
        return {"healthy": False, "message": f"Redis check failed: {e}"}

def disk_space_health_check():
    """Check disk space"""
    try:
        disk = psutil.disk_usage('/')
        usage_percent = (disk.used / disk.total) * 100
        
        if usage_percent > 90:
            return {"healthy": False, "message": f"Disk usage critical: {usage_percent:.1f}%"}
        elif usage_percent > 80:
            return {"healthy": True, "message": f"Disk usage warning: {usage_percent:.1f}%"}
        else:
            return {"healthy": True, "message": f"Disk usage OK: {usage_percent:.1f}%"}
    except Exception as e:
        return {"healthy": False, "message": f"Disk check failed: {e}"}

def memory_health_check():
    """Check memory usage"""
    try:
        memory = psutil.virtual_memory()
        
        if memory.percent > 90:
            return {"healthy": False, "message": f"Memory usage critical: {memory.percent:.1f}%"}
        elif memory.percent > 80:
            return {"healthy": True, "message": f"Memory usage warning: {memory.percent:.1f}%"}
        else:
            return {"healthy": True, "message": f"Memory usage OK: {memory.percent:.1f}%"}
    except Exception as e:
        return {"healthy": False, "message": f"Memory check failed: {e}"}

# Default alert rules
def high_cpu_alert_rule(context):
    """Alert rule for high CPU usage"""
    metrics = context.get("metrics", {})
    cpu_percent = metrics.get("cpu", {}).get("percent", 0)
    return cpu_percent > 80

def high_memory_alert_rule(context):
    """Alert rule for high memory usage"""
    metrics = context.get("metrics", {})
    memory_percent = metrics.get("memory", {}).get("percent", 0)
    return memory_percent > 85

def database_unhealthy_alert_rule(context):
    """Alert rule for database health issues"""
    health = context.get("health", {})
    db_check = health.get("checks", {}).get("database", {})
    return db_check.get("status") != "healthy"

# Initialize monitoring system
async def init_monitoring_system():
    """Initialize the monitoring system"""
    try:
        # Register health checks
        health_checker.register_health_check("database", database_health_check, critical=True)
        health_checker.register_health_check("redis", redis_health_check, critical=False)
        health_checker.register_health_check("disk_space", disk_space_health_check, critical=True)
        health_checker.register_health_check("memory", memory_health_check, critical=False)
        
        # Add alert rules
        alert_manager.add_alert_rule(
            "high_cpu_usage",
            high_cpu_alert_rule,
            AlertLevel.WARNING,
            "High CPU usage detected: {metrics[cpu][percent]:.1f}%"
        )
        
        alert_manager.add_alert_rule(
            "high_memory_usage", 
            high_memory_alert_rule,
            AlertLevel.WARNING,
            "High memory usage detected: {metrics[memory][percent]:.1f}%"
        )
        
        alert_manager.add_alert_rule(
            "database_unhealthy",
            database_unhealthy_alert_rule,
            AlertLevel.CRITICAL,
            "Database health check failed"
        )
        
        # Configure notification channels (example)
        if os.getenv("ALERT_EMAIL_TO"):
            alert_manager.add_notification_channel("email", "email", {
                "smtp_server": os.getenv("SMTP_SERVER", "localhost"),
                "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                "from_email": os.getenv("ALERT_EMAIL_FROM", "alerts@aria.local"),
                "to_email": os.getenv("ALERT_EMAIL_TO"),
                "username": os.getenv("SMTP_USERNAME"),
                "password": os.getenv("SMTP_PASSWORD"),
                "use_tls": True
            })
        
        logger.info("Monitoring system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Monitoring system initialization failed: {e}")
        return False

# Main monitoring loop
async def monitoring_loop():
    """Main monitoring loop"""
    while True:
        try:
            # Collect metrics
            metrics = metrics_collector.collect_system_metrics()
            
            # Run health checks
            health_status = await health_checker.run_health_checks()
            
            # Check alert rules
            await alert_manager.check_alert_rules(metrics, health_status)
            
            # Wait before next iteration
            await asyncio.sleep(60)  # Run every minute
            
        except Exception as e:
            logger.error(f"Monitoring loop error: {e}")
            await asyncio.sleep(60)

# API endpoints for monitoring data
def get_monitoring_dashboard() -> Dict[str, Any]:
    """Get comprehensive monitoring dashboard data"""
    return {
        "health": health_checker.health_history[-1] if health_checker.health_history else None,
        "metrics": metrics_collector.get_metrics_summary(),
        "alerts": alert_manager.get_active_alerts(),
        "timestamp": datetime.utcnow().isoformat()
    }