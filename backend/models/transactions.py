"""
Transaction Models - AR/AP, Invoices, Bills, Payments
South African ERP with VAT compliance
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from .base import Base


class InvoiceStatus(str, Enum):
    """Invoice Status"""
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    VOID = "void"
    CREDIT_NOTE = "credit_note"


class PaymentStatus(str, Enum):
    """Payment Status"""
    PENDING = "pending"
    PROCESSING = "processing"
    CLEARED = "cleared"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RECONCILED = "reconciled"


class PaymentMethod(str, Enum):
    """Payment Methods"""
    EFT = "eft"
    CASH = "cash"
    CHEQUE = "cheque"
    CARD = "card"
    DEBIT_ORDER = "debit_order"
    DIRECT_DEPOSIT = "direct_deposit"


class VATType(str, Enum):
    """SA VAT Types"""
    STANDARD = "standard"  # 15%
    ZERO_RATED = "zero_rated"  # 0%
    EXEMPT = "exempt"
    OUT_OF_SCOPE = "out_of_scope"


class Customer(Base):
    """
    Customer Master Data
    """
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Customer identification
    customer_code = Column(String(50), nullable=False, unique=True, index=True)
    customer_name = Column(String(200), nullable=False, index=True)
    
    # Contact details
    contact_person = Column(String(200))
    email = Column(String(200))
    phone = Column(String(50))
    mobile = Column(String(50))
    
    # Address
    billing_address_line1 = Column(String(200))
    billing_address_line2 = Column(String(200))
    billing_city = Column(String(100))
    billing_province = Column(String(100))
    billing_postal_code = Column(String(20))
    billing_country = Column(String(100), default="South Africa")
    
    shipping_address_line1 = Column(String(200))
    shipping_address_line2 = Column(String(200))
    shipping_city = Column(String(100))
    shipping_province = Column(String(100))
    shipping_postal_code = Column(String(20))
    shipping_country = Column(String(100), default="South Africa")
    
    # Tax details
    vat_number = Column(String(50))
    tax_number = Column(String(50))
    is_vat_registered = Column(Boolean, default=True)
    
    # Credit terms
    payment_terms_days = Column(Integer, default=30)  # Net 30
    credit_limit = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    
    # Accounting
    ar_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # BBBEE
    bbbee_level = Column(Integer)  # 1-8
    bbbee_score = Column(Float)
    bbbee_certificate_number = Column(String(100))
    bbbee_expiry_date = Column(DateTime)
    is_black_owned = Column(Boolean, default=False)
    black_ownership_percentage = Column(Float, default=0.0)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_on_hold = Column(Boolean, default=False)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    invoices = relationship("Invoice", back_populates="customer")
    payments = relationship("Payment", back_populates="customer", foreign_keys="Payment.customer_id")
    
    def __repr__(self):
        return f"<Customer {self.customer_code} - {self.customer_name}>"


class Supplier(Base):
    """
    Supplier Master Data
    """
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Supplier identification
    supplier_code = Column(String(50), nullable=False, unique=True, index=True)
    supplier_name = Column(String(200), nullable=False, index=True)
    
    # Contact details
    contact_person = Column(String(200))
    email = Column(String(200))
    phone = Column(String(50))
    
    # Address
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    city = Column(String(100))
    province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Africa")
    
    # Banking details
    bank_name = Column(String(100))
    account_number = Column(String(50))
    branch_code = Column(String(20))
    account_type = Column(String(50))
    
    # Tax details
    vat_number = Column(String(50))
    tax_number = Column(String(50))
    is_vat_registered = Column(Boolean, default=True)
    
    # Payment terms
    payment_terms_days = Column(Integer, default=30)
    current_balance = Column(Float, default=0.0)
    
    # Accounting
    ap_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # BBBEE
    bbbee_level = Column(Integer)
    bbbee_score = Column(Float)
    bbbee_certificate_number = Column(String(100))
    bbbee_expiry_date = Column(DateTime)
    is_black_owned = Column(Boolean, default=False)
    black_ownership_percentage = Column(Float, default=0.0)
    procurement_points = Column(Float, default=0.0)  # For BBBEE procurement calculation
    
    # Status
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bills = relationship("Bill", back_populates="supplier")
    payments = relationship("Payment", back_populates="supplier", foreign_keys="Payment.supplier_id")
    
    def __repr__(self):
        return f"<Supplier {self.supplier_code} - {self.supplier_name}>"


class Invoice(Base):
    """
    Customer Invoices (AR)
    """
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Invoice identification
    invoice_number = Column(String(50), nullable=False, unique=True, index=True)
    invoice_type = Column(String(20), default="invoice")  # invoice, credit_note
    
    # Customer
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    
    # Dates
    invoice_date = Column(DateTime, nullable=False, index=True)
    due_date = Column(DateTime, nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True)  # "2025-10"
    
    # Reference
    reference = Column(String(100))
    purchase_order = Column(String(100))
    
    # Amounts
    subtotal = Column(Float, default=0.0)
    vat_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Payment tracking
    amount_paid = Column(Float, default=0.0)
    amount_outstanding = Column(Float, default=0.0)
    
    # Status
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True)
    
    # GL
    gl_journal_id = Column(Integer, ForeignKey("general_ledger.id"))
    
    # Notes
    notes = Column(Text)
    terms_conditions = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("PaymentAllocation", back_populates="invoice")
    
    def __repr__(self):
        return f"<Invoice {self.invoice_number} - R{self.total_amount:.2f}>"


class InvoiceLine(Base):
    """
    Invoice Line Items
    """
    __tablename__ = "invoice_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Invoice reference
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    line_number = Column(Integer, default=1)
    
    # Item details
    description = Column(String(500), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Quantities
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    
    # Amounts
    line_total = Column(Float, nullable=False)
    discount_percentage = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    
    # VAT
    vat_type = Column(SQLEnum(VATType), default=VATType.STANDARD)
    vat_rate = Column(Float, default=15.0)
    vat_amount = Column(Float, default=0.0)
    
    # Accounting
    revenue_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="lines")
    
    def __repr__(self):
        return f"<InvoiceLine {self.line_number} - {self.description} - R{self.line_total:.2f}>"


class Bill(Base):
    """
    Supplier Bills (AP)
    """
    __tablename__ = "bills"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Bill identification
    bill_number = Column(String(50), nullable=False, unique=True, index=True)
    supplier_invoice_number = Column(String(100))  # Supplier's invoice number
    
    # Supplier
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    
    # Dates
    bill_date = Column(DateTime, nullable=False, index=True)
    due_date = Column(DateTime, nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True)
    
    # Reference
    reference = Column(String(100))
    purchase_order = Column(String(100))
    
    # Amounts
    subtotal = Column(Float, default=0.0)
    vat_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Payment tracking
    amount_paid = Column(Float, default=0.0)
    amount_outstanding = Column(Float, default=0.0)
    
    # Status
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True)
    
    # GL
    gl_journal_id = Column(Integer, ForeignKey("general_ledger.id"))
    
    # Document
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # Scanned invoice
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    supplier = relationship("Supplier", back_populates="bills")
    lines = relationship("BillLine", back_populates="bill", cascade="all, delete-orphan")
    payments = relationship("PaymentAllocation", back_populates="bill")
    
    def __repr__(self):
        return f"<Bill {self.bill_number} - {self.supplier_id} - R{self.total_amount:.2f}>"


class BillLine(Base):
    """
    Bill Line Items
    """
    __tablename__ = "bill_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Bill reference
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=False)
    line_number = Column(Integer, default=1)
    
    # Item details
    description = Column(String(500), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Quantities
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    
    # Amounts
    line_total = Column(Float, nullable=False)
    
    # VAT
    vat_type = Column(SQLEnum(VATType), default=VATType.STANDARD)
    vat_rate = Column(Float, default=15.0)
    vat_amount = Column(Float, default=0.0)
    
    # Accounting
    expense_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bill = relationship("Bill", back_populates="lines")
    
    def __repr__(self):
        return f"<BillLine {self.line_number} - {self.description} - R{self.line_total:.2f}>"


class Payment(Base):
    """
    Payments and Receipts
    """
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Payment identification
    payment_number = Column(String(50), nullable=False, unique=True, index=True)
    payment_type = Column(String(20), nullable=False)  # receipt (AR) or payment (AP)
    
    # Party
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    
    # Dates
    payment_date = Column(DateTime, nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True)
    
    # Amount
    payment_amount = Column(Float, nullable=False)
    unallocated_amount = Column(Float, default=0.0)
    
    # Payment details
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    reference = Column(String(200))  # Bank reference, cheque number, etc.
    
    # Banking
    bank_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    
    # GL
    gl_journal_id = Column(Integer, ForeignKey("general_ledger.id"))
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    customer = relationship("Customer", back_populates="payments", foreign_keys=[customer_id])
    supplier = relationship("Supplier", back_populates="payments", foreign_keys=[supplier_id])
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Payment {self.payment_number} - R{self.payment_amount:.2f}>"


class PaymentAllocation(Base):
    """
    Payment Allocation to Invoices/Bills
    """
    __tablename__ = "payment_allocations"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Payment
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    
    # Invoice or Bill
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=True)
    
    # Amount
    allocated_amount = Column(Float, nullable=False)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    payment = relationship("Payment", back_populates="allocations")
    invoice = relationship("Invoice", back_populates="payments")
    bill = relationship("Bill", back_populates="payments")
    
    def __repr__(self):
        return f"<PaymentAllocation R{self.allocated_amount:.2f}>"
