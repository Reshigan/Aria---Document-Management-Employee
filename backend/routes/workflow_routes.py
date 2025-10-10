"""
Workflow API Routes - RAPID IMPLEMENTATION
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from database import get_db
from auth import get_current_user
from models.user_models import User
from services.workflow_service import WorkflowService
from schemas.workflow_schemas import (
    Workflow, WorkflowCreate, WorkflowUpdate, WorkflowListResponse,
    WorkflowTemplate, WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowTemplateListResponse,
    WorkflowStep, WorkflowStepUpdate, WorkflowStepAction,
    WorkflowExecution, WorkflowNotification, WorkflowStats,
    WorkflowStatus, StepStatus
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# Template Routes
@router.post("/templates", response_model=WorkflowTemplate)
async def create_workflow_template(
    template_data: WorkflowTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create workflow template"""
    service = WorkflowService(db)
    return service.create_template(template_data, current_user.id)

@router.get("/templates", response_model=WorkflowTemplateListResponse)
async def get_workflow_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow templates"""
    service = WorkflowService(db)
    templates = service.get_templates(skip, limit, category)
    total = len(templates)  # Simplified for speed
    
    return WorkflowTemplateListResponse(
        templates=templates,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/templates/{template_id}", response_model=WorkflowTemplate)
async def get_workflow_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow template by ID"""
    service = WorkflowService(db)
    template = service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/templates/{template_id}", response_model=WorkflowTemplate)
async def update_workflow_template(
    template_id: int,
    template_data: WorkflowTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workflow template"""
    service = WorkflowService(db)
    template = service.update_template(template_id, template_data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

# Workflow Routes
@router.post("", response_model=Workflow)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create workflow"""
    service = WorkflowService(db)
    return service.create_workflow(workflow_data, current_user.id)

@router.post("/from-template/{template_id}", response_model=Workflow)
async def create_workflow_from_template(
    template_id: int,
    document_id: int,
    workflow_data: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create workflow from template"""
    service = WorkflowService(db)
    workflow = service.create_workflow_from_template(
        template_id, document_id, current_user.id, workflow_data
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Template not found")
    return workflow

@router.get("", response_model=WorkflowListResponse)
async def get_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[WorkflowStatus] = None,
    document_id: Optional[int] = None,
    my_workflows: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflows"""
    service = WorkflowService(db)
    user_id = current_user.id if my_workflows else None
    workflows = service.get_workflows(skip, limit, status, document_id, user_id)
    total = len(workflows)  # Simplified for speed
    
    return WorkflowListResponse(
        workflows=workflows,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/{workflow_id}", response_model=Workflow)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow by ID"""
    service = WorkflowService(db)
    workflow = service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.put("/{workflow_id}", response_model=Workflow)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workflow"""
    service = WorkflowService(db)
    workflow = service.update_workflow(workflow_id, workflow_data)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.post("/{workflow_id}/start", response_model=Workflow)
async def start_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start workflow execution"""
    service = WorkflowService(db)
    workflow = service.start_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=400, detail="Cannot start workflow")
    return workflow

# Step Routes
@router.get("/{workflow_id}/steps", response_model=List[WorkflowStep])
async def get_workflow_steps(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow steps"""
    service = WorkflowService(db)
    return service.get_workflow_steps(workflow_id)

@router.get("/steps/{step_id}", response_model=WorkflowStep)
async def get_workflow_step(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow step by ID"""
    service = WorkflowService(db)
    step = service.get_step(step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step

@router.put("/steps/{step_id}", response_model=WorkflowStep)
async def update_workflow_step(
    step_id: int,
    step_data: WorkflowStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workflow step"""
    service = WorkflowService(db)
    step = service.update_step(step_id, step_data)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step

@router.post("/steps/{step_id}/complete", response_model=WorkflowStep)
async def complete_workflow_step(
    step_id: int,
    action_data: WorkflowStepAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Complete workflow step"""
    service = WorkflowService(db)
    step = service.complete_step(
        step_id, current_user.id, 
        action_data.step_data, action_data.comments
    )
    if not step:
        raise HTTPException(status_code=400, detail="Cannot complete step")
    return step

# Task Management
@router.get("/tasks/my-tasks", response_model=List[WorkflowStep])
async def get_my_tasks(
    status: Optional[StepStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's assigned workflow tasks"""
    service = WorkflowService(db)
    return service.get_user_tasks(current_user.id, status)

# Analytics
@router.get("/analytics/stats", response_model=WorkflowStats)
async def get_workflow_stats(
    my_workflows: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow statistics"""
    service = WorkflowService(db)
    user_id = current_user.id if my_workflows else None
    return service.get_workflow_stats(user_id)

# Bulk Operations
@router.post("/bulk/start")
async def bulk_start_workflows(
    workflow_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start multiple workflows"""
    service = WorkflowService(db)
    results = []
    
    for workflow_id in workflow_ids:
        try:
            workflow = service.start_workflow(workflow_id)
            results.append({"workflow_id": workflow_id, "success": bool(workflow)})
        except Exception as e:
            results.append({"workflow_id": workflow_id, "success": False, "error": str(e)})
    
    return {"results": results}

@router.post("/bulk/assign")
async def bulk_assign_workflows(
    workflow_ids: List[int],
    assigned_to: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign multiple workflows"""
    service = WorkflowService(db)
    results = []
    
    for workflow_id in workflow_ids:
        try:
            workflow = service.update_workflow(workflow_id, WorkflowUpdate(assigned_to=assigned_to))
            results.append({"workflow_id": workflow_id, "success": bool(workflow)})
        except Exception as e:
            results.append({"workflow_id": workflow_id, "success": False, "error": str(e)})
    
    return {"results": results}

# Search and Filtering
@router.get("/search", response_model=WorkflowListResponse)
async def search_workflows(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search workflows"""
    service = WorkflowService(db)
    # Simplified search - in production, use full-text search
    workflows = service.get_workflows(skip, limit)
    filtered = [w for w in workflows if q.lower() in w.name.lower() or (w.description and q.lower() in w.description.lower())]
    
    return WorkflowListResponse(
        workflows=filtered,
        total=len(filtered),
        page=skip // limit + 1,
        size=limit
    )