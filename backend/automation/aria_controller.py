"""
Aria Master Controller Bot
===========================

The central orchestration bot that:
1. Receives emails from Office 365 mailbox
2. Receives WhatsApp messages
3. Classifies incoming messages and attachments
4. Routes to specialist bots
5. Tracks execution status
6. Sends notifications and summaries
7. Handles exceptions and escalations

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date
from enum import Enum
from dataclasses import dataclass
import json
import logging

logger = logging.getLogger(__name__)


class MessageChannel(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    WEB = "web"


class DocumentType(str, Enum):
    INVOICE = "invoice"
    PURCHASE_ORDER = "purchase_order"
    QUOTE = "quote"
    DELIVERY_NOTE = "delivery_note"
    PAYSLIP = "payslip"
    LEAVE_REQUEST = "leave_request"
    EXPENSE_CLAIM = "expense_claim"
    GENERAL = "general"
    UNKNOWN = "unknown"


class BotStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_APPROVAL = "requires_approval"
    CANCELLED = "cancelled"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class IncomingMessage:
    """Represents an incoming message to Aria"""
    message_id: str
    channel: MessageChannel
    sender: str
    sender_email: Optional[str]
    sender_phone: Optional[str]
    subject: Optional[str]
    body: str
    attachments: List[Dict[str, Any]]
    received_at: datetime
    priority: Priority = Priority.MEDIUM


@dataclass
class DocumentClassification:
    """Result of document classification"""
    document_type: DocumentType
    confidence: float
    extracted_data: Dict[str, Any]
    supplier_name: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Optional[float] = None
    document_date: Optional[date] = None
    reference_number: Optional[str] = None


@dataclass
class BotTask:
    """Represents a task assigned to a specialist bot"""
    task_id: str
    message_id: str
    bot_name: str
    bot_type: str
    document_type: DocumentType
    input_data: Dict[str, Any]
    priority: Priority
    status: BotStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_manager: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    errors: List[str] = None
    requires_approval: bool = False
    approval_requested_at: Optional[datetime] = None


@dataclass
class BotExecution:
    """Result of bot execution"""
    success: bool
    task_id: str
    bot_name: str
    result_data: Dict[str, Any]
    summary: str
    exceptions: List[str]
    decision_points: List[Dict[str, Any]]
    processing_time: float
    confidence_score: float


class AriaController:
    """
    Master controller bot that orchestrates all specialist bots.
    
    Aria is the central AI that:
    - Receives all incoming communications
    - Classifies documents and messages
    - Routes to appropriate specialist bots
    - Monitors execution
    - Sends notifications
    - Generates daily summaries
    """
    
    def __init__(self):
        self.bot_registry = self._initialize_bot_registry()
        self.active_tasks: Dict[str, BotTask] = {}
        self.completed_tasks: List[BotTask] = []
        
    def _initialize_bot_registry(self) -> Dict[DocumentType, Dict[str, Any]]:
        """Map document types to specialist bots"""
        return {
            DocumentType.INVOICE: {
                "bot_name": "Invoice Processing Bot",
                "bot_type": "financial",
                "manager": "financial_manager@company.com",
                "capabilities": ["ocr", "validation", "posting", "payment_processing"]
            },
            DocumentType.PURCHASE_ORDER: {
                "bot_name": "Purchase Order Bot",
                "bot_type": "procurement",
                "manager": "procurement_manager@company.com",
                "capabilities": ["po_creation", "approval_routing", "supplier_notification"]
            },
            DocumentType.QUOTE: {
                "bot_name": "Quotation Bot",
                "bot_type": "sales",
                "manager": "sales_manager@company.com",
                "capabilities": ["quote_generation", "pricing", "customer_notification"]
            },
            DocumentType.LEAVE_REQUEST: {
                "bot_name": "Leave Management Bot",
                "bot_type": "hr",
                "manager": "hr_manager@company.com",
                "capabilities": ["leave_validation", "balance_check", "approval_routing"]
            },
            DocumentType.EXPENSE_CLAIM: {
                "bot_name": "Expense Processing Bot",
                "bot_type": "financial",
                "manager": "financial_manager@company.com",
                "capabilities": ["receipt_validation", "policy_check", "reimbursement"]
            },
        }
    
    async def process_incoming_message(self, message: IncomingMessage) -> Dict[str, Any]:
        """
        Main entry point for processing incoming messages.
        
        Args:
            message: The incoming message with attachments
            
        Returns:
            Processing result with task IDs and status
        """
        logger.info(f"Aria: Processing message {message.message_id} from {message.sender} via {message.channel}")
        
        # Step 1: Acknowledge receipt
        await self._send_acknowledgment(message)
        
        # Step 2: Classify message and attachments
        classifications = await self._classify_message(message)
        
        # Step 3: Create tasks for specialist bots
        tasks = []
        for classification in classifications:
            task = await self._create_bot_task(message, classification)
            tasks.append(task)
            self.active_tasks[task.task_id] = task
        
        # Step 4: Execute tasks (async processing)
        results = []
        for task in tasks:
            result = await self._execute_bot_task(task)
            results.append(result)
        
        # Step 5: Send summary to sender
        await self._send_processing_summary(message, results)
        
        return {
            "message_id": message.message_id,
            "tasks_created": len(tasks),
            "tasks": [{"task_id": t.task_id, "bot": t.bot_name, "status": t.status.value} for t in tasks],
            "results": results
        }
    
    async def _classify_message(self, message: IncomingMessage) -> List[DocumentClassification]:
        """
        Classify the message and any attachments using AI/ML.
        
        This would integrate with document parser and OCR.
        """
        classifications = []
        
        # Classify attachments
        for attachment in message.attachments:
            classification = await self._classify_document(attachment)
            classifications.append(classification)
        
        # If no attachments, classify the message body
        if not message.attachments:
            classification = await self._classify_text(message.body, message.subject)
            classifications.append(classification)
        
        return classifications
    
    async def _classify_document(self, attachment: Dict[str, Any]) -> DocumentClassification:
        """
        Classify a document attachment.
        
        This would call the document parser service with OCR and AI classification.
        """
        # Placeholder - would integrate with actual document parser
        filename = attachment.get("filename", "").lower()
        
        # Simple rule-based classification (would be ML-based in production)
        if "invoice" in filename or "inv" in filename:
            doc_type = DocumentType.INVOICE
        elif "purchase" in filename or "po" in filename:
            doc_type = DocumentType.PURCHASE_ORDER
        elif "quote" in filename or "quotation" in filename:
            doc_type = DocumentType.QUOTE
        elif "delivery" in filename or "dn" in filename:
            doc_type = DocumentType.DELIVERY_NOTE
        elif "payslip" in filename:
            doc_type = DocumentType.PAYSLIP
        else:
            doc_type = DocumentType.UNKNOWN
        
        return DocumentClassification(
            document_type=doc_type,
            confidence=0.85,
            extracted_data={
                "filename": attachment.get("filename"),
                "file_size": attachment.get("size"),
                "content_type": attachment.get("content_type")
            }
        )
    
    async def _classify_text(self, body: str, subject: Optional[str]) -> DocumentClassification:
        """
        Classify text content using NLP.
        
        This would use GPT/BERT to understand intent.
        """
        # Placeholder - would use NLP model
        body_lower = body.lower()
        subject_lower = (subject or "").lower()
        
        if "leave" in body_lower or "leave" in subject_lower:
            doc_type = DocumentType.LEAVE_REQUEST
        elif "expense" in body_lower or "claim" in body_lower:
            doc_type = DocumentType.EXPENSE_CLAIM
        else:
            doc_type = DocumentType.GENERAL
        
        return DocumentClassification(
            document_type=doc_type,
            confidence=0.75,
            extracted_data={"text": body, "subject": subject}
        )
    
    async def _create_bot_task(self, message: IncomingMessage, classification: DocumentClassification) -> BotTask:
        """Create a task for a specialist bot"""
        import uuid
        
        bot_info = self.bot_registry.get(classification.document_type, {
            "bot_name": "General Processing Bot",
            "bot_type": "general",
            "manager": "admin@company.com"
        })
        
        task = BotTask(
            task_id=str(uuid.uuid4()),
            message_id=message.message_id,
            bot_name=bot_info["bot_name"],
            bot_type=bot_info["bot_type"],
            document_type=classification.document_type,
            input_data={
                "message": message.__dict__,
                "classification": classification.__dict__
            },
            priority=message.priority,
            status=BotStatus.PENDING,
            created_at=datetime.now(),
            assigned_manager=bot_info.get("manager"),
            errors=[]
        )
        
        logger.info(f"Aria: Created task {task.task_id} for {task.bot_name}")
        return task
    
    async def _execute_bot_task(self, task: BotTask) -> BotExecution:
        """
        Execute a bot task by routing to the appropriate specialist bot.
        
        This would call the actual specialist bot service.
        """
        logger.info(f"Aria: Executing task {task.task_id} with {task.bot_name}")
        
        task.status = BotStatus.PROCESSING
        task.started_at = datetime.now()
        
        try:
            # Placeholder - would route to actual bot service
            # For now, simulate processing
            import time
            start_time = time.time()
            
            # Simulate bot processing
            result_data = {
                "processed": True,
                "document_type": task.document_type.value,
                "status": "success"
            }
            
            # Check if approval needed (business rules)
            requires_approval = self._check_approval_required(task, result_data)
            
            if requires_approval:
                task.status = BotStatus.REQUIRES_APPROVAL
                task.requires_approval = True
                task.approval_requested_at = datetime.now()
                
                # Send approval request to manager
                await self._request_manager_approval(task, result_data)
            else:
                task.status = BotStatus.COMPLETED
                task.completed_at = datetime.now()
            
            task.result = result_data
            
            processing_time = time.time() - start_time
            
            execution = BotExecution(
                success=True,
                task_id=task.task_id,
                bot_name=task.bot_name,
                result_data=result_data,
                summary=f"Successfully processed {task.document_type.value}",
                exceptions=[],
                decision_points=[],
                processing_time=processing_time,
                confidence_score=0.92
            )
            
            # Send notification to manager
            await self._notify_manager(task, execution)
            
            return execution
            
        except Exception as e:
            logger.error(f"Aria: Task {task.task_id} failed: {str(e)}")
            task.status = BotStatus.FAILED
            task.errors.append(str(e))
            
            # Send failure notification
            await self._notify_failure(task, str(e))
            
            return BotExecution(
                success=False,
                task_id=task.task_id,
                bot_name=task.bot_name,
                result_data={},
                summary=f"Failed to process: {str(e)}",
                exceptions=[str(e)],
                decision_points=[],
                processing_time=0,
                confidence_score=0
            )
    
    def _check_approval_required(self, task: BotTask, result_data: Dict[str, Any]) -> bool:
        """
        Check if manager approval is required based on business rules.
        
        Examples:
        - Invoices > R10,000 need approval
        - New suppliers need approval
        - Leave > 10 days needs approval
        """
        # Placeholder - would implement actual business rules
        if task.document_type == DocumentType.INVOICE:
            amount = result_data.get("amount", 0)
            return amount > 10000
        elif task.document_type == DocumentType.LEAVE_REQUEST:
            days = result_data.get("days", 0)
            return days > 10
        
        return False
    
    async def _send_acknowledgment(self, message: IncomingMessage):
        """Send immediate acknowledgment to sender"""
        logger.info(f"Aria: Sending acknowledgment to {message.sender}")
        # Would integrate with email/WhatsApp sender
        pass
    
    async def _request_manager_approval(self, task: BotTask, result_data: Dict[str, Any]):
        """Request approval from manager"""
        logger.info(f"Aria: Requesting approval from {task.assigned_manager} for task {task.task_id}")
        # Would send email/notification to manager with approval link
        pass
    
    async def _notify_manager(self, task: BotTask, execution: BotExecution):
        """Send summary notification to manager"""
        logger.info(f"Aria: Notifying {task.assigned_manager} about task {task.task_id}")
        # Would send email/WhatsApp with summary
        pass
    
    async def _notify_failure(self, task: BotTask, error: str):
        """Send failure notification"""
        logger.error(f"Aria: Notifying failure for task {task.task_id}: {error}")
        # Would send urgent notification
        pass
    
    async def _send_processing_summary(self, message: IncomingMessage, results: List[BotExecution]):
        """Send processing summary back to sender"""
        logger.info(f"Aria: Sending summary to {message.sender}")
        # Would send email/WhatsApp with results
        pass
    
    async def generate_daily_summary(self, target_date: date) -> Dict[str, Any]:
        """
        Generate daily summary for executives.
        
        Includes:
        - Total transactions processed
        - Exceptions and errors
        - Items requiring attention
        - KPIs and metrics
        - Trend analysis
        """
        logger.info(f"Aria: Generating daily summary for {target_date}")
        
        # Get all tasks for the day
        daily_tasks = [
            task for task in self.completed_tasks
            if task.created_at.date() == target_date
        ]
        
        # Calculate statistics
        total_tasks = len(daily_tasks)
        completed = sum(1 for t in daily_tasks if t.status == BotStatus.COMPLETED)
        failed = sum(1 for t in daily_tasks if t.status == BotStatus.FAILED)
        pending_approval = sum(1 for t in daily_tasks if t.status == BotStatus.REQUIRES_APPROVAL)
        
        # Group by document type
        by_type = {}
        for task in daily_tasks:
            doc_type = task.document_type.value
            by_type[doc_type] = by_type.get(doc_type, 0) + 1
        
        # Get exceptions
        exceptions = [
            {
                "task_id": task.task_id,
                "document_type": task.document_type.value,
                "error": task.errors[0] if task.errors else "Unknown error"
            }
            for task in daily_tasks if task.status == BotStatus.FAILED
        ]
        
        # Get items requiring attention
        attention_items = [
            {
                "task_id": task.task_id,
                "document_type": task.document_type.value,
                "manager": task.assigned_manager,
                "waiting_since": task.approval_requested_at.isoformat() if task.approval_requested_at else None
            }
            for task in daily_tasks if task.status == BotStatus.REQUIRES_APPROVAL
        ]
        
        summary = {
            "date": target_date.isoformat(),
            "generated_at": datetime.now().isoformat(),
            "overview": {
                "total_transactions": total_tasks,
                "completed": completed,
                "failed": failed,
                "pending_approval": pending_approval,
                "success_rate": round(completed / total_tasks * 100, 2) if total_tasks > 0 else 0
            },
            "by_document_type": by_type,
            "exceptions": exceptions,
            "attention_required": attention_items,
            "insights": self._generate_insights(daily_tasks)
        }
        
        # Send to executives
        await self._send_executive_summary(summary)
        
        return summary
    
    def _generate_insights(self, tasks: List[BotTask]) -> List[str]:
        """Generate AI insights from daily activities"""
        insights = []
        
        if len(tasks) > 0:
            # Analyze patterns
            failed_count = sum(1 for t in tasks if t.status == BotStatus.FAILED)
            if failed_count > len(tasks) * 0.1:  # More than 10% failure rate
                insights.append(f"⚠️ High failure rate detected: {failed_count}/{len(tasks)} tasks failed")
            
            # Check processing times
            avg_time = sum(
                (t.completed_at - t.started_at).total_seconds()
                for t in tasks if t.completed_at and t.started_at
            ) / len(tasks) if tasks else 0
            
            if avg_time > 60:  # More than 1 minute
                insights.append(f"⏱️ Average processing time is high: {avg_time:.1f} seconds")
            else:
                insights.append(f"✅ Excellent processing time: {avg_time:.1f} seconds average")
        
        return insights
    
    async def _send_executive_summary(self, summary: Dict[str, Any]):
        """Send daily summary to executives"""
        logger.info("Aria: Sending daily summary to executives")
        # Would send formatted email to exec team
        pass


# Singleton instance
aria_controller = AriaController()


async def process_email(email_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process an incoming email through Aria.
    
    Args:
        email_data: Email data from Office 365
        
    Returns:
        Processing result
    """
    message = IncomingMessage(
        message_id=email_data.get("id"),
        channel=MessageChannel.EMAIL,
        sender=email_data.get("from", {}).get("name"),
        sender_email=email_data.get("from", {}).get("email"),
        sender_phone=None,
        subject=email_data.get("subject"),
        body=email_data.get("body"),
        attachments=email_data.get("attachments", []),
        received_at=datetime.now(),
        priority=Priority.MEDIUM
    )
    
    return await aria_controller.process_incoming_message(message)


async def process_whatsapp(whatsapp_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process an incoming WhatsApp message through Aria.
    
    Args:
        whatsapp_data: WhatsApp message data
        
    Returns:
        Processing result
    """
    message = IncomingMessage(
        message_id=whatsapp_data.get("id"),
        channel=MessageChannel.WHATSAPP,
        sender=whatsapp_data.get("from", {}).get("name"),
        sender_email=None,
        sender_phone=whatsapp_data.get("from", {}).get("phone"),
        subject=None,
        body=whatsapp_data.get("text"),
        attachments=whatsapp_data.get("media", []),
        received_at=datetime.now(),
        priority=Priority.MEDIUM
    )
    
    return await aria_controller.process_incoming_message(message)


async def generate_daily_summary_for_date(target_date: date = None) -> Dict[str, Any]:
    """
    Generate daily summary for a specific date.
    
    Args:
        target_date: Date to generate summary for (defaults to today)
        
    Returns:
        Daily summary with all metrics and insights
    """
    if target_date is None:
        target_date = date.today()
    
    return await aria_controller.generate_daily_summary(target_date)
