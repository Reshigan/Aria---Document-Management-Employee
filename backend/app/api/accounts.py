"""
ARIA ERP - Chart of Accounts API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.financial import ChartOfAccounts
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new chart of accounts entry"""
    db_account = ChartOfAccounts(
        **account.model_dump(),
        company_id=current_user.company_id
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.get("/", response_model=List[AccountResponse])
def list_accounts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all chart of accounts entries"""
    accounts = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.company_id == current_user.company_id
    ).offset(skip).limit(limit).all()
    return accounts


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific account by ID"""
    account = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.id == account_id,
        ChartOfAccounts.company_id == current_user.company_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: UUID,
    account_update: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update account"""
    account = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.id == account_id,
        ChartOfAccounts.company_id == current_user.company_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    for key, value in account_update.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete account"""
    account = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.id == account_id,
        ChartOfAccounts.company_id == current_user.company_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db.delete(account)
    db.commit()
    return None
