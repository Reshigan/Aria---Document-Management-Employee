from sqlalchemy import Column, Integer, String, Date, Numeric, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class CustomerPaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CLEARED = "CLEARED"
    BOUNCED = "BOUNCED"
    CANCELLED = "CANCELLED"


class CustomerPaymentMethod(str, enum.Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    CHECK = "CHECK"
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    EFT = "EFT"
    MOBILE_PAYMENT = "MOBILE_PAYMENT"


class CustomerPayment(Base):
    __tablename__ = "customer_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey('customer_invoices.id'), index=True)
    
    # Payment details
    payment_date = Column(Date, nullable=False, index=True)
    received_date = Column(Date, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    currency_code = Column(String(3), default="ZAR")
    
    # Payment method
    payment_method = Column(SQLEnum(CustomerPaymentMethod), nullable=False)
    reference_number = Column(String(50))  # Check number, transaction ID, etc.
    
    # Bank details
    bank_account_id = Column(Integer)  # Company bank account received into
    
    # Status
    status = Column(SQLEnum(CustomerPaymentStatus), default=CustomerPaymentStatus.PENDING, index=True)
    
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
    customer = relationship("Customer", back_populates="payments")
    invoice = relationship("CustomerInvoice", back_populates="payments")
    gl_entry = relationship("JournalEntry")
