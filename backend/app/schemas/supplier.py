"""
ARIA ERP - Supplier Schemas
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class SupplierBase(BaseModel):
    """Supplier base schema"""
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    supplier_type: str = "business"
    industry: Optional[str] = None
    tax_number: Optional[str] = None
    vat_number: Optional[str] = None
    
    # BBBEE (South Africa)
    bbbee_level: Optional[int] = Field(None, ge=1, le=8)
    bbbee_certificate_expiry: Optional[date] = None
    is_black_owned: bool = False
    black_ownership_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    
    # Financial
    payment_terms: int = Field(default=30, ge=0)
    currency: str = "ZAR"
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_branch_code: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "South Africa"
    
    # Contact
    contact_person_name: Optional[str] = None
    contact_person_email: Optional[EmailStr] = None
    contact_person_phone: Optional[str] = None
    
    # Rating
    rating: Optional[int] = Field(None, ge=1, le=5)


class SupplierCreate(SupplierBase):
    """Supplier creation request"""
    pass


class SupplierUpdate(BaseModel):
    """Supplier update request"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    payment_terms: Optional[int] = None
    is_active: Optional[bool] = None
    rating: Optional[int] = None


class SupplierResponse(SupplierBase):
    """Supplier response"""
    id: UUID
    supplier_number: str
    company_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
