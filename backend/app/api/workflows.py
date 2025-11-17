"""
Workflow API Endpoints

Provides REST API for workflow management and execution.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.workflows.workflow_orchestrator import WorkflowOrchestrator


router = APIRouter(prefix="/api/workflows", tags=["workflows"])



class StartWorkflowRequest(BaseModel):
    workflow_name: str
    initial_context: Dict[str, Any]
    conversation_id: Optional[str] = None


class ApprovalDecisionRequest(BaseModel):
    notes: Optional[str] = None


class ProcessEventRequest(BaseModel):
    event_type: str
    event_data: Dict[str, Any]
    correlation_keys: Dict[str, Any]
    event_source: str = "manual"


class WorkflowResponse(BaseModel):
    instance_id: str
    workflow_name: Optional[str]
    current_state: str
    status: str
    context: Dict[str, Any]
    started_at: Optional[str]
    last_activity_at: Optional[str]
    pending_approvals: List[Dict[str, Any]]
    recent_steps: List[Dict[str, Any]]



@router.post("/start", response_model=WorkflowResponse)
async def start_workflow(
    request: StartWorkflowRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new workflow instance.
    
    Example:
    ```
    POST /api/workflows/start
    {
        "workflow_name": "quote_to_cash",
        "initial_context": {
            "customer_name": "Woolworths",
            "customer_id": "cust-123",
            "products": [...]
        },
        "conversation_id": "conv-456"
    }
    ```
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        
        result = await orchestrator.start_workflow(
            workflow_name=request.workflow_name,
            company_id=UUID(current_user['company_id']),
            user_id=UUID(current_user['user_id']),
            initial_context=request.initial_context,
            conversation_id=UUID(request.conversation_id) if request.conversation_id else None
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")


@router.get("/{instance_id}", response_model=WorkflowResponse)
async def get_workflow_status(
    instance_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current status of a workflow instance.
    
    Example:
    ```
    GET /api/workflows/abc-123
    ```
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        result = orchestrator.get_workflow_status(UUID(instance_id))
        
        if not result:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")


@router.post("/{instance_id}/approve", response_model=WorkflowResponse)
async def approve_workflow_step(
    instance_id: str,
    request: ApprovalDecisionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a pending workflow step.
    
    Example:
    ```
    POST /api/workflows/abc-123/approve
    {
        "notes": "Looks good, proceed with sending quote"
    }
    ```
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        
        result = await orchestrator.approve_step(
            instance_id=UUID(instance_id),
            user_id=UUID(current_user['user_id']),
            notes=request.notes
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve step: {str(e)}")


@router.post("/{instance_id}/reject", response_model=WorkflowResponse)
async def reject_workflow_step(
    instance_id: str,
    request: ApprovalDecisionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a pending workflow step.
    
    Example:
    ```
    POST /api/workflows/abc-123/reject
    {
        "notes": "Price is too low, need to revise"
    }
    ```
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        
        result = await orchestrator.reject_step(
            instance_id=UUID(instance_id),
            user_id=UUID(current_user['user_id']),
            notes=request.notes
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject step: {str(e)}")


@router.post("/events", response_model=Dict[str, Any])
async def process_workflow_event(
    request: ProcessEventRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process an external event that may resume workflows.
    
    Example:
    ```
    POST /api/workflows/events
    {
        "event_type": "po_received",
        "event_data": {
            "po_number": "PO-12345",
            "po_document": "..."
        },
        "correlation_keys": {
            "quote_id": "quote-789",
            "customer_id": "cust-123"
        },
        "event_source": "email"
    }
    ```
    """
    try:
        orchestrator = WorkflowOrchestrator(db)
        
        resumed_workflows = await orchestrator.process_event(
            event_type=request.event_type,
            event_data=request.event_data,
            correlation_keys=request.correlation_keys,
            event_source=request.event_source
        )
        
        return {
            "event_type": request.event_type,
            "resumed_workflows": [str(wf_id) for wf_id in resumed_workflows],
            "count": len(resumed_workflows)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process event: {str(e)}")


@router.get("/", response_model=List[Dict[str, Any]])
async def list_workflows(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List workflow instances for current user's company.
    
    Example:
    ```
    GET /api/workflows?status=running
    ```
    """
    try:
        company_id = current_user['company_id']
        
        query = """
            SELECT id, workflow_definition_id, current_state, status,
                   started_at, last_activity_at
            FROM workflow_instances
            WHERE company_id = :company_id
        """
        params = {'company_id': company_id}
        
        if status:
            query += " AND status = :status"
            params['status'] = status
        
        query += " ORDER BY last_activity_at DESC LIMIT 50"
        
        results = db.execute(query, params).fetchall()
        
        workflows = []
        for row in results:
            workflows.append({
                'instance_id': str(row[0]),
                'workflow_definition_id': str(row[1]),
                'current_state': row[2],
                'status': row[3],
                'started_at': row[4].isoformat() if row[4] else None,
                'last_activity_at': row[5].isoformat() if row[5] else None
            })
        
        return workflows
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list workflows: {str(e)}")


@router.get("/{instance_id}/audit", response_model=List[Dict[str, Any]])
async def get_workflow_audit_log(
    instance_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get audit log for a workflow instance.
    
    Example:
    ```
    GET /api/workflows/abc-123/audit
    ```
    """
    try:
        results = db.execute("""
            SELECT id, action, actor_type, old_state, new_state,
                   description, created_at
            FROM workflow_audit_log
            WHERE workflow_instance_id = :instance_id
            ORDER BY created_at DESC
        """, {'instance_id': instance_id}).fetchall()
        
        audit_log = []
        for row in results:
            audit_log.append({
                'id': str(row[0]),
                'action': row[1],
                'actor_type': row[2],
                'old_state': row[3],
                'new_state': row[4],
                'description': row[5],
                'created_at': row[6].isoformat() if row[6] else None
            })
        
        return audit_log
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get audit log: {str(e)}")
