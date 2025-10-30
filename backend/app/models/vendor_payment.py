from sqlalchemy import Column, Integer, String, Date, Numeric, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class PaymentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    CHECK = "CHECK"
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    ACH = "ACH"
    WIRE = "WIRE"


class VendorPayment(Base):
    __tablename__ = "vendor_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey('vendors.id'), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey('vendor_invoices.id'), index=True)
    
    # Payment details
    payment_date = Column(Date, nullable=False, index=True)
    scheduled_date = Column(Date, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    currency_code = Column(String(3), default="ZAR")
    
    # Payment method
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    reference_number = Column(String(50))  # Check number, transaction ID, etc.
    
    # Bank details
    bank_account_id = Column(Integer)  # Company bank account used
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.SCHEDULED, index=True)
    
    # GL posting
    gl_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    
    # Metadata
    description = Column(Text)
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    processed_by = Column(Integer)
    
    # Relationships
    vendor = relationship("Vendor", back_populates="payments")
    invoice = relationship("VendorInvoice", back_populates="payments")
    gl_entry = relationship("JournalEntry")
