"""
ARIA ERP - Payment Schemas
"""
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from uuid import UUID


class PaymentAllocationCreate(BaseModel):
    """Payment allocation"""
    invoice_id: UUID
    allocated_amount: Decimal = Field(..., gt=0)


class PaymentBase(BaseModel):
    """Payment base schema"""
    payment_date: date
    amount: Decimal = Field(..., gt=0)
    payment_method: str = Field(..., min_length=1)
    reference: Optional[str] = None
    notes: Optional[str] = None
    currency: str = "ZAR"


class PaymentCreate(PaymentBase):
    """Payment creation request"""
    payment_type: str = Field(..., pattern="^(customer_payment|supplier_payment)$")
    customer_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    bank_account_id: Optional[UUID] = None
    allocations: List[PaymentAllocationCreate] = []


class PaymentUpdate(BaseModel):
    """Payment update request"""
    payment_date: Optional[date] = None
    amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PaymentResponse(PaymentBase):
    """Payment response"""
    id: UUID
    company_id: UUID
    payment_number: str
    payment_type: str
    customer_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    bank_account_id: Optional[UUID] = None
    status: str
    bot_processed: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
