"""
Quality Admin Configuration API
Provides 3 admin screens:
1. Inspection Templates Configuration
2. Sampling Plans Configuration
3. NCR (Non-Conformance Report) Workflows Configuration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

try:
    from app.database import get_db
except ImportError:
    from database import get_db

router = APIRouter(prefix="/api/admin/quality", tags=["Quality Admin Configuration"])

# ============================================================================
# ============================================================================

class InspectionTemplateCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    inspection_type: str  # RECEIVING, IN_PROCESS, FINAL, AUDIT
    item_category: Optional[str] = None
    required_sample_size: int = 1
    acceptance_criteria: str
    is_active: bool = True

class InspectionTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    inspection_type: Optional[str] = None
    item_category: Optional[str] = None
    required_sample_size: Optional[int] = None
    acceptance_criteria: Optional[str] = None
    is_active: Optional[bool] = None

class InspectionTemplateResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    inspection_type: str
    item_category: Optional[str]
    required_sample_size: int
    acceptance_criteria: str
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InspectionCheckpointCreate(BaseModel):
    template_id: int
    checkpoint_name: str
    checkpoint_type: str  # VISUAL, MEASUREMENT, TEST
    specification: str
    tolerance: Optional[str] = None
    measurement_unit: Optional[str] = None
    sequence: int
    is_critical: bool = False

class InspectionCheckpointResponse(BaseModel):
    id: int
    company_id: str
    template_id: int
    checkpoint_name: str
    checkpoint_type: str
    specification: str
    tolerance: Optional[str]
    measurement_unit: Optional[str]
    sequence: int
    is_critical: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/inspection-templates", response_model=List[InspectionTemplateResponse])
def get_inspection_templates(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    inspection_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all inspection templates for a company"""
    query = """
        SELECT id, company_id, code, name, description, inspection_type,
               item_category, required_sample_size, acceptance_criteria,
               is_active, created_by, created_at, updated_at
        FROM inspection_templates
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if inspection_type:
        query += " AND inspection_type = :inspection_type"
        params["inspection_type"] = inspection_type
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/inspection-templates", response_model=InspectionTemplateResponse)
def create_inspection_template(
    template: InspectionTemplateCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new inspection template"""
    query = """
        INSERT INTO inspection_templates (
            company_id, code, name, description, inspection_type,
            item_category, required_sample_size, acceptance_criteria,
            is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :inspection_type,
            :item_category, :required_sample_size, :acceptance_criteria,
            :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, inspection_type,
                    item_category, required_sample_size, acceptance_criteria,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": template.code,
        "name": template.name,
        "description": template.description,
        "inspection_type": template.inspection_type,
        "item_category": template.item_category,
        "required_sample_size": template.required_sample_size,
        "acceptance_criteria": template.acceptance_criteria,
        "is_active": template.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.get("/inspection-checkpoints", response_model=List[InspectionCheckpointResponse])
def get_inspection_checkpoints(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    template_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all inspection checkpoints for a company"""
    query = """
        SELECT id, company_id, template_id, checkpoint_name, checkpoint_type,
               specification, tolerance, measurement_unit, sequence, is_critical,
               created_by, created_at, updated_at
        FROM inspection_checkpoints
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if template_id:
        query += " AND template_id = :template_id"
        params["template_id"] = template_id
    
    query += " ORDER BY template_id, sequence OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/inspection-checkpoints", response_model=InspectionCheckpointResponse)
def create_inspection_checkpoint(
    checkpoint: InspectionCheckpointCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new inspection checkpoint"""
    query = """
        INSERT INTO inspection_checkpoints (
            company_id, template_id, checkpoint_name, checkpoint_type,
            specification, tolerance, measurement_unit, sequence, is_critical, created_by
        ) VALUES (
            :company_id, :template_id, :checkpoint_name, :checkpoint_type,
            :specification, :tolerance, :measurement_unit, :sequence, :is_critical, :created_by
        ) RETURNING id, company_id, template_id, checkpoint_name, checkpoint_type,
                    specification, tolerance, measurement_unit, sequence, is_critical,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "template_id": checkpoint.template_id,
        "checkpoint_name": checkpoint.checkpoint_name,
        "checkpoint_type": checkpoint.checkpoint_type,
        "specification": checkpoint.specification,
        "tolerance": checkpoint.tolerance,
        "measurement_unit": checkpoint.measurement_unit,
        "sequence": checkpoint.sequence,
        "is_critical": checkpoint.is_critical,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

# ============================================================================
# ============================================================================

class SamplingPlanCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    sampling_method: str  # RANDOM, SYSTEMATIC, STRATIFIED, AQL
    lot_size_min: int
    lot_size_max: int
    sample_size: int
    acceptance_number: int
    rejection_number: int
    is_active: bool = True

class SamplingPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sampling_method: Optional[str] = None
    lot_size_min: Optional[int] = None
    lot_size_max: Optional[int] = None
    sample_size: Optional[int] = None
    acceptance_number: Optional[int] = None
    rejection_number: Optional[int] = None
    is_active: Optional[bool] = None

class SamplingPlanResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    sampling_method: str
    lot_size_min: int
    lot_size_max: int
    sample_size: int
    acceptance_number: int
    rejection_number: int
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/sampling-plans", response_model=List[SamplingPlanResponse])
def get_sampling_plans(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    sampling_method: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all sampling plans for a company"""
    query = """
        SELECT id, company_id, code, name, description, sampling_method,
               lot_size_min, lot_size_max, sample_size,
               acceptance_number, rejection_number, is_active,
               created_by, created_at, updated_at
        FROM sampling_plans
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if sampling_method:
        query += " AND sampling_method = :sampling_method"
        params["sampling_method"] = sampling_method
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/sampling-plans", response_model=SamplingPlanResponse)
def create_sampling_plan(
    plan: SamplingPlanCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new sampling plan"""
    query = """
        INSERT INTO sampling_plans (
            company_id, code, name, description, sampling_method,
            lot_size_min, lot_size_max, sample_size,
            acceptance_number, rejection_number, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :sampling_method,
            :lot_size_min, :lot_size_max, :sample_size,
            :acceptance_number, :rejection_number, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, sampling_method,
                    lot_size_min, lot_size_max, sample_size,
                    acceptance_number, rejection_number, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "sampling_method": plan.sampling_method,
        "lot_size_min": plan.lot_size_min,
        "lot_size_max": plan.lot_size_max,
        "sample_size": plan.sample_size,
        "acceptance_number": plan.acceptance_number,
        "rejection_number": plan.rejection_number,
        "is_active": plan.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/sampling-plans/{plan_id}", response_model=SamplingPlanResponse)
def update_sampling_plan(
    plan_id: int,
    plan: SamplingPlanUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a sampling plan"""
    updates = []
    params = {"plan_id": plan_id, "company_id": company_id}
    
    if plan.name is not None:
        updates.append("name = :name")
        params["name"] = plan.name
    if plan.description is not None:
        updates.append("description = :description")
        params["description"] = plan.description
    if plan.sampling_method is not None:
        updates.append("sampling_method = :sampling_method")
        params["sampling_method"] = plan.sampling_method
    if plan.lot_size_min is not None:
        updates.append("lot_size_min = :lot_size_min")
        params["lot_size_min"] = plan.lot_size_min
    if plan.lot_size_max is not None:
        updates.append("lot_size_max = :lot_size_max")
        params["lot_size_max"] = plan.lot_size_max
    if plan.sample_size is not None:
        updates.append("sample_size = :sample_size")
        params["sample_size"] = plan.sample_size
    if plan.acceptance_number is not None:
        updates.append("acceptance_number = :acceptance_number")
        params["acceptance_number"] = plan.acceptance_number
    if plan.rejection_number is not None:
        updates.append("rejection_number = :rejection_number")
        params["rejection_number"] = plan.rejection_number
    if plan.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = plan.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE sampling_plans
        SET {', '.join(updates)}
        WHERE id = :plan_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, sampling_method,
                  lot_size_min, lot_size_max, sample_size,
                  acceptance_number, rejection_number, is_active,
                  created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Sampling plan not found")
    return dict(row._mapping)

