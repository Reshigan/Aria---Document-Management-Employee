"""
Comprehensive Audit Trail System for Aria
==========================================

Logs all bot actions, ERP transactions, and system events
for compliance, troubleshooting, and forensic analysis.

Features:
- Complete audit trail of all bot actions
- User action tracking
- System event logging
- Data change tracking
- Query and reporting capabilities

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date
from enum import Enum
from dataclasses import dataclass, asdict
import json
import logging

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    BOT_STARTED = "bot_started"
    BOT_COMPLETED = "bot_completed"
    BOT_FAILED = "bot_failed"
    DOCUMENT_RECEIVED = "document_received"
    DOCUMENT_CLASSIFIED = "document_classified"
    DOCUMENT_PROCESSED = "document_processed"
    TRANSACTION_CREATED = "transaction_created"
    TRANSACTION_POSTED = "transaction_posted"
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_GRANTED = "approval_granted"
    APPROVAL_REJECTED = "approval_rejected"
    NOTIFICATION_SENT = "notification_sent"
    ERROR_OCCURRED = "error_occurred"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"


@dataclass
class AuditEvent:
    """Represents an audit event"""
    event_id: str
    event_type: EventType
    timestamp: datetime
    actor: str  # User, bot, or system
    actor_type: str  # user, bot, system
    resource_type: str  # invoice, po, employee, etc.
    resource_id: Optional[str]
    action: str
    description: str
    metadata: Dict[str, Any]
    ip_address: Optional[str] = None
    session_id: Optional[str] = None
    parent_event_id: Optional[str] = None  # For linked events
    success: bool = True
    error_message: Optional[str] = None


class AuditTrailSystem:
    """
    Audit trail system that logs all significant events.
    
    Storage can be:
    - Database (PostgreSQL with JSONB)
    - Log files
    - External SIEM (Splunk, ELK)
    """
    
    def __init__(self, storage_backend: str = "database"):
        """
        Initialize audit trail system.
        
        Args:
            storage_backend: Where to store audit logs (database, file, siem)
        """
        self.storage_backend = storage_backend
        self.events: List[AuditEvent] = []  # In-memory cache
    
    def log_event(
        self,
        event_type: EventType,
        actor: str,
        actor_type: str,
        resource_type: str,
        action: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
        parent_event_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> str:
        """
        Log an audit event.
        
        Args:
            event_type: Type of event
            actor: Who performed the action (user email, bot name, "system")
            actor_type: Type of actor (user, bot, system)
            resource_type: What was affected
            action: What action was performed
            description: Human-readable description
            metadata: Additional structured data
            resource_id: ID of affected resource
            ip_address: IP address of actor
            session_id: Session ID
            parent_event_id: Parent event if this is a child event
            success: Whether the action succeeded
            error_message: Error message if failed
            
        Returns:
            Event ID
        """
        import uuid
        
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            timestamp=datetime.now(),
            actor=actor,
            actor_type=actor_type,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            description=description,
            metadata=metadata or {},
            ip_address=ip_address,
            session_id=session_id,
            parent_event_id=parent_event_id,
            success=success,
            error_message=error_message
        )
        
        # Store event
        self._store_event(event)
        
        # Log to system logger
        log_level = logging.ERROR if not success else logging.INFO
        logger.log(
            log_level,
            f"Audit: [{event_type.value}] {actor} {action} {resource_type} {resource_id or ''}: {description}"
        )
        
        return event.event_id
    
    def _store_event(self, event: AuditEvent):
        """Store event to backend"""
        # Add to in-memory cache
        self.events.append(event)
        
        # Store to backend
        if self.storage_backend == "database":
            self._store_to_database(event)
        elif self.storage_backend == "file":
            self._store_to_file(event)
        elif self.storage_backend == "siem":
            self._store_to_siem(event)
    
    def _store_to_database(self, event: AuditEvent):
        """Store event to database"""
        # Would insert into audit_log table
        # For now, placeholder
        pass
    
    def _store_to_file(self, event: AuditEvent):
        """Store event to log file"""
        try:
            with open("audit_trail.log", "a") as f:
                f.write(json.dumps(asdict(event), default=str) + "\n")
        except Exception as e:
            logger.error(f"Failed to write audit log to file: {str(e)}")
    
    def _store_to_siem(self, event: AuditEvent):
        """Store event to SIEM system"""
        # Would send to Splunk/ELK/etc.
        pass
    
    def query_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[List[EventType]] = None,
        actor: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        success: Optional[bool] = None,
        limit: int = 100
    ) -> List[AuditEvent]:
        """
        Query audit events with filters.
        
        Args:
            start_date: Start datetime filter
            end_date: End datetime filter
            event_types: Filter by event types
            actor: Filter by actor
            resource_type: Filter by resource type
            resource_id: Filter by specific resource
            success: Filter by success status
            limit: Maximum number of events to return
            
        Returns:
            List of matching audit events
        """
        results = self.events
        
        # Apply filters
        if start_date:
            results = [e for e in results if e.timestamp >= start_date]
        if end_date:
            results = [e for e in results if e.timestamp <= end_date]
        if event_types:
            results = [e for e in results if e.event_type in event_types]
        if actor:
            results = [e for e in results if e.actor == actor]
        if resource_type:
            results = [e for e in results if e.resource_type == resource_type]
        if resource_id:
            results = [e for e in results if e.resource_id == resource_id]
        if success is not None:
            results = [e for e in results if e.success == success]
        
        # Sort by timestamp descending
        results.sort(key=lambda e: e.timestamp, reverse=True)
        
        # Limit results
        return results[:limit]
    
    def get_event_chain(self, event_id: str) -> List[AuditEvent]:
        """
        Get an event and all its children (event chain).
        
        Useful for tracing a complete transaction.
        """
        chain = []
        
        # Get the root event
        root_event = next((e for e in self.events if e.event_id == event_id), None)
        if not root_event:
            return chain
        
        chain.append(root_event)
        
        # Get all child events recursively
        def get_children(parent_id: str):
            children = [e for e in self.events if e.parent_event_id == parent_id]
            for child in children:
                chain.append(child)
                get_children(child.event_id)
        
        get_children(event_id)
        
        return chain
    
    def generate_audit_report(
        self,
        start_date: date,
        end_date: date,
        report_type: str = "summary"
    ) -> Dict[str, Any]:
        """
        Generate an audit report for a date range.
        
        Args:
            start_date: Start date
            end_date: End date
            report_type: Type of report (summary, detailed, compliance)
            
        Returns:
            Report data
        """
        from datetime import datetime as dt
        
        events = self.query_events(
            start_date=dt.combine(start_date, dt.min.time()),
            end_date=dt.combine(end_date, dt.max.time()),
            limit=10000
        )
        
        if report_type == "summary":
            return self._generate_summary_report(events, start_date, end_date)
        elif report_type == "detailed":
            return self._generate_detailed_report(events, start_date, end_date)
        elif report_type == "compliance":
            return self._generate_compliance_report(events, start_date, end_date)
        else:
            return {}
    
    def _generate_summary_report(
        self,
        events: List[AuditEvent],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Generate summary audit report"""
        total_events = len(events)
        successful = sum(1 for e in events if e.success)
        failed = total_events - successful
        
        # Count by event type
        by_event_type = {}
        for event in events:
            event_type = event.event_type.value
            by_event_type[event_type] = by_event_type.get(event_type, 0) + 1
        
        # Count by actor
        by_actor = {}
        for event in events:
            actor = event.actor
            by_actor[actor] = by_actor.get(actor, 0) + 1
        
        # Count by resource type
        by_resource = {}
        for event in events:
            resource = event.resource_type
            by_resource[resource] = by_resource.get(resource, 0) + 1
        
        return {
            "report_type": "summary",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "statistics": {
                "total_events": total_events,
                "successful": successful,
                "failed": failed,
                "success_rate": round(successful / total_events * 100, 2) if total_events > 0 else 0
            },
            "by_event_type": by_event_type,
            "by_actor": by_actor,
            "by_resource_type": by_resource,
            "top_actors": sorted(by_actor.items(), key=lambda x: x[1], reverse=True)[:10],
            "recent_failures": [
                {
                    "event_id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "actor": e.actor,
                    "action": e.action,
                    "error": e.error_message
                }
                for e in events if not e.success
            ][:20]
        }
    
    def _generate_detailed_report(
        self,
        events: List[AuditEvent],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Generate detailed audit report"""
        return {
            "report_type": "detailed",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "events": [
                {
                    "event_id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "event_type": e.event_type.value,
                    "actor": e.actor,
                    "actor_type": e.actor_type,
                    "resource_type": e.resource_type,
                    "resource_id": e.resource_id,
                    "action": e.action,
                    "description": e.description,
                    "success": e.success,
                    "error_message": e.error_message
                }
                for e in events
            ]
        }
    
    def _generate_compliance_report(
        self,
        events: List[AuditEvent],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Generate compliance audit report"""
        # Financial transactions
        financial_events = [
            e for e in events
            if e.resource_type in ["invoice", "payment", "journal_entry", "purchase_order"]
        ]
        
        # User access events
        access_events = [
            e for e in events
            if e.event_type in [EventType.USER_LOGIN, EventType.USER_LOGOUT]
        ]
        
        # Approval events
        approval_events = [
            e for e in events
            if e.event_type in [EventType.APPROVAL_REQUESTED, EventType.APPROVAL_GRANTED, EventType.APPROVAL_REJECTED]
        ]
        
        return {
            "report_type": "compliance",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "financial_transactions": {
                "total": len(financial_events),
                "by_type": self._count_by_field(financial_events, "resource_type")
            },
            "user_access": {
                "total_logins": len([e for e in access_events if e.event_type == EventType.USER_LOGIN]),
                "unique_users": len(set(e.actor for e in access_events)),
                "by_user": self._count_by_field(access_events, "actor")
            },
            "approvals": {
                "requested": len([e for e in approval_events if e.event_type == EventType.APPROVAL_REQUESTED]),
                "granted": len([e for e in approval_events if e.event_type == EventType.APPROVAL_GRANTED]),
                "rejected": len([e for e in approval_events if e.event_type == EventType.APPROVAL_REJECTED])
            },
            "data_integrity": {
                "failed_transactions": len([e for e in financial_events if not e.success]),
                "error_rate": round(len([e for e in events if not e.success]) / len(events) * 100, 2) if events else 0
            }
        }
    
    def _count_by_field(self, events: List[AuditEvent], field: str) -> Dict[str, int]:
        """Count events by a specific field"""
        counts = {}
        for event in events:
            value = getattr(event, field)
            counts[value] = counts.get(value, 0) + 1
        return counts


# Singleton instance
audit_trail = AuditTrailSystem(storage_backend="file")


# Convenience functions for common audit events
def log_bot_started(bot_name: str, task_id: str, input_data: Dict[str, Any]) -> str:
    """Log bot started event"""
    return audit_trail.log_event(
        event_type=EventType.BOT_STARTED,
        actor=bot_name,
        actor_type="bot",
        resource_type="task",
        resource_id=task_id,
        action="started",
        description=f"{bot_name} started processing task {task_id}",
        metadata={"input_data": input_data}
    )


def log_bot_completed(bot_name: str, task_id: str, result_data: Dict[str, Any], parent_event_id: str) -> str:
    """Log bot completed event"""
    return audit_trail.log_event(
        event_type=EventType.BOT_COMPLETED,
        actor=bot_name,
        actor_type="bot",
        resource_type="task",
        resource_id=task_id,
        action="completed",
        description=f"{bot_name} completed task {task_id}",
        metadata={"result_data": result_data},
        parent_event_id=parent_event_id,
        success=True
    )


def log_bot_failed(bot_name: str, task_id: str, error: str, parent_event_id: str) -> str:
    """Log bot failed event"""
    return audit_trail.log_event(
        event_type=EventType.BOT_FAILED,
        actor=bot_name,
        actor_type="bot",
        resource_type="task",
        resource_id=task_id,
        action="failed",
        description=f"{bot_name} failed to process task {task_id}",
        metadata={},
        parent_event_id=parent_event_id,
        success=False,
        error_message=error
    )


def log_document_received(source: str, document_type: str, filename: str) -> str:
    """Log document received event"""
    return audit_trail.log_event(
        event_type=EventType.DOCUMENT_RECEIVED,
        actor="aria_controller",
        actor_type="system",
        resource_type=document_type,
        action="received",
        description=f"Document received: {filename}",
        metadata={"source": source, "filename": filename}
    )


def log_transaction_posted(user: str, transaction_type: str, transaction_id: str, amount: float) -> str:
    """Log transaction posted event"""
    return audit_trail.log_event(
        event_type=EventType.TRANSACTION_POSTED,
        actor=user,
        actor_type="user",
        resource_type=transaction_type,
        resource_id=transaction_id,
        action="posted",
        description=f"{transaction_type} {transaction_id} posted for R {amount:,.2f}",
        metadata={"amount": amount}
    )
