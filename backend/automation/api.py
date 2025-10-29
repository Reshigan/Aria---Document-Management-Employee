"""
Aria Automation API Endpoints
==============================

RESTful API for Aria automation system:
- Email webhook
- WhatsApp webhook
- Manual document submission
- Bot task status
- Health monitoring
- Audit trail queries

Author: Aria ERP Team
Date: 2025-10-29
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from pydantic import BaseModel, Field
import logging

from automation.aria_controller import aria_controller, process_email, process_whatsapp, generate_daily_summary_for_date
from automation.office365_integration import Office365Client
from automation.whatsapp_integration import WhatsAppClient
from automation.document_parser import document_parser
from automation.notification_system import notification_system
from automation.audit_trail import audit_trail, EventType
from automation.monitoring import monitoring_system

logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/api/v1/automation", tags=["automation"])


# ============================================================================
# Request/Response Models
# ============================================================================

class EmailWebhookRequest(BaseModel):
    """Email webhook payload from Office 365"""
    subscription_id: str
    change_type: str
    resource: str
    resource_data: Dict[str, Any]


class WhatsAppWebhookRequest(BaseModel):
    """WhatsApp webhook payload"""
    entry: List[Dict[str, Any]]


class DocumentSubmission(BaseModel):
    """Manual document submission"""
    document_type: str = Field(..., description="Document type hint (invoice, po, etc.)")
    source: str = Field(default="manual", description="Submission source")
    notes: Optional[str] = Field(None, description="Additional notes")


class TaskStatusResponse(BaseModel):
    """Bot task status"""
    task_id: str
    status: str
    bot_name: str
    created_at: str
    completed_at: Optional[str]
    result: Optional[Dict[str, Any]]
    errors: List[str]


class HealthResponse(BaseModel):
    """System health response"""
    overall_status: str
    checked_at: str
    uptime_seconds: float
    components: List[Dict[str, Any]]


class AuditQueryRequest(BaseModel):
    """Audit trail query"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_types: Optional[List[str]] = None
    actor: Optional[str] = None
    resource_type: Optional[str] = None
    limit: int = Field(default=100, le=1000)


# ============================================================================
# Webhook Endpoints
# ============================================================================

@router.post("/webhooks/office365", response_model=Dict[str, str])
async def office365_webhook(
    request: EmailWebhookRequest,
    background_tasks: BackgroundTasks
):
    """
    Office 365 email webhook endpoint.
    
    Called by Microsoft Graph when new email arrives in Aria's mailbox.
    
    Setup:
    1. Create webhook subscription in Azure AD
    2. Point to this endpoint
    3. Aria will automatically process all incoming emails
    """
    try:
        logger.info(f"O365 Webhook: Received notification (subscription: {request.subscription_id})")
        
        # Log audit event
        audit_trail.log_event(
            event_type=EventType.DOCUMENT_RECEIVED,
            actor="office365_webhook",
            actor_type="system",
            resource_type="email",
            action="received",
            description="Email received via webhook",
            metadata={"subscription_id": request.subscription_id}
        )
        
        # Process email in background
        # Would fetch the actual email using resource ID
        # For now, acknowledge receipt
        
        return {"status": "accepted", "message": "Email will be processed"}
        
    except Exception as e:
        logger.error(f"O365 Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/whatsapp", response_model=Dict[str, str])
async def whatsapp_webhook(
    request: WhatsAppWebhookRequest,
    background_tasks: BackgroundTasks
):
    """
    WhatsApp Business API webhook endpoint.
    
    Called by Meta when new WhatsApp message is received.
    
    Setup:
    1. Configure webhook in Meta Business Manager
    2. Point to this endpoint
    3. Verify webhook token
    """
    try:
        logger.info("WhatsApp Webhook: Received message")
        
        # Process WhatsApp message
        for entry in request.entry:
            # Extract message details
            # Process through Aria controller
            pass
        
        # Log audit event
        audit_trail.log_event(
            event_type=EventType.DOCUMENT_RECEIVED,
            actor="whatsapp_webhook",
            actor_type="system",
            resource_type="whatsapp_message",
            action="received",
            description="WhatsApp message received",
            metadata={}
        )
        
        return {"status": "accepted", "message": "Message will be processed"}
        
    except Exception as e:
        logger.error(f"WhatsApp Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhooks/whatsapp", response_model=Dict[str, Any])
