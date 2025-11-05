"""
VAT/Tax Models
Includes: VAT Returns, VAT Adjustments, Tax Codes
"""
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class VATReturnStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class VATReturnPeriod(str, enum.Enum):
    MONTHLY = "MONTHLY"
    BIMONTHLY = "BIMONTHLY"


class TaxType(str, enum.Enum):
    VAT = "VAT"
    WHT = "WHT"  # Withholding Tax
    EXCISE = "EXCISE"
    CUSTOMS = "CUSTOMS"


class VATReturn(Base):
    __tablename__ = "vat_returns"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    return_number = Column(String(50), nullable=False, unique=True, index=True)
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False, index=True)
    period_type = Column(SQLEnum(VATReturnPeriod), default=VATReturnPeriod.BIMONTHLY)
    
    output_tax = Column(Numeric(15, 2), nullable=False, default=0)
    
    input_tax = Column(Numeric(15, 2), nullable=False, default=0)
    
    net_vat = Column(Numeric(15, 2), nullable=False, default=0)
    
    bad_debts = Column(Numeric(15, 2), nullable=False, default=0)
    
    adjustments = Column(Numeric(15, 2), nullable=False, default=0)
    
    total_vat_payable = Column(Numeric(15, 2), nullable=False, default=0)
    
    zero_rated_supplies = Column(Numeric(15, 2), nullable=False, default=0)
    
    exempt_supplies = Column(Numeric(15, 2), nullable=False, default=0)
    
    total_supplies = Column(Numeric(15, 2), nullable=False, default=0)
    
    total_purchases = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Status
    status = Column(SQLEnum(VATReturnStatus), default=VATReturnStatus.DRAFT, index=True)
    
    submitted_date = Column(DateTime)
    submitted_by_id = Column(Integer)
    submission_reference = Column(String(100))
    
    sars_reference = Column(String(100))
    sars_response = Column(Text)
    
    payment_date = Column(Date)
    payment_reference = Column(String(100))
    
    notes = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
    
    # Relationships
    adjustments_list = relationship("VATAdjustment", back_populates="vat_return")


class VATAdjustment(Base):
    __tablename__ = "vat_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    vat_return_id = Column(Integer, nullable=True, index=True)
    
    adjustment_date = Column(Date, nullable=False, index=True)
    adjustment_type = Column(String(50), nullable=False)  # CORRECTION, BAD_DEBT, CREDIT_NOTE, etc.
    description = Column(Text, nullable=False)
    
    adjustment_amount = Column(Numeric(15, 2), nullable=False)
    
    reference = Column(String(200))
    original_transaction_id = Column(Integer)
    
    gl_entry_id = Column(Integer)
    
    # Status
    is_posted = Column(Boolean, default=False)
    
    notes = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)


class TaxCode(Base):
    __tablename__ = "tax_codes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    code = Column(String(20), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    tax_type = Column(SQLEnum(TaxType), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False)
    
    # GL accounts
    tax_collected_account = Column(String(20))  # For output tax (sales)
    tax_paid_account = Column(String(20))  # For input tax (purchases)
    
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    is_zero_rated = Column(Boolean, default=False)
    is_exempt = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)


class VATTransaction(Base):
    __tablename__ = "vat_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    transaction_date = Column(Date, nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)  # SALE, PURCHASE
    
    document_type = Column(String(50))  # INVOICE, BILL, CREDIT_NOTE
    document_id = Column(Integer)
    document_number = Column(String(100))
    
    net_amount = Column(Numeric(15, 2), nullable=False)
    vat_amount = Column(Numeric(15, 2), nullable=False)
    gross_amount = Column(Numeric(15, 2), nullable=False)
    
    tax_code_id = Column(Integer, index=True)
    tax_rate = Column(Numeric(5, 2), nullable=False)
    
    vat_return_id = Column(Integer, index=True)
    is_included_in_return = Column(Boolean, default=False)
    
    gl_entry_id = Column(Integer)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
