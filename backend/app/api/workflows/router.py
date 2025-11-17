"""
Workflow Orchestration API
REST endpoints for managing workflows, approvals, and workflow instances
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_db
from app.models.workflow.workflow_models import (
    WorkflowInstance, WorkflowStep, WorkflowApproval, WorkflowEvent,
    WorkflowStatus, ApprovalStatus
)
from app.services.workflow.workflow_orchestrator import WorkflowOrchestrator

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


class StartWorkflowRequest(BaseModel):
    """Request to start a new workflow"""
    workflow_type: str = Field(..., description="Type of workflow to start")
    input_data: Dict[str, Any] = Field(..., description="Initial workflow data")
    tenant_id: int = Field(1, description="Tenant ID")
    user_id: int = Field(1, description="User ID")


class WorkflowInstanceResponse(BaseModel):
    """Workflow instance response"""
    id: str
    type: str
    status: str
    current_step: Optional[str]
    context: Dict[str, Any]
    correlation_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class WorkflowStepResponse(BaseModel):
    """Workflow step response"""
    id: str
    name: str
    type: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class WorkflowApprovalResponse(BaseModel):
    """Workflow approval response"""
    id: str
    title: str
    description: Optional[str]
    status: str
    token: str
    context_data: Optional[Dict[str, Any]]
    created_at: datetime
    expires_at: Optional[datetime]
    decision: Optional[str]
    decision_note: Optional[str]
    decided_at: Optional[datetime]

    class Config:
        from_attributes = True


class ApprovalDecisionRequest(BaseModel):
    """Request to make an approval decision"""
    decision: str = Field(..., description="Decision: 'approve', 'reject', or 'change'")
    note: Optional[str] = Field(None, description="Optional decision note")


@router.post("/start", response_model=WorkflowInstanceResponse)
async def start_workflow(
    request: StartWorkflowRequest,
    db: Session = Depends(get_db)
):
    """
    Start a new workflow instance
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        instance = await orchestrator.start_workflow(
            workflow_type=request.workflow_type,
            input_data=request.input_data,
            tenant_id=request.tenant_id,
            user_id=request.user_id
        )
        
        return WorkflowInstanceResponse.from_orm(instance)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start workflow: {str(e)}"
        )


@router.get("/instances", response_model=List[WorkflowInstanceResponse])
async def list_workflow_instances(
    tenant_id: int = 1,
    status_filter: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List workflow instances for a tenant
    """
    query = db.query(WorkflowInstance).filter(
        WorkflowInstance.tenant_id == tenant_id
    )
    
    if status_filter:
        query = query.filter(WorkflowInstance.status == status_filter)
    
    instances = query.order_by(
        WorkflowInstance.created_at.desc()
    ).limit(limit).all()
    
    return [WorkflowInstanceResponse.from_orm(i) for i in instances]


@router.get("/instances/{instance_id}", response_model=WorkflowInstanceResponse)
async def get_workflow_instance(
    instance_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific workflow instance
    """
    instance = db.query(WorkflowInstance).filter(
        WorkflowInstance.id == instance_id
    ).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow instance not found"
        )
    
    return WorkflowInstanceResponse.from_orm(instance)


@router.get("/instances/{instance_id}/steps", response_model=List[WorkflowStepResponse])
async def get_workflow_steps(
    instance_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all steps for a workflow instance
    """
    steps = db.query(WorkflowStep).filter(
        WorkflowStep.instance_id == instance_id
    ).order_by(WorkflowStep.started_at).all()
    
    return [WorkflowStepResponse.from_orm(s) for s in steps]


@router.get("/instances/{instance_id}/approvals", response_model=List[WorkflowApprovalResponse])
async def get_workflow_approvals(
    instance_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all approvals for a workflow instance
    """
    approvals = db.query(WorkflowApproval).filter(
        WorkflowApproval.instance_id == instance_id
    ).order_by(WorkflowApproval.created_at).all()
    
    return [WorkflowApprovalResponse.from_orm(a) for a in approvals]


@router.post("/approvals/{approval_token}/decide")
async def decide_approval(
    approval_token: str,
    request: ApprovalDecisionRequest,
    db: Session = Depends(get_db)
):
    """
    Make a decision on an approval
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        await orchestrator.handle_approval_decision(
            approval_token=approval_token,
            decision=request.decision,
            note=request.note
        )
        
        return {"status": "success", "decision": request.decision}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process approval: {str(e)}"
        )


@router.post("/email/received")
async def handle_email_received(
    email_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Handle incoming email for workflow matching
    
    This endpoint would be called by an email polling service
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        await orchestrator.handle_email_received(email_data)
        
        return {"status": "processed"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process email: {str(e)}"
        )


@router.get("/health")
async def workflow_health():
    """
    Health check for workflow service
    """
    return {
        "status": "healthy",
        "service": "workflow_orchestration",
        "timestamp": datetime.utcnow().isoformat()
    }
