"""
Payroll/HR Admin Configuration API
Provides 4 admin screens:
1. Pay Items Configuration
2. Pay Calendars Configuration
3. Tax Tables Configuration
4. Leave Policies Configuration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

router = APIRouter(prefix="/api/admin/payroll-hr", tags=["Payroll/HR Admin Configuration"])

# ============================================================================
# ============================================================================

class PayItemCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    item_type: str  # EARNING, DEDUCTION, BENEFIT, TAX
    calculation_method: str  # FIXED, PERCENTAGE, FORMULA
    default_amount: float = 0.0
    is_taxable: bool = True
    is_statutory: bool = False
    gl_account: Optional[str] = None
    is_active: bool = True

class PayItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    item_type: Optional[str] = None
    calculation_method: Optional[str] = None
    default_amount: Optional[float] = None
    is_taxable: Optional[bool] = None
    is_statutory: Optional[bool] = None
    gl_account: Optional[str] = None
    is_active: Optional[bool] = None

class PayItemResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    item_type: str
    calculation_method: str
    default_amount: float
    is_taxable: bool
    is_statutory: bool
    gl_account: Optional[str]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/pay-items", response_model=List[PayItemResponse])
def get_pay_items(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    item_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all pay items for a company"""
    query = """
        SELECT id, company_id, code, name, description, item_type,
               calculation_method, default_amount, is_taxable, is_statutory,
               gl_account, is_active, created_by, created_at, updated_at
        FROM pay_items
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if item_type:
        query += " AND item_type = :item_type"
        params["item_type"] = item_type
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY item_type, code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/pay-items", response_model=PayItemResponse)
def create_pay_item(
    item: PayItemCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new pay item"""
    query = """
        INSERT INTO pay_items (
            company_id, code, name, description, item_type,
            calculation_method, default_amount, is_taxable, is_statutory,
            gl_account, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :item_type,
            :calculation_method, :default_amount, :is_taxable, :is_statutory,
            :gl_account, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, item_type,
                    calculation_method, default_amount, is_taxable, is_statutory,
                    gl_account, is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": item.code,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "calculation_method": item.calculation_method,
        "default_amount": item.default_amount,
        "is_taxable": item.is_taxable,
        "is_statutory": item.is_statutory,
        "gl_account": item.gl_account,
        "is_active": item.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/pay-items/{item_id}", response_model=PayItemResponse)
def update_pay_item(
    item_id: int,
    item: PayItemUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a pay item"""
    updates = []
    params = {"item_id": item_id, "company_id": company_id}
    
    if item.name is not None:
        updates.append("name = :name")
        params["name"] = item.name
    if item.description is not None:
        updates.append("description = :description")
        params["description"] = item.description
    if item.item_type is not None:
        updates.append("item_type = :item_type")
        params["item_type"] = item.item_type
    if item.calculation_method is not None:
        updates.append("calculation_method = :calculation_method")
        params["calculation_method"] = item.calculation_method
    if item.default_amount is not None:
        updates.append("default_amount = :default_amount")
        params["default_amount"] = item.default_amount
    if item.is_taxable is not None:
        updates.append("is_taxable = :is_taxable")
        params["is_taxable"] = item.is_taxable
    if item.is_statutory is not None:
        updates.append("is_statutory = :is_statutory")
        params["is_statutory"] = item.is_statutory
    if item.gl_account is not None:
        updates.append("gl_account = :gl_account")
        params["gl_account"] = item.gl_account
    if item.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = item.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE pay_items
        SET {', '.join(updates)}
        WHERE id = :item_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, item_type,
                  calculation_method, default_amount, is_taxable, is_statutory,
                  gl_account, is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Pay item not found")
    return dict(row._mapping)

