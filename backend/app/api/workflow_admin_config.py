"""
Workflow Admin Configuration API
Provides 3 admin screens:
1. Approval Matrices Configuration
2. Step Definitions Configuration
3. Escalation Rules Configuration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

router = APIRouter(prefix="/api/admin/workflow", tags=["Workflow Admin Configuration"])

# ============================================================================
# ============================================================================

class ApprovalMatrixCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    document_type: str  # QUOTE, SALES_ORDER, PURCHASE_ORDER, INVOICE, etc.
    approval_type: str  # AMOUNT_BASED, ROLE_BASED, SEQUENTIAL, PARALLEL
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    required_approvers: int = 1
    is_active: bool = True

class ApprovalMatrixUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[str] = None
    approval_type: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    required_approvers: Optional[int] = None
    is_active: Optional[bool] = None

class ApprovalMatrixResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    document_type: str
    approval_type: str
    min_amount: Optional[float]
    max_amount: Optional[float]
    required_approvers: int
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ApprovalMatrixLevelCreate(BaseModel):
    matrix_id: int
    level: int
    approver_role: str
    approver_user_id: Optional[str] = None
    can_delegate: bool = False
    is_required: bool = True

class ApprovalMatrixLevelResponse(BaseModel):
    id: int
    company_id: str
    matrix_id: int
    level: int
    approver_role: str
    approver_user_id: Optional[str]
    can_delegate: bool
    is_required: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/approval-matrices", response_model=List[ApprovalMatrixResponse])
def get_approval_matrices(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    document_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all approval matrices for a company"""
    query = """
        SELECT id, company_id, code, name, description, document_type,
               approval_type, min_amount, max_amount, required_approvers,
               is_active, created_by, created_at, updated_at
        FROM approval_matrices
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if document_type:
        query += " AND document_type = :document_type"
        params["document_type"] = document_type
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY document_type, code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/approval-matrices", response_model=ApprovalMatrixResponse)
def create_approval_matrix(
    matrix: ApprovalMatrixCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new approval matrix"""
    query = """
        INSERT INTO approval_matrices (
            company_id, code, name, description, document_type,
            approval_type, min_amount, max_amount, required_approvers,
            is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :document_type,
            :approval_type, :min_amount, :max_amount, :required_approvers,
            :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, document_type,
                    approval_type, min_amount, max_amount, required_approvers,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": matrix.code,
        "name": matrix.name,
        "description": matrix.description,
        "document_type": matrix.document_type,
        "approval_type": matrix.approval_type,
        "min_amount": matrix.min_amount,
        "max_amount": matrix.max_amount,
        "required_approvers": matrix.required_approvers,
        "is_active": matrix.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.get("/approval-matrix-levels", response_model=List[ApprovalMatrixLevelResponse])
def get_approval_matrix_levels(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    matrix_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all approval matrix levels for a company"""
    query = """
        SELECT id, company_id, matrix_id, level, approver_role,
               approver_user_id, can_delegate, is_required,
               created_by, created_at, updated_at
        FROM approval_matrix_levels
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if matrix_id:
        query += " AND matrix_id = :matrix_id"
        params["matrix_id"] = matrix_id
    
    query += " ORDER BY matrix_id, level OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/approval-matrix-levels", response_model=ApprovalMatrixLevelResponse)
def create_approval_matrix_level(
    level: ApprovalMatrixLevelCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new approval matrix level"""
    query = """
        INSERT INTO approval_matrix_levels (
            company_id, matrix_id, level, approver_role, approver_user_id,
            can_delegate, is_required, created_by
        ) VALUES (
            :company_id, :matrix_id, :level, :approver_role, :approver_user_id,
            :can_delegate, :is_required, :created_by
        ) RETURNING id, company_id, matrix_id, level, approver_role,
                    approver_user_id, can_delegate, is_required,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "matrix_id": level.matrix_id,
        "level": level.level,
        "approver_role": level.approver_role,
        "approver_user_id": level.approver_user_id,
        "can_delegate": level.can_delegate,
        "is_required": level.is_required,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

# ============================================================================
# ============================================================================

class WorkflowStepDefinitionCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    workflow_type: str  # APPROVAL, NOTIFICATION, ACTION, CONDITION
    step_type: str  # START, INTERMEDIATE, END
    action_type: Optional[str] = None  # EMAIL, SMS, API_CALL, UPDATE_STATUS
    condition_expression: Optional[str] = None
    timeout_hours: Optional[int] = None
    is_active: bool = True

class WorkflowStepDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow_type: Optional[str] = None
    step_type: Optional[str] = None
    action_type: Optional[str] = None
    condition_expression: Optional[str] = None
    timeout_hours: Optional[int] = None
    is_active: Optional[bool] = None

class WorkflowStepDefinitionResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    workflow_type: str
    step_type: str
    action_type: Optional[str]
    condition_expression: Optional[str]
    timeout_hours: Optional[int]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/workflow-step-definitions", response_model=List[WorkflowStepDefinitionResponse])
def get_workflow_step_definitions(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    workflow_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all workflow step definitions for a company"""
    query = """
        SELECT id, company_id, code, name, description, workflow_type,
               step_type, action_type, condition_expression, timeout_hours,
               is_active, created_by, created_at, updated_at
        FROM workflow_step_definitions
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if workflow_type:
        query += " AND workflow_type = :workflow_type"
        params["workflow_type"] = workflow_type
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY workflow_type, code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/workflow-step-definitions", response_model=WorkflowStepDefinitionResponse)
def create_workflow_step_definition(
    step: WorkflowStepDefinitionCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new workflow step definition"""
    query = """
        INSERT INTO workflow_step_definitions (
            company_id, code, name, description, workflow_type,
            step_type, action_type, condition_expression, timeout_hours,
            is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :workflow_type,
            :step_type, :action_type, :condition_expression, :timeout_hours,
            :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, workflow_type,
                    step_type, action_type, condition_expression, timeout_hours,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": step.code,
        "name": step.name,
        "description": step.description,
        "workflow_type": step.workflow_type,
        "step_type": step.step_type,
        "action_type": step.action_type,
        "condition_expression": step.condition_expression,
        "timeout_hours": step.timeout_hours,
        "is_active": step.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/workflow-step-definitions/{step_id}", response_model=WorkflowStepDefinitionResponse)
def update_workflow_step_definition(
    step_id: int,
    step: WorkflowStepDefinitionUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a workflow step definition"""
    updates = []
    params = {"step_id": step_id, "company_id": company_id}
    
    if step.name is not None:
        updates.append("name = :name")
        params["name"] = step.name
    if step.description is not None:
        updates.append("description = :description")
        params["description"] = step.description
    if step.workflow_type is not None:
        updates.append("workflow_type = :workflow_type")
        params["workflow_type"] = step.workflow_type
    if step.step_type is not None:
        updates.append("step_type = :step_type")
        params["step_type"] = step.step_type
    if step.action_type is not None:
        updates.append("action_type = :action_type")
        params["action_type"] = step.action_type
    if step.condition_expression is not None:
        updates.append("condition_expression = :condition_expression")
        params["condition_expression"] = step.condition_expression
    if step.timeout_hours is not None:
        updates.append("timeout_hours = :timeout_hours")
        params["timeout_hours"] = step.timeout_hours
    if step.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = step.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE workflow_step_definitions
        SET {', '.join(updates)}
        WHERE id = :step_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, workflow_type,
                  step_type, action_type, condition_expression, timeout_hours,
                  is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Workflow step definition not found")
    return dict(row._mapping)

