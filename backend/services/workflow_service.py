"""
Workflow Service - RAPID IMPLEMENTATION
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from models.workflow_models import (
    Workflow, WorkflowStep, WorkflowTemplate, WorkflowTemplateStep,
    WorkflowExecution, WorkflowNotification, WorkflowStatus, StepStatus
)
from schemas.workflow_schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowTemplateCreate, WorkflowTemplateUpdate,
    WorkflowStepUpdate, WorkflowExecutionCreate, WorkflowNotificationCreate
)

logger = logging.getLogger(__name__)

class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    # Template Management
    def create_template(self, template_data: WorkflowTemplateCreate, user_id: int) -> WorkflowTemplate:
        """Create workflow template"""
        template = WorkflowTemplate(
            **template_data.model_dump(exclude={'steps'}),
            created_by=user_id
        )
        self.db.add(template)
        self.db.flush()
        
        # Add steps
        for step_data in template_data.steps:
            step = WorkflowTemplateStep(
                **step_data.model_dump(),
                template_id=template.id
            )
            self.db.add(step)
        
        self.db.commit()
        self.db.refresh(template)
        return template

    def get_templates(self, skip: int = 0, limit: int = 100, category: Optional[str] = None) -> List[WorkflowTemplate]:
        """Get workflow templates"""
        query = self.db.query(WorkflowTemplate)
        if category:
            query = query.filter(WorkflowTemplate.category == category)
        return query.filter(WorkflowTemplate.is_active == True).offset(skip).limit(limit).all()

    def get_template(self, template_id: int) -> Optional[WorkflowTemplate]:
        """Get workflow template by ID"""
        return self.db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()

    def update_template(self, template_id: int, template_data: WorkflowTemplateUpdate) -> Optional[WorkflowTemplate]:
        """Update workflow template"""
        template = self.get_template(template_id)
        if not template:
            return None
        
        for field, value in template_data.model_dump(exclude_unset=True).items():
            setattr(template, field, value)
        
        self.db.commit()
        self.db.refresh(template)
        return template

    # Workflow Management
    def create_workflow(self, workflow_data: WorkflowCreate, user_id: int) -> Workflow:
        """Create workflow instance"""
        workflow = Workflow(
            **workflow_data.model_dump(exclude={'steps'}),
            created_by=user_id
        )
        self.db.add(workflow)
        self.db.flush()
        
        # Add steps
        for step_data in workflow_data.steps:
            step = WorkflowStep(
                **step_data.model_dump(),
                workflow_id=workflow.id
            )
            self.db.add(step)
        
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def create_workflow_from_template(self, template_id: int, document_id: int, user_id: int, 
                                    workflow_data: Optional[Dict[str, Any]] = None) -> Optional[Workflow]:
        """Create workflow from template"""
        template = self.get_template(template_id)
        if not template:
            return None
        
        workflow = Workflow(
            name=f"{template.name} - Document {document_id}",
            description=template.description,
            template_id=template_id,
            document_id=document_id,
            created_by=user_id,
            workflow_data=workflow_data or {}
        )
        self.db.add(workflow)
        self.db.flush()
        
        # Create steps from template
        for template_step in template.steps:
            step = WorkflowStep(
                workflow_id=workflow.id,
                step_number=template_step.step_number,
                name=template_step.name,
                description=template_step.description,
                action_type=template_step.action_type,
                assigned_to=template_step.assigned_user_id,
                assigned_role=template_step.assigned_role,
                step_data=template_step.config,
                due_date=datetime.utcnow() + timedelta(hours=template_step.timeout_hours)
            )
            self.db.add(step)
        
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def get_workflows(self, skip: int = 0, limit: int = 100, status: Optional[WorkflowStatus] = None,
                     document_id: Optional[int] = None, user_id: Optional[int] = None) -> List[Workflow]:
        """Get workflows with filters"""
        query = self.db.query(Workflow)
        
        if status:
            query = query.filter(Workflow.status == status)
        if document_id:
            query = query.filter(Workflow.document_id == document_id)
        if user_id:
            query = query.filter(or_(
                Workflow.created_by == user_id,
                Workflow.assigned_to == user_id
            ))
        
        return query.order_by(desc(Workflow.created_at)).offset(skip).limit(limit).all()

    def get_workflow(self, workflow_id: int) -> Optional[Workflow]:
        """Get workflow by ID"""
        return self.db.query(Workflow).filter(Workflow.id == workflow_id).first()

    def update_workflow(self, workflow_id: int, workflow_data: WorkflowUpdate) -> Optional[Workflow]:
        """Update workflow"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return None
        
        for field, value in workflow_data.model_dump(exclude_unset=True).items():
            setattr(workflow, field, value)
        
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    # Step Management
    def get_workflow_steps(self, workflow_id: int) -> List[WorkflowStep]:
        """Get workflow steps"""
        return self.db.query(WorkflowStep).filter(
            WorkflowStep.workflow_id == workflow_id
        ).order_by(WorkflowStep.step_number).all()

    def get_step(self, step_id: int) -> Optional[WorkflowStep]:
        """Get workflow step by ID"""
        return self.db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()

    def update_step(self, step_id: int, step_data: WorkflowStepUpdate) -> Optional[WorkflowStep]:
        """Update workflow step"""
        step = self.get_step(step_id)
        if not step:
            return None
        
        for field, value in step_data.model_dump(exclude_unset=True).items():
            setattr(step, field, value)
        
        # Update timestamps based on status
        if step_data.status == StepStatus.IN_PROGRESS and not step.started_at:
            step.started_at = datetime.utcnow()
        elif step_data.status == StepStatus.COMPLETED and not step.completed_at:
            step.completed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(step)
        
        # Update workflow progress
        self._update_workflow_progress(step.workflow_id)
        
        return step

    def start_workflow(self, workflow_id: int) -> Optional[Workflow]:
        """Start workflow execution"""
        workflow = self.get_workflow(workflow_id)
        if not workflow or workflow.status != WorkflowStatus.DRAFT:
            return None
        
        workflow.status = WorkflowStatus.ACTIVE
        workflow.started_at = datetime.utcnow()
        workflow.current_step = 1
        
        # Start first step
        first_step = self.db.query(WorkflowStep).filter(
            and_(WorkflowStep.workflow_id == workflow_id, WorkflowStep.step_number == 1)
        ).first()
        
        if first_step:
            first_step.status = StepStatus.IN_PROGRESS
            first_step.started_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def complete_step(self, step_id: int, user_id: int, result_data: Optional[Dict[str, Any]] = None,
                     comments: Optional[str] = None) -> Optional[WorkflowStep]:
        """Complete workflow step"""
        step = self.get_step(step_id)
        if not step or step.status != StepStatus.IN_PROGRESS:
            return None
        
        step.status = StepStatus.COMPLETED
        step.completed_at = datetime.utcnow()
        if result_data:
            step.result_data = result_data
        if comments:
            step.comments = comments
        
        # Log execution
        execution = WorkflowExecution(
            workflow_id=step.workflow_id,
            step_id=step_id,
            action="complete",
            actor_id=user_id,
            execution_data=result_data or {},
            result="success"
        )
        self.db.add(execution)
        
        # Start next step
        next_step = self.db.query(WorkflowStep).filter(
            and_(
                WorkflowStep.workflow_id == step.workflow_id,
                WorkflowStep.step_number == step.step_number + 1
            )
        ).first()
        
        if next_step:
            next_step.status = StepStatus.IN_PROGRESS
            next_step.started_at = datetime.utcnow()
            
            workflow = self.get_workflow(step.workflow_id)
            workflow.current_step = next_step.step_number
        else:
            # Complete workflow
            workflow = self.get_workflow(step.workflow_id)
            workflow.status = WorkflowStatus.COMPLETED
            workflow.completed_at = datetime.utcnow()
            workflow.progress_percentage = 100
        
        self.db.commit()
        self.db.refresh(step)
        return step

    def _update_workflow_progress(self, workflow_id: int):
        """Update workflow progress percentage"""
        total_steps = self.db.query(func.count(WorkflowStep.id)).filter(
            WorkflowStep.workflow_id == workflow_id
        ).scalar()
        
        completed_steps = self.db.query(func.count(WorkflowStep.id)).filter(
            and_(
                WorkflowStep.workflow_id == workflow_id,
                WorkflowStep.status == StepStatus.COMPLETED
            )
        ).scalar()
        
        if total_steps > 0:
            progress = int((completed_steps / total_steps) * 100)
            workflow = self.get_workflow(workflow_id)
            workflow.progress_percentage = progress
            self.db.commit()

    # Analytics and Reporting
    def get_workflow_stats(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Get workflow statistics"""
        query = self.db.query(Workflow)
        if user_id:
            query = query.filter(or_(
                Workflow.created_by == user_id,
                Workflow.assigned_to == user_id
            ))
        
        total = query.count()
        active = query.filter(Workflow.status == WorkflowStatus.ACTIVE).count()
        completed = query.filter(Workflow.status == WorkflowStatus.COMPLETED).count()
        
        # Pending steps
        step_query = self.db.query(WorkflowStep)
        if user_id:
            step_query = step_query.join(Workflow).filter(or_(
                Workflow.created_by == user_id,
                Workflow.assigned_to == user_id,
                WorkflowStep.assigned_to == user_id
            ))
        
        pending_steps = step_query.filter(WorkflowStep.status == StepStatus.PENDING).count()
        overdue_steps = step_query.filter(
            and_(
                WorkflowStep.status.in_([StepStatus.PENDING, StepStatus.IN_PROGRESS]),
                WorkflowStep.due_date < datetime.utcnow()
            )
        ).count()
        
        return {
            "total_workflows": total,
            "active_workflows": active,
            "completed_workflows": completed,
            "pending_steps": pending_steps,
            "overdue_steps": overdue_steps
        }

    def get_user_tasks(self, user_id: int, status: Optional[StepStatus] = None) -> List[WorkflowStep]:
        """Get user's assigned workflow tasks"""
        query = self.db.query(WorkflowStep).filter(WorkflowStep.assigned_to == user_id)
        
        if status:
            query = query.filter(WorkflowStep.status == status)
        else:
            query = query.filter(WorkflowStep.status.in_([StepStatus.PENDING, StepStatus.IN_PROGRESS]))
        
        return query.order_by(WorkflowStep.due_date).all()

    # Notifications
    def create_notification(self, notification_data: WorkflowNotificationCreate) -> WorkflowNotification:
        """Create workflow notification"""
        notification = WorkflowNotification(**notification_data.model_dump())
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_pending_notifications(self) -> List[WorkflowNotification]:
        """Get pending notifications to send"""
        return self.db.query(WorkflowNotification).filter(
            WorkflowNotification.is_sent == False
        ).all()

    def mark_notification_sent(self, notification_id: int):
        """Mark notification as sent"""
        notification = self.db.query(WorkflowNotification).filter(
            WorkflowNotification.id == notification_id
        ).first()
        if notification:
            notification.is_sent = True
            notification.sent_at = datetime.utcnow()
            self.db.commit()