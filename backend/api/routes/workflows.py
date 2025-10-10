"""
Workflow Management API Routes
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, select, update, delete, or_

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import (
    User, WorkflowTemplate, WorkflowStepTemplate, Workflow, WorkflowStep, 
    Document, ActivityLog
)
from schemas.advanced import (
    WorkflowTemplateResponse, WorkflowTemplateCreate, WorkflowTemplateUpdate,
    WorkflowResponse, WorkflowCreate, WorkflowStepResponse, WorkflowStepUpdate
)
from services.auth_service import auth_service

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/templates", response_model=List[WorkflowTemplateResponse])
async def list_workflow_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List available workflow templates"""
    query = select(WorkflowTemplate)
    
    # Non-superusers only see public templates or their own
    if not current_user.is_superuser:
        query = query.where(
            or_(
                WorkflowTemplate.is_public == True,
                WorkflowTemplate.created_by == current_user.id
            )
        )
    
    result = await db.execute(query.order_by(WorkflowTemplate.name))
    templates = result.scalars().all()
    
    return [WorkflowTemplateResponse.from_orm(template) for template in templates]


@router.post("/templates", response_model=WorkflowTemplateResponse)
async def create_workflow_template(
    template_data: WorkflowTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new workflow template"""
    # Check if name already exists
    query = select(WorkflowTemplate).where(
        WorkflowTemplate.name == template_data.name
    )
    result = await db.execute(query)
    existing_template = result.scalar_one_or_none()
    
    if existing_template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow template with this name already exists"
        )
    
    # Create template
    template = WorkflowTemplate(
        name=template_data.name,
        description=template_data.description,
        category=template_data.category,
        is_public=template_data.is_public,
        created_by=current_user.id
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    # Create step templates
    for i, step_data in enumerate(template_data.steps):
        step_template = WorkflowStepTemplate(
            workflow_template_id=template.id,
            name=step_data.name,
            description=step_data.description,
            step_type=step_data.step_type,
            order_index=i + 1,
            required=step_data.required,
            auto_complete=step_data.auto_complete,
            assigned_role=step_data.assigned_role,
            due_days=step_data.due_days,
            conditions=step_data.conditions,
            actions=step_data.actions
        )
        db.add(step_template)
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "workflow_template_created", "workflow_template", template.id,
        f"Created workflow template: {template.name}"
    )
    
    return WorkflowTemplateResponse.from_orm(template)


@router.get("/templates/{template_id}", response_model=WorkflowTemplateResponse)
async def get_workflow_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get workflow template details"""
    result = await db.execute(select(WorkflowTemplate).where(
        WorkflowTemplate.id == template_id
    ))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow template not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access this workflow template"
        )
    
    return WorkflowTemplateResponse.from_orm(template)


