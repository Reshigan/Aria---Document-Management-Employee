"""
ARIA ERP - Banking & Reconciliation Module
Complete banking management: Accounts, Transactions, Reconciliation
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date

router = APIRouter(prefix="/api/erp/banking", tags=["Banking & Reconciliation"])


def get_db():
    """Get database session"""
    from backend.database import get_db as _get_db
    return next(_get_db())

def get_company_id() -> UUID:
    """Get company ID from context - placeholder for now"""
    return UUID("00000000-0000-0000-0000-000000000001")

def get_user_id(db: Session) -> UUID:
    """Get user ID"""
    result = db.execute(text("SELECT id FROM users LIMIT 1"))
    row = result.fetchone()
    return row[0] if row else UUID("00000000-0000-0000-0000-000000000001")


class BankAccountCreate(BaseModel):
    account_name: str
    account_number: str
    bank_name: str
    branch_code: Optional[str] = None
    account_type: str  # "checking", "savings", "credit_card"
    currency: str = "ZAR"
    opening_balance: Decimal = Decimal("0")

class BankAccountResponse(BaseModel):
    id: UUID
    company_id: UUID
    account_name: str
    account_number: str
    bank_name: str
    branch_code: Optional[str]
    account_type: str
    currency: str
    current_balance: Decimal
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class BankTransactionCreate(BaseModel):
    bank_account_id: UUID
    transaction_date: date
    description: str
    reference: Optional[str] = None
    debit: Optional[Decimal] = None
    credit: Optional[Decimal] = None
    transaction_type: str  # "deposit", "withdrawal", "transfer", "fee", "interest"

class BankTransactionResponse(BaseModel):
    id: UUID
    company_id: UUID
    bank_account_id: UUID
    account_name: Optional[str] = None
    transaction_date: date
    description: str
    reference: Optional[str]
    debit: Optional[Decimal]
    credit: Optional[Decimal]
    balance: Decimal
    transaction_type: str
    reconciled: bool
    reconciled_date: Optional[date]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReconciliationCreate(BaseModel):
    bank_account_id: UUID
    statement_date: date
    statement_balance: Decimal
    transaction_ids: List[UUID]

class ReconciliationResponse(BaseModel):
    id: UUID
    bank_account_id: UUID
    account_name: str
    statement_date: date
    statement_balance: Decimal
    book_balance: Decimal
    difference: Decimal
    transactions_reconciled: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "banking_reconciliation",
        "endpoints": ["accounts", "transactions", "reconciliations"]
    }


@router.get("/accounts", response_model=List[BankAccountResponse])
async def get_bank_accounts(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all bank accounts"""
    query = """
        SELECT id, company_id, account_name, account_number, bank_name,
               branch_code, account_type, currency, current_balance, is_active, created_at
        FROM bank_accounts
        WHERE company_id = :company_id
        ORDER BY account_name
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    accounts = []
    for row in result:
        accounts.append(BankAccountResponse(
            id=row[0], company_id=row[1], account_name=row[2], account_number=row[3],
            bank_name=row[4], branch_code=row[5], account_type=row[6], currency=row[7],
            current_balance=row[8], is_active=row[9], created_at=row[10]
        ))
    return accounts

@router.post("/accounts", response_model=BankAccountResponse)
async def create_bank_account(
    account: BankAccountCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a bank account"""
    try:
        account_id = uuid4()
        
        db.execute(text("""
            INSERT INTO bank_accounts (id, company_id, account_name, account_number,
                                      bank_name, branch_code, account_type, currency,
                                      current_balance, is_active, created_at, updated_at)
            VALUES (:id, :company_id, :account_name, :account_number,
                    :bank_name, :branch_code, :account_type, :currency,
                    :opening_balance, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(account_id),
            "company_id": str(company_id),
            "account_name": account.account_name,
            "account_number": account.account_number,
            "bank_name": account.bank_name,
            "branch_code": account.branch_code,
            "account_type": account.account_type,
            "currency": account.currency,
            "opening_balance": float(account.opening_balance)
        })
        
        db.commit()
        
        query = """
            SELECT id, company_id, account_name, account_number, bank_name,
                   branch_code, account_type, currency, current_balance, is_active, created_at
            FROM bank_accounts
            WHERE id = :account_id
        """
        result = db.execute(text(query), {"account_id": str(account_id)})
        row = result.fetchone()
        
        return BankAccountResponse(
            id=row[0], company_id=row[1], account_name=row[2], account_number=row[3],
            bank_name=row[4], branch_code=row[5], account_type=row[6], currency=row[7],
            current_balance=row[8], is_active=row[9], created_at=row[10]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating bank account: {str(e)}")


@router.get("/transactions", response_model=List[BankTransactionResponse])
async def get_bank_transactions(
    bank_account_id: Optional[UUID] = None,
    reconciled: Optional[bool] = None,
    limit: int = 100,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get bank transactions with optional filters"""
    query = """
        SELECT bt.id, bt.company_id, bt.bank_account_id, ba.account_name,
               bt.transaction_date, bt.description, bt.reference,
               bt.debit, bt.credit, bt.balance, bt.transaction_type,
               bt.reconciled, bt.reconciled_date, bt.created_at
        FROM bank_transactions bt
        JOIN bank_accounts ba ON bt.bank_account_id = ba.id
        WHERE bt.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if bank_account_id:
        query += " AND bt.bank_account_id = :bank_account_id"
        params["bank_account_id"] = str(bank_account_id)
    
    if reconciled is not None:
        query += " AND bt.reconciled = :reconciled"
        params["reconciled"] = reconciled
    
    query += " ORDER BY bt.transaction_date DESC, bt.created_at DESC LIMIT :limit"
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    transactions = []
    for row in result:
        transactions.append(BankTransactionResponse(
            id=row[0], company_id=row[1], bank_account_id=row[2], account_name=row[3],
            transaction_date=row[4], description=row[5], reference=row[6],
            debit=row[7], credit=row[8], balance=row[9], transaction_type=row[10],
            reconciled=row[11], reconciled_date=row[12], created_at=row[13]
        ))
    return transactions

@router.post("/transactions", response_model=BankTransactionResponse)
async def create_bank_transaction(
    transaction: BankTransactionCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a bank transaction"""
    try:
        transaction_id = uuid4()
        
        balance_query = """
            SELECT current_balance FROM bank_accounts
            WHERE id = :account_id AND company_id = :company_id
        """
        result = db.execute(text(balance_query), {
            "account_id": str(transaction.bank_account_id),
            "company_id": str(company_id)
        })
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        current_balance = Decimal(str(row[0]))
        
        debit_amount = transaction.debit or Decimal("0")
        credit_amount = transaction.credit or Decimal("0")
        new_balance = current_balance - debit_amount + credit_amount
        
        db.execute(text("""
            INSERT INTO bank_transactions (id, company_id, bank_account_id, transaction_date,
                                          description, reference, debit, credit, balance,
                                          transaction_type, reconciled, created_at, updated_at)
            VALUES (:id, :company_id, :account_id, :transaction_date,
                    :description, :reference, :debit, :credit, :balance,
                    :transaction_type, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(transaction_id),
            "company_id": str(company_id),
            "account_id": str(transaction.bank_account_id),
            "transaction_date": transaction.transaction_date,
            "description": transaction.description,
            "reference": transaction.reference,
            "debit": float(debit_amount) if debit_amount else None,
            "credit": float(credit_amount) if credit_amount else None,
            "balance": float(new_balance),
            "transaction_type": transaction.transaction_type
        })
        
        db.execute(text("""
            UPDATE bank_accounts
            SET current_balance = :new_balance, updated_at = CURRENT_TIMESTAMP
            WHERE id = :account_id
        """), {
            "new_balance": float(new_balance),
            "account_id": str(transaction.bank_account_id)
        })
        
        db.commit()
        
        query = """
            SELECT bt.id, bt.company_id, bt.bank_account_id, ba.account_name,
                   bt.transaction_date, bt.description, bt.reference,
                   bt.debit, bt.credit, bt.balance, bt.transaction_type,
                   bt.reconciled, bt.reconciled_date, bt.created_at
            FROM bank_transactions bt
            JOIN bank_accounts ba ON bt.bank_account_id = ba.id
            WHERE bt.id = :transaction_id
        """
        result = db.execute(text(query), {"transaction_id": str(transaction_id)})
        row = result.fetchone()
        
        return BankTransactionResponse(
            id=row[0], company_id=row[1], bank_account_id=row[2], account_name=row[3],
            transaction_date=row[4], description=row[5], reference=row[6],
            debit=row[7], credit=row[8], balance=row[9], transaction_type=row[10],
            reconciled=row[11], reconciled_date=row[12], created_at=row[13]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating bank transaction: {str(e)}")


@router.post("/reconciliations", response_model=ReconciliationResponse)
async def create_reconciliation(
    reconciliation: ReconciliationCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a bank reconciliation"""
    try:
        reconciliation_id = uuid4()
        
        account_query = """
            SELECT account_name, current_balance FROM bank_accounts
            WHERE id = :account_id AND company_id = :company_id
        """
        result = db.execute(text(account_query), {
            "account_id": str(reconciliation.bank_account_id),
            "company_id": str(company_id)
        })
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        account_name = row[0]
        book_balance = Decimal(str(row[1]))
        
        for transaction_id in reconciliation.transaction_ids:
            db.execute(text("""
                UPDATE bank_transactions
                SET reconciled = true, reconciled_date = :statement_date, updated_at = CURRENT_TIMESTAMP
                WHERE id = :transaction_id AND company_id = :company_id
            """), {
                "transaction_id": str(transaction_id),
                "company_id": str(company_id),
                "statement_date": reconciliation.statement_date
            })
        
        difference = reconciliation.statement_balance - book_balance
        status = "balanced" if abs(difference) < Decimal("0.01") else "unbalanced"
        
        db.commit()
        
        return ReconciliationResponse(
            id=reconciliation_id,
            bank_account_id=reconciliation.bank_account_id,
            account_name=account_name,
            statement_date=reconciliation.statement_date,
            statement_balance=reconciliation.statement_balance,
            book_balance=book_balance,
            difference=difference,
            transactions_reconciled=len(reconciliation.transaction_ids),
            status=status,
            created_at=datetime.now()
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating reconciliation: {str(e)}")

@router.get("/reconciliation-summary", response_model=dict)
async def get_reconciliation_summary(
    bank_account_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get reconciliation summary for a bank account"""
    query = """
        SELECT 
            COUNT(*) as total_transactions,
            COUNT(*) FILTER (WHERE reconciled = true) as reconciled_count,
            COUNT(*) FILTER (WHERE reconciled = false) as unreconciled_count,
            SUM(COALESCE(debit, 0)) as total_debits,
            SUM(COALESCE(credit, 0)) as total_credits
        FROM bank_transactions
        WHERE company_id = :company_id AND bank_account_id = :account_id
    """
    result = db.execute(text(query), {
        "company_id": str(company_id),
        "account_id": str(bank_account_id)
    })
    row = result.fetchone()
    
    return {
        "total_transactions": row[0] or 0,
        "reconciled_count": row[1] or 0,
        "unreconciled_count": row[2] or 0,
        "total_debits": float(row[3]) if row[3] else 0,
        "total_credits": float(row[4]) if row[4] else 0,
        "reconciliation_percentage": (float(row[1]) / float(row[0]) * 100) if row[0] and row[0] > 0 else 0
    }
