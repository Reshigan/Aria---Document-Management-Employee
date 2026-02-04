"""
ARIA ERP - Company Schemas
"""
from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class CompanyBase(BaseModel):
    """Company base schema"""
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None
    registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    vat_number: Optional[str] = None
    industry: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "South Africa"
    country_code: str = "ZA"  # ISO 3166-1 alpha-2 - used to apply country-specific rules
    
    # Settings (auto-populated from country selection)
    base_currency: str = "ZAR"
    currency_symbol: str = "R"
    fiscal_year_start: Optional[date] = None
    date_format: str = "DD/MM/YYYY"
    number_format: str = "1 234,56"
    time_zone: str = "Africa/Johannesburg"
    language_code: str = "en"
    
    # Tax settings (auto-populated from country selection)
    tax_system: str = "VAT"
    default_tax_code: str = "VAT_STD"
    tax_registration_number: Optional[str] = None


class CompanyCreate(CompanyBase):
    """Company creation request"""
    pass


class CompanyUpdate(BaseModel):
    """Company update request"""
    name: Optional[str] = None
    legal_name: Optional[str] = None
    registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    vat_number: Optional[str] = None
    industry: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    base_currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    date_format: Optional[str] = None
    number_format: Optional[str] = None
    time_zone: Optional[str] = None
    language_code: Optional[str] = None
    tax_system: Optional[str] = None
    default_tax_code: Optional[str] = None
    tax_registration_number: Optional[str] = None


class CompanyResponse(CompanyBase):
    """Company response"""
    id: UUID
    subscription_plan: str
    subscription_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