@router.put("/templates/{template_id}", response_model=WorkflowTemplateResponse)
async def update_workflow_template(
    template_id: int,
    template_data: WorkflowTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update workflow template"""
    result = await db.execute(select(WorkflowTemplate).where(
        WorkflowTemplate.id == template_id
    ))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow template not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to modify this workflow template"
        )
    
    # Update fields
    update_data = template_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(template, field):
            setattr(template, field, value)
    
    await db.commit()
    await db.refresh(template)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "workflow_template_updated", "workflow_template", template.id,
        f"Updated workflow template: {template.name}"
    )
    
    return WorkflowTemplateResponse.from_orm(template)


@router.delete("/templates/{template_id}")
async def delete_workflow_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete workflow template"""
    result = await db.execute(select(WorkflowTemplate).where(
        WorkflowTemplate.id == template_id
    ))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow template not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this workflow template"
        )
    
    # Check if template is in use
    active_workflows = select(Workflow).where(
        and_(
            Workflow.template_id == template_id,
            Workflow.status.in_(["pending", "in_progress"])
        )
    ).scalar()
    
    if active_workflows > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete template with {active_workflows} active workflows"
        )
    
    # Delete step templates
    select(WorkflowStepTemplate).where(
        WorkflowStepTemplate.workflow_template_id == template_id
    ).delete()
    
    # Delete template
    await db.delete(template)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "workflow_template_deleted", "workflow_template", template_id,
        f"Deleted workflow template: {template.name}"
    )
    
    return {"message": "Workflow template deleted successfully"}


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new workflow instance"""
    # Verify template exists
    result = await db.execute(select(WorkflowTemplate).where(
        WorkflowTemplate.id == workflow_data.template_id
    ))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow template not found"
        )
    
    # Check template permissions
    if not current_user.is_superuser and not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to use this workflow template"
        )
    
    # Verify document exists if specified
    if workflow_data.document_id:
        query = select(Document).where(
            Document.id == workflow_data.document_id
        )
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Create workflow
    workflow = Workflow(
        template_id=workflow_data.template_id,
        document_id=workflow_data.document_id,
        title=workflow_data.title or template.name,
        description=workflow_data.description,
        priority=workflow_data.priority,
        due_date=workflow_data.due_date,
        created_by=current_user.id,
        status="pending"
    )
    
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    
    # Create workflow steps from template
    step_templates = select(WorkflowStepTemplate).where(
        WorkflowStepTemplate.workflow_template_id == template.id
    ).order_by(WorkflowStepTemplate.order_index).all()
    
    for step_template in step_templates:
        # Calculate due date for step
        step_due_date = None
        if step_template.due_days and workflow.due_date:
            step_due_date = workflow.due_date
        elif step_template.due_days:
            step_due_date = datetime.utcnow() + timedelta(days=step_template.due_days)
        
        workflow_step = WorkflowStep(
            workflow_id=workflow.id,
            step_template_id=step_template.id,
            name=step_template.name,
            description=step_template.description,
            step_type=step_template.step_type,
            order_index=step_template.order_index,
            status="pending",
            required=step_template.required,
            assigned_role=step_template.assigned_role,
            due_date=step_due_date,
            conditions=step_template.conditions,
            actions=step_template.actions
        )
        db.add(workflow_step)
    
    # Set first step to active
    first_step = select(WorkflowStep).where(
        WorkflowStep.workflow_id == workflow.id
    ).order_by(WorkflowStep.order_index).first()
    
    if first_step:
        first_step.status = "active"
        workflow.status = "in_progress"
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "workflow_created", "workflow", workflow.id,
        f"Created workflow: {workflow.title}"
    )
    
    return WorkflowResponse.from_orm(workflow)


@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    status: Optional[str] = Query(None),
    template_id: Optional[int] = Query(None),
    document_id: Optional[int] = Query(None),
    assigned_to_me: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List workflows with filtering"""
    query = select(Workflow)
    
    # Apply filters
    if status:
        query = query.where(Workflow.status == status)
    
    if template_id:
        query = query.where(Workflow.template_id == template_id)
    
    if document_id:
        query = query.where(Workflow.document_id == document_id)
    
    if assigned_to_me:
        # Find workflows with steps assigned to current user
        assigned_workflow_ids = select(WorkflowStep.workflow_id).where(
            and_(
                WorkflowStep.assigned_user_id == current_user.id,
                WorkflowStep.status.in_(["active", "pending"])
            )
        ).subquery()
        query = query.where(Workflow.id.in_(assigned_workflow_ids))
    
    # Non-superusers only see workflows they created or are involved in
    if not current_user.is_superuser:
        involved_workflow_ids = select(WorkflowStep.workflow_id).where(
            or_(
                WorkflowStep.assigned_user_id == current_user.id,
                WorkflowStep.completed_by == current_user.id
            )
        ).subquery()
        
        query = query.where(
            or_(
                Workflow.created_by == current_user.id,
                Workflow.id.in_(involved_workflow_ids)
            )
        )
    
    # Apply pagination
    result = await db.execute(query.order_by(Workflow.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size))
    result = await db.execute(result.scalars())
    result = await db.execute(result.scalars())
    workflows = result.scalars().all()
    
    return [WorkflowResponse.from_orm(workflow) for workflow in workflows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get workflow details"""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        # Check if user is creator or involved in workflow
        is_involved = select(WorkflowStep).where(
            and_(
                WorkflowStep.workflow_id == workflow_id,
                or_(
                    WorkflowStep.assigned_user_id == current_user.id,
                    WorkflowStep.completed_by == current_user.id
                )
            )
        ).first() is not None
        
        if workflow.created_by != current_user.id and not is_involved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to access this workflow"
            )
    
    return WorkflowResponse.from_orm(workflow)


@router.put("/{workflow_id}/steps/{step_id}", response_model=WorkflowStepResponse)
async def update_workflow_step(
    workflow_id: int,
    step_id: int,
    step_data: WorkflowStepUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update workflow step (complete, assign, etc.)"""
    step = select(WorkflowStep).where(
        and_(
            WorkflowStep.id == step_id,
            WorkflowStep.workflow_id == workflow_id
        )
    ).first()
    
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow step not found"
        )
    
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    # Check permissions
    can_update = (
        current_user.is_superuser or
        workflow.created_by == current_user.id or
        step.assigned_user_id == current_user.id
    )
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to update this workflow step"
        )
    
    # Update step
    if step_data.status == "completed":
        step.status = "completed"
        step.completed_by = current_user.id
        step.completed_at = datetime.utcnow()
        step.completion_notes = step_data.completion_notes
        
        # Check if this was the last step
        remaining_steps = select(WorkflowStep).where(
            and_(
                WorkflowStep.workflow_id == workflow_id,
                WorkflowStep.status.in_(["pending", "active"]),
                WorkflowStep.required == True
            )
        ).scalar()
        
        if remaining_steps == 0:
            # Workflow is complete
            workflow.status = "completed"
            workflow.completed_at = datetime.utcnow()
        else:
            # Activate next step
            next_step = select(WorkflowStep).where(
                and_(
                    WorkflowStep.workflow_id == workflow_id,
                    WorkflowStep.order_index > step.order_index,
                    WorkflowStep.status == "pending"
                )
            ).order_by(WorkflowStep.order_index).first()
            
            if next_step:
                next_step.status = "active"
    
    elif step_data.assigned_user_id:
        # Assign step to user
        query = select(User).where(User.id == step_data.assigned_user_id)
        result = await db.execute(query)
        assignee = result.scalar_one_or_none()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignee user not found"
            )
        
        step.assigned_user_id = step_data.assigned_user_id
        step.assigned_at = datetime.utcnow()
    
    # Update other fields
    if step_data.notes:
        step.notes = step_data.notes
    
    if step_data.due_date:
        step.due_date = step_data.due_date
    
    await db.commit()
    await db.refresh(step)
    
    # Log activity
    action = "workflow_step_completed" if step_data.status == "completed" else "workflow_step_updated"
    await auth_service._log_activity_async(
        db, current_user.id, action, "workflow_step", step.id,
        f"Updated workflow step: {step.name}"
    )
    
    return WorkflowStepResponse.from_orm(step)


