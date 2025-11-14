"""
ARIA ERP - General Ledger API (PostgreSQL)
Provides Chart of Accounts with direct PostgreSQL access
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
import psycopg2
import psycopg2.extras
import os

from auth_integrated import get_current_user

router = APIRouter(prefix="/api/erp/gl", tags=["General Ledger"])

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)


@router.get("/accounts")
async def list_accounts(
    company_id: Optional[str] = Query(None, description="Company ID"),
    account_type: Optional[str] = None,
    is_active: bool = True,
    current_user: Dict = Depends(get_current_user)
):
    """List all chart of accounts for a company"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        comp_id = company_id or current_user.get('organization_id')
        
        if not comp_id:
            return []
        
        query = """
            SELECT 
                id, company_id, code, name, account_type, account_category,
                parent_account_id, currency, is_reconcilable, is_system_account,
                opening_balance, current_balance, is_active, created_at, updated_at
            FROM chart_of_accounts
            WHERE company_id = %s AND is_active = %s
        """
        params = [comp_id, is_active]
        
        if account_type:
            query += " AND account_type = %s"
            params.append(account_type)
        
        query += " ORDER BY code"
        
        cursor.execute(query, params)
        accounts = cursor.fetchall()
        
        result = []
        for account in accounts:
            result.append({
                'id': str(account['id']),
                'account_code': account['code'],
                'account_name': account['name'],
                'account_type': account['account_type'],
                'account_category': account['account_category'],
                'parent_account_id': str(account['parent_account_id']) if account['parent_account_id'] else None,
                'currency': account['currency'],
                'is_reconcilable': account['is_reconcilable'],
                'is_system_account': account['is_system_account'],
                'opening_balance': float(account['opening_balance']) if account['opening_balance'] else 0.0,
                'current_balance': float(account['current_balance']) if account['current_balance'] else 0.0,
                'is_active': account['is_active'],
                'created_at': account['created_at'].isoformat() if account['created_at'] else None,
                'updated_at': account['updated_at'].isoformat() if account['updated_at'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/accounts/{account_id}")
async def get_account(
    account_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific account by ID"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                id, company_id, code, name, account_type, account_category,
                parent_account_id, currency, is_reconcilable, is_system_account,
                opening_balance, current_balance, is_active, created_at, updated_at
            FROM chart_of_accounts
            WHERE id = %s
        """, (account_id,))
        
        account = cursor.fetchone()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return {
            'id': str(account['id']),
            'account_code': account['code'],
            'account_name': account['name'],
            'account_type': account['account_type'],
            'account_category': account['account_category'],
            'parent_account_id': str(account['parent_account_id']) if account['parent_account_id'] else None,
            'currency': account['currency'],
            'is_reconcilable': account['is_reconcilable'],
            'is_system_account': account['is_system_account'],
            'opening_balance': float(account['opening_balance']) if account['opening_balance'] else 0.0,
            'current_balance': float(account['current_balance']) if account['current_balance'] else 0.0,
            'is_active': account['is_active'],
            'created_at': account['created_at'].isoformat() if account['created_at'] else None,
            'updated_at': account['updated_at'].isoformat() if account['updated_at'] else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.post("/accounts")
async def create_account(
    account: Dict[str, Any],
    company_id: Optional[str] = Query(None, description="Company ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new chart of accounts entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        comp_id = company_id or current_user.get('organization_id')
        
        if not comp_id:
            raise HTTPException(status_code=400, detail="Company ID required")
        
        cursor.execute("""
            SELECT id FROM chart_of_accounts
            WHERE company_id = %s AND code = %s
        """, (comp_id, account.get('account_code')))
        
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Account code already exists")
        
        cursor.execute("""
            INSERT INTO chart_of_accounts (
                company_id, code, name, account_type, account_category,
                is_active, is_reconcilable, is_system_account,
                opening_balance, current_balance, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, code, name, account_type, account_category, is_active, created_at
        """, (
            comp_id,
            account.get('account_code'),
            account.get('account_name'),
            account.get('account_type', 'Asset'),
            account.get('account_category'),
            account.get('is_active', True),
            account.get('is_reconcilable', False),
            account.get('is_system_account', False),
            account.get('opening_balance', 0.0),
            account.get('current_balance', 0.0)
        ))
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'account_code': result['code'],
            'account_name': result['name'],
            'account_type': result['account_type'],
            'account_category': result['account_category'],
            'is_active': result['is_active'],
            'created_at': result['created_at'].isoformat() if result['created_at'] else None
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.put("/accounts/{account_id}")
async def update_account(
    account_id: str,
    account: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Update an existing account"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT is_system_account FROM chart_of_accounts WHERE id = %s", (account_id,))
        existing = cursor.fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found")
        
        if existing['is_system_account']:
            raise HTTPException(status_code=400, detail="Cannot modify system accounts")
        
        update_fields = []
        params = []
        
        if 'account_name' in account:
            update_fields.append("name = %s")
            params.append(account['account_name'])
        
        if 'is_active' in account:
            update_fields.append("is_active = %s")
            params.append(account['is_active'])
        
        if 'account_category' in account:
            update_fields.append("account_category = %s")
            params.append(account['account_category'])
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("updated_at = NOW()")
        params.append(account_id)
        
        query = f"UPDATE chart_of_accounts SET {', '.join(update_fields)} WHERE id = %s RETURNING id, code, name, is_active"
        cursor.execute(query, params)
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'account_code': result['code'],
            'account_name': result['name'],
            'is_active': result['is_active']
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete an account (soft delete by setting is_active=False)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT is_system_account FROM chart_of_accounts WHERE id = %s", (account_id,))
        existing = cursor.fetchone()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found")
        
        if existing['is_system_account']:
            raise HTTPException(status_code=400, detail="Cannot delete system accounts")
        
        cursor.execute("""
            UPDATE chart_of_accounts
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = %s
        """, (account_id,))
        
        conn.commit()
        
        return {"message": "Account deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
