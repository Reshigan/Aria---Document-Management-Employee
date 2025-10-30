"""
ARIA ERP - Customer Schemas
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class CustomerBase(BaseModel):
    """Customer base schema"""
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    customer_type: str = "business"
    industry: Optional[str] = None
    tax_number: Optional[str] = None
    vat_number: Optional[str] = None
    
    # Financial
    credit_limit: Decimal = Field(default=0, ge=0)
    payment_terms: int = Field(default=30, ge=0)
    currency: str = "ZAR"
    
    # Address
    billing_address_line1: Optional[str] = None
    billing_address_line2: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: str = "South Africa"
    
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    shipping_country: str = "South Africa"
    
    # Contact
    contact_person_name: Optional[str] = None
    contact_person_email: Optional[EmailStr] = None
    contact_person_phone: Optional[str] = None


class CustomerCreate(CustomerBase):
    """Customer creation request"""
    pass


class CustomerUpdate(BaseModel):
    """Customer update request"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[int] = None
    is_active: Optional[bool] = None


class CustomerResponse(CustomerBase):
    """Customer response"""
    id: UUID
    customer_number: str
    company_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
