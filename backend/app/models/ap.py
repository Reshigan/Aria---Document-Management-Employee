"""
Accounts Payable Models
Includes: Vendor Bills, Payments, Credit Notes
"""
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class BillStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    POSTED = "POSTED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    OVERPAID = "OVERPAID"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    EFT = "EFT"
    CARD = "CARD"
    WIRE_TRANSFER = "WIRE_TRANSFER"


class VendorBill(Base):
    __tablename__ = "vendor_bills"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    bill_number = Column(String(50), nullable=False, unique=True, index=True)
    vendor_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), index=True)
    
    bill_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    
    vendor_invoice_number = Column(String(100))
    reference = Column(String(200))
    
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(15, 2), nullable=False, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    amount_paid = Column(Numeric(15, 2), nullable=False, default=0)
    amount_outstanding = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Status
    status = Column(SQLEnum(BillStatus), default=BillStatus.DRAFT, index=True)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.UNPAID, index=True)
    
    gl_entry_id = Column(Integer)
    
    notes = Column(Text)
    terms_and_conditions = Column(Text)
    
    approved_by_id = Column(Integer)
    approved_at = Column(DateTime)
    posted_by_id = Column(Integer)
    posted_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
    
    # Relationships
    lines = relationship("VendorBillLine", back_populates="bill", cascade="all, delete-orphan")


class VendorBillLine(Base):
    __tablename__ = "vendor_bill_lines"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("vendor_bills.id"), nullable=False, index=True)
    
    line_number = Column(Integer, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    description = Column(Text, nullable=False)
    
    quantity = Column(Numeric(15, 3), nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False)
    discount_percent = Column(Numeric(5, 2), default=0)
    
    tax_rate = Column(Numeric(5, 2), default=15)  # SA VAT
    tax_amount = Column(Numeric(15, 2), nullable=False)
    
    line_total = Column(Numeric(15, 2), nullable=False)
    
    expense_account_code = Column(String(20))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bill = relationship("VendorBill", back_populates="lines")


class VendorPayment(Base):
    __tablename__ = "vendor_payments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    payment_number = Column(String(50), nullable=False, unique=True, index=True)
    vendor_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    
    amount = Column(Numeric(15, 2), nullable=False)
    
    reference = Column(String(200))
    cheque_number = Column(String(50))
    
    # Status
    status = Column(String(20), default="DRAFT")  # DRAFT, POSTED
    
    gl_entry_id = Column(Integer)
    
    notes = Column(Text)
    
    posted_by_id = Column(Integer)
    posted_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
    
    # Relationships
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("vendor_payments.id"), nullable=False, index=True)
    bill_id = Column(Integer, ForeignKey("vendor_bills.id"), nullable=False, index=True)
    
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    payment = relationship("VendorPayment", back_populates="allocations")


class VendorCreditNote(Base):
    __tablename__ = "vendor_credit_notes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    credit_note_number = Column(String(50), nullable=False, unique=True, index=True)
    vendor_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    bill_id = Column(Integer, ForeignKey("vendor_bills.id"), index=True)
    
    credit_note_date = Column(Date, nullable=False, index=True)
    
    vendor_credit_number = Column(String(100))
    reference = Column(String(200))
    reason = Column(Text)
    
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(15, 2), nullable=False, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    amount_applied = Column(Numeric(15, 2), nullable=False, default=0)
    amount_remaining = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Status
    status = Column(String(20), default="DRAFT")  # DRAFT, POSTED
    
    gl_entry_id = Column(Integer)
    
    notes = Column(Text)
    
    posted_by_id = Column(Integer)
    posted_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
    
    # Relationships
    lines = relationship("VendorCreditNoteLine", back_populates="credit_note", cascade="all, delete-orphan")


class VendorCreditNoteLine(Base):
    __tablename__ = "vendor_credit_note_lines"

    id = Column(Integer, primary_key=True, index=True)
    credit_note_id = Column(Integer, ForeignKey("vendor_credit_notes.id"), nullable=False, index=True)
    
    line_number = Column(Integer, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    description = Column(Text, nullable=False)
    
    quantity = Column(Numeric(15, 3), nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False)
    
    tax_rate = Column(Numeric(5, 2), default=15)
    tax_amount = Column(Numeric(15, 2), nullable=False)
    
    line_total = Column(Numeric(15, 2), nullable=False)
    
    expense_account_code = Column(String(20))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    credit_note = relationship("VendorCreditNote", back_populates="lines")