@router.delete("/pay-items/{item_id}")
def delete_pay_item(
    item_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a pay item"""
    query = """
        DELETE FROM pay_items
        WHERE id = :item_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"item_id": item_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pay item not found")
    return {"message": "Pay item deleted successfully"}

# ============================================================================
# ============================================================================

class PayCalendarCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    frequency: str  # WEEKLY, BI_WEEKLY, SEMI_MONTHLY, MONTHLY
    payment_day: int  # Day of week (1-7) or day of month (1-31)
    is_active: bool = True

class PayCalendarUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    payment_day: Optional[int] = None
    is_active: Optional[bool] = None

class PayCalendarResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    frequency: str
    payment_day: int
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/pay-calendars", response_model=List[PayCalendarResponse])
def get_pay_calendars(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all pay calendars for a company"""
    query = """
        SELECT id, company_id, code, name, description, frequency,
               payment_day, is_active, created_by, created_at, updated_at
        FROM pay_calendars
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

@router.post("/pay-calendars", response_model=PayCalendarResponse)
def create_pay_calendar(
    calendar: PayCalendarCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new pay calendar"""
    query = """
        INSERT INTO pay_calendars (
            company_id, code, name, description, frequency,
            payment_day, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :frequency,
            :payment_day, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, frequency,
                    payment_day, is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": calendar.code,
        "name": calendar.name,
        "description": calendar.description,
        "frequency": calendar.frequency,
        "payment_day": calendar.payment_day,
        "is_active": calendar.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

# ============================================================================
# ============================================================================

class TaxTableCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    tax_year: int
    country_code: str = "ZA"
    bracket_min: float
    bracket_max: Optional[float] = None
    base_tax: float = 0.0
    marginal_rate: float
    is_active: bool = True

class TaxTableUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tax_year: Optional[int] = None
    country_code: Optional[str] = None
    bracket_min: Optional[float] = None
    bracket_max: Optional[float] = None
    base_tax: Optional[float] = None
    marginal_rate: Optional[float] = None
    is_active: Optional[bool] = None

class TaxTableResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    tax_year: int
    country_code: str
    bracket_min: float
    bracket_max: Optional[float]
    base_tax: float
    marginal_rate: float
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/tax-tables", response_model=List[TaxTableResponse])
def get_tax_tables(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    tax_year: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all tax tables for a company"""
    query = """
        SELECT id, company_id, code, name, description, tax_year,
               country_code, bracket_min, bracket_max, base_tax,
               marginal_rate, is_active, created_by, created_at, updated_at
        FROM tax_tables
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if tax_year:
        query += " AND tax_year = :tax_year"
        params["tax_year"] = tax_year
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY tax_year DESC, bracket_min OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/tax-tables", response_model=TaxTableResponse)
def create_tax_table(
    table: TaxTableCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new tax table"""
    query = """
        INSERT INTO tax_tables (
            company_id, code, name, description, tax_year, country_code,
            bracket_min, bracket_max, base_tax, marginal_rate,
            is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :tax_year, :country_code,
            :bracket_min, :bracket_max, :base_tax, :marginal_rate,
            :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, tax_year,
                    country_code, bracket_min, bracket_max, base_tax,
                    marginal_rate, is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": table.code,
        "name": table.name,
        "description": table.description,
        "tax_year": table.tax_year,
        "country_code": table.country_code,
        "bracket_min": table.bracket_min,
        "bracket_max": table.bracket_max,
        "base_tax": table.base_tax,
        "marginal_rate": table.marginal_rate,
        "is_active": table.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

# ============================================================================
# ============================================================================

class LeavePolicyCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    leave_type: str  # ANNUAL, SICK, MATERNITY, PATERNITY, STUDY, UNPAID
    accrual_rate: float  # Days per month
    max_accrual: float  # Maximum days that can be accrued
    carry_forward_allowed: bool = True
    carry_forward_limit: Optional[float] = None
    requires_approval: bool = True
    min_notice_days: int = 0
    is_active: bool = True

class LeavePolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    leave_type: Optional[str] = None
    accrual_rate: Optional[float] = None
    max_accrual: Optional[float] = None
    carry_forward_allowed: Optional[bool] = None
    carry_forward_limit: Optional[float] = None
    requires_approval: Optional[bool] = None
    min_notice_days: Optional[int] = None
    is_active: Optional[bool] = None

class LeavePolicyResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    leave_type: str
    accrual_rate: float
    max_accrual: float
    carry_forward_allowed: bool
    carry_forward_limit: Optional[float]
    requires_approval: bool
    min_notice_days: int
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/leave-policies", response_model=List[LeavePolicyResponse])
def get_leave_policies(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    leave_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all leave policies for a company"""
    query = """
        SELECT id, company_id, code, name, description, leave_type,
               accrual_rate, max_accrual, carry_forward_allowed,
               carry_forward_limit, requires_approval, min_notice_days,
               is_active, created_by, created_at, updated_at
        FROM leave_policies
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if leave_type:
        query += " AND leave_type = :leave_type"
        params["leave_type"] = leave_type
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    query += " ORDER BY leave_type, code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/leave-policies", response_model=LeavePolicyResponse)
def create_leave_policy(
    policy: LeavePolicyCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new leave policy"""
    query = """
        INSERT INTO leave_policies (
            company_id, code, name, description, leave_type,
            accrual_rate, max_accrual, carry_forward_allowed,
            carry_forward_limit, requires_approval, min_notice_days,
            is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :leave_type,
            :accrual_rate, :max_accrual, :carry_forward_allowed,
            :carry_forward_limit, :requires_approval, :min_notice_days,
            :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, leave_type,
                    accrual_rate, max_accrual, carry_forward_allowed,
                    carry_forward_limit, requires_approval, min_notice_days,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": policy.code,
        "name": policy.name,
        "description": policy.description,
        "leave_type": policy.leave_type,
        "accrual_rate": policy.accrual_rate,
        "max_accrual": policy.max_accrual,
        "carry_forward_allowed": policy.carry_forward_allowed,
        "carry_forward_limit": policy.carry_forward_limit,
        "requires_approval": policy.requires_approval,
        "min_notice_days": policy.min_notice_days,
        "is_active": policy.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/leave-policies/{policy_id}", response_model=LeavePolicyResponse)
def update_leave_policy(
    policy_id: int,
    policy: LeavePolicyUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a leave policy"""
    updates = []
    params = {"policy_id": policy_id, "company_id": company_id}
    
    if policy.name is not None:
        updates.append("name = :name")
        params["name"] = policy.name
    if policy.description is not None:
        updates.append("description = :description")
        params["description"] = policy.description
    if policy.leave_type is not None:
        updates.append("leave_type = :leave_type")
        params["leave_type"] = policy.leave_type
    if policy.accrual_rate is not None:
        updates.append("accrual_rate = :accrual_rate")
        params["accrual_rate"] = policy.accrual_rate
    if policy.max_accrual is not None:
        updates.append("max_accrual = :max_accrual")
        params["max_accrual"] = policy.max_accrual
    if policy.carry_forward_allowed is not None:
        updates.append("carry_forward_allowed = :carry_forward_allowed")
        params["carry_forward_allowed"] = policy.carry_forward_allowed
    if policy.carry_forward_limit is not None:
        updates.append("carry_forward_limit = :carry_forward_limit")
        params["carry_forward_limit"] = policy.carry_forward_limit
    if policy.requires_approval is not None:
        updates.append("requires_approval = :requires_approval")
        params["requires_approval"] = policy.requires_approval
    if policy.min_notice_days is not None:
        updates.append("min_notice_days = :min_notice_days")
        params["min_notice_days"] = policy.min_notice_days
    if policy.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = policy.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE leave_policies
        SET {', '.join(updates)}
        WHERE id = :policy_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, leave_type,
                  accrual_rate, max_accrual, carry_forward_allowed,
                  carry_forward_limit, requires_approval, min_notice_days,
                  is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    return dict(row._mapping)

@router.delete("/leave-policies/{policy_id}")
def delete_leave_policy(
    policy_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a leave policy"""
    query = """
        DELETE FROM leave_policies
        WHERE id = :policy_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"policy_id": policy_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    return {"message": "Leave policy deleted successfully"}
