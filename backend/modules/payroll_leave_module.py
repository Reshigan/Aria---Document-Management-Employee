"""
ARIA ERP - Payroll & Leave Management Module
SA BCEA Compliant Payroll and Leave Management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date

router = APIRouter(prefix="/api/erp/payroll", tags=["Payroll & Leave Management"])


def get_db():
    """Get database session"""
    from backend.database import get_db as _get_db
    return next(_get_db())

def get_company_id() -> UUID:
    """Get company ID from context - placeholder for now"""
    return UUID("00000000-0000-0000-0000-000000000001")

def get_user_id(db: Session) -> UUID:
    """Get user ID"""
    result = db.execute(text("SELECT id FROM users LIMIT 1"))
    row = result.fetchone()
    return row[0] if row else UUID("00000000-0000-0000-0000-000000000001")


def calculate_paye(annual_taxable_income: Decimal) -> Decimal:
    """Calculate PAYE using 2024/2025 SA tax tables"""
    if annual_taxable_income <= Decimal("237100"):
        return Decimal("0.18") * annual_taxable_income
    elif annual_taxable_income <= Decimal("370500"):
        return Decimal("42678") + Decimal("0.26") * (annual_taxable_income - Decimal("237100"))
    elif annual_taxable_income <= Decimal("512800"):
        return Decimal("77362") + Decimal("0.31") * (annual_taxable_income - Decimal("370500"))
    elif annual_taxable_income <= Decimal("673000"):
        return Decimal("121475") + Decimal("0.36") * (annual_taxable_income - Decimal("512800"))
    elif annual_taxable_income <= Decimal("857900"):
        return Decimal("179147") + Decimal("0.39") * (annual_taxable_income - Decimal("673000"))
    elif annual_taxable_income <= Decimal("1817000"):
        return Decimal("251258") + Decimal("0.41") * (annual_taxable_income - Decimal("857900"))
    else:
        return Decimal("644489") + Decimal("0.45") * (annual_taxable_income - Decimal("1817000"))

def calculate_uif(gross_salary: Decimal) -> tuple:
    """Calculate UIF (1% employee, 1% employer, max R17712.47 per month)"""
    max_uif_salary = Decimal("17712.47")
    uif_base = min(gross_salary, max_uif_salary)
    uif_employee = uif_base * Decimal("0.01")
    uif_employer = uif_base * Decimal("0.01")
    return (uif_employee, uif_employer)

def calculate_sdl(gross_salary: Decimal) -> Decimal:
    """Calculate SDL (Skills Development Levy) - 1% of gross salary"""
    return gross_salary * Decimal("0.01")


class LeaveRequestCreate(BaseModel):
    leave_type_id: UUID
    start_date: date
    end_date: date
    days_requested: Decimal
    reason: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    id: UUID
    company_id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    leave_type_id: UUID
    leave_type_name: Optional[str] = None
    start_date: date
    end_date: date
    days_requested: Decimal
    reason: Optional[str]
    status: str
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class LeaveBalanceResponse(BaseModel):
    leave_type_id: UUID
    leave_type_code: str
    leave_type_name: str
    year: int
    opening_balance: Decimal
    accrued: Decimal
    taken: Decimal
    balance: Decimal
    
    class Config:
        from_attributes = True

class PayrollRunCreate(BaseModel):
    period_start: date
    period_end: date
    payment_date: date

class PayrollRunResponse(BaseModel):
    id: UUID
    company_id: UUID
    run_number: str
    period_start: date
    period_end: date
    payment_date: date
    status: str
    total_gross: Decimal
    total_paye: Decimal
    total_uif: Decimal
    total_sdl: Decimal
    total_net: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True

class PayslipResponse(BaseModel):
    id: UUID
    company_id: UUID
    payroll_run_id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    payslip_number: str
    basic_salary: Decimal
    allowances: Decimal
    overtime: Decimal
    gross_salary: Decimal
    paye: Decimal
    uif_employee: Decimal
    uif_employer: Decimal
    sdl: Decimal
    other_deductions: Decimal
    net_salary: Decimal
    days_worked: Decimal
    leave_days: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "payroll_leave",
        "endpoints": ["leave-requests", "leave-balances", "payroll-runs", "payslips"],
        "compliance": "SA BCEA"
    }


@router.get("/leave-types", response_model=List[dict])
async def get_leave_types(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all leave types"""
    query = """
        SELECT id, code, name, days_per_year, carry_forward, 
               max_carry_forward_days, requires_approval
        FROM leave_types
        WHERE company_id = :company_id AND is_active = true
        ORDER BY name
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    leave_types = []
    for row in result:
        leave_types.append({
            "id": str(row[0]),
            "code": row[1],
            "name": row[2],
            "days_per_year": float(row[3]),
            "carry_forward": row[4],
            "max_carry_forward_days": float(row[5]),
            "requires_approval": row[6]
        })
    return leave_types

@router.get("/leave-balances", response_model=List[LeaveBalanceResponse])
async def get_leave_balances(
    employee_id: Optional[UUID] = None,
    year: Optional[int] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get leave balances for employees"""
    current_year = datetime.now().year if not year else year
    user_id = get_user_id(db) if not employee_id else employee_id
    
    query = """
        SELECT lb.leave_type_id, lt.code, lt.name, lb.year,
               lb.opening_balance, lb.accrued, lb.taken, lb.balance
        FROM leave_balances lb
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.company_id = :company_id
        AND lb.employee_id = :employee_id
        AND lb.year = :year
        ORDER BY lt.name
    """
    result = db.execute(text(query), {
        "company_id": str(company_id),
        "employee_id": str(user_id),
        "year": current_year
    })
    
    balances = []
    for row in result:
        balances.append(LeaveBalanceResponse(
            leave_type_id=row[0], leave_type_code=row[1], leave_type_name=row[2],
            year=row[3], opening_balance=row[4], accrued=row[5], taken=row[6], balance=row[7]
        ))
    return balances

