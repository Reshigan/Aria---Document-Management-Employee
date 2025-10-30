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
    
    # Settings
    base_currency: str = "ZAR"
    fiscal_year_start: Optional[date] = None
    time_zone: str = "Africa/Johannesburg"


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
