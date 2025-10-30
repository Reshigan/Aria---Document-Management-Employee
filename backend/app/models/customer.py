from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class CustomerStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class CreditTerms(str, enum.Enum):
    NET_30 = "NET_30"
    NET_60 = "NET_60"
    NET_90 = "NET_90"
    COD = "COD"  # Cash on Delivery
    CIA = "CIA"  # Cash in Advance
    CUSTOM = "CUSTOM"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    legal_name = Column(String(200))
    tax_id = Column(String(50))
    
    # Contact information
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(50))
    fax = Column(String(50))
    website = Column(String(200))
    
    # Billing address
    billing_address_line1 = Column(String(200))
    billing_address_line2 = Column(String(200))
    billing_city = Column(String(100))
    billing_state = Column(String(100))
    billing_postal_code = Column(String(20))
    billing_country = Column(String(100), default="South Africa")
    
    # Shipping address
    shipping_address_line1 = Column(String(200))
    shipping_address_line2 = Column(String(200))
    shipping_city = Column(String(100))
    shipping_state = Column(String(100))
    shipping_postal_code = Column(String(20))
    shipping_country = Column(String(100), default="South Africa")
    
    # Financial details
    credit_terms = Column(SQLEnum(CreditTerms), default=CreditTerms.NET_30)
    credit_limit = Column(Numeric(15, 2), default=0)
    current_balance = Column(Numeric(15, 2), default=0)
    currency_code = Column(String(3), default="ZAR")
    
    # Banking details (for refunds)
    bank_name = Column(String(100))
    bank_account_number = Column(String(50))
    bank_branch_code = Column(String(20))
    
    # AR account
    ar_account_number = Column(String(20))  # Default AR account for this customer
    revenue_account_number = Column(String(20))  # Default revenue account
    
    # Status and metadata
    status = Column(SQLEnum(CustomerStatus), default=CustomerStatus.ACTIVE)
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    updated_by = Column(Integer)
    
    # Relationships
    invoices = relationship("CustomerInvoice", back_populates="customer")
    payments = relationship("CustomerPayment", back_populates="customer")
