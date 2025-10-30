from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class VendorStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class PaymentTerms(str, enum.Enum):
    NET_30 = "NET_30"
    NET_60 = "NET_60"
    NET_90 = "NET_90"
    DUE_ON_RECEIPT = "DUE_ON_RECEIPT"
    CUSTOM = "CUSTOM"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vendor_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    legal_name = Column(String(200))
    tax_id = Column(String(50))
    
    # Contact information
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(50))
    fax = Column(String(50))
    website = Column(String(200))
    
    # Address
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Africa")
    
    # Financial details
    payment_terms = Column(SQLEnum(PaymentTerms), default=PaymentTerms.NET_30)
    credit_limit = Column(Numeric(15, 2), default=0)
    current_balance = Column(Numeric(15, 2), default=0)
    currency_code = Column(String(3), default="ZAR")
    
    # Banking details
    bank_name = Column(String(100))
    bank_account_number = Column(String(50))
    bank_branch_code = Column(String(20))
    swift_code = Column(String(20))
    
    # AP account
    ap_account_number = Column(String(20))  # Default AP account for this vendor
    
    # Status and metadata
    status = Column(SQLEnum(VendorStatus), default=VendorStatus.ACTIVE)
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    updated_by = Column(Integer)
    
    # Relationships
    invoices = relationship("VendorInvoice", back_populates="vendor")
    payments = relationship("VendorPayment", back_populates="vendor")
