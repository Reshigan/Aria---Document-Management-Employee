"""
ARIA ERP - Invoice Schemas
"""
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from uuid import UUID


class InvoiceLineItemCreate(BaseModel):
    """Invoice line item creation"""
    description: str = Field(..., min_length=1)
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(default=0, ge=0, le=100)
    discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    product_id: Optional[UUID] = None
    revenue_account_id: Optional[UUID] = None


class InvoiceLineItemResponse(InvoiceLineItemCreate):
    """Invoice line item response"""
    id: UUID
    invoice_id: UUID
    line_number: int
    line_total: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    """Invoice base schema"""
    customer_id: UUID
    invoice_date: date
    due_date: date
    customer_po_number: Optional[str] = None
    currency: str = "ZAR"
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    """Invoice creation request"""
    line_items: List[InvoiceLineItemCreate] = Field(..., min_items=1)


class InvoiceUpdate(BaseModel):
    """Invoice update request"""
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    """Invoice response"""
    id: UUID
    company_id: UUID
    invoice_number: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    status: str
    bot_processed: bool
    bot_confidence_score: Optional[Decimal] = None
    line_items: List[InvoiceLineItemResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
