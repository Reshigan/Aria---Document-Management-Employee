"""
Banking API
Provides endpoints for bank accounts, transactions, reconciliation, and rules
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
import csv
import io

from core.database import get_db
from core.auth import get_current_user
from models.user import User
from app.models.banking import (
    BankAccount, BankTransaction, BankReconciliation, BankRule,
    BankAccountType, TransactionType, ReconciliationStatus, RuleConditionType
)

router = APIRouter(prefix="/api/banking", tags=["Banking"])

# ===================== SCHEMAS =====================

class BankAccountCreate(BaseModel):
    account_name: str
    account_number: str
    account_type: str
    bank_name: Optional[str] = None
    branch_code: Optional[str] = None
    gl_account_code: str
    opening_balance: Decimal = Decimal("0")
    currency_code: str = "ZAR"

class BankAccountResponse(BaseModel):
    id: int
    tenant_id: int
    account_name: str
    account_number: str
    account_type: str
    bank_name: Optional[str]
    gl_account_code: str
    current_balance: Decimal
    reconciled_balance: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BankTransactionCreate(BaseModel):
    bank_account_id: int
    transaction_date: date
    transaction_type: str
    description: str
    payee: Optional[str] = None
    reference: Optional[str] = None
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")
    gl_account_code: Optional[str] = None

class BankTransactionResponse(BaseModel):
    id: int
    bank_account_id: int
    transaction_date: date
    transaction_type: str
    description: str
    payee: Optional[str]
    reference: Optional[str]
    debit_amount: Decimal
    credit_amount: Decimal
    balance: Decimal
    reconciliation_status: str
    is_posted: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BankRuleCreate(BaseModel):
    rule_name: str
    description: Optional[str] = None
    condition_type: str
    condition_field: str
    condition_value: str
    gl_account_code: str
    tax_code: Optional[str] = None
    auto_post: bool = False

class BankRuleResponse(BaseModel):
    id: int
    tenant_id: int
    rule_name: str
    condition_type: str
    condition_field: str
    condition_value: str
    gl_account_code: str
    is_active: bool
    times_applied: int
    created_at: datetime

    class Config:
        from_attributes = True

class ReconcileTransactionRequest(BaseModel):
    transaction_ids: List[int]
    reconciliation_date: date


@router.post("/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    account: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bank account"""
    db_account = BankAccount(
        tenant_id=current_user.tenant_id,
        account_name=account.account_name,
        account_number=account.account_number,
        account_type=account.account_type,
        bank_name=account.bank_name,
        branch_code=account.branch_code,
        gl_account_code=account.gl_account_code,
        opening_balance=account.opening_balance,
        current_balance=account.opening_balance,
        reconciled_balance=account.opening_balance,
        currency_code=account.currency_code,
        is_active=True,
        created_by_id=current_user.id
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    return db_account

@router.get("/accounts", response_model=List[BankAccountResponse])
def list_bank_accounts(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bank accounts"""
    query = db.query(BankAccount).filter(BankAccount.tenant_id == current_user.tenant_id)
    
    if is_active is not None:
        query = query.filter(BankAccount.is_active == is_active)
    
    accounts = query.order_by(BankAccount.account_name).all()
    return accounts

@router.get("/accounts/{account_id}", response_model=BankAccountResponse)
def get_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific bank account"""
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    return account


@router.post("/transactions", response_model=BankTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_bank_transaction(
    transaction: BankTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bank transaction (Spend Money / Receive Money)"""
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == transaction.bank_account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    balance_change = transaction.credit_amount - transaction.debit_amount
    new_balance = account.current_balance + balance_change
    
    db_transaction = BankTransaction(
        tenant_id=current_user.tenant_id,
        bank_account_id=transaction.bank_account_id,
        transaction_date=transaction.transaction_date,
        transaction_type=transaction.transaction_type,
        description=transaction.description,
        payee=transaction.payee,
        reference=transaction.reference,
        debit_amount=transaction.debit_amount,
        credit_amount=transaction.credit_amount,
        balance=new_balance,
        gl_account_code=transaction.gl_account_code,
        reconciliation_status=ReconciliationStatus.UNRECONCILED,
        is_posted=False,
        created_by_id=current_user.id
    )
    
    db.add(db_transaction)
    account.current_balance = new_balance
    account.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction

@router.get("/transactions", response_model=List[BankTransactionResponse])
def list_bank_transactions(
    bank_account_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    reconciliation_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bank transactions with optional filters"""
    query = db.query(BankTransaction).filter(BankTransaction.tenant_id == current_user.tenant_id)
    
    if bank_account_id:
        query = query.filter(BankTransaction.bank_account_id == bank_account_id)
    if from_date:
        query = query.filter(BankTransaction.transaction_date >= from_date)
    if to_date:
        query = query.filter(BankTransaction.transaction_date <= to_date)
    if reconciliation_status:
        query = query.filter(BankTransaction.reconciliation_status == reconciliation_status)
    
    transactions = query.order_by(desc(BankTransaction.transaction_date)).offset(skip).limit(limit).all()
    return transactions

@router.post("/transactions/import")
async def import_bank_transactions(
    bank_account_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import bank transactions from CSV file"""
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == bank_account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    contents = await file.read()
    csv_data = io.StringIO(contents.decode('utf-8'))
    reader = csv.DictReader(csv_data)
    
    imported_count = 0
    import_batch_id = f"IMPORT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    for row in reader:
        try:
            transaction_date = datetime.strptime(row.get('Date', row.get('date', '')), '%Y-%m-%d').date()
            description = row.get('Description', row.get('description', ''))
            debit = Decimal(row.get('Debit', row.get('debit', '0')).replace(',', '') or '0')
            credit = Decimal(row.get('Credit', row.get('credit', '0')).replace(',', '') or '0')
            reference = row.get('Reference', row.get('reference', ''))
            
            if credit > 0:
                transaction_type = TransactionType.RECEIVE
            else:
                transaction_type = TransactionType.SPEND
            
            balance_change = credit - debit
            new_balance = account.current_balance + balance_change
            
            db_transaction = BankTransaction(
                tenant_id=current_user.tenant_id,
                bank_account_id=bank_account_id,
                transaction_date=transaction_date,
                transaction_type=transaction_type,
                description=description,
                reference=reference,
                debit_amount=debit,
                credit_amount=credit,
                balance=new_balance,
                reconciliation_status=ReconciliationStatus.UNRECONCILED,
                is_posted=False,
                import_batch_id=import_batch_id,
                created_by_id=current_user.id
            )
            
            db.add(db_transaction)
            account.current_balance = new_balance
            imported_count += 1
            
        except Exception:
            continue
    
    account.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "imported_count": imported_count,
        "import_batch_id": import_batch_id
    }


@router.post("/reconcile")
def reconcile_transactions(
    request: ReconcileTransactionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reconcile bank transactions"""
    reconciled_count = 0
    
    for transaction_id in request.transaction_ids:
        transaction = db.query(BankTransaction).filter(
            and_(
                BankTransaction.id == transaction_id,
                BankTransaction.tenant_id == current_user.tenant_id
            )
        ).first()
        
        if transaction:
            transaction.reconciliation_status = ReconciliationStatus.RECONCILED
            transaction.reconciled_date = request.reconciliation_date
            transaction.reconciled_by_id = current_user.id
            reconciled_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "reconciled_count": reconciled_count
    }

@router.get("/reconciliation/summary")
def get_reconciliation_summary(
    bank_account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reconciliation summary for a bank account"""
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == bank_account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    unreconciled = db.query(BankTransaction).filter(
        and_(
            BankTransaction.bank_account_id == bank_account_id,
            BankTransaction.reconciliation_status == ReconciliationStatus.UNRECONCILED
        )
    ).all()
    
    unreconciled_debits = sum(t.debit_amount for t in unreconciled)
    unreconciled_credits = sum(t.credit_amount for t in unreconciled)
    
    return {
        "account_name": account.account_name,
        "current_balance": float(account.current_balance),
        "reconciled_balance": float(account.reconciled_balance),
        "unreconciled_count": len(unreconciled),
        "unreconciled_debits": float(unreconciled_debits),
        "unreconciled_credits": float(unreconciled_credits),
        "difference": float(account.current_balance - account.reconciled_balance)
    }


@router.post("/rules", response_model=BankRuleResponse, status_code=status.HTTP_201_CREATED)
def create_bank_rule(
    rule: BankRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bank rule"""
    db_rule = BankRule(
        tenant_id=current_user.tenant_id,
        rule_name=rule.rule_name,
        description=rule.description,
        condition_type=rule.condition_type,
        condition_field=rule.condition_field,
        condition_value=rule.condition_value,
        gl_account_code=rule.gl_account_code,
        tax_code=rule.tax_code,
        auto_post=rule.auto_post,
        is_active=True,
        times_applied=0,
        created_by_id=current_user.id
    )
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    return db_rule

@router.get("/rules", response_model=List[BankRuleResponse])
def list_bank_rules(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List bank rules"""
    query = db.query(BankRule).filter(BankRule.tenant_id == current_user.tenant_id)
    
    if is_active is not None:
        query = query.filter(BankRule.is_active == is_active)
    
    rules = query.order_by(desc(BankRule.priority), BankRule.rule_name).all()
    return rules

@router.post("/rules/apply/{transaction_id}")
def apply_bank_rules(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply bank rules to a transaction"""
    transaction = db.query(BankTransaction).filter(
        and_(
            BankTransaction.id == transaction_id,
            BankTransaction.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    rules = db.query(BankRule).filter(
        and_(
            BankRule.tenant_id == current_user.tenant_id,
            BankRule.is_active == True
        )
    ).order_by(desc(BankRule.priority)).all()
    
    for rule in rules:
        field_value = getattr(transaction, rule.condition_field, "")
        if field_value is None:
            field_value = ""
        
        match = False
        if rule.condition_type == RuleConditionType.CONTAINS:
            match = rule.condition_value.lower() in str(field_value).lower()
        elif rule.condition_type == RuleConditionType.STARTS_WITH:
            match = str(field_value).lower().startswith(rule.condition_value.lower())
        elif rule.condition_type == RuleConditionType.ENDS_WITH:
            match = str(field_value).lower().endswith(rule.condition_value.lower())
        elif rule.condition_type == RuleConditionType.EQUALS:
            match = str(field_value).lower() == rule.condition_value.lower()
        
        if match:
            transaction.gl_account_code = rule.gl_account_code
            rule.times_applied += 1
            rule.last_applied_date = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "rule_applied": rule.rule_name,
                "gl_account_code": rule.gl_account_code
            }
    
    return {
        "success": False,
        "message": "No matching rule found"
    }
