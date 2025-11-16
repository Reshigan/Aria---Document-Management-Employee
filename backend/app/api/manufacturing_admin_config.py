"""
Manufacturing Admin Configuration API
Provides 4 admin screens:
1. Work Centers Configuration
2. Calendars/Shifts Configuration
3. Standard Costs Configuration
4. Scrap/Backflush Rules Configuration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, time

try:
    from app.database import get_db
except ImportError:
    from database import get_db

router = APIRouter(prefix="/api/admin/manufacturing", tags=["Manufacturing Admin Configuration"])

# ============================================================================
# ============================================================================

class WorkCenterCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    work_center_type: str  # MACHINE, LABOR, ASSEMBLY, INSPECTION
    capacity_per_hour: float
    cost_per_hour: float
    efficiency_percent: float = 100.0
    calendar_id: Optional[int] = None
    is_active: bool = True

class WorkCenterUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    work_center_type: Optional[str] = None
    capacity_per_hour: Optional[float] = None
    cost_per_hour: Optional[float] = None
    efficiency_percent: Optional[float] = None
    calendar_id: Optional[int] = None
    is_active: Optional[bool] = None

class WorkCenterResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    work_center_type: str
    capacity_per_hour: float
    cost_per_hour: float
    efficiency_percent: float
    calendar_id: Optional[int]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/work-centers", response_model=List[WorkCenterResponse])
def get_work_centers(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    work_center_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all work centers for a company"""
    query = """
        SELECT id, company_id, code, name, description, work_center_type,
               capacity_per_hour, cost_per_hour, efficiency_percent,
               calendar_id, is_active, created_by, created_at, updated_at
        FROM work_centers
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    if work_center_type:
        query += " AND work_center_type = :work_center_type"
        params["work_center_type"] = work_center_type
    
    query += " ORDER BY code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/work-centers/{center_id}", response_model=WorkCenterResponse)
def get_work_center(
    center_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Get a specific work center"""
    query = """
        SELECT id, company_id, code, name, description, work_center_type,
               capacity_per_hour, cost_per_hour, efficiency_percent,
               calendar_id, is_active, created_by, created_at, updated_at
        FROM work_centers
        WHERE id = :center_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"center_id": center_id, "company_id": company_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Work center not found")
    return dict(row._mapping)

@router.post("/work-centers", response_model=WorkCenterResponse)
def create_work_center(
    center: WorkCenterCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new work center"""
    query = """
        INSERT INTO work_centers (
            company_id, code, name, description, work_center_type,
            capacity_per_hour, cost_per_hour, efficiency_percent,
            calendar_id, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :work_center_type,
            :capacity_per_hour, :cost_per_hour, :efficiency_percent,
            :calendar_id, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, work_center_type,
                    capacity_per_hour, cost_per_hour, efficiency_percent,
                    calendar_id, is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": center.code,
        "name": center.name,
        "description": center.description,
        "work_center_type": center.work_center_type,
        "capacity_per_hour": center.capacity_per_hour,
        "cost_per_hour": center.cost_per_hour,
        "efficiency_percent": center.efficiency_percent,
        "calendar_id": center.calendar_id,
        "is_active": center.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/work-centers/{center_id}", response_model=WorkCenterResponse)
def update_work_center(
    center_id: int,
    center: WorkCenterUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a work center"""
    updates = []
    params = {"center_id": center_id, "company_id": company_id}
    
    if center.name is not None:
        updates.append("name = :name")
        params["name"] = center.name
    if center.description is not None:
        updates.append("description = :description")
        params["description"] = center.description
    if center.work_center_type is not None:
        updates.append("work_center_type = :work_center_type")
        params["work_center_type"] = center.work_center_type
    if center.capacity_per_hour is not None:
        updates.append("capacity_per_hour = :capacity_per_hour")
        params["capacity_per_hour"] = center.capacity_per_hour
    if center.cost_per_hour is not None:
        updates.append("cost_per_hour = :cost_per_hour")
        params["cost_per_hour"] = center.cost_per_hour
    if center.efficiency_percent is not None:
        updates.append("efficiency_percent = :efficiency_percent")
        params["efficiency_percent"] = center.efficiency_percent
    if center.calendar_id is not None:
        updates.append("calendar_id = :calendar_id")
        params["calendar_id"] = center.calendar_id
    if center.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = center.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE work_centers
        SET {', '.join(updates)}
        WHERE id = :center_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, work_center_type,
                  capacity_per_hour, cost_per_hour, efficiency_percent,
                  calendar_id, is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Work center not found")
    return dict(row._mapping)