async def whatsapp_webhook_verify(
    hub_mode: str = Form(..., alias="hub.mode"),
    hub_verify_token: str = Form(..., alias="hub.verify_token"),
    hub_challenge: str = Form(..., alias="hub.challenge")
):
    """
    WhatsApp webhook verification endpoint.
    
    Called by Meta to verify webhook setup.
    """
    # Verify token (should match your configured token)
    expected_token = "aria_webhook_token"
    
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("WhatsApp webhook verified successfully")
        return {"hub.challenge": hub_challenge}
    else:
        raise HTTPException(status_code=403, detail="Verification failed")


# ============================================================================
# Document Processing Endpoints
# ============================================================================

@router.post("/documents/submit", response_model=Dict[str, Any])
async def submit_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    source: str = Form(default="manual"),
    notes: Optional[str] = Form(None)
):
    """
    Manual document submission endpoint.
    
    Allows users to manually upload documents for processing.
    
    Use cases:
    - Drag & drop invoice upload
    - Mobile app document submission
    - Legacy document processing
    """
    try:
        logger.info(f"Document submission: {file.filename} ({document_type})")
        
        # Read file content
        content = await file.read()
        
        # Parse document
        parsed = await document_parser.parse_document(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type
        )
        
        # Process through Aria
        from automation.aria_controller import IncomingMessage, MessageChannel, Priority
        
        message = IncomingMessage(
            message_id=f"manual_{datetime.now().timestamp()}",
            channel=MessageChannel.WEB,
            sender=source,
            sender_email=None,
            sender_phone=None,
            subject=file.filename,
            body=notes or "",
            attachments=[{
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(content),
                "parsed_data": parsed
            }],
            received_at=datetime.now(),
            priority=Priority.MEDIUM
        )
        
        result = await aria_controller.process_incoming_message(message)
        
        # Log audit event
        audit_trail.log_event(
            event_type=EventType.DOCUMENT_RECEIVED,
            actor=source,
            actor_type="user",
            resource_type=document_type,
            action="submitted",
            description=f"Document submitted: {file.filename}",
            metadata={"filename": file.filename, "size": len(content)}
        )
        
        return {
            "status": "success",
            "message": "Document submitted successfully",
            "document": parsed,
            "processing_result": result
        }
        
    except Exception as e:
        logger.error(f"Document submission error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Task Management Endpoints
# ============================================================================

@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get status of a bot task.
    
    Returns current status, results, and any errors.
    """
    try:
        task = aria_controller.active_tasks.get(task_id)
        
        if not task:
            # Check completed tasks
            task = next((t for t in aria_controller.completed_tasks if t.task_id == task_id), None)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskStatusResponse(
            task_id=task.task_id,
            status=task.status.value,
            bot_name=task.bot_name,
            created_at=task.created_at.isoformat(),
            completed_at=task.completed_at.isoformat() if task.completed_at else None,
            result=task.result,
            errors=task.errors or []
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get task status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks", response_model=List[TaskStatusResponse])
async def list_tasks(
    status: Optional[str] = None,
    bot_name: Optional[str] = None,
    limit: int = 50
):
    """
    List bot tasks with optional filters.
    """
    try:
        # Get all tasks
        all_tasks = list(aria_controller.active_tasks.values()) + aria_controller.completed_tasks
        
        # Apply filters
        if status:
            all_tasks = [t for t in all_tasks if t.status.value == status]
        if bot_name:
            all_tasks = [t for t in all_tasks if t.bot_name == bot_name]
        
        # Sort by created_at descending
        all_tasks.sort(key=lambda t: t.created_at, reverse=True)
        
        # Limit results
        all_tasks = all_tasks[:limit]
        
        return [
            TaskStatusResponse(
                task_id=t.task_id,
                status=t.status.value,
                bot_name=t.bot_name,
                created_at=t.created_at.isoformat(),
                completed_at=t.completed_at.isoformat() if t.completed_at else None,
                result=t.result,
                errors=t.errors or []
            )
            for t in all_tasks
        ]
        
    except Exception as e:
        logger.error(f"List tasks error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Reporting Endpoints
# ============================================================================

@router.post("/reports/daily-summary", response_model=Dict[str, Any])
async def generate_daily_summary(
    target_date: Optional[date] = None,
    send_email: bool = True
):
    """
    Generate daily summary report.
    
    Called by scheduler at end of each day, or manually by executives.
    """
    try:
        if target_date is None:
            target_date = date.today()
        
        logger.info(f"Generating daily summary for {target_date}")
        
        summary = await generate_daily_summary_for_date(target_date)
        
        # Send email if requested
        if send_email:
            await notification_system.send_daily_summary(
                executive_email="exec@vantax.co.za",
                summary_data=summary
            )
        
        # Log audit event
        audit_trail.log_event(
            event_type=EventType.SYSTEM_START,
            actor="system",
            actor_type="system",
            resource_type="report",
            action="generated",
            description=f"Daily summary generated for {target_date}",
            metadata={"date": target_date.isoformat()}
        )
        
        return summary
        
    except Exception as e:
        logger.error(f"Daily summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Monitoring Endpoints
# ============================================================================

@router.get("/health", response_model=HealthResponse)
async def get_system_health():
    """
    Get current system health status.
    
    Used by:
    - Load balancers for health checks
    - Monitoring dashboards
    - Alerting systems
    """
    try:
        health = await monitoring_system.check_system_health()
        return HealthResponse(**health)
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/alerts", response_model=List[Dict[str, Any]])
async def get_active_alerts():
    """Get all active system alerts"""
    try:
        return monitoring_system.get_active_alerts()
    except Exception as e:
        logger.error(f"Get alerts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=List[Dict[str, Any]])
async def get_metrics(
    metric_name: Optional[str] = None,
    hours: int = 1
):
    """
    Get performance metrics.
    
    Args:
        metric_name: Specific metric to retrieve
        hours: Number of hours of history to return
    """
    try:
        from datetime import timedelta
        
        start_time = datetime.now() - timedelta(hours=hours)
        
        metrics = monitoring_system.get_metrics(
            metric_name=metric_name,
            start_time=start_time
        )
        
        return metrics
        
    except Exception as e:
        logger.error(f"Get metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Audit Trail Endpoints
# ============================================================================

@router.post("/audit/query", response_model=Dict[str, Any])
async def query_audit_trail(request: AuditQueryRequest):
    """
    Query audit trail with filters.
    
    Required for:
    - Compliance reporting
    - Forensic analysis
    - Troubleshooting
    """
    try:
        # Convert event_types to enum
        event_types = None
        if request.event_types:
            event_types = [EventType(et) for et in request.event_types]
        
        events = audit_trail.query_events(
            start_date=request.start_date,
            end_date=request.end_date,
            event_types=event_types,
            actor=request.actor,
            resource_type=request.resource_type,
            limit=request.limit
        )
        
        return {
            "total": len(events),
            "events": [
                {
                    "event_id": e.event_id,
                    "event_type": e.event_type.value,
                    "timestamp": e.timestamp.isoformat(),
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
        
    except Exception as e:
        logger.error(f"Audit query error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/reports/{report_type}", response_model=Dict[str, Any])
async def generate_audit_report(
    report_type: str,
    start_date: date,
    end_date: date
):
    """
    Generate audit report.
    
    Report types:
    - summary: High-level statistics
    - detailed: All events
    - compliance: Compliance-focused report
    """
    try:
        if report_type not in ["summary", "detailed", "compliance"]:
            raise HTTPException(status_code=400, detail="Invalid report type")
        
        report = audit_trail.generate_audit_report(
            start_date=start_date,
            end_date=end_date,
            report_type=report_type
        )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate audit report error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
