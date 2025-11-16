"""
AR/AP/Banking Admin Configuration API
Provides 3 admin screens:
1. Payment Terms Configuration
2. Dunning Policies Configuration
3. Bank Reconciliation Configuration
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

router = APIRouter(prefix="/api/admin/ar-ap-banking", tags=["AR/AP/Banking Admin Configuration"])

# ============================================================================
# ============================================================================

class PaymentTermCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    days: int
    discount_percent: Optional[float] = 0.0
    discount_days: Optional[int] = 0
    is_active: bool = True

class PaymentTermUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    days: Optional[int] = None
    discount_percent: Optional[float] = None
    discount_days: Optional[int] = None
    is_active: Optional[bool] = None

class PaymentTermResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    days: int
    discount_percent: float
    discount_days: int
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/payment-terms", response_model=List[PaymentTermResponse])
def get_payment_terms(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all payment terms for a company"""
    query = """
        SELECT id, company_id, code, name, description, days, 
               discount_percent, discount_days, is_active,
               created_by, created_at, updated_at
        FROM payment_terms
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/payment-terms/{term_id}", response_model=PaymentTermResponse)
def get_payment_term(
    term_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Get a specific payment term"""
    query = """
        SELECT id, company_id, code, name, description, days,
               discount_percent, discount_days, is_active,
               created_by, created_at, updated_at
        FROM payment_terms
        WHERE id = :term_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"term_id": term_id, "company_id": company_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment term not found")
    return dict(row._mapping)

@router.post("/payment-terms", response_model=PaymentTermResponse)
def create_payment_term(
    term: PaymentTermCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new payment term"""
    query = """
        INSERT INTO payment_terms (
            company_id, code, name, description, days,
            discount_percent, discount_days, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :days,
            :discount_percent, :discount_days, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, days,
                    discount_percent, discount_days, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": term.code,
        "name": term.name,
        "description": term.description,
        "days": term.days,
        "discount_percent": term.discount_percent,
        "discount_days": term.discount_days,
        "is_active": term.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/payment-terms/{term_id}", response_model=PaymentTermResponse)
def update_payment_term(
    term_id: int,
    term: PaymentTermUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a payment term"""
    updates = []
    params = {"term_id": term_id, "company_id": company_id}
    
    if term.name is not None:
        updates.append("name = :name")
        params["name"] = term.name
    if term.description is not None:
        updates.append("description = :description")
        params["description"] = term.description
    if term.days is not None:
        updates.append("days = :days")
        params["days"] = term.days
    if term.discount_percent is not None:
        updates.append("discount_percent = :discount_percent")
        params["discount_percent"] = term.discount_percent
    if term.discount_days is not None:
        updates.append("discount_days = :discount_days")
        params["discount_days"] = term.discount_days
    if term.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = term.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE payment_terms
        SET {', '.join(updates)}
        WHERE id = :term_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, days,
                  discount_percent, discount_days, is_active,
                  created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment term not found")
    return dict(row._mapping)

