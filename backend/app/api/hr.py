"""
HR & Payroll Management API
Includes: Employees, Payroll, Leave Management, Attendance
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, extract
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
import calendar

from core.database import get_db
from core.auth import get_current_user
from models.hr import (
    Employee, EmployeeLeave, LeaveType, Payroll, PayrollItem,
    Attendance, Department, Position
)
from models.user import User
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/hr", tags=["HR & Payroll"])

# ===================== SCHEMAS =====================

class EmployeeCreate(BaseModel):
    employee_number: str
    first_name: str
    last_name: str
    id_number: str  # SA ID number
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: date
    hire_date: date
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    employment_type: str = "permanent"  # permanent, contract, temporary
    salary: Decimal = Field(ge=0)
    tax_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    uif_number: Optional[str] = None
    address: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    salary: Optional[Decimal] = None
    is_active: Optional[bool] = None
    address: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    tenant_id: int
    employee_number: str
    first_name: str
    last_name: str
    email: Optional[str]
    phone: Optional[str]
    hire_date: date
    department_id: Optional[int]
    position_id: Optional[int]
    employment_type: str
    salary: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LeaveRequestCreate(BaseModel):
    employee_id: int
    leave_type_id: int
    start_date: date
    end_date: date
    days_requested: Decimal = Field(gt=0)
    reason: Optional[str] = None

class LeaveRequestUpdate(BaseModel):
    status: str  # pending, approved, rejected, cancelled
    approver_notes: Optional[str] = None

class LeaveResponse(BaseModel):
    id: int
    tenant_id: int
    employee_id: int
    leave_type_id: int
    start_date: date
    end_date: date
    days_requested: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PayrollCreate(BaseModel):
    employee_id: int
    pay_period_start: date
    pay_period_end: date
    basic_salary: Decimal = Field(ge=0)
    overtime_hours: Decimal = Field(default=Decimal("0"), ge=0)
    overtime_rate: Decimal = Field(default=Decimal("0"), ge=0)
    allowances: Decimal = Field(default=Decimal("0"), ge=0)
    deductions: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None

class PayrollResponse(BaseModel):
    id: int
    tenant_id: int
    employee_id: int
    pay_period_start: date
    pay_period_end: date
    gross_salary: Decimal
    paye: Decimal
    uif: Decimal
    net_salary: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceCreate(BaseModel):
    employee_id: int
    attendance_date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    hours_worked: Optional[Decimal] = None
    notes: Optional[str] = None

# ===================== EMPLOYEE ENDPOINTS =====================

@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new employee"""
    # Check if employee number or ID number already exists
    existing = db.query(Employee).filter(
        and_(
            Employee.tenant_id == current_user.tenant_id,
            or_(
                Employee.employee_number == employee.employee_number,
                Employee.id_number == employee.id_number
            )
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Employee number or ID number already exists")
    
    db_employee = Employee(
        tenant_id=current_user.tenant_id,
        employee_number=employee.employee_number,
        first_name=employee.first_name,
        last_name=employee.last_name,
        id_number=employee.id_number,
        email=employee.email,
        phone=employee.phone,
        date_of_birth=employee.date_of_birth,
        hire_date=employee.hire_date,
        department_id=employee.department_id,
        position_id=employee.position_id,
        employment_type=employee.employment_type,
        salary=employee.salary,
        tax_number=employee.tax_number,
        bank_name=employee.bank_name,
        account_number=employee.account_number,
        branch_code=employee.branch_code,
        uif_number=employee.uif_number,
        address=employee.address,
        is_active=True,
        created_by_id=current_user.id
    )
    
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    
    return db_employee

@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List employees with optional filters"""
    query = db.query(Employee).filter(Employee.tenant_id == current_user.tenant_id)
    
    if search:
        search_filter = or_(
            Employee.first_name.ilike(f"%{search}%"),
            Employee.last_name.ilike(f"%{search}%"),
            Employee.employee_number.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
    
    employees = query.order_by(Employee.first_name, Employee.last_name).offset(skip).limit(limit).all()
    return employees

@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific employee"""
    employee = db.query(Employee).filter(
        and_(
            Employee.id == employee_id,
            Employee.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee

@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an employee"""
    employee = db.query(Employee).filter(
        and_(
            Employee.id == employee_id,
            Employee.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    for field, value in employee_update.dict(exclude_unset=True).items():
        setattr(employee, field, value)
    
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    
    return employee

@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_employee(
    employee_id: int,
    termination_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate an employee (termination)"""
    employee = db.query(Employee).filter(
        and_(
            Employee.id == employee_id,
            Employee.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_active = False
    employee.termination_date = termination_date or date.today()
    employee.updated_at = datetime.utcnow()
    db.commit()

# ===================== LEAVE MANAGEMENT ENDPOINTS =====================

@router.post("/leave-requests", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    leave: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new leave request"""
    # Validate employee exists
    employee = db.query(Employee).filter(
        and_(
            Employee.id == leave.employee_id,
            Employee.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check for overlapping leave
    overlapping = db.query(EmployeeLeave).filter(
        and_(
            EmployeeLeave.employee_id == leave.employee_id,
            EmployeeLeave.status.in_(["pending", "approved"]),
            or_(
                and_(
                    EmployeeLeave.start_date <= leave.start_date,
                    EmployeeLeave.end_date >= leave.start_date
                ),
                and_(
                    EmployeeLeave.start_date <= leave.end_date,
                    EmployeeLeave.end_date >= leave.end_date
                )
            )
        )
    ).first()
    
    if overlapping:
        raise HTTPException(status_code=400, detail="Leave request overlaps with existing leave")
    
    db_leave = EmployeeLeave(
        tenant_id=current_user.tenant_id,
        employee_id=leave.employee_id,
        leave_type_id=leave.leave_type_id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_requested=leave.days_requested,
        reason=leave.reason,
        status="pending",
        requested_by_id=current_user.id
    )
    
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    
    return db_leave

@router.get("/leave-requests", response_model=List[LeaveResponse])
def list_leave_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List leave requests with optional filters"""
    query = db.query(EmployeeLeave).filter(EmployeeLeave.tenant_id == current_user.tenant_id)
    
    if employee_id:
        query = query.filter(EmployeeLeave.employee_id == employee_id)
    if status:
        query = query.filter(EmployeeLeave.status == status)
    if from_date:
        query = query.filter(EmployeeLeave.start_date >= from_date)
    if to_date:
        query = query.filter(EmployeeLeave.end_date <= to_date)
    
    leaves = query.order_by(EmployeeLeave.start_date.desc()).offset(skip).limit(limit).all()
    return leaves

@router.put("/leave-requests/{leave_id}", response_model=LeaveResponse)
def update_leave_request(
    leave_id: int,
    leave_update: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update leave request status (approve/reject)"""
    leave = db.query(EmployeeLeave).filter(
        and_(
            EmployeeLeave.id == leave_id,
            EmployeeLeave.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave.status not in ["pending"]:
        raise HTTPException(status_code=400, detail="Can only update pending leave requests")
    
    leave.status = leave_update.status
    leave.approver_notes = leave_update.approver_notes
    leave.approved_by_id = current_user.id
    leave.approved_at = datetime.utcnow()
    leave.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(leave)
    
    return leave

# ===================== PAYROLL ENDPOINTS =====================

@router.post("/payroll", response_model=PayrollResponse, status_code=status.HTTP_201_CREATED)
def create_payroll(
    payroll: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a payroll entry with PAYE and UIF calculations"""
    # Validate employee
    employee = db.query(Employee).filter(
        and_(
            Employee.id == payroll.employee_id,
            Employee.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate gross salary
    overtime_pay = payroll.overtime_hours * payroll.overtime_rate
    gross_salary = payroll.basic_salary + overtime_pay + payroll.allowances
    
    # Calculate PAYE (simplified SA tax calculation)
    # This is a simplified version - real calculation requires tax tables
    annual_salary = gross_salary * 12
    if annual_salary <= 237100:
        paye_rate = Decimal("0.18")
        paye_threshold = Decimal("0")
    elif annual_salary <= 370500:
        paye_rate = Decimal("0.26")
        paye_threshold = Decimal("42678")
    elif annual_salary <= 512800:
        paye_rate = Decimal("0.31")
        paye_threshold = Decimal("77362")
    elif annual_salary <= 673000:
        paye_rate = Decimal("0.36")
        paye_threshold = Decimal("121475")
    elif annual_salary <= 857900:
        paye_rate = Decimal("0.39")
        paye_threshold = Decimal("179147")
    else:
        paye_rate = Decimal("0.41")
        paye_threshold = Decimal("251258")
    
    annual_paye = paye_threshold + (annual_salary - 237100) * paye_rate if annual_salary > 237100 else Decimal("0")
    monthly_paye = annual_paye / 12
    
    # Calculate UIF (1% of gross, max R177.12)
    uif = min(gross_salary * Decimal("0.01"), Decimal("177.12"))
    
    # Calculate net salary
    total_deductions = monthly_paye + uif + payroll.deductions
    net_salary = gross_salary - total_deductions
    
    # Generate payroll number
    last_payroll = db.query(Payroll).filter(
        Payroll.tenant_id == current_user.tenant_id
    ).order_by(Payroll.id.desc()).first()
    
    next_number = 1 if not last_payroll else int(last_payroll.payroll_number.split('-')[-1]) + 1
    payroll_number = f"PAY-{datetime.now().year}{datetime.now().month:02d}-{next_number:05d}"
    
    db_payroll = Payroll(
        tenant_id=current_user.tenant_id,
        employee_id=payroll.employee_id,
        payroll_number=payroll_number,
        pay_period_start=payroll.pay_period_start,
        pay_period_end=payroll.pay_period_end,
        basic_salary=payroll.basic_salary,
        overtime_hours=payroll.overtime_hours,
        overtime_pay=overtime_pay,
        allowances=payroll.allowances,
        gross_salary=gross_salary,
        paye=monthly_paye,
        uif=uif,
        other_deductions=payroll.deductions,
        net_salary=net_salary,
        status="draft",
        notes=payroll.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_payroll)
    db.commit()
    db.refresh(db_payroll)
    
    return db_payroll

@router.get("/payroll", response_model=List[PayrollResponse])
def list_payroll(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    employee_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List payroll entries with optional filters"""
    query = db.query(Payroll).filter(Payroll.tenant_id == current_user.tenant_id)
    
    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)
    if year:
        query = query.filter(extract('year', Payroll.pay_period_start) == year)
    if month:
        query = query.filter(extract('month', Payroll.pay_period_start) == month)
    if status:
        query = query.filter(Payroll.status == status)
    
    payrolls = query.order_by(Payroll.pay_period_start.desc()).offset(skip).limit(limit).all()
    return payrolls

@router.get("/payroll/{payroll_id}", response_model=PayrollResponse)
def get_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific payroll entry"""
    payroll = db.query(Payroll).filter(
        and_(
            Payroll.id == payroll_id,
            Payroll.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll entry not found")
    
    return payroll

@router.post("/payroll/{payroll_id}/approve", response_model=PayrollResponse)
def approve_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a payroll entry"""
    payroll = db.query(Payroll).filter(
        and_(
            Payroll.id == payroll_id,
            Payroll.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll entry not found")
    
    if payroll.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft payroll can be approved")
    
    payroll.status = "approved"
    payroll.approved_by_id = current_user.id
    payroll.approved_at = datetime.utcnow()
    payroll.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(payroll)
    
    return payroll

@router.post("/payroll/{payroll_id}/pay", response_model=PayrollResponse)
def pay_payroll(
    payroll_id: int,
    payment_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark payroll as paid"""
    payroll = db.query(Payroll).filter(
        and_(
            Payroll.id == payroll_id,
            Payroll.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll entry not found")
    
    if payroll.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved payroll can be paid")
    
    payroll.status = "paid"
    payroll.payment_date = payment_date
    payroll.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(payroll)
    
    return payroll

# ===================== ATTENDANCE ENDPOINTS =====================

@router.post("/attendance", status_code=status.HTTP_201_CREATED)
def create_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create an attendance record"""
    # Check if attendance already exists for this employee and date
    existing = db.query(Attendance).filter(
        and_(
            Attendance.tenant_id == current_user.tenant_id,
            Attendance.employee_id == attendance.employee_id,
            Attendance.attendance_date == attendance.attendance_date
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance record already exists for this date")
    
    # Calculate hours worked if both check-in and check-out provided
    hours_worked = attendance.hours_worked
    if attendance.check_in_time and attendance.check_out_time:
        time_diff = attendance.check_out_time - attendance.check_in_time
        hours_worked = Decimal(str(time_diff.total_seconds() / 3600))
    
    db_attendance = Attendance(
        tenant_id=current_user.tenant_id,
        employee_id=attendance.employee_id,
        attendance_date=attendance.attendance_date,
        check_in_time=attendance.check_in_time,
        check_out_time=attendance.check_out_time,
        hours_worked=hours_worked,
        status="present",
        notes=attendance.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    
    return db_attendance

@router.get("/attendance")
def list_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    employee_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List attendance records with optional filters"""
    query = db.query(Attendance).filter(Attendance.tenant_id == current_user.tenant_id)
    
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    if from_date:
        query = query.filter(Attendance.attendance_date >= from_date)
    if to_date:
        query = query.filter(Attendance.attendance_date <= to_date)
    
    records = query.order_by(Attendance.attendance_date.desc()).offset(skip).limit(limit).all()
    return records

# ===================== REPORTS =====================

@router.get("/reports/emp201/{year}/{month}")
def emp201_report(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate EMP201 report for SARS submission"""
    # Get all payroll for the period
    payrolls = db.query(Payroll).filter(
        and_(
            Payroll.tenant_id == current_user.tenant_id,
            extract('year', Payroll.pay_period_start) == year,
            extract('month', Payroll.pay_period_start) == month,
            Payroll.status.in_(["approved", "paid"])
        )
    ).all()
    
    total_paye = sum(p.paye for p in payrolls)
    total_uif = sum(p.uif for p in payrolls)
    total_remuneration = sum(p.gross_salary for p in payrolls)
    employee_count = len(payrolls)
    
    # UIF is 2% total (1% employee + 1% employer)
    employer_uif = total_uif  # Match employee contribution
    
    # SDL (Skills Development Levy) is 1% of total payroll
    sdl = total_remuneration * Decimal("0.01")
    
    total_payable = total_paye + total_uif + employer_uif + sdl
    
    return {
        "period": f"{year}-{month:02d}",
        "employee_count": employee_count,
        "total_remuneration": float(total_remuneration),
        "paye": float(total_paye),
        "employee_uif": float(total_uif),
        "employer_uif": float(employer_uif),
        "sdl": float(sdl),
        "total_payable": float(total_payable),
        "due_date": f"{year}-{month:02d}-07"  # EMP201 due 7th of following month
    }

@router.get("/reports/headcount")
def headcount_report(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate headcount report"""
    query = db.query(Employee).filter(
        and_(
            Employee.tenant_id == current_user.tenant_id,
            Employee.is_active == True
        )
    )
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    employees = query.all()
    
    by_department = {}
    by_employment_type = {}
    
    for emp in employees:
        dept = emp.department_id or "unassigned"
        if dept not in by_department:
            by_department[dept] = 0
        by_department[dept] += 1
        
        if emp.employment_type not in by_employment_type:
            by_employment_type[emp.employment_type] = 0
        by_employment_type[emp.employment_type] += 1
    
    return {
        "total_employees": len(employees),
        "by_department": by_department,
        "by_employment_type": by_employment_type
    }
