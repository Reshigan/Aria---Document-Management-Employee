"""
ARIA ERP - Company Model
"""
from sqlalchemy import Column, String, Boolean, Date, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Company(BaseModel):
    """Company/Organization model (Multi-tenant)"""
    
    __tablename__ = "companies"
    
    # Basic info
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    registration_number = Column(String(100))
    tax_number = Column(String(100))
    vat_number = Column(String(100))
    industry = Column(String(100))
    company_size = Column(String(50))
    logo_url = Column(Text)
    website = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Africa")
    country_code = Column(String(2), default="ZA", index=True)  # ISO 3166-1 alpha-2
    
    # Settings
    base_currency = Column(String(3), default="ZAR")
    currency_symbol = Column(String(10), default="R")
    fiscal_year_start = Column(Date)
    date_format = Column(String(20), default="DD/MM/YYYY")
    number_format = Column(String(20), default="1 234,56")
    time_zone = Column(String(50), default="Africa/Johannesburg")
    language_code = Column(String(5), default="en")
    
    # Tax settings (populated from country selection)
    tax_system = Column(String(20), default="VAT")
    default_tax_code = Column(String(20), default="VAT_STD")
    tax_registration_number = Column(String(100))  # VAT/GST/Sales Tax number
    
    # Subscription
    subscription_plan = Column(String(50), default="starter")
    subscription_status = Column(String(50), default="trial")
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    users = relationship("User", back_populates="company")
    
    def __repr__(self):
        return f"<Company {self.name}>"
