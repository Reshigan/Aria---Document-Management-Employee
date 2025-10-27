"""
Database models for ARIA ERP system
SQLAlchemy ORM models
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"


class User(Base):
    """User model with authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    invoices = relationship("Invoice", back_populates="user")
    expenses = relationship("Expense", back_populates="user")


class Invoice(Base):
    """Invoice model for financial management"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String)
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    currency = Column(String, default="ZAR")
    status = Column(String, default="draft")  # draft, sent, paid, overdue, cancelled
    due_date = Column(DateTime(timezone=True))
    paid_date = Column(DateTime(timezone=True))
    description = Column(Text)
    notes = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    """Invoice line items"""
    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    tax_rate = Column(Float, default=15.0)  # VAT rate for South Africa
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    invoice = relationship("Invoice", back_populates="line_items")


class Expense(Base):
    """Expense tracking model"""
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    expense_number = Column(String, unique=True, index=True)
    employee_name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # travel, meals, supplies, etc.
    amount = Column(Float, nullable=False)
    currency = Column(String, default="ZAR")
    status = Column(String, default="pending")  # pending, approved, rejected, reimbursed
    receipt_url = Column(String)
    description = Column(Text)
    notes = Column(Text)
    submission_date = Column(DateTime(timezone=True), server_default=func.now())
    approval_date = Column(DateTime(timezone=True))
    user_id = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="expenses", foreign_keys=[user_id])


class Customer(Base):
    """Customer/Contact model for CRM"""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    company = Column(String)
    industry = Column(String)
    address = Column(Text)
    city = Column(String)
    country = Column(String, default="South Africa")
    lead_score = Column(Integer, default=0)
    status = Column(String, default="lead")  # lead, prospect, customer, inactive
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    interactions = relationship("CustomerInteraction", back_populates="customer", cascade="all, delete-orphan")


class CustomerInteraction(Base):
    """Customer interaction history"""
    __tablename__ = "customer_interactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    interaction_type = Column(String)  # email, call, meeting, demo, etc.
    subject = Column(String)
    notes = Column(Text)
    outcome = Column(String)  # positive, neutral, negative
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="interactions")


class Employee(Base):
    """Employee model for HR"""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_number = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String)
    job_title = Column(String)
    department = Column(String)
    manager_id = Column(Integer, ForeignKey("employees.id"))
    hire_date = Column(DateTime(timezone=True))
    salary = Column(Float)
    currency = Column(String, default="ZAR")
    status = Column(String, default="active")  # active, inactive, terminated
    id_number = Column(String)  # South African ID number
    tax_number = Column(String)  # South African tax number
    bank_account = Column(String)
    bank_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    manager = relationship("Employee", remote_side=[id])
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")


class LeaveRequest(Base):
    """Employee leave requests"""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type = Column(String, nullable=False)  # annual, sick, unpaid, etc.
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    days = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected
    reason = Column(Text)
    approved_by = Column(Integer, ForeignKey("employees.id"))
    approval_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="leave_requests", foreign_keys=[employee_id])


class PurchaseOrder(Base):
    """Purchase orders for procurement"""
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String, unique=True, index=True, nullable=False)
    vendor_name = Column(String, nullable=False)
    vendor_email = Column(String)
    total_amount = Column(Float, nullable=False)
    currency = Column(String, default="ZAR")
    status = Column(String, default="draft")  # draft, sent, confirmed, received, closed
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    expected_delivery = Column(DateTime(timezone=True))
    actual_delivery = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ComplianceRecord(Base):
    """BBBEE and compliance tracking"""
    __tablename__ = "compliance_records"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String, nullable=False)  # bbbee, sars, sox, gdpr, etc.
    entity_name = Column(String, nullable=False)
    entity_id = Column(String)
    compliance_level = Column(String)  # For BBBEE: Level 1-8
    score = Column(Float)
    status = Column(String, default="pending")  # pending, compliant, non_compliant
    verification_date = Column(DateTime(timezone=True))
    expiry_date = Column(DateTime(timezone=True))
    certificate_url = Column(String)
    notes = Column(Text)
    data = Column(JSON)  # Store detailed compliance data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class BotExecution(Base):
    """Track bot executions for analytics"""
    __tablename__ = "bot_executions"

    id = Column(Integer, primary_key=True, index=True)
    bot_name = Column(String, nullable=False, index=True)
    status = Column(String, default="running")  # running, success, failed
    input_data = Column(JSON)
    output_data = Column(JSON)
    error_message = Column(Text)
    execution_time = Column(Float)  # seconds
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class AuditLog(Base):
    """Audit trail for compliance"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # create, read, update, delete
    entity_type = Column(String, nullable=False)  # invoice, expense, user, etc.
    entity_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
