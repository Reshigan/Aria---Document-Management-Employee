"""
Workflow Orchestrator
Core engine for managing workflow execution with approval gates and event-driven state transitions
"""

import logging
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.models.workflow.workflow_models import (
    WorkflowInstance, WorkflowStep, WorkflowApproval, WorkflowEvent, WorkflowMessage,
    WorkflowStatus, StepStatus, ApprovalStatus, EventType
)
from app.services.workflow.agent_execution_service import AgentExecutionService, AgentExecutionRequest
from app.services.workflow.email_service import EmailService, EmailMessage

logger = logging.getLogger(__name__)


class WorkflowDefinition(BaseModel):
    """Workflow definition - describes the workflow structure"""
    type: str = Field(..., description="Workflow type (e.g., 'quote_to_cash')")
    name: str = Field(..., description="Human-readable workflow name")
    slots: Dict[str, Any] = Field(default_factory=dict, description="Required input slots")
    steps: List[Dict[str, Any]] = Field(default_factory=list, description="Workflow steps")


class WorkflowOrchestrator:
    """
    Workflow orchestrator - manages workflow execution
    
    Features:
    - Event-driven state machine
    - Approval gates
    - Email integration
    - Agent coordination
    - Durable state persistence
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.agent_service = AgentExecutionService(db)
        self.email_service = EmailService()
        
    async def start_workflow(
        self,
        workflow_type: str,
        input_data: Dict[str, Any],
        tenant_id: int,
        user_id: int
    ) -> WorkflowInstance:
        """
        Start a new workflow instance
        """
        instance_id = str(uuid.uuid4())
        correlation_id = f"WF-{instance_id[:8]}"
        
        instance = WorkflowInstance(
            id=instance_id,
            type=workflow_type,
            status=WorkflowStatus.PENDING,
            current_step=None,
            context=input_data,
            tenant_id=tenant_id,
            initiated_by_user_id=user_id,
            correlation_id=correlation_id
        )
        
        self.db.add(instance)
        
        self._log_event(instance_id, EventType.WORKFLOW_STARTED, {
            "workflow_type": workflow_type,
            "input_data": input_data
        })
        
        self.db.commit()
        
        logger.info(f"Started workflow: id={instance_id}, type={workflow_type}")
        
        await self._execute_next_step(instance)
        
        return instance
    
    async def _execute_next_step(self, instance: WorkflowInstance):
        """Execute the next step in the workflow"""
        definition = self._get_workflow_definition(instance.type)
        if not definition:
            raise ValueError(f"Workflow definition not found: {instance.type}")
        
        current_step_index = self._get_current_step_index(instance, definition)
        if current_step_index >= len(definition.steps):
            await self._complete_workflow(instance)
            return
        
        step_config = definition.steps[current_step_index]
        
        step_id = str(uuid.uuid4())
        step = WorkflowStep(
            id=step_id,
            instance_id=instance.id,
            name=step_config["name"],
            type=step_config["type"],
            status=StepStatus.PENDING,
            config=step_config,
            idempotency_key=f"{instance.id}-{step_config['name']}"
        )
        
        self.db.add(step)
        instance.current_step = step_config["name"]
        instance.status = WorkflowStatus.IN_PROGRESS
        self.db.commit()
        
        await self._execute_step(instance, step, step_config)
    
    async def _execute_step(self, instance: WorkflowInstance, step: WorkflowStep, config: Dict[str, Any]):
        """Execute a single workflow step"""
        step.status = StepStatus.IN_PROGRESS
        step.started_at = datetime.utcnow()
        self.db.commit()
        
        self._log_event(instance.id, EventType.STEP_STARTED, {
            "step_id": step.id,
            "step_name": step.name,
            "step_type": step.type
        })
        
        try:
            if step.type == "slot_filling":
                await self._execute_slot_filling(instance, step, config)
            elif step.type == "approval_request":
                await self._execute_approval_request(instance, step, config)
            elif step.type == "agent_execution":
                await self._execute_agent(instance, step, config)
            elif step.type == "email_send":
                await self._execute_email_send(instance, step, config)
            elif step.type == "wait_for_email":
                await self._execute_wait_for_email(instance, step, config)
            else:
                raise ValueError(f"Unknown step type: {step.type}")
            
        except Exception as e:
            logger.error(f"Step execution failed: step={step.name}, error={str(e)}", exc_info=True)
            step.status = StepStatus.FAILED
            step.error_message = str(e)
            step.completed_at = datetime.utcnow()
            instance.status = WorkflowStatus.FAILED
            instance.error_message = str(e)
            self.db.commit()
            
            self._log_event(instance.id, EventType.STEP_FAILED, {
                "step_id": step.id,
                "error": str(e)
            })
    
    async def _execute_slot_filling(self, instance: WorkflowInstance, step: WorkflowStep, config: Dict[str, Any]):
        """Execute slot filling step - collect required data from user"""
        required_slots = config.get("required_slots", [])
        missing_slots = []
        
        for slot in required_slots:
            if slot not in instance.context or not instance.context[slot]:
                missing_slots.append(slot)
        
        if missing_slots:
            instance.status = WorkflowStatus.WAITING_APPROVAL
            step.output_data = {"missing_slots": missing_slots}
            self.db.commit()
            
            self._log_message(instance.id, "chat", "outbound", {
                "text": f"Please provide the following information: {', '.join(missing_slots)}"
            })
        else:
            step.status = StepStatus.COMPLETED
            step.completed_at = datetime.utcnow()
            self.db.commit()
            
            await self._execute_next_step(instance)
    
    async def _execute_approval_request(self, instance: WorkflowInstance, step: WorkflowStep, config: Dict[str, Any]):
        """Execute approval request step"""
        approval_id = str(uuid.uuid4())
        approval_token = str(uuid.uuid4())
        
        approval = WorkflowApproval(
            id=approval_id,
            instance_id=instance.id,
            step_id=step.id,
            approver_user_id=instance.initiated_by_user_id,
            status=ApprovalStatus.PENDING,
            token=approval_token,
            title=config.get("title", "Approval Required"),
            description=config.get("description", ""),
            context_data=instance.context,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        self.db.add(approval)
        instance.status = WorkflowStatus.WAITING_APPROVAL
        self.db.commit()
        
        self._log_event(instance.id, EventType.APPROVAL_REQUESTED, {
            "approval_id": approval_id,
            "title": approval.title
        })
        
        self._log_message(instance.id, "chat", "outbound", {
            "text": f"{approval.title}\n\n{approval.description}",
            "approval_id": approval_id,
            "approval_token": approval_token,
            "actions": ["approve", "reject", "change"]
        })
    
    async def _execute_agent(self, instance: WorkflowInstance, step: WorkflowStep, config: Dict[str, Any]):
        """Execute agent step"""
        agent_id = config.get("agent_id")
        operation = config.get("operation", "execute")
        
        payload = {}
        for key, value in config.get("input_mapping", {}).items():
            if value.startswith("$"):
                context_key = value[1:]
                payload[key] = instance.context.get(context_key)
            else:
                payload[key] = value
        
        request = AgentExecutionRequest(
            agent_id=agent_id,
            operation=operation,
            payload=payload,
            correlation_id=instance.correlation_id,
            idempotency_key=step.idempotency_key
        )
        
        response = await self.agent_service.execute(request)
        
        if response.status == "success":
            step.status = StepStatus.COMPLETED
            step.output_data = response.data
            step.completed_at = datetime.utcnow()
            step.duration_ms = response.duration_ms
            
            output_mapping = config.get("output_mapping", {})
            for context_key, response_key in output_mapping.items():
                if response.data and response_key in response.data:
                    instance.context[context_key] = response.data[response_key]
            
            self.db.commit()
            
            self._log_event(instance.id, EventType.AGENT_EXECUTED, {
                "agent_id": agent_id,
                "operation": operation,
                "duration_ms": response.duration_ms
            })
            
            await self._execute_next_step(instance)
        else:
            raise Exception(f"Agent execution failed: {response.errors}")
    
    async def _execute_email_send(self, instance: WorkflowInstance, step: WorkflowStep, config: Dict[str, Any]):
        """Execute email send step"""
        to_addresses = config.get("to", [])
        subject = config.get("subject", "")
        body = config.get("body", "")
        
        for key, value in instance.context.items():
            subject = subject.replace(f"${{{key}}}", str(value))
            body = body.replace(f"${{{key}}}", str(value))
        
        message = EmailMessage(
            to=to_addresses,
            subject=subject,
            body=body,
            correlation_id=instance.correlation_id
        )
        
        result = await self.email_service.send_email(message)
        
        step.status = StepStatus.COMPLETED
        step.output_data = result
        step.completed_at = datetime.utcnow()
        self.db.commit()
        
        self._log_event(instance.id, EventType.EMAIL_SENT, {
            "to": to_addresses,
            "subject": subject
        })
        
        await self._execute_next_step(instance)
    
    async def _execute_wait_for_email(self, instance: WorkflowInstance, step: WorkflowStep, config: Dict[str, Any]):
        """Execute wait for email step"""
        instance.status = WorkflowStatus.WAITING_EXTERNAL
        step.status = StepStatus.IN_PROGRESS
        self.db.commit()
        
        logger.info(f"Workflow waiting for email: instance={instance.id}, step={step.name}")
    
    async def handle_email_received(self, email_data: Dict[str, Any]):
        """Handle incoming email and match to workflow"""
        subject = email_data.get("subject", "")
        correlation_id = self.email_service.extract_correlation_id(subject)
        
        if not correlation_id:
            logger.info(f"Email received without correlation ID: subject={subject}")
            return
        
        instance = self.db.query(WorkflowInstance).filter(
            WorkflowInstance.correlation_id == correlation_id,
            WorkflowInstance.status == WorkflowStatus.WAITING_EXTERNAL
        ).first()
        
        if not instance:
            logger.warning(f"No workflow found for correlation_id={correlation_id}")
            return
        
        instance.context["received_email"] = email_data
        
        self._log_event(instance.id, EventType.EMAIL_RECEIVED, email_data)
        
        current_step = self.db.query(WorkflowStep).filter(
            WorkflowStep.instance_id == instance.id,
            WorkflowStep.status == StepStatus.IN_PROGRESS
        ).first()
        
        if current_step:
            current_step.status = StepStatus.COMPLETED
            current_step.output_data = email_data
            current_step.completed_at = datetime.utcnow()
        
        self.db.commit()
        
        await self._execute_next_step(instance)
    
    async def handle_approval_decision(self, approval_token: str, decision: str, note: Optional[str] = None):
        """Handle approval decision"""
        approval = self.db.query(WorkflowApproval).filter(
            WorkflowApproval.token == approval_token,
            WorkflowApproval.status == ApprovalStatus.PENDING
        ).first()
        
        if not approval:
            raise ValueError("Approval not found or already decided")
        
        if approval.expires_at and datetime.utcnow() > approval.expires_at:
            approval.status = ApprovalStatus.EXPIRED
            self.db.commit()
            raise ValueError("Approval has expired")
        
        approval.decision = decision
        approval.decision_note = note
        approval.decided_at = datetime.utcnow()
        
        if decision == "approve":
            approval.status = ApprovalStatus.APPROVED
        elif decision == "reject":
            approval.status = ApprovalStatus.REJECTED
        
        instance = self.db.query(WorkflowInstance).filter(
            WorkflowInstance.id == approval.instance_id
        ).first()
        
        if approval.step_id:
            step = self.db.query(WorkflowStep).filter(
                WorkflowStep.id == approval.step_id
            ).first()
            if step:
                step.status = StepStatus.COMPLETED
                step.output_data = {"decision": decision}
                step.completed_at = datetime.utcnow()
        
        self.db.commit()
        
        self._log_event(instance.id, EventType.APPROVAL_DECIDED, {
            "approval_id": approval.id,
            "decision": decision
        })
        
        if decision == "approve":
            await self._execute_next_step(instance)
        elif decision == "reject":
            instance.status = WorkflowStatus.CANCELLED
            self.db.commit()
        elif decision == "change":
            instance.status = WorkflowStatus.PENDING
            self.db.commit()
    
    async def _complete_workflow(self, instance: WorkflowInstance):
        """Complete the workflow"""
        instance.status = WorkflowStatus.COMPLETED
        instance.completed_at = datetime.utcnow()
        self.db.commit()
        
        self._log_event(instance.id, EventType.WORKFLOW_COMPLETED, {
            "duration_seconds": (instance.completed_at - instance.created_at).total_seconds()
        })
        
        logger.info(f"Workflow completed: id={instance.id}, type={instance.type}")
    
    def _get_workflow_definition(self, workflow_type: str) -> Optional[WorkflowDefinition]:
        """Get workflow definition by type"""
        if workflow_type == "quote_to_cash":
            return WorkflowDefinition(
                type="quote_to_cash",
                name="Quote to Cash",
                slots={
                    "customer_id": "required",
                    "items": "required",
                    "currency": "required",
                    "contact_email": "required"
                },
                steps=[
                    {
                        "name": "collect_data",
                        "type": "slot_filling",
                        "required_slots": ["customer_id", "items", "currency", "contact_email"]
                    },
                    {
                        "name": "approval_create_quote",
                        "type": "approval_request",
                        "title": "Create Quote?",
                        "description": "Review the quote details and approve to create."
                    },
                    {
                        "name": "create_quote",
                        "type": "agent_execution",
                        "agent_id": "quote_agent",
                        "operation": "create",
                        "input_mapping": {
                            "customer_id": "$customer_id",
                            "items": "$items",
                            "currency": "$currency"
                        },
                        "output_mapping": {
                            "quote_id": "id",
                            "quote_number": "quote_number"
                        }
                    },
                    {
                        "name": "send_quote_email",
                        "type": "email_send",
                        "to": ["${contact_email}"],
                        "subject": "Quote ${quote_number}",
                        "body": "Please find attached quote ${quote_number}."
                    },
                    {
                        "name": "wait_for_po",
                        "type": "wait_for_email",
                        "description": "Waiting for purchase order from customer"
                    },
                    {
                        "name": "approval_create_so",
                        "type": "approval_request",
                        "title": "Create Sales Order?",
                        "description": "Purchase order received. Create sales order?"
                    },
                    {
                        "name": "create_sales_order",
                        "type": "agent_execution",
                        "agent_id": "sales_order_agent",
                        "operation": "create",
                        "input_mapping": {
                            "quote_id": "$quote_id",
                            "po_number": "$received_email.po_number"
                        },
                        "output_mapping": {
                            "so_id": "id"
                        }
                    }
                ]
            )
        return None
    
    def _get_current_step_index(self, instance: WorkflowInstance, definition: WorkflowDefinition) -> int:
        """Get the index of the current step"""
        if not instance.current_step:
            return 0
        
        for i, step in enumerate(definition.steps):
            if step["name"] == instance.current_step:
                return i + 1
        
        return 0
    
    def _log_event(self, instance_id: str, event_type: EventType, payload: Dict[str, Any]):
        """Log a workflow event"""
        event = WorkflowEvent(
            id=str(uuid.uuid4()),
            instance_id=instance_id,
            type=event_type,
            payload=payload,
            trace_id=str(uuid.uuid4())
        )
        self.db.add(event)
    
    def _log_message(self, instance_id: str, channel: str, direction: str, content: Dict[str, Any]):
        """Log a workflow message"""
        message = WorkflowMessage(
            id=str(uuid.uuid4()),
            instance_id=instance_id,
            channel=channel,
            direction=direction,
            content=content
        )
        self.db.add(message)