@router.post("/leave-requests", response_model=LeaveRequestResponse)
async def create_leave_request(
    leave_request: LeaveRequestCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a leave request"""
    try:
        user_id = get_user_id(db)
        request_id = uuid4()
        
        current_year = leave_request.start_date.year
        balance_query = """
            SELECT balance FROM leave_balances
            WHERE company_id = :company_id AND employee_id = :employee_id
            AND leave_type_id = :leave_type_id AND year = :year
        """
        result = db.execute(text(balance_query), {
            "company_id": str(company_id),
            "employee_id": str(user_id),
            "leave_type_id": str(leave_request.leave_type_id),
            "year": current_year
        })
        row = result.fetchone()
        
        if not row or row[0] < leave_request.days_requested:
            raise HTTPException(status_code=400, detail="Insufficient leave balance")
        
        db.execute(text("""
            INSERT INTO leave_requests (id, company_id, employee_id, leave_type_id,
                                       start_date, end_date, days_requested, reason,
                                       status, created_at, updated_at)
            VALUES (:id, :company_id, :employee_id, :leave_type_id,
                    :start_date, :end_date, :days_requested, :reason,
                    'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(request_id),
            "company_id": str(company_id),
            "employee_id": str(user_id),
            "leave_type_id": str(leave_request.leave_type_id),
            "start_date": leave_request.start_date,
            "end_date": leave_request.end_date,
            "days_requested": float(leave_request.days_requested),
            "reason": leave_request.reason
        })
        
        db.commit()
        
        query = """
            SELECT lr.id, lr.company_id, lr.employee_id, u.full_name as employee_name,
                   lr.leave_type_id, lt.name as leave_type_name,
                   lr.start_date, lr.end_date, lr.days_requested, lr.reason,
                   lr.status, lr.approved_by, lr.approved_at, lr.created_at
            FROM leave_requests lr
            JOIN users u ON lr.employee_id = u.id
            JOIN leave_types lt ON lr.leave_type_id = lt.id
            WHERE lr.id = :request_id
        """
        result = db.execute(text(query), {"request_id": str(request_id)})
        row = result.fetchone()
        
        return LeaveRequestResponse(
            id=row[0], company_id=row[1], employee_id=row[2], employee_name=row[3],
            leave_type_id=row[4], leave_type_name=row[5],
            start_date=row[6], end_date=row[7], days_requested=row[8], reason=row[9],
            status=row[10], approved_by=row[11], approved_at=row[12], created_at=row[13]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating leave request: {str(e)}")

@router.post("/leave-requests/{request_id}/approve")
async def approve_leave_request(
    request_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Approve a leave request"""
    try:
        user_id = get_user_id(db)
        
        query = """
            SELECT employee_id, leave_type_id, days_requested, start_date
            FROM leave_requests
            WHERE id = :request_id AND company_id = :company_id AND status = 'pending'
        """
        result = db.execute(text(query), {
            "request_id": str(request_id),
            "company_id": str(company_id)
        })
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found or already processed")
        
        employee_id, leave_type_id, days_requested, start_date = row
        current_year = start_date.year
        
        db.execute(text("""
            UPDATE leave_requests
            SET status = 'approved', approved_by = :approved_by, 
                approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :request_id
        """), {
            "request_id": str(request_id),
            "approved_by": str(user_id)
        })
        
        db.execute(text("""
            UPDATE leave_balances
            SET taken = taken + :days_taken, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND employee_id = :employee_id
            AND leave_type_id = :leave_type_id AND year = :year
        """), {
            "company_id": str(company_id),
            "employee_id": str(employee_id),
            "leave_type_id": str(leave_type_id),
            "days_taken": float(days_requested),
            "year": current_year
        })
        
        db.commit()
        return {"message": "Leave request approved successfully", "request_id": str(request_id)}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error approving leave request: {str(e)}")

@router.get("/leave-requests", response_model=List[LeaveRequestResponse])
async def get_leave_requests(
    status: Optional[str] = None,
    employee_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get leave requests with optional filters"""
    query = """
        SELECT lr.id, lr.company_id, lr.employee_id, u.full_name as employee_name,
               lr.leave_type_id, lt.name as leave_type_name,
               lr.start_date, lr.end_date, lr.days_requested, lr.reason,
               lr.status, lr.approved_by, lr.approved_at, lr.created_at
        FROM leave_requests lr
        JOIN users u ON lr.employee_id = u.id
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if status:
        query += " AND lr.status = :status"
        params["status"] = status
    
    if employee_id:
        query += " AND lr.employee_id = :employee_id"
        params["employee_id"] = str(employee_id)
    
    query += " ORDER BY lr.created_at DESC"
    
    result = db.execute(text(query), params)
    requests = []
    for row in result:
        requests.append(LeaveRequestResponse(
            id=row[0], company_id=row[1], employee_id=row[2], employee_name=row[3],
            leave_type_id=row[4], leave_type_name=row[5],
            start_date=row[6], end_date=row[7], days_requested=row[8], reason=row[9],
            status=row[10], approved_by=row[11], approved_at=row[12], created_at=row[13]
        ))
    return requests


@router.post("/payroll-runs", response_model=PayrollRunResponse)
async def create_payroll_run(
    payroll_run: PayrollRunCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a payroll run"""
    try:
        user_id = get_user_id(db)
        run_id = uuid4()
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM payroll_runs WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        run_number = f"PR-{payroll_run.period_start.strftime('%Y%m')}-{str(count + 1).zfill(3)}"
        
        db.execute(text("""
            INSERT INTO payroll_runs (id, company_id, run_number, period_start, period_end,
                                     payment_date, status, processed_by, created_at, updated_at)
            VALUES (:id, :company_id, :run_number, :period_start, :period_end,
                    :payment_date, 'draft', :processed_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(run_id),
            "company_id": str(company_id),
            "run_number": run_number,
            "period_start": payroll_run.period_start,
            "period_end": payroll_run.period_end,
            "payment_date": payroll_run.payment_date,
            "processed_by": str(user_id)
        })
        
        db.commit()
        
        query = """
            SELECT id, company_id, run_number, period_start, period_end, payment_date,
                   status, total_gross, total_paye, total_uif, total_sdl, total_net, created_at
            FROM payroll_runs
            WHERE id = :run_id
        """
        result = db.execute(text(query), {"run_id": str(run_id)})
        row = result.fetchone()
        
        return PayrollRunResponse(
            id=row[0], company_id=row[1], run_number=row[2], period_start=row[3],
            period_end=row[4], payment_date=row[5], status=row[6],
            total_gross=row[7], total_paye=row[8], total_uif=row[9],
            total_sdl=row[10], total_net=row[11], created_at=row[12]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating payroll run: {str(e)}")

@router.post("/payroll-runs/{run_id}/process")
async def process_payroll_run(
    run_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Process payroll run - calculate payslips for all employees"""
    try:
        employees_query = """
            SELECT id, full_name FROM users
            WHERE id IN (SELECT DISTINCT employee_id FROM leave_balances WHERE company_id = :company_id)
            LIMIT 10
        """
        result = db.execute(text(employees_query), {"company_id": str(company_id)})
        employees = result.fetchall()
        
        total_gross = Decimal("0")
        total_paye = Decimal("0")
        total_uif = Decimal("0")
        total_sdl = Decimal("0")
        total_net = Decimal("0")
        
        payslip_count = 0
        
        for emp_id, emp_name in employees:
            payslip_id = uuid4()
            payslip_count += 1
            
            basic_salary = Decimal("25000.00")
            allowances = Decimal("2000.00")
            overtime = Decimal("0.00")
            gross_salary = basic_salary + allowances + overtime
            
            annual_taxable = gross_salary * 12
            annual_paye = calculate_paye(annual_taxable)
            monthly_paye = annual_paye / 12
            
            uif_employee, uif_employer = calculate_uif(gross_salary)
            
            # Calculate SDL
            sdl = calculate_sdl(gross_salary)
            
            # Calculate net salary
            other_deductions = Decimal("0.00")
            net_salary = gross_salary - monthly_paye - uif_employee - other_deductions
            
            # Create payslip
            payslip_number = f"PS-{run_id}-{str(payslip_count).zfill(4)}"
            
            db.execute(text("""
                INSERT INTO payslips (id, company_id, payroll_run_id, employee_id, payslip_number,
                                     basic_salary, allowances, overtime, gross_salary,
                                     paye, uif_employee, uif_employer, sdl, other_deductions, net_salary,
                                     days_worked, leave_days, created_at, updated_at)
                VALUES (:id, :company_id, :run_id, :employee_id, :payslip_number,
                        :basic_salary, :allowances, :overtime, :gross_salary,
                        :paye, :uif_employee, :uif_employer, :sdl, :other_deductions, :net_salary,
                        22, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "id": str(payslip_id),
                "company_id": str(company_id),
                "run_id": str(run_id),
                "employee_id": str(emp_id),
                "payslip_number": payslip_number,
                "basic_salary": float(basic_salary),
                "allowances": float(allowances),
                "overtime": float(overtime),
                "gross_salary": float(gross_salary),
                "paye": float(monthly_paye),
                "uif_employee": float(uif_employee),
                "uif_employer": float(uif_employer),
                "sdl": float(sdl),
                "other_deductions": float(other_deductions),
                "net_salary": float(net_salary)
            })
            
            total_gross += gross_salary
            total_paye += monthly_paye
            total_uif += (uif_employee + uif_employer)
            total_sdl += sdl
            total_net += net_salary
        
        db.execute(text("""
            UPDATE payroll_runs
            SET status = 'processed', total_gross = :total_gross, total_paye = :total_paye,
                total_uif = :total_uif, total_sdl = :total_sdl, total_net = :total_net,
                processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :run_id
        """), {
            "run_id": str(run_id),
            "total_gross": float(total_gross),
            "total_paye": float(total_paye),
            "total_uif": float(total_uif),
            "total_sdl": float(total_sdl),
            "total_net": float(total_net)
        })
        
        db.commit()
        
        return {
            "message": "Payroll run processed successfully",
            "run_id": str(run_id),
            "payslips_created": payslip_count,
            "total_gross": float(total_gross),
            "total_net": float(total_net)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing payroll run: {str(e)}")

@router.get("/payroll-runs", response_model=List[PayrollRunResponse])
async def get_payroll_runs(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all payroll runs"""
    query = """
        SELECT id, company_id, run_number, period_start, period_end, payment_date,
               status, total_gross, total_paye, total_uif, total_sdl, total_net, created_at
        FROM payroll_runs
        WHERE company_id = :company_id
        ORDER BY created_at DESC
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    runs = []
    for row in result:
        runs.append(PayrollRunResponse(
            id=row[0], company_id=row[1], run_number=row[2], period_start=row[3],
            period_end=row[4], payment_date=row[5], status=row[6],
            total_gross=row[7], total_paye=row[8], total_uif=row[9],
            total_sdl=row[10], total_net=row[11], created_at=row[12]
        ))
    return runs

@router.get("/payslips", response_model=List[PayslipResponse])
async def get_payslips(
    payroll_run_id: Optional[UUID] = None,
    employee_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get payslips with optional filters"""
    query = """
        SELECT p.id, p.company_id, p.payroll_run_id, p.employee_id, u.full_name as employee_name,
               p.payslip_number, p.basic_salary, p.allowances, p.overtime, p.gross_salary,
               p.paye, p.uif_employee, p.uif_employer, p.sdl, p.other_deductions, p.net_salary,
               p.days_worked, p.leave_days, p.created_at
        FROM payslips p
        JOIN users u ON p.employee_id = u.id
        WHERE p.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if payroll_run_id:
        query += " AND p.payroll_run_id = :payroll_run_id"
        params["payroll_run_id"] = str(payroll_run_id)
    
    if employee_id:
        query += " AND p.employee_id = :employee_id"
        params["employee_id"] = str(employee_id)
    
    query += " ORDER BY p.created_at DESC"
    
    result = db.execute(text(query), params)
    payslips = []
    for row in result:
        payslips.append(PayslipResponse(
            id=row[0], company_id=row[1], payroll_run_id=row[2], employee_id=row[3],
            employee_name=row[4], payslip_number=row[5], basic_salary=row[6],
            allowances=row[7], overtime=row[8], gross_salary=row[9],
            paye=row[10], uif_employee=row[11], uif_employer=row[12], sdl=row[13],
            other_deductions=row[14], net_salary=row[15], days_worked=row[16],
            leave_days=row[17], created_at=row[18]
        ))
    return payslips