@router.delete("/workflow-step-definitions/{step_id}")
def delete_workflow_step_definition(
    step_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a workflow step definition"""
    query = """
        DELETE FROM workflow_step_definitions
        WHERE id = :step_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"step_id": step_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Workflow step definition not found")
    return {"message": "Workflow step definition deleted successfully"}

# ============================================================================
# ============================================================================

class EscalationRuleCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    rule_type: str  # APPROVAL_TIMEOUT, SLA_BREACH, EXCEPTION
    trigger_condition: str
    escalation_level: int = 1
    escalate_to_role: str
    escalate_to_user_id: Optional[str] = None
    notification_template: Optional[str] = None
    is_active: bool = True

class EscalationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rule_type: Optional[str] = None
    trigger_condition: Optional[str] = None
    escalation_level: Optional[int] = None
    escalate_to_role: Optional[str] = None
    escalate_to_user_id: Optional[str] = None
    notification_template: Optional[str] = None
    is_active: Optional[bool] = None

class EscalationRuleResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    rule_type: str
    trigger_condition: str
    escalation_level: int
    escalate_to_role: str
    escalate_to_user_id: Optional[str]
    notification_template: Optional[str]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/escalation-rules", response_model=List[EscalationRuleResponse])
def get_escalation_rules(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    rule_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all escalation rules for a company"""
    query = """
        SELECT id, company_id, code, name, description, rule_type,
               trigger_condition, escalation_level, escalate_to_role,
               escalate_to_user_id, notification_template, is_active,
               created_by, created_at, updated_at
        FROM escalation_rules
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if rule_type:
        query += " AND rule_type = :rule_type"
        params["rule_type"] = rule_type
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY escalation_level, code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/escalation-rules", response_model=EscalationRuleResponse)
def create_escalation_rule(
    rule: EscalationRuleCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new escalation rule"""
    query = """
        INSERT INTO escalation_rules (
            company_id, code, name, description, rule_type,
            trigger_condition, escalation_level, escalate_to_role,
            escalate_to_user_id, notification_template, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :rule_type,
            :trigger_condition, :escalation_level, :escalate_to_role,
            :escalate_to_user_id, :notification_template, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, rule_type,
                    trigger_condition, escalation_level, escalate_to_role,
                    escalate_to_user_id, notification_template, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": rule.code,
        "name": rule.name,
        "description": rule.description,
        "rule_type": rule.rule_type,
        "trigger_condition": rule.trigger_condition,
        "escalation_level": rule.escalation_level,
        "escalate_to_role": rule.escalate_to_role,
        "escalate_to_user_id": rule.escalate_to_user_id,
        "notification_template": rule.notification_template,
        "is_active": rule.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/escalation-rules/{rule_id}", response_model=EscalationRuleResponse)
def update_escalation_rule(
    rule_id: int,
    rule: EscalationRuleUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update an escalation rule"""
    updates = []
    params = {"rule_id": rule_id, "company_id": company_id}
    
    if rule.name is not None:
        updates.append("name = :name")
        params["name"] = rule.name
    if rule.description is not None:
        updates.append("description = :description")
        params["description"] = rule.description
    if rule.rule_type is not None:
        updates.append("rule_type = :rule_type")
        params["rule_type"] = rule.rule_type
    if rule.trigger_condition is not None:
        updates.append("trigger_condition = :trigger_condition")
        params["trigger_condition"] = rule.trigger_condition
    if rule.escalation_level is not None:
        updates.append("escalation_level = :escalation_level")
        params["escalation_level"] = rule.escalation_level
    if rule.escalate_to_role is not None:
        updates.append("escalate_to_role = :escalate_to_role")
        params["escalate_to_role"] = rule.escalate_to_role
    if rule.escalate_to_user_id is not None:
        updates.append("escalate_to_user_id = :escalate_to_user_id")
        params["escalate_to_user_id"] = rule.escalate_to_user_id
    if rule.notification_template is not None:
        updates.append("notification_template = :notification_template")
        params["notification_template"] = rule.notification_template
    if rule.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = rule.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE escalation_rules
        SET {', '.join(updates)}
        WHERE id = :rule_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, rule_type,
                  trigger_condition, escalation_level, escalate_to_role,
                  escalate_to_user_id, notification_template, is_active,
                  created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Escalation rule not found")
    return dict(row._mapping)

@router.delete("/escalation-rules/{rule_id}")
def delete_escalation_rule(
    rule_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete an escalation rule"""
    query = """
        DELETE FROM escalation_rules
        WHERE id = :rule_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"rule_id": rule_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Escalation rule not found")
    return {"message": "Escalation rule deleted successfully"}