@router.post("/{workflow_id}/cancel")
async def cancel_workflow(
    workflow_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel workflow"""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and workflow.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to cancel this workflow"
        )
    
    if workflow.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel workflow that is already completed or cancelled"
        )
    
    # Cancel workflow and all pending steps
    workflow.status = "cancelled"
    workflow.cancelled_at = datetime.utcnow()
    workflow.cancellation_reason = reason
    
    # Cancel all pending/active steps
    select(WorkflowStep).where(
        and_(
            WorkflowStep.workflow_id == workflow_id,
            WorkflowStep.status.in_(["pending", "active"])
        )
    ).update({"status": "cancelled"})
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "workflow_cancelled", "workflow", workflow.id,
        f"Cancelled workflow: {workflow.title} - Reason: {reason}"
    )
    
    return {"message": "Workflow cancelled successfully"}


@router.get("/{workflow_id}/history")
async def get_workflow_history(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get workflow execution history"""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        is_involved = select(WorkflowStep).where(
            and_(
                WorkflowStep.workflow_id == workflow_id,
                or_(
                    WorkflowStep.assigned_user_id == current_user.id,
                    WorkflowStep.completed_by == current_user.id
                )
            )
        ).first() is not None
        
        if workflow.created_by != current_user.id and not is_involved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to access this workflow"
            )
    
    # Get workflow activity history
    activities = select(ActivityLog).where(
        and_(
            ActivityLog.resource_type.in_(["workflow", "workflow_step"]),
            or_(
                ActivityLog.resource_id == workflow_id,
                ActivityLog.extra_data.contains(f'"workflow_id": {workflow_id}')
            )
        )
    ).order_by(ActivityLog.created_at.desc()).all()
    
    return [
        {
            "id": activity.id,
            "action": activity.action,
            "description": activity.description,
            "user_id": activity.user_id,
            "created_at": activity.created_at,
            "extra_data": activity.extra_data
        }
        for activity in activities
    ]