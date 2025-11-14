"""
ARIA ERP - Banking Module (PostgreSQL)
Provides full CRUD operations for Bank Accounts and Bank Transactions
Matches frontend API contract: /api/banking/* or /erp/banking/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import uuid

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# ========================================

bank_accounts_router = APIRouter(prefix="/api/banking/accounts", tags=["Banking Accounts"])

@bank_accounts_router.get("")
async def list_bank_accounts(
    current_user: Dict = Depends(get_current_user)
):
    """List all bank accounts"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT ba.*, coa.account_code, coa.account_name as gl_account_name
            FROM bank_accounts ba
            LEFT JOIN chart_of_accounts coa ON ba.gl_account_id = coa.id
            WHERE ba.company_id = %s
            ORDER BY ba.account_name
        """, (company_id,))
        
        accounts = cursor.fetchall()
        
        result = []
        for account in accounts:
            result.append({
                'id': str(account['id']),
                'account_name': account['account_name'],
                'account_number': account.get('account_number'),
                'bank_name': account.get('bank_name'),
                'branch_code': account.get('branch_code'),
                'account_type': account.get('account_type'),
                'currency': account.get('currency', 'ZAR'),
                'current_balance': float(account.get('current_balance', 0)),
                'gl_account_id': str(account['gl_account_id']) if account.get('gl_account_id') else None,
                'gl_account_code': account.get('account_code'),
                'gl_account_name': account.get('gl_account_name'),
                'is_active': account.get('is_active', True),
                'created_at': account['created_at'].isoformat() if account.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_accounts_router.get("/{account_id}")
async def get_bank_account(
    account_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single bank account"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT ba.*, coa.account_code, coa.account_name as gl_account_name
            FROM bank_accounts ba
            LEFT JOIN chart_of_accounts coa ON ba.gl_account_id = coa.id
            WHERE ba.id = %s AND ba.company_id = %s
        """, (account_id, company_id))
        
        account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        return {
            'id': str(account['id']),
            'account_name': account['account_name'],
            'account_number': account.get('account_number'),
            'bank_name': account.get('bank_name'),
            'branch_code': account.get('branch_code'),
            'account_type': account.get('account_type'),
            'currency': account.get('currency', 'ZAR'),
            'current_balance': float(account.get('current_balance', 0)),
            'gl_account_id': str(account['gl_account_id']) if account.get('gl_account_id') else None,
            'gl_account_code': account.get('account_code'),
            'gl_account_name': account.get('gl_account_name'),
            'is_active': account.get('is_active', True),
            'created_at': account['created_at'].isoformat() if account.get('created_at') else None,
            'updated_at': account['updated_at'].isoformat() if account.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_accounts_router.post("")
async def create_bank_account(
    account_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new bank account"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        account_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO bank_accounts (id, company_id, account_name, account_number, bank_name, branch_code, 
                                      account_type, currency, current_balance, gl_account_id, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, account_name
        """, (account_id, company_id, account_data.get('account_name'), account_data.get('account_number'),
              account_data.get('bank_name'), account_data.get('branch_code'), account_data.get('account_type'),
              account_data.get('currency', 'ZAR'), account_data.get('current_balance', 0),
              account_data.get('gl_account_id'), account_data.get('is_active', True)))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'account_name': result['account_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_accounts_router.put("/{account_id}")
async def update_bank_account(
    account_id: str = Path(...),
    account_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a bank account"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE bank_accounts
            SET account_name = %s, bank_name = %s, branch_code = %s, account_type = %s,
                is_active = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (account_data.get('account_name'), account_data.get('bank_name'), account_data.get('branch_code'),
              account_data.get('account_type'), account_data.get('is_active', True), account_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        conn.commit()
        return {"message": "Bank account updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_accounts_router.delete("/{account_id}")
async def delete_bank_account(
    account_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a bank account"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM bank_accounts WHERE id = %s AND company_id = %s", (account_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        conn.commit()
        return {"message": "Bank account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# ========================================

bank_transactions_router = APIRouter(prefix="/api/banking/transactions", tags=["Banking Transactions"])

@bank_transactions_router.get("")
async def list_bank_transactions(
    bank_account_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all bank transactions"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT bt.*, ba.account_name as bank_account_name
            FROM bank_transactions bt
            JOIN bank_accounts ba ON bt.bank_account_id = ba.id
            WHERE ba.company_id = %s
        """
        params = [company_id]
        
        if bank_account_id:
            query += " AND bt.bank_account_id = %s"
            params.append(bank_account_id)
        if from_date:
            query += " AND bt.transaction_date >= %s"
            params.append(from_date)
        if to_date:
            query += " AND bt.transaction_date <= %s"
            params.append(to_date)
        
        query += " ORDER BY bt.transaction_date DESC, bt.created_at DESC"
        
        cursor.execute(query, params)
        transactions = cursor.fetchall()
        
        result = []
        for txn in transactions:
            result.append({
                'id': str(txn['id']),
                'bank_account_id': str(txn['bank_account_id']),
                'bank_account_name': txn.get('bank_account_name'),
                'transaction_date': txn['transaction_date'].isoformat() if txn['transaction_date'] else None,
                'description': txn.get('description'),
                'reference': txn.get('reference'),
                'transaction_type': txn.get('transaction_type'),
                'amount': float(txn.get('amount', 0)),
                'balance_after': float(txn.get('balance_after', 0)),
                'is_reconciled': txn.get('is_reconciled', False),
                'reconciled_at': txn['reconciled_at'].isoformat() if txn.get('reconciled_at') else None,
                'created_at': txn['created_at'].isoformat() if txn.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_transactions_router.get("/{transaction_id}")
async def get_bank_transaction(
    transaction_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single bank transaction"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT bt.*, ba.account_name as bank_account_name
            FROM bank_transactions bt
            JOIN bank_accounts ba ON bt.bank_account_id = ba.id
            WHERE bt.id = %s AND ba.company_id = %s
        """, (transaction_id, company_id))
        
        txn = cursor.fetchone()
        if not txn:
            raise HTTPException(status_code=404, detail="Bank transaction not found")
        
        return {
            'id': str(txn['id']),
            'bank_account_id': str(txn['bank_account_id']),
            'bank_account_name': txn.get('bank_account_name'),
            'transaction_date': txn['transaction_date'].isoformat() if txn['transaction_date'] else None,
            'description': txn.get('description'),
            'reference': txn.get('reference'),
            'transaction_type': txn.get('transaction_type'),
            'amount': float(txn.get('amount', 0)),
            'balance_after': float(txn.get('balance_after', 0)),
            'is_reconciled': txn.get('is_reconciled', False),
            'reconciled_at': txn['reconciled_at'].isoformat() if txn.get('reconciled_at') else None,
            'created_at': txn['created_at'].isoformat() if txn.get('created_at') else None,
            'updated_at': txn['updated_at'].isoformat() if txn.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_transactions_router.post("")
async def create_bank_transaction(
    transaction_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new bank transaction"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT current_balance FROM bank_accounts WHERE id = %s AND company_id = %s",
                      (transaction_data.get('bank_account_id'), company_id))
        account = cursor.fetchone()
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        current_balance = float(account['current_balance'])
        amount = float(transaction_data.get('amount', 0))
        transaction_type = transaction_data.get('transaction_type', 'debit')
        
        if transaction_type == 'credit':
            new_balance = current_balance + amount
        else:
            new_balance = current_balance - amount
        
        transaction_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO bank_transactions (id, bank_account_id, transaction_date, description, reference,
                                          transaction_type, amount, balance_after, is_reconciled, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (transaction_id, transaction_data.get('bank_account_id'), transaction_data.get('transaction_date'),
              transaction_data.get('description'), transaction_data.get('reference'), transaction_type,
              amount, new_balance, False))
        
        result = cursor.fetchone()
        
        cursor.execute("""
            UPDATE bank_accounts SET current_balance = %s, updated_at = NOW()
            WHERE id = %s
        """, (new_balance, transaction_data.get('bank_account_id')))
        
        conn.commit()
        return {'id': str(result['id'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_transactions_router.post("/{transaction_id}/reconcile")
async def reconcile_transaction(
    transaction_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Mark a transaction as reconciled"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE bank_transactions bt
            SET is_reconciled = true, reconciled_at = NOW(), updated_at = NOW()
            FROM bank_accounts ba
            WHERE bt.bank_account_id = ba.id AND bt.id = %s AND ba.company_id = %s
        """, (transaction_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Bank transaction not found")
        
        conn.commit()
        return {"message": "Transaction reconciled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@bank_transactions_router.delete("/{transaction_id}")
async def delete_bank_transaction(
    transaction_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a bank transaction"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT bt.*, ba.current_balance
            FROM bank_transactions bt
            JOIN bank_accounts ba ON bt.bank_account_id = ba.id
            WHERE bt.id = %s AND ba.company_id = %s
        """, (transaction_id, company_id))
        
        txn = cursor.fetchone()
        if not txn:
            raise HTTPException(status_code=404, detail="Bank transaction not found")
        
        current_balance = float(txn['current_balance'])
        amount = float(txn['amount'])
        transaction_type = txn['transaction_type']
        
        if transaction_type == 'credit':
            new_balance = current_balance - amount
        else:
            new_balance = current_balance + amount
        
        cursor.execute("DELETE FROM bank_transactions WHERE id = %s", (transaction_id,))
        
        cursor.execute("""
            UPDATE bank_accounts SET current_balance = %s, updated_at = NOW()
            WHERE id = %s
        """, (new_balance, txn['bank_account_id']))
        
        conn.commit()
        return {"message": "Bank transaction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
