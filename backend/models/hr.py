"""
HR Models - Employees, Payroll, Leave Management
South African compliance (PAYE, UIF, SDL, IRP5)
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from enum import Enum
from .base import Base


class EmploymentType(str, Enum):
    """Employment Types"""
    PERMANENT = "permanent"
    CONTRACT = "contract"
    TEMPORARY = "temporary"
    PART_TIME = "part_time"
    INTERN = "intern"


class EmployeeStatus(str, Enum):
    """Employee Status"""
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    RESIGNED = "resigned"


class LeaveType(str, Enum):
    """Leave Types (SA specific)"""
    ANNUAL = "annual"
    SICK = "sick"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    FAMILY_RESPONSIBILITY = "family_responsibility"
    STUDY = "study"
    UNPAID = "unpaid"


class LeaveRequestStatus(str, Enum):
    """Leave Request Status"""
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class PayrollStatus(str, Enum):
    """Payroll Status"""
    DRAFT = "draft"
    CALCULATED = "calculated"
    APPROVED = "approved"
    PAID = "paid"
    SUBMITTED = "submitted"  # To SARS


class Employee(Base):
    """
    Employee Master Data
    """
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Employee identification
    employee_number = Column(String(50), nullable=False, unique=True, index=True)
    
    # Personal information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    id_number = Column(String(13), unique=True, index=True)  # SA ID number
    passport_number = Column(String(50))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    nationality = Column(String(100), default="South African")
    
    # Contact details
    email = Column(String(200), index=True)
    phone = Column(String(50))
    mobile = Column(String(50))
    
    # Address
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    city = Column(String(100))
    province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Africa")
    
    # Employment details
    employment_type = Column(SQLEnum(EmploymentType), nullable=False)
    job_title = Column(String(100), nullable=False, index=True)
    department = Column(String(100), index=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # Dates
    hire_date = Column(Date, nullable=False, index=True)
    termination_date = Column(Date, nullable=True)
    
    # Status
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE, index=True)
    
    # Compensation
    basic_salary = Column(Float, nullable=False)
    salary_frequency = Column(String(20), default="monthly")  # monthly, weekly, hourly
    
    # Banking details
    bank_name = Column(String(100))
    account_number = Column(String(50))
    branch_code = Column(String(20))
    account_type = Column(String(50))
    
    # Tax details (SA)
    tax_number = Column(String(50))  # Income tax number
    tax_directive = Column(Boolean, default=False)
    tax_directive_amount = Column(Float, default=0.0)
    
    # UIF registration
    uif_reference_number = Column(String(50))
    is_uif_exempt = Column(Boolean, default=False)
    
    # Pension/Provident fund
    pension_fund_member = Column(Boolean, default=False)
    pension_fund_number = Column(String(50))
    pension_contribution_percentage = Column(Float, default=0.0)
    
    # Medical aid
    medical_aid_member = Column(Boolean, default=False)
    medical_aid_name = Column(String(100))
    medical_aid_number = Column(String(50))
    medical_aid_dependants = Column(Integer, default=0)
    medical_aid_contribution = Column(Float, default=0.0)
    
    # Leave balances
    annual_leave_balance = Column(Float, default=0.0)
    sick_leave_balance = Column(Float, default=0.0)
    
    # Emergency contact
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(50))
    emergency_contact_relationship = Column(String(100))
    
    # Accounting
    salary_expense_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # User account link
    user_id = Column(String(100), unique=True, index=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    payroll_entries = relationship("PayrollEntry", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    subordinates = relationship("Employee", backref="manager", remote_side=[id])
    
    def __repr__(self):
        return f"<Employee {self.employee_number} - {self.first_name} {self.last_name}>"


class PayrollPeriod(Base):
    """
    Payroll Period (monthly/weekly pay periods)
    """
    __tablename__ = "payroll_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Period identification
    period_code = Column(String(20), nullable=False, unique=True, index=True)  # "2025-10"
    period_name = Column(String(100))  # "October 2025 Payroll"
    
    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    pay_date = Column(Date, nullable=False)
    
    # Status
    status = Column(SQLEnum(PayrollStatus), default=PayrollStatus.DRAFT, index=True)
    
    # Totals
    total_employees = Column(Integer, default=0)
    total_gross_salary = Column(Float, default=0.0)
    total_paye = Column(Float, default=0.0)
    total_uif_employee = Column(Float, default=0.0)
    total_uif_employer = Column(Float, default=0.0)
    total_sdl = Column(Float, default=0.0)
    total_net_pay = Column(Float, default=0.0)
    
    # GL
    gl_journal_id = Column(Integer, ForeignKey("general_ledger.id"))
    
    # SARS submission
    submitted_to_sars = Column(Boolean, default=False)
    sars_submission_date = Column(DateTime)
    sars_reference = Column(String(100))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    
    # Relationships
    entries = relationship("PayrollEntry", back_populates="payroll_period", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PayrollPeriod {self.period_code} - {self.status}>"


class PayrollEntry(Base):
    """
    Individual Employee Payroll Entry
    """
    __tablename__ = "payroll_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # References
    payroll_period_id = Column(Integer, ForeignKey("payroll_periods.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Earnings
    basic_salary = Column(Float, nullable=False)
    overtime = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    allowances = Column(Float, default=0.0)
    gross_salary = Column(Float, nullable=False)
    
    # Deductions
    paye = Column(Float, default=0.0)  # SARS income tax
    uif_employee = Column(Float, default=0.0)  # 1% employee UIF
    uif_employer = Column(Float, default=0.0)  # 1% employer UIF
    pension_contribution = Column(Float, default=0.0)
    medical_aid = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)
    
    # Employer costs
    sdl = Column(Float, default=0.0)  # 1% Skills Development Levy
    employer_uif = Column(Float, default=0.0)
    
    # Net pay
    net_pay = Column(Float, nullable=False)
    
    # Tax certificate data (IRP5)
    taxable_income = Column(Float, default=0.0)
    tax_paid = Column(Float, default=0.0)
    
    # Payment
    is_paid = Column(Boolean, default=False)
    paid_date = Column(Date)
    payment_reference = Column(String(100))
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payroll_period = relationship("PayrollPeriod", back_populates="entries")
    employee = relationship("Employee", back_populates="payroll_entries")
    
    def __repr__(self):
        return f"<PayrollEntry Employee:{self.employee_id} - Net Pay: R{self.net_pay:.2f}>"


class LeaveRequest(Base):
    """
    Employee Leave Request
    """
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Employee
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Leave details
    leave_type = Column(SQLEnum(LeaveType), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False)
    days_requested = Column(Float, nullable=False)
    
    # Reason
    reason = Column(Text)
    
    # Status
    status = Column(SQLEnum(LeaveRequestStatus), default=LeaveRequestStatus.PENDING, index=True)
    
    # Approval
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    approval_notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="leave_requests")
    
    def __repr__(self):
        return f"<LeaveRequest {self.employee_id} - {self.leave_type} - {self.days_requested} days>"


class IRP5Certificate(Base):
    """
    IRP5 Tax Certificate (SA annual tax certificate)
    """
    __tablename__ = "irp5_certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Employee
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Tax year
    tax_year = Column(Integer, nullable=False, index=True)  # 2025
    tax_year_start = Column(Date)  # 2024-03-01
    tax_year_end = Column(Date)  # 2025-02-28
    
    # Income
    gross_income = Column(Float, default=0.0)
    taxable_income = Column(Float, default=0.0)
    
    # Tax paid
    paye_total = Column(Float, default=0.0)
    
    # Deductions
    pension_contributions = Column(Float, default=0.0)
    retirement_annuity = Column(Float, default=0.0)
    medical_aid_contributions = Column(Float, default=0.0)
    
    # UIF
    uif_contributions = Column(Float, default=0.0)
    
    # Other
    travel_allowance = Column(Float, default=0.0)
    fringe_benefits = Column(Float, default=0.0)
    
    # Certificate
    certificate_number = Column(String(100), unique=True)
    issued_date = Column(Date)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<IRP5 {self.employee_id} - Tax Year {self.tax_year}>"


class Recruitment(Base):
    """
    Recruitment/Job Posting
    """
    __tablename__ = "recruitments"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Job details
    job_title = Column(String(200), nullable=False, index=True)
    department = Column(String(100), index=True)
    position_type = Column(SQLEnum(EmploymentType), nullable=False)
    
    # Job description
    description = Column(Text, nullable=False)
    requirements = Column(Text)
    responsibilities = Column(Text)
    
    # Compensation
    salary_min = Column(Float)
    salary_max = Column(Float)
    
    # Dates
    opening_date = Column(Date, nullable=False)
    closing_date = Column(Date)
    
    # Status
    is_active = Column(Boolean, default=True)
    positions_available = Column(Integer, default=1)
    positions_filled = Column(Integer, default=0)
    
    # Hiring manager
    hiring_manager = Column(String(100))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    applications = relationship("JobApplication", back_populates="recruitment")
    
    def __repr__(self):
        return f"<Recruitment {self.job_title} - {self.department}>"


class JobApplication(Base):
    """
    Job Application
    """
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Recruitment
    recruitment_id = Column(Integer, ForeignKey("recruitments.id"), nullable=False)
    
    # Applicant details
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False, index=True)
    phone = Column(String(50))
    
    # Application
    resume_url = Column(String(500))
    cover_letter = Column(Text)
    
    # Status
    status = Column(String(50), default="applied", index=True)  # applied, screening, interview, offer, rejected, hired
    
    # Notes
    notes = Column(Text)
    
    # Audit
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    recruitment = relationship("Recruitment", back_populates="applications")
    
    def __repr__(self):
        return f"<JobApplication {self.first_name} {self.last_name} - {self.recruitment_id}>"