@router.delete("/payment-terms/{term_id}")
def delete_payment_term(
    term_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a payment term"""
    query = """
        DELETE FROM payment_terms
        WHERE id = :term_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"term_id": term_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Payment term not found")
    return {"message": "Payment term deleted successfully"}

# ============================================================================
# ============================================================================

class DunningPolicyCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    level: int
    days_overdue: int
    action: str  # EMAIL, LETTER, PHONE, SUSPEND
    template_id: Optional[int] = None
    escalate_to_level: Optional[int] = None
    is_active: bool = True

class DunningPolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    days_overdue: Optional[int] = None
    action: Optional[str] = None
    template_id: Optional[int] = None
    escalate_to_level: Optional[int] = None
    is_active: Optional[bool] = None

class DunningPolicyResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    level: int
    days_overdue: int
    action: str
    template_id: Optional[int]
    escalate_to_level: Optional[int]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/dunning-policies", response_model=List[DunningPolicyResponse])
def get_dunning_policies(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all dunning policies for a company"""
    query = """
        SELECT id, company_id, code, name, description, level,
               days_overdue, action, template_id, escalate_to_level,
               is_active, created_by, created_at, updated_at
        FROM dunning_policies
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY level, days_overdue OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/dunning-policies/{policy_id}", response_model=DunningPolicyResponse)
def get_dunning_policy(
    policy_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Get a specific dunning policy"""
    query = """
        SELECT id, company_id, code, name, description, level,
               days_overdue, action, template_id, escalate_to_level,
               is_active, created_by, created_at, updated_at
        FROM dunning_policies
        WHERE id = :policy_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"policy_id": policy_id, "company_id": company_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dunning policy not found")
    return dict(row._mapping)

@router.post("/dunning-policies", response_model=DunningPolicyResponse)
def create_dunning_policy(
    policy: DunningPolicyCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new dunning policy"""
    query = """
        INSERT INTO dunning_policies (
            company_id, code, name, description, level, days_overdue,
            action, template_id, escalate_to_level, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :level, :days_overdue,
            :action, :template_id, :escalate_to_level, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, level,
                    days_overdue, action, template_id, escalate_to_level,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": policy.code,
        "name": policy.name,
        "description": policy.description,
        "level": policy.level,
        "days_overdue": policy.days_overdue,
        "action": policy.action,
        "template_id": policy.template_id,
        "escalate_to_level": policy.escalate_to_level,
        "is_active": policy.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/dunning-policies/{policy_id}", response_model=DunningPolicyResponse)
def update_dunning_policy(
    policy_id: int,
    policy: DunningPolicyUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a dunning policy"""
    updates = []
    params = {"policy_id": policy_id, "company_id": company_id}
    
    if policy.name is not None:
        updates.append("name = :name")
        params["name"] = policy.name
    if policy.description is not None:
        updates.append("description = :description")
        params["description"] = policy.description
    if policy.level is not None:
        updates.append("level = :level")
        params["level"] = policy.level
    if policy.days_overdue is not None:
        updates.append("days_overdue = :days_overdue")
        params["days_overdue"] = policy.days_overdue
    if policy.action is not None:
        updates.append("action = :action")
        params["action"] = policy.action
    if policy.template_id is not None:
        updates.append("template_id = :template_id")
        params["template_id"] = policy.template_id
    if policy.escalate_to_level is not None:
        updates.append("escalate_to_level = :escalate_to_level")
        params["escalate_to_level"] = policy.escalate_to_level
    if policy.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = policy.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE dunning_policies
        SET {', '.join(updates)}
        WHERE id = :policy_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, level,
                  days_overdue, action, template_id, escalate_to_level,
                  is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dunning policy not found")
    return dict(row._mapping)

@router.delete("/dunning-policies/{policy_id}")
def delete_dunning_policy(
    policy_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a dunning policy"""
    query = """
        DELETE FROM dunning_policies
        WHERE id = :policy_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"policy_id": policy_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Dunning policy not found")
    return {"message": "Dunning policy deleted successfully"}

# ============================================================================
# ============================================================================

class BankReconConfigCreate(BaseModel):
    bank_account_id: str
    auto_match_tolerance: float = 0.01
    auto_match_days: int = 7
    require_approval: bool = True
    approval_threshold: float = 1000.0
    statement_import_format: str  # CSV, OFX, MT940, CAMT053
    is_active: bool = True

class BankReconConfigUpdate(BaseModel):
    auto_match_tolerance: Optional[float] = None
    auto_match_days: Optional[int] = None
    require_approval: Optional[bool] = None
    approval_threshold: Optional[float] = None
    statement_import_format: Optional[str] = None
    is_active: Optional[bool] = None

class BankReconConfigResponse(BaseModel):
    id: int
    company_id: str
    bank_account_id: str
    auto_match_tolerance: float
    auto_match_days: int
    require_approval: bool
    approval_threshold: float
    statement_import_format: str
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/bank-recon-configs", response_model=List[BankReconConfigResponse])
def get_bank_recon_configs(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all bank reconciliation configurations for a company"""
    query = """
        SELECT id, company_id, bank_account_id, auto_match_tolerance,
               auto_match_days, require_approval, approval_threshold,
               statement_import_format, is_active,
               created_by, created_at, updated_at
        FROM bank_recon_configs
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY bank_account_id OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/bank-recon-configs/{config_id}", response_model=BankReconConfigResponse)
def get_bank_recon_config(
    config_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Get a specific bank reconciliation configuration"""
    query = """
        SELECT id, company_id, bank_account_id, auto_match_tolerance,
               auto_match_days, require_approval, approval_threshold,
               statement_import_format, is_active,
               created_by, created_at, updated_at
        FROM bank_recon_configs
        WHERE id = :config_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"config_id": config_id, "company_id": company_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bank reconciliation configuration not found")
    return dict(row._mapping)

@router.post("/bank-recon-configs", response_model=BankReconConfigResponse)
def create_bank_recon_config(
    config: BankReconConfigCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new bank reconciliation configuration"""
    query = """
        INSERT INTO bank_recon_configs (
            company_id, bank_account_id, auto_match_tolerance, auto_match_days,
            require_approval, approval_threshold, statement_import_format,
            is_active, created_by
        ) VALUES (
            :company_id, :bank_account_id, :auto_match_tolerance, :auto_match_days,
            :require_approval, :approval_threshold, :statement_import_format,
            :is_active, :created_by
        ) RETURNING id, company_id, bank_account_id, auto_match_tolerance,
                    auto_match_days, require_approval, approval_threshold,
                    statement_import_format, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "bank_account_id": config.bank_account_id,
        "auto_match_tolerance": config.auto_match_tolerance,
        "auto_match_days": config.auto_match_days,
        "require_approval": config.require_approval,
        "approval_threshold": config.approval_threshold,
        "statement_import_format": config.statement_import_format,
        "is_active": config.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/bank-recon-configs/{config_id}", response_model=BankReconConfigResponse)
def update_bank_recon_config(
    config_id: int,
    config: BankReconConfigUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a bank reconciliation configuration"""
    updates = []
    params = {"config_id": config_id, "company_id": company_id}
    
    if config.auto_match_tolerance is not None:
        updates.append("auto_match_tolerance = :auto_match_tolerance")
        params["auto_match_tolerance"] = config.auto_match_tolerance
    if config.auto_match_days is not None:
        updates.append("auto_match_days = :auto_match_days")
        params["auto_match_days"] = config.auto_match_days
    if config.require_approval is not None:
        updates.append("require_approval = :require_approval")
        params["require_approval"] = config.require_approval
    if config.approval_threshold is not None:
        updates.append("approval_threshold = :approval_threshold")
        params["approval_threshold"] = config.approval_threshold
    if config.statement_import_format is not None:
        updates.append("statement_import_format = :statement_import_format")
        params["statement_import_format"] = config.statement_import_format
    if config.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = config.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE bank_recon_configs
        SET {', '.join(updates)}
        WHERE id = :config_id AND company_id = :company_id
        RETURNING id, company_id, bank_account_id, auto_match_tolerance,
                  auto_match_days, require_approval, approval_threshold,
                  statement_import_format, is_active,
                  created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bank reconciliation configuration not found")
    return dict(row._mapping)

@router.delete("/bank-recon-configs/{config_id}")
def delete_bank_recon_config(
    config_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a bank reconciliation configuration"""
    query = """
        DELETE FROM bank_recon_configs
        WHERE id = :config_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"config_id": config_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Bank reconciliation configuration not found")
    return {"message": "Bank reconciliation configuration deleted successfully"}