@router.delete("/work-centers/{center_id}")
def delete_work_center(
    center_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a work center"""
    query = """
        DELETE FROM work_centers
        WHERE id = :center_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"center_id": center_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Work center not found")
    return {"message": "Work center deleted successfully"}

# ============================================================================
# ============================================================================

class WorkCalendarCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    timezone: str = "UTC"
    is_active: bool = True

class WorkCalendarUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None

class WorkCalendarResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    timezone: str
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkShiftCreate(BaseModel):
    calendar_id: int
    shift_name: str
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    break_minutes: int = 0
    is_active: bool = True

class WorkShiftUpdate(BaseModel):
    shift_name: Optional[str] = None
    day_of_week: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    break_minutes: Optional[int] = None
    is_active: Optional[bool] = None

class WorkShiftResponse(BaseModel):
    id: int
    company_id: str
    calendar_id: int
    shift_name: str
    day_of_week: int
    start_time: str
    end_time: str
    break_minutes: int
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/work-calendars", response_model=List[WorkCalendarResponse])
def get_work_calendars(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all work calendars for a company"""
    query = """
        SELECT id, company_id, code, name, description, timezone,
               is_active, created_by, created_at, updated_at
        FROM work_calendars
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

@router.post("/work-calendars", response_model=WorkCalendarResponse)
def create_work_calendar(
    calendar: WorkCalendarCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new work calendar"""
    query = """
        INSERT INTO work_calendars (
            company_id, code, name, description, timezone, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :timezone, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, timezone,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": calendar.code,
        "name": calendar.name,
        "description": calendar.description,
        "timezone": calendar.timezone,
        "is_active": calendar.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.get("/work-shifts", response_model=List[WorkShiftResponse])
def get_work_shifts(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    calendar_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all work shifts for a company"""
    query = """
        SELECT id, company_id, calendar_id, shift_name, day_of_week,
               start_time, end_time, break_minutes, is_active,
               created_by, created_at, updated_at
        FROM work_shifts
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if calendar_id:
        query += " AND calendar_id = :calendar_id"
        params["calendar_id"] = calendar_id
    
    query += " ORDER BY calendar_id, day_of_week, start_time OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/work-shifts", response_model=WorkShiftResponse)
def create_work_shift(
    shift: WorkShiftCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new work shift"""
    query = """
        INSERT INTO work_shifts (
            company_id, calendar_id, shift_name, day_of_week,
            start_time, end_time, break_minutes, is_active, created_by
        ) VALUES (
            :company_id, :calendar_id, :shift_name, :day_of_week,
            :start_time, :end_time, :break_minutes, :is_active, :created_by
        ) RETURNING id, company_id, calendar_id, shift_name, day_of_week,
                    start_time, end_time, break_minutes, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "calendar_id": shift.calendar_id,
        "shift_name": shift.shift_name,
        "day_of_week": shift.day_of_week,
        "start_time": shift.start_time,
        "end_time": shift.end_time,
        "break_minutes": shift.break_minutes,
        "is_active": shift.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

# ============================================================================
# ============================================================================

class StandardCostCreate(BaseModel):
    item_id: str
    cost_type: str  # MATERIAL, LABOR, OVERHEAD, TOTAL
    cost_amount: float
    effective_date: datetime
    expiry_date: Optional[datetime] = None
    is_active: bool = True

class StandardCostUpdate(BaseModel):
    cost_amount: Optional[float] = None
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class StandardCostResponse(BaseModel):
    id: int
    company_id: str
    item_id: str
    cost_type: str
    cost_amount: float
    effective_date: datetime
    expiry_date: Optional[datetime]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/standard-costs", response_model=List[StandardCostResponse])
def get_standard_costs(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    item_id: Optional[str] = None,
    cost_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all standard costs for a company"""
    query = """
        SELECT id, company_id, item_id, cost_type, cost_amount,
               effective_date, expiry_date, is_active,
               created_by, created_at, updated_at
        FROM standard_costs
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if item_id:
        query += " AND item_id = :item_id"
        params["item_id"] = item_id
    
    if cost_type:
        query += " AND cost_type = :cost_type"
        params["cost_type"] = cost_type
    
    query += " ORDER BY item_id, cost_type, effective_date DESC OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/standard-costs", response_model=StandardCostResponse)
def create_standard_cost(
    cost: StandardCostCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new standard cost"""
    query = """
        INSERT INTO standard_costs (
            company_id, item_id, cost_type, cost_amount,
            effective_date, expiry_date, is_active, created_by
        ) VALUES (
            :company_id, :item_id, :cost_type, :cost_amount,
            :effective_date, :expiry_date, :is_active, :created_by
        ) RETURNING id, company_id, item_id, cost_type, cost_amount,
                    effective_date, expiry_date, is_active,
                    created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "item_id": cost.item_id,
        "cost_type": cost.cost_type,
        "cost_amount": cost.cost_amount,
        "effective_date": cost.effective_date,
        "expiry_date": cost.expiry_date,
        "is_active": cost.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

# ============================================================================
# ============================================================================

class ScrapBackflushRuleCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    rule_type: str  # SCRAP, BACKFLUSH
    trigger: str  # ON_COMPLETION, ON_START, MANUAL
    item_category: Optional[str] = None
    scrap_percent: float = 0.0
    backflush_method: Optional[str] = None  # FIFO, LIFO, AVERAGE
    is_active: bool = True

class ScrapBackflushRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rule_type: Optional[str] = None
    trigger: Optional[str] = None
    item_category: Optional[str] = None
    scrap_percent: Optional[float] = None
    backflush_method: Optional[str] = None
    is_active: Optional[bool] = None

class ScrapBackflushRuleResponse(BaseModel):
    id: int
    company_id: str
    code: str
    name: str
    description: Optional[str]
    rule_type: str
    trigger: str
    item_category: Optional[str]
    scrap_percent: float
    backflush_method: Optional[str]
    is_active: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/scrap-backflush-rules", response_model=List[ScrapBackflushRuleResponse])
def get_scrap_backflush_rules(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    rule_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all scrap/backflush rules for a company"""
    query = """
        SELECT id, company_id, code, name, description, rule_type,
               trigger, item_category, scrap_percent, backflush_method,
               is_active, created_by, created_at, updated_at
        FROM scrap_backflush_rules
        WHERE company_id = :company_id
    """
    params = {"company_id": company_id}
    
    if rule_type:
        query += " AND rule_type = :rule_type"
        params["rule_type"] = rule_type
    
    query += " ORDER BY code OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.post("/scrap-backflush-rules", response_model=ScrapBackflushRuleResponse)
def create_scrap_backflush_rule(
    rule: ScrapBackflushRuleCreate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    current_user: str = Query("system", description="Current user"),
    db: Session = Depends(get_db)
):
    """Create a new scrap/backflush rule"""
    query = """
        INSERT INTO scrap_backflush_rules (
            company_id, code, name, description, rule_type, trigger,
            item_category, scrap_percent, backflush_method, is_active, created_by
        ) VALUES (
            :company_id, :code, :name, :description, :rule_type, :trigger,
            :item_category, :scrap_percent, :backflush_method, :is_active, :created_by
        ) RETURNING id, company_id, code, name, description, rule_type,
                    trigger, item_category, scrap_percent, backflush_method,
                    is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), {
        "company_id": company_id,
        "code": rule.code,
        "name": rule.name,
        "description": rule.description,
        "rule_type": rule.rule_type,
        "trigger": rule.trigger,
        "item_category": rule.item_category,
        "scrap_percent": rule.scrap_percent,
        "backflush_method": rule.backflush_method,
        "is_active": rule.is_active,
        "created_by": current_user
    })
    db.commit()
    row = result.fetchone()
    return dict(row._mapping)

@router.put("/scrap-backflush-rules/{rule_id}", response_model=ScrapBackflushRuleResponse)
def update_scrap_backflush_rule(
    rule_id: int,
    rule: ScrapBackflushRuleUpdate,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Update a scrap/backflush rule"""
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
    if rule.trigger is not None:
        updates.append("trigger = :trigger")
        params["trigger"] = rule.trigger
    if rule.item_category is not None:
        updates.append("item_category = :item_category")
        params["item_category"] = rule.item_category
    if rule.scrap_percent is not None:
        updates.append("scrap_percent = :scrap_percent")
        params["scrap_percent"] = rule.scrap_percent
    if rule.backflush_method is not None:
        updates.append("backflush_method = :backflush_method")
        params["backflush_method"] = rule.backflush_method
    if rule.is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = rule.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    query = f"""
        UPDATE scrap_backflush_rules
        SET {', '.join(updates)}
        WHERE id = :rule_id AND company_id = :company_id
        RETURNING id, company_id, code, name, description, rule_type,
                  trigger, item_category, scrap_percent, backflush_method,
                  is_active, created_by, created_at, updated_at
    """
    result = db.execute(text(query), params)
    db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scrap/backflush rule not found")
    return dict(row._mapping)

@router.delete("/scrap-backflush-rules/{rule_id}")
def delete_scrap_backflush_rule(
    rule_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Delete a scrap/backflush rule"""
    query = """
        DELETE FROM scrap_backflush_rules
        WHERE id = :rule_id AND company_id = :company_id
    """
    result = db.execute(text(query), {"rule_id": rule_id, "company_id": company_id})
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Scrap/backflush rule not found")
    return {"message": "Scrap/backflush rule deleted successfully"}
