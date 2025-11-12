"""
ARIA ERP - General Ledger API
Provides Chart of Accounts, Journal Entries, and Financial Reports
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field

from core.database import get_db
from core.auth import get_current_user
from models.accounting import (
    ChartOfAccounts, GeneralLedger, GeneralLedgerLine,
    AccountType, AccountSubType, JournalStatus, JournalEntryType
)
from models.user import User

router = APIRouter(prefix="/api/erp/gl", tags=["General Ledger"])


# Pydantic Models
class AccountCreate(BaseModel):
    account_code: str = Field(..., description="Account code (e.g., 1000, 4100)")
    account_name: str = Field(..., description="Account name")
    description: Optional[str] = None
    account_type: AccountType
    account_subtype: AccountSubType
    parent_account_id: Optional[int] = None
    is_control_account: bool = False
    accepts_posting: bool = True
    is_tax_account: bool = False
    vat_rate: float = 0.0


class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    vat_rate: Optional[float] = None


class AccountResponse(BaseModel):
    id: int
    account_code: str
    account_name: str
    description: Optional[str]
    account_type: str
    account_subtype: str
    parent_account_id: Optional[int]
    is_control_account: bool
    is_system_account: bool
    accepts_posting: bool
    is_tax_account: bool
    vat_rate: float
    debit_balance: float
    credit_balance: float
    current_balance: float
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class JournalLineCreate(BaseModel):
    account_id: int
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None
    department: Optional[str] = None
    project: Optional[str] = None
    cost_center: Optional[str] = None


class JournalEntryCreate(BaseModel):
    entry_type: JournalEntryType
    entry_date: date
    description: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    lines: List[JournalLineCreate]


class JournalEntryResponse(BaseModel):
    id: int
    journal_number: str
    entry_type: str
    entry_date: date
    posting_date: Optional[datetime]
    period: str
    financial_year: int
    description: str
    reference: Optional[str]
    status: str
    total_debit: float
    total_credit: float
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/accounts", response_model=List[AccountResponse])
async def list_accounts(
    company_id: str = Query(..., description="Company ID"),
    account_type: Optional[AccountType] = None,
    is_active: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all chart of accounts for a company"""
    query = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.tenant_id == company_id,
        ChartOfAccounts.is_active == is_active
    )
    
    if account_type:
        query = query.filter(ChartOfAccounts.account_type == account_type)
    
    accounts = query.order_by(ChartOfAccounts.account_code).all()
    return accounts


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific account by ID"""
    account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("/accounts", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    company_id: str = Query(..., description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chart of accounts entry"""
    existing = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.tenant_id == company_id,
        ChartOfAccounts.account_code == account.account_code
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Account code already exists")
    
    db_account = ChartOfAccounts(
        tenant_id=company_id,
        account_code=account.account_code,
        account_name=account.account_name,
        description=account.description,
        account_type=account.account_type,
        account_subtype=account.account_subtype,
        parent_account_id=account.parent_account_id,
        is_control_account=account.is_control_account,
        accepts_posting=account.accepts_posting,
        is_tax_account=account.is_tax_account,
        vat_rate=account.vat_rate,
        created_by=current_user.email if current_user else None
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    return db_account


@router.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    account: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing account"""
    db_account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if db_account.is_system_account:
        raise HTTPException(status_code=400, detail="Cannot modify system accounts")
    
    # Update fields
    if account.account_name is not None:
        db_account.account_name = account.account_name
    if account.description is not None:
        db_account.description = account.description
    if account.is_active is not None:
        db_account.is_active = account.is_active
    if account.vat_rate is not None:
        db_account.vat_rate = account.vat_rate
    
    db_account.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_account)
    
    return db_account


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an account (soft delete by setting is_active=False)"""
    db_account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if db_account.is_system_account:
        raise HTTPException(status_code=400, detail="Cannot delete system accounts")
    
    has_transactions = db.query(GeneralLedgerLine).filter(
        GeneralLedgerLine.account_id == account_id
    ).first()
    
    if has_transactions:
        db_account.is_active = False
        db_account.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Account deactivated (has transactions)"}
    else:
        db.delete(db_account)
        db.commit()
        return {"message": "Account deleted"}


@router.get("/journal-entries", response_model=List[JournalEntryResponse])
async def list_journal_entries(
    company_id: str = Query(..., description="Company ID"),
    status: Optional[JournalStatus] = None,
    entry_type: Optional[JournalEntryType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List journal entries for a company"""
    query = db.query(GeneralLedger).filter(GeneralLedger.tenant_id == company_id)
    
    if status:
        query = query.filter(GeneralLedger.status == status)
    if entry_type:
        query = query.filter(GeneralLedger.entry_type == entry_type)
    if start_date:
        query = query.filter(GeneralLedger.entry_date >= start_date)
    if end_date:
        query = query.filter(GeneralLedger.entry_date <= end_date)
    
    entries = query.order_by(GeneralLedger.entry_date.desc()).limit(limit).all()
    return entries


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific journal entry by ID"""
    entry = db.query(GeneralLedger).filter(GeneralLedger.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry


@router.post("/journal-entries", response_model=JournalEntryResponse)
async def create_journal_entry(
    entry: JournalEntryCreate,
    company_id: str = Query(..., description="Company ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new journal entry"""
    total_debit = sum(line.debit for line in entry.lines)
    total_credit = sum(line.credit for line in entry.lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Journal entry not balanced: DR={total_debit}, CR={total_credit}"
        )
    
    year = entry.entry_date.year
    period = entry.entry_date.strftime("%Y-%m")
    
    last_entry = db.query(GeneralLedger).filter(
        GeneralLedger.tenant_id == company_id,
        GeneralLedger.period == period
    ).order_by(GeneralLedger.id.desc()).first()
    
    seq = 1 if not last_entry else int(last_entry.journal_number.split("-")[-1]) + 1
    journal_number = f"JE-{year}-{seq:05d}"
    
    # Create journal entry
    db_entry = GeneralLedger(
        tenant_id=company_id,
        journal_number=journal_number,
        entry_type=entry.entry_type,
        entry_date=entry.entry_date,
        period=period,
        financial_year=year,
        description=entry.description,
        reference=entry.reference,
        notes=entry.notes,
        status=JournalStatus.DRAFT,
        total_debit=total_debit,
        total_credit=total_credit,
        created_by=current_user.email if current_user else None
    )
    
    db.add(db_entry)
    db.flush()  # Get the ID
    
    for idx, line in enumerate(entry.lines, 1):
        db_line = GeneralLedgerLine(
            tenant_id=company_id,
            journal_id=db_entry.id,
            line_number=idx,
            account_id=line.account_id,
            debit=line.debit,
            credit=line.credit,
            description=line.description or entry.description,
            department=line.department,
            project=line.project,
            cost_center=line.cost_center
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_entry)
    
    return db_entry


@router.post("/journal-entries/{entry_id}/post")
async def post_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Post a journal entry to the general ledger"""
    entry = db.query(GeneralLedger).filter(GeneralLedger.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry.status != JournalStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft entries can be posted")
    
    if not entry.is_balanced():
        raise HTTPException(status_code=400, detail="Journal entry is not balanced")
    
    entry.status = JournalStatus.POSTED
    entry.posting_date = datetime.utcnow()
    entry.posted_by = current_user.email if current_user else None
    
    lines = db.query(GeneralLedgerLine).filter(GeneralLedgerLine.journal_id == entry_id).all()
    for line in lines:
        account = db.query(ChartOfAccounts).filter(ChartOfAccounts.id == line.account_id).first()
        if account:
            account.debit_balance += line.debit
            account.credit_balance += line.credit
            
            if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
                account.current_balance = account.debit_balance - account.credit_balance
            else:
                account.current_balance = account.credit_balance - account.debit_balance
    
    db.commit()
    
    return {"message": "Journal entry posted successfully", "journal_number": entry.journal_number}


@router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a draft journal entry"""
    entry = db.query(GeneralLedger).filter(GeneralLedger.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if entry.status != JournalStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft entries can be deleted")
    
    db.query(GeneralLedgerLine).filter(GeneralLedgerLine.journal_id == entry_id).delete()
    
    db.delete(entry)
    db.commit()
    
    return {"message": "Journal entry deleted"}


@router.get("/reports/trial-balance")
async def get_trial_balance(
    company_id: str = Query(..., description="Company ID"),
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate trial balance report"""
    accounts = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.tenant_id == company_id,
        ChartOfAccounts.is_active == True
    ).order_by(ChartOfAccounts.account_code).all()
    
    trial_balance = []
    total_debits = 0.0
    total_credits = 0.0
    
    for account in accounts:
        if account.current_balance != 0:
            if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
                debit = abs(account.current_balance) if account.current_balance > 0 else 0
                credit = abs(account.current_balance) if account.current_balance < 0 else 0
            else:
                credit = abs(account.current_balance) if account.current_balance > 0 else 0
                debit = abs(account.current_balance) if account.current_balance < 0 else 0
            
            trial_balance.append({
                "account_code": account.account_code,
                "account_name": account.account_name,
                "account_type": account.account_type.value,
                "debit": debit,
                "credit": credit
            })
            
            total_debits += debit
            total_credits += credit
    
    return {
        "company_id": company_id,
        "as_of_date": str(as_of_date) if as_of_date else str(date.today()),
        "accounts": trial_balance,
        "total_debits": total_debits,
        "total_credits": total_credits,
        "balanced": abs(total_debits - total_credits) < 0.01,
        "difference": abs(total_debits - total_credits)
    }


@router.get("/reports/balance-sheet")
async def get_balance_sheet(
    company_id: str = Query(..., description="Company ID"),
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate balance sheet report"""
    accounts = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.tenant_id == company_id,
        ChartOfAccounts.is_active == True
    ).all()
    
    assets = []
    liabilities = []
    equity = []
    
    total_assets = 0.0
    total_liabilities = 0.0
    total_equity = 0.0
    
    for account in accounts:
        if account.current_balance != 0:
            balance = abs(account.current_balance)
            
            if account.account_type == AccountType.ASSET:
                assets.append({
                    "account_code": account.account_code,
                    "account_name": account.account_name,
                    "account_subtype": account.account_subtype.value,
                    "amount": balance
                })
                total_assets += balance
            elif account.account_type == AccountType.LIABILITY:
                liabilities.append({
                    "account_code": account.account_code,
                    "account_name": account.account_name,
                    "account_subtype": account.account_subtype.value,
                    "amount": balance
                })
                total_liabilities += balance
            elif account.account_type == AccountType.EQUITY:
                equity.append({
                    "account_code": account.account_code,
                    "account_name": account.account_name,
                    "account_subtype": account.account_subtype.value,
                    "amount": balance
                })
                total_equity += balance
    
    return {
        "company_id": company_id,
        "as_of_date": str(as_of_date) if as_of_date else str(date.today()),
        "assets": {
            "accounts": assets,
            "total": total_assets
        },
        "liabilities": {
            "accounts": liabilities,
            "total": total_liabilities
        },
        "equity": {
            "accounts": equity,
            "total": total_equity
        },
        "total_liabilities_equity": total_liabilities + total_equity,
        "balanced": abs(total_assets - (total_liabilities + total_equity)) < 0.01,
        "difference": total_assets - (total_liabilities + total_equity)
    }
