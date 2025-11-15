"""
ARIA ERP - General Ledger Module (PostgreSQL)
Provides full CRUD operations for Journal Entries and Chart of Accounts
Matches frontend API contract: /erp/gl/* or /api/erp/gl/*
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

journal_entries_router = APIRouter(prefix="/api/erp/gl/journal-entries", tags=["General Ledger Journal Entries"])

@journal_entries_router.get("")
async def list_journal_entries(
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all journal entries with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT je.id, je.entry_number, je.entry_date, je.description, je.status,
                   je.reference, je.created_at, je.updated_at, je.created_by,
                   COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debit,
                   COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credit
            FROM journal_entries je
            LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            WHERE je.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND je.status = %s"
            params.append(status)
        if from_date:
            query += " AND je.entry_date >= %s"
            params.append(from_date)
        if to_date:
            query += " AND je.entry_date <= %s"
            params.append(to_date)
        
        query += " GROUP BY je.id ORDER BY je.entry_date DESC, je.created_at DESC"
        
        cursor.execute(query, params)
        entries = cursor.fetchall()
        
        result = []
        for entry in entries:
            result.append({
                'id': str(entry['id']),
                'entry_number': entry['entry_number'],
                'entry_date': entry['entry_date'].isoformat() if entry['entry_date'] else None,
                'description': entry['description'],
                'status': entry['status'],
                'reference': entry.get('reference'),
                'total_debit': float(entry.get('total_debit', 0)),
                'total_credit': float(entry.get('total_credit', 0)),
                'created_at': entry['created_at'].isoformat() if entry.get('created_at') else None,
                'updated_at': entry['updated_at'].isoformat() if entry.get('updated_at') else None,
                'created_by': entry.get('created_by')
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.get("/{entry_id}")
async def get_journal_entry(
    entry_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single journal entry with lines"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM journal_entries
            WHERE id = %s AND company_id = %s
        """, (entry_id, company_id))
        
        entry = cursor.fetchone()
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        cursor.execute("""
            SELECT jel.*, coa.account_code, coa.account_name
            FROM journal_entry_lines jel
            LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.journal_entry_id = %s
            ORDER BY jel.line_number
        """, (entry_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(entry['id']),
            'entry_number': entry['entry_number'],
            'entry_date': entry['entry_date'].isoformat() if entry['entry_date'] else None,
            'description': entry['description'],
            'status': entry['status'],
            'reference': entry.get('reference'),
            'created_at': entry['created_at'].isoformat() if entry.get('created_at') else None,
            'updated_at': entry['updated_at'].isoformat() if entry.get('updated_at') else None,
            'created_by': entry.get('created_by'),
            'posted_at': entry['posted_at'].isoformat() if entry.get('posted_at') else None,
            'posted_by': entry.get('posted_by'),
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'account_id': str(line['account_id']) if line['account_id'] else None,
                'account_code': line.get('account_code'),
                'account_name': line.get('account_name'),
                'description': line.get('description'),
                'debit_amount': float(line['debit_amount']) if line.get('debit_amount') else 0.0,
                'credit_amount': float(line['credit_amount']) if line.get('credit_amount') else 0.0
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.post("")
async def create_journal_entry(
    entry_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new journal entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 'JE-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM journal_entries WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        entry_number = f"JE-{next_num:05d}"
        
        lines = entry_data.get('lines', [])
        if not lines:
            raise HTTPException(status_code=400, detail="Journal entry must have at least one line")
        
        total_debit = sum(float(line.get('debit_amount', 0)) for line in lines)
        total_credit = sum(float(line.get('credit_amount', 0)) for line in lines)
        if abs(total_debit - total_credit) > 0.01:
            raise HTTPException(status_code=400, detail=f"Debits ({total_debit}) must equal credits ({total_credit})")
        
        entry_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO journal_entries (id, company_id, entry_number, entry_date, description, status, reference, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, entry_number
        """, (entry_id, company_id, entry_number, entry_data.get('entry_date'), entry_data.get('description'), 
              'draft', entry_data.get('reference'), user_email))
        
        result = cursor.fetchone()
        
        for idx, line in enumerate(lines, 1):
            cursor.execute("""
                INSERT INTO journal_entry_lines (id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), entry_id, idx, line.get('account_id'), line.get('description'),
                  line.get('debit_amount', 0), line.get('credit_amount', 0)))
        
        conn.commit()
        return {'id': str(result['id']), 'entry_number': result['entry_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.post("/{entry_id}/post")
async def post_journal_entry(
    entry_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Post a journal entry"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE journal_entries 
            SET status = 'posted', posted_at = NOW(), posted_by = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (user_email, entry_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        conn.commit()
        return {"message": "Journal entry posted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.delete("/{entry_id}")
async def delete_journal_entry(
    entry_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a journal entry"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM journal_entry_lines WHERE journal_entry_id = %s", (entry_id,))
        cursor.execute("DELETE FROM journal_entries WHERE id = %s AND company_id = %s", (entry_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        conn.commit()
        return {"message": "Journal entry deleted successfully"}
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

chart_of_accounts_router = APIRouter(prefix="/api/erp/gl/chart-of-accounts", tags=["General Ledger Chart of Accounts"])

@chart_of_accounts_router.post("")
async def create_account(
    account_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new GL account"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        account_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, parent_account_id, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, account_code, account_name
        """, (account_id, company_id, account_data.get('account_code'), account_data.get('account_name'),
              account_data.get('account_type'), account_data.get('parent_account_id'), 
              account_data.get('is_active', True)))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'account_code': result['account_code'], 'account_name': result['account_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@chart_of_accounts_router.put("/{account_id}")
async def update_account(
    account_id: str = Path(...),
    account_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a GL account"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE chart_of_accounts
            SET account_name = %s, account_type = %s, is_active = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (account_data.get('account_name'), account_data.get('account_type'),
              account_data.get('is_active', True), account_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Account not found")
        
        conn.commit()
        return {"message": "Account updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@chart_of_accounts_router.delete("/{account_id}")
async def delete_account(
    account_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a GL account"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM chart_of_accounts WHERE id = %s AND company_id = %s", (account_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Account not found")
        
        conn.commit()
        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.put("/{entry_id}")
async def update_journal_entry(
    entry_id: str = Path(...),
    entry_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a journal entry (only allowed for draft status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status FROM journal_entries WHERE id = %s AND company_id = %s", (entry_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        if result['status'] != 'draft':
            raise HTTPException(status_code=400, detail=f"Cannot update journal entry with status: {result['status']}")
        
        lines = entry_data.get('lines', [])
        if lines:
            total_debit = sum(float(line.get('debit_amount', 0)) for line in lines)
            total_credit = sum(float(line.get('credit_amount', 0)) for line in lines)
            if abs(total_debit - total_credit) > 0.01:
                raise HTTPException(status_code=400, detail=f"Debits must equal credits")
            
            cursor.execute("DELETE FROM journal_entry_lines WHERE journal_entry_id = %s", (entry_id,))
            
            for idx, line in enumerate(lines, 1):
                cursor.execute("""
                    INSERT INTO journal_entry_lines (id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (str(uuid.uuid4()), entry_id, idx, line.get('account_id'), line.get('description'),
                      line.get('debit_amount', 0), line.get('credit_amount', 0)))
        
        cursor.execute("""
            UPDATE journal_entries
            SET entry_date = %s, description = %s, reference = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (entry_data.get('entry_date'), entry_data.get('description'), 
              entry_data.get('reference'), entry_id, company_id))
        
        conn.commit()
        return {"message": "Journal entry updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.post("/{entry_id}/cancel")
async def cancel_journal_entry(
    entry_id: str = Path(...),
    cancel_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(get_current_user)
):
    """Cancel a journal entry (only allowed for draft status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status, entry_number FROM journal_entries WHERE id = %s AND company_id = %s", (entry_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        status, entry_number = result['status'], result['entry_number']
        if status not in ['draft']:
            raise HTTPException(status_code=400, detail=f"Cannot cancel journal entry with status: {status}")
        
        cursor.execute("UPDATE journal_entries SET status = 'cancelled', updated_at = NOW() WHERE id = %s AND company_id = %s", (entry_id, company_id))
        conn.commit()
        
        return {
            "message": f"Journal entry {entry_number} cancelled successfully",
            "entry_id": entry_id,
            "reason": cancel_data.get('reason')
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entries_router.post("/{entry_id}/reverse")
async def reverse_journal_entry(
    entry_id: str = Path(...),
    reverse_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(get_current_user)
):
    """Reverse a posted journal entry by creating a reversing entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM journal_entries
            WHERE id = %s AND company_id = %s
        """, (entry_id, company_id))
        
        original_entry = cursor.fetchone()
        if not original_entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        if original_entry['status'] != 'posted':
            raise HTTPException(status_code=400, detail=f"Can only reverse posted journal entries")
        
        cursor.execute("""
            SELECT * FROM journal_entry_lines
            WHERE journal_entry_id = %s
            ORDER BY line_number
        """, (entry_id,))
        
        original_lines = cursor.fetchall()
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 'JE-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM journal_entries WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        entry_number = f"JE-{next_num:05d}"
        
        reversing_entry_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO journal_entries (id, company_id, entry_number, entry_date, description, status, reference, created_by, posted_by, posted_at, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW())
            RETURNING id, entry_number
        """, (reversing_entry_id, company_id, entry_number, reverse_data.get('entry_date', datetime.now().date()),
              f"REVERSAL: {original_entry['description']}", 'posted', f"REV-{original_entry['entry_number']}", 
              user_email, user_email))
        
        result = cursor.fetchone()
        
        for idx, line in enumerate(original_lines, 1):
            cursor.execute("""
                INSERT INTO journal_entry_lines (id, journal_entry_id, line_number, account_code, description, debit_amount, credit_amount, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), reversing_entry_id, idx, line['account_code'], 
                  f"REVERSAL: {line.get('description', '')}", line['credit_amount'], line['debit_amount']))
        
        conn.commit()
        return {
            'message': f"Journal entry reversed successfully",
            'original_entry_id': entry_id,
            'reversing_entry_id': str(result['id']),
            'reversing_entry_number': result['entry_number']
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
