"""
ARIA ERP - Tax Filings Module (PostgreSQL)
Provides full CRUD operations for Tax Filings (PAYE, UIF, SDL, VAT)
Matches frontend API contract: /api/payroll/tax
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

tax_filings_router = APIRouter(prefix="/api/payroll/tax", tags=["Tax Filings"])

@tax_filings_router.get("")
async def list_tax_filings(
    tax_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all tax filings"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT id, filing_number, tax_type, period, period_start, period_end, due_date, 
                   amount, status, filed_date, payment_reference, sars_reference, notes, created_at
            FROM tax_filings
            WHERE company_id = %s
        """
        params = [company_id]
        
        if tax_type:
            query += " AND tax_type = %s"
            params.append(tax_type)
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY due_date DESC, period DESC"
        
        cursor.execute(query, params)
        filings = cursor.fetchall()
        
        result = []
        for filing in filings:
            result.append({
                'id': str(filing['id']),
                'filing_number': filing.get('filing_number'),
                'tax_type': filing.get('tax_type'),
                'period': filing.get('period'),
                'period_start': filing['period_start'].isoformat() if filing.get('period_start') else None,
                'period_end': filing['period_end'].isoformat() if filing.get('period_end') else None,
                'due_date': filing['due_date'].isoformat() if filing.get('due_date') else None,
                'amount': float(filing.get('amount', 0)),
                'status': filing.get('status'),
                'filed_date': filing['filed_date'].isoformat() if filing.get('filed_date') else None,
                'payment_reference': filing.get('payment_reference'),
                'sars_reference': filing.get('sars_reference'),
                'notes': filing.get('notes'),
                'created_at': filing['created_at'].isoformat() if filing.get('created_at') else None
            })
        
        return {'filings': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_filings_router.get("/{filing_id}")
async def get_tax_filing(
    filing_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single tax filing"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT * FROM tax_filings WHERE id = %s AND company_id = %s", (filing_id, company_id))
        filing = cursor.fetchone()
        
        if not filing:
            raise HTTPException(status_code=404, detail="Tax filing not found")
        
        return {
            'id': str(filing['id']),
            'filing_number': filing.get('filing_number'),
            'tax_type': filing.get('tax_type'),
            'period': filing.get('period'),
            'period_start': filing['period_start'].isoformat() if filing.get('period_start') else None,
            'period_end': filing['period_end'].isoformat() if filing.get('period_end') else None,
            'due_date': filing['due_date'].isoformat() if filing.get('due_date') else None,
            'amount': float(filing.get('amount', 0)),
            'status': filing.get('status'),
            'filed_date': filing['filed_date'].isoformat() if filing.get('filed_date') else None,
            'payment_reference': filing.get('payment_reference'),
            'sars_reference': filing.get('sars_reference'),
            'notes': filing.get('notes'),
            'created_at': filing['created_at'].isoformat() if filing.get('created_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_filings_router.post("")
async def create_tax_filing(
    filing_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new tax filing"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(filing_number FROM 'TAX-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM tax_filings WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        filing_number = f"TAX-{next_num:05d}"
        
        filing_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO tax_filings (id, company_id, filing_number, tax_type, period, period_start, period_end, due_date, amount, status, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, filing_number
        """, (filing_id, company_id, filing_number, filing_data.get('tax_type'), filing_data.get('period'),
              filing_data.get('period_start'), filing_data.get('period_end'), filing_data.get('due_date'),
              filing_data.get('amount'), filing_data.get('status', 'PENDING'), filing_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'filing_number': result['filing_number'], 'message': 'Tax filing created successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_filings_router.put("/{filing_id}")
async def update_tax_filing(
    filing_id: str = Path(...),
    filing_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a tax filing"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE tax_filings
            SET tax_type = %s, period = %s, period_start = %s, period_end = %s, due_date = %s, amount = %s, status = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (filing_data.get('tax_type'), filing_data.get('period'), filing_data.get('period_start'),
              filing_data.get('period_end'), filing_data.get('due_date'), filing_data.get('amount'),
              filing_data.get('status'), filing_data.get('notes'), filing_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tax filing not found")
        
        conn.commit()
        return {"message": "Tax filing updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_filings_router.post("/{filing_id}/submit")
async def submit_tax_filing(
    filing_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Submit a tax filing to SARS"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE tax_filings
            SET status = 'SUBMITTED', filed_date = NOW(), updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (filing_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tax filing not found")
        
        conn.commit()
        return {"message": "Tax filing submitted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_filings_router.post("/{filing_id}/pay")
async def pay_tax_filing(
    filing_id: str = Path(...),
    payment_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Mark a tax filing as paid"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE tax_filings
            SET status = 'PAID', payment_reference = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (payment_data.get('payment_reference'), filing_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tax filing not found")
        
        conn.commit()
        return {"message": "Tax filing marked as paid"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_filings_router.delete("/{filing_id}")
async def delete_tax_filing(
    filing_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a tax filing"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM tax_filings WHERE id = %s AND company_id = %s", (filing_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tax filing not found")
        
        conn.commit()
        return {"message": "Tax filing deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
