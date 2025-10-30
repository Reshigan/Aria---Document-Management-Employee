from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class TaxType(str, enum.Enum):
    VAT = "VAT"
    SALES_TAX = "SALES_TAX"
    GST = "GST"
    WITHHOLDING = "WITHHOLDING"
    EXCISE = "EXCISE"
    CUSTOMS = "CUSTOMS"
    PAYROLL_TAX = "PAYROLL_TAX"


class TaxCode(Base):
    __tablename__ = "tax_codes"

    id = Column(Integer, primary_key=True, index=True)
    tax_code = Column(String(20), unique=True, nullable=False, index=True)
    tax_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Tax details
    tax_type = Column(SQLEnum(TaxType), nullable=False, index=True)
    tax_rate = Column(Numeric(5, 2), nullable=False)  # Percentage
    
    # GL accounts
    tax_collected_account = Column(String(20))  # For output tax
    tax_paid_account = Column(String(20))  # For input tax
    
    # Applicability
    is_active = Column(Boolean, default=True, index=True)
    is_default = Column(Boolean, default=False)
    applies_to_sales = Column(Boolean, default=True)
    applies_to_purchases = Column(Boolean, default=True)
    
    # Validity
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    
    # Metadata
    country_code = Column(String(3), default="ZAR")
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    
    # Relationships
    transactions = relationship("TaxTransaction", back_populates="tax_code")


class TaxTransaction(Base):
    __tablename__ = "tax_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tax_code_id = Column(Integer, ForeignKey('tax_codes.id'), nullable=False, index=True)
    
    # Transaction reference
    transaction_date = Column(Date, nullable=False, index=True)
    document_type = Column(String(50), nullable=False)  # INVOICE, BILL, PAYMENT
    document_number = Column(String(50), nullable=False, index=True)
    reference_id = Column(Integer)  # ID of invoice/bill
    
    # Amounts
    taxable_amount = Column(Numeric(15, 2), nullable=False)
    tax_amount = Column(Numeric(15, 2), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    
    # Tax details
    tax_rate = Column(Numeric(5, 2), nullable=False)
    is_input_tax = Column(Boolean, default=False)  # Input (purchase) vs Output (sales)
    is_recoverable = Column(Boolean, default=True)
    
    # GL posting
    gl_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    
    # Tax period
    tax_period = Column(String(7), index=True)  # YYYY-MM format
    is_filed = Column(Boolean, default=False, index=True)
    filed_date = Column(Date)
    
    # Customer/Vendor
    party_name = Column(String(200))
    party_tax_number = Column(String(50))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    created_by = Column(Integer)
    
    # Relationships
    tax_code = relationship("TaxCode", back_populates="transactions")
    gl_entry = relationship("JournalEntry")


class TaxReturn(Base):
    __tablename__ = "tax_returns"

    id = Column(Integer, primary_key=True, index=True)
    
    # Return details
    return_number = Column(String(50), unique=True, nullable=False, index=True)
    tax_period = Column(String(7), nullable=False, index=True)  # YYYY-MM
    tax_type = Column(SQLEnum(TaxType), nullable=False, index=True)
    
    # Dates
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    filed_date = Column(Date)
    
    # Amounts
    total_sales = Column(Numeric(15, 2), default=0)
    total_purchases = Column(Numeric(15, 2), default=0)
    output_tax = Column(Numeric(15, 2), default=0)
    input_tax = Column(Numeric(15, 2), default=0)
    net_tax_payable = Column(Numeric(15, 2), default=0)
    
    # Status
    status = Column(String(20), default="DRAFT", index=True)  # DRAFT, FILED, PAID
    is_filed = Column(Boolean, default=False)
    is_paid = Column(Boolean, default=False)
    
    # Payment
    payment_date = Column(Date)
    payment_reference = Column(String(100))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    filed_by = Column(Integer)
