from sqlalchemy import Column, Integer, String, Date, Numeric, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class CustomerInvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"
    WRITTEN_OFF = "WRITTEN_OFF"


class CustomerInvoice(Base):
    __tablename__ = "customer_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False, index=True)
    
    # Dates
    invoice_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    sent_date = Column(Date)
    
    # Reference
    so_number = Column(String(50), index=True)  # Sales order reference
    po_number = Column(String(50))  # Customer's PO number
    
    # Amounts
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), nullable=False)
    amount_paid = Column(Numeric(15, 2), default=0)
    amount_due = Column(Numeric(15, 2))
    
    # Currency
    currency_code = Column(String(3), default="ZAR")
    exchange_rate = Column(Numeric(12, 6), default=1.0)
    
    # Status
    status = Column(SQLEnum(CustomerInvoiceStatus), default=CustomerInvoiceStatus.DRAFT, index=True)
    
    # GL posting
    gl_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    
    # Metadata
    description = Column(Text)
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    updated_by = Column(Integer)
    
    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    lines = relationship("CustomerInvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("CustomerPayment", back_populates="invoice")
    gl_entry = relationship("JournalEntry")


class CustomerInvoiceLine(Base):
    __tablename__ = "customer_invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey('customer_invoices.id'), nullable=False)
    line_number = Column(Integer, nullable=False)
    
    # Item details
    product_code = Column(String(50))
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), default=1)
    unit_price = Column(Numeric(15, 2), nullable=False)
    line_total = Column(Numeric(15, 2), nullable=False)
    
    # GL account for posting
    revenue_account_number = Column(String(20), nullable=False)
    cost_center = Column(String(20))
    project_code = Column(String(20))
    department = Column(String(50))
    
    # Tax
    tax_code = Column(String(20))
    tax_rate = Column(Numeric(5, 2), default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    
    # Metadata
    created_at = Column(Date, default=datetime.utcnow)
    
    # Relationships
    invoice = relationship("CustomerInvoice", back_populates="lines")