@router.delete("/sampling-plans/{plan_id}")
def delete_sampling_plan(
    plan_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a sampling plan"""
    query = """
        DELETE FROM sampling_plans
        WHERE id = :plan_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"plan_id": plan_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Sampling plan not found")
    return {"message": "Sampling plan deleted successfully"}

# ============================================================================
# ============================================================================

class NCRWorkflowCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    severity_level: str  # CRITICAL, MAJOR, MINOR
    auto_assign_to_role: Optional[str] = None
    requires_root_cause: bool = True
    requires_corrective_action: bool = True
    requires_approval: bool = True
    approval_role: Optional[str] = None
    is_active: bool = True

class NCRWorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity_level: Optional[str] = None
    auto_assign_to_role: Optional[str] = None
    requires_root_cause: Optional[bool] = None
    requires_corrective_action: Optional[bool] = None
    requires_approval: Optional[bool] = None
    approval_role: Optional[str] = None
    is_active: Optional[bool] = None

class NCRWorkflowResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    severity_level: str
    auto_assign_to_role: Optional[str]
    requires_root_cause: bool
    requires_corrective_action: bool
    requires_approval: bool
    approval_role: Optional[str]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/ncr-workflows", response_model=List[NCRWorkflowResponse])
def get_ncr_workflows(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    severity_level: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all NCR workflows for a company"""
    query = """
        SELECT id, company_id, code, name, description, severity_level,
               auto_assign_to_role, requires_root_cause, requires_corrective_action,
               requires_approval, approval_role, is_active,
               created_by, created_at, updated_at
        FROM ncr_workflows
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if severity_level:
        query += " AND severity_level = :severity_level"
        params["severity_level"] = severity_level
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY severity_level, code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/ncr-workflows", response_model=NCRWorkflowResponse)
def create_ncr_workflow(
    workflow: NCRWorkflowCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new NCR workflow"""
    query = """
        INSERT INTO ncr_workflows (
            company_id, code, name, description, severity_level,
            auto_assign_to_role, requires_root_cause, requires_corrective_action,
            requires_approval, approval_role, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :severity_level,
            :auto_assign_to_role, :requires_root_cause, :requires_corrective_action,
            :requires_approval, :approval_role, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, severity_level,
                    auto_assign_to_role, requires_root_cause, requires_corrective_action,
                    requires_approval, approval_role, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": workflow.code,
        "name": workflow.name,
        "description": workflow.description,
        "severity_level": workflow.severity_level,
        "auto_assign_to_role": workflow.auto_assign_to_role,
        "requires_root_cause": workflow.requires_root_cause,
        "requires_corrective_action": workflow.requires_corrective_action,
        "requires_approval": workflow.requires_approval,
        "approval_role": workflow.approval_role,
        "is_active": workflow.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/ncr-workflows/{workflow_id}", response_model=NCRWorkflowResponse)
def update_ncr_workflow(
    workflow_id: int,
    workflow: NCRWorkflowUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update an NCR workflow"""
    updates = []
    params = {"workflow_id": workflow_id, "company_id": company_id}
    
    if workflow.name is not None:
        updates.append("name = :name")
        params["name"] = workflow.name
    if workflow.description is not None:
        updates.append("description = :description")
        params["description"] = workflow.description
    if workflow.severity_level is not None:
        updates.append("severity_level = :severity_level")
        params["severity_level"] = workflow.severity_level
    if workflow.auto_assign_to_role is not None:
        updates.append("auto_assign_to_role = :auto_assign_to_role")
        params["auto_assign_to_role"] = workflow.auto_assign_to_role
    if workflow.requires_root_cause is not None:
        updates.append("requires_root_cause = :requires_root_cause")
        params["requires_root_cause"] = workflow.requires_root_cause
    if workflow.requires_corrective_action is not None:
        updates.append("requires_corrective_action = :requires_corrective_action")
        params["requires_corrective_action"] = workflow.requires_corrective_action
    if workflow.requires_approval is not None:
        updates.append("requires_approval = :requires_approval")
        params["requires_approval"] = workflow.requires_approval
    if workflow.approval_role is not None:
        updates.append("approval_role = :approval_role")
        params["approval_role"] = workflow.approval_role
    if workflow.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = workflow.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE ncr_workflows
        SET {', '.join(updates)}
        WHERE id = :workflow_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, severity_level,
                  auto_assign_to_role, requires_root_cause, requires_corrective_action,
                  requires_approval, approval_role, is_active,
                  created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="NCR workflow not found")
    return dict(row._mapping)

@router.delete("/ncr-workflows/{workflow_id}")
def delete_ncr_workflow(
    workflow_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete an NCR workflow"""
    query = """
        DELETE FROM ncr_workflows
        WHERE id = :workflow_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"workflow_id": workflow_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="NCR workflow not found")
    return {"message": "NCR workflow deleted successfully"}
