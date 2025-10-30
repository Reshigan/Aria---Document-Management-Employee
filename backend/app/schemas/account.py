"""
ARIA ERP - Chart of Accounts Schemas
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from uuid import UUID


class AccountBase(BaseModel):
    """Account base schema"""
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=255)
    account_type: str = Field(..., pattern="^(asset|liability|equity|revenue|expense)$")
    account_category: Optional[str] = None
    parent_account_id: Optional[UUID] = None
    currency: str = "ZAR"
    is_reconcilable: bool = False
    opening_balance: Decimal = 0


class AccountCreate(AccountBase):
    """Account creation request"""
    pass


class AccountUpdate(BaseModel):
    """Account update request"""
    name: Optional[str] = None
    account_category: Optional[str] = None
    is_reconcilable: Optional[bool] = None
    is_active: Optional[bool] = None


class AccountResponse(AccountBase):
    """Account response"""
    id: UUID
    company_id: UUID
    current_balance: Decimal
    is_system_account: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
