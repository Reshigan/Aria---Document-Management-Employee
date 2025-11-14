"""
ARIA ERP - Payments Module (PostgreSQL)
Provides full CRUD operations for Customer Payments and Payment Allocations
Matches frontend API contract: /api/payments/*
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

customer_payments_router = APIRouter(prefix="/api/payments/customer-payments", tags=["Customer Payments"])

@customer_payments_router.get("")
async def list_customer_payments(
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all customer payments"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT cp.*, c.customer_name
            FROM customer_payments cp
            LEFT JOIN customers c ON cp.customer_id = c.id
            WHERE cp.company_id = %s
        """
        params = [company_id]
        
        if customer_id:
            query += " AND cp.customer_id = %s"
            params.append(customer_id)
        if status:
            query += " AND cp.status = %s"
            params.append(status)
        
        query += " ORDER BY cp.payment_date DESC, cp.created_at DESC"
        
        cursor.execute(query, params)
        payments = cursor.fetchall()
        
        result = []
        for payment in payments:
            result.append({
                'id': str(payment['id']),
                'payment_number': payment.get('payment_number'),
                'customer_id': str(payment['customer_id']) if payment.get('customer_id') else None,
                'customer_name': payment.get('customer_name'),
                'payment_date': payment['payment_date'].isoformat() if payment.get('payment_date') else None,
                'amount': float(payment.get('amount', 0)),
                'payment_method': payment.get('payment_method'),
                'reference': payment.get('reference'),
                'status': payment.get('status'),
                'created_at': payment['created_at'].isoformat() if payment.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customer_payments_router.get("/{payment_id}")
async def get_customer_payment(
    payment_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single customer payment with allocations"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT cp.*, c.customer_name
            FROM customer_payments cp
            LEFT JOIN customers c ON cp.customer_id = c.id
            WHERE cp.id = %s AND cp.company_id = %s
        """, (payment_id, company_id))
        
        payment = cursor.fetchone()
        if not payment:
            raise HTTPException(status_code=404, detail="Customer payment not found")
        
        cursor.execute("""
            SELECT pa.*, ci.invoice_number
            FROM payment_allocations pa
            LEFT JOIN customer_invoices ci ON pa.invoice_id = ci.id
            WHERE pa.payment_id = %s
            ORDER BY pa.created_at
        """, (payment_id,))
        
        allocations = cursor.fetchall()
        
        return {
            'id': str(payment['id']),
            'payment_number': payment.get('payment_number'),
            'customer_id': str(payment['customer_id']) if payment.get('customer_id') else None,
            'customer_name': payment.get('customer_name'),
            'payment_date': payment['payment_date'].isoformat() if payment.get('payment_date') else None,
            'amount': float(payment.get('amount', 0)),
            'payment_method': payment.get('payment_method'),
            'reference': payment.get('reference'),
            'status': payment.get('status'),
            'notes': payment.get('notes'),
            'created_at': payment['created_at'].isoformat() if payment.get('created_at') else None,
            'updated_at': payment['updated_at'].isoformat() if payment.get('updated_at') else None,
            'allocations': [{
                'id': str(alloc['id']),
                'invoice_id': str(alloc['invoice_id']) if alloc.get('invoice_id') else None,
                'invoice_number': alloc.get('invoice_number'),
                'allocated_amount': float(alloc.get('allocated_amount', 0))
            } for alloc in allocations]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customer_payments_router.post("")
async def create_customer_payment(
    payment_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new customer payment"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 'PMT-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM customer_payments WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        payment_number = f"PMT-{next_num:05d}"
        
        payment_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO customer_payments (id, company_id, payment_number, customer_id, payment_date,
                                          amount, payment_method, reference, status, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, payment_number
        """, (payment_id, company_id, payment_number, payment_data.get('customer_id'),
              payment_data.get('payment_date'), payment_data.get('amount'),
              payment_data.get('payment_method'), payment_data.get('reference'),
              'unallocated', payment_data.get('notes')))
        
        result = cursor.fetchone()
        
        allocations = payment_data.get('allocations', [])
        for alloc in allocations:
            cursor.execute("""
                INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at, updated_at)
                VALUES (%s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), payment_id, alloc.get('invoice_id'),
                  alloc.get('allocated_amount', 0)))
        
        if allocations:
            cursor.execute("""
                UPDATE customer_payments SET status = 'allocated', updated_at = NOW()
                WHERE id = %s
            """, (payment_id,))
        
        conn.commit()
        return {'id': str(result['id']), 'payment_number': result['payment_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customer_payments_router.put("/{payment_id}")
async def update_customer_payment(
    payment_id: str = Path(...),
    payment_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a customer payment"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE customer_payments
            SET payment_method = %s, reference = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (payment_data.get('payment_method'), payment_data.get('reference'),
              payment_data.get('notes'), payment_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer payment not found")
        
        conn.commit()
        return {"message": "Customer payment updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customer_payments_router.post("/{payment_id}/allocate")
async def allocate_payment(
    payment_id: str = Path(...),
    allocation_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Allocate a payment to invoices"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM customer_payments WHERE id = %s AND company_id = %s", (payment_id, company_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Customer payment not found")
        
        cursor.execute("""
            INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
        """, (str(uuid.uuid4()), payment_id, allocation_data.get('invoice_id'),
              allocation_data.get('allocated_amount', 0)))
        
        cursor.execute("""
            UPDATE customer_payments SET status = 'allocated', updated_at = NOW()
            WHERE id = %s
        """, (payment_id,))
        
        conn.commit()
        return {"message": "Payment allocated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@customer_payments_router.delete("/{payment_id}")
async def delete_customer_payment(
    payment_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a customer payment"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM payment_allocations WHERE payment_id = %s", (payment_id,))
        cursor.execute("DELETE FROM customer_payments WHERE id = %s AND company_id = %s", (payment_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer payment not found")
        
        conn.commit()
        return {"message": "Customer payment deleted successfully"}
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

payment_allocations_router = APIRouter(prefix="/api/payments/allocations", tags=["Payment Allocations"])

@payment_allocations_router.get("")
async def list_payment_allocations(
    payment_id: Optional[str] = Query(None),
    invoice_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all payment allocations"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT pa.*, cp.payment_number, ci.invoice_number
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            LEFT JOIN customer_invoices ci ON pa.invoice_id = ci.id
            WHERE cp.company_id = %s
        """
        params = [company_id]
        
        if payment_id:
            query += " AND pa.payment_id = %s"
            params.append(payment_id)
        if invoice_id:
            query += " AND pa.invoice_id = %s"
            params.append(invoice_id)
        
        query += " ORDER BY pa.created_at DESC"
        
        cursor.execute(query, params)
        allocations = cursor.fetchall()
        
        result = []
        for alloc in allocations:
            result.append({
                'id': str(alloc['id']),
                'payment_id': str(alloc['payment_id']),
                'payment_number': alloc.get('payment_number'),
                'invoice_id': str(alloc['invoice_id']) if alloc.get('invoice_id') else None,
                'invoice_number': alloc.get('invoice_number'),
                'allocated_amount': float(alloc.get('allocated_amount', 0)),
                'created_at': alloc['created_at'].isoformat() if alloc.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@payment_allocations_router.get("/{allocation_id}")
async def get_payment_allocation(
    allocation_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single payment allocation"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT pa.*, cp.payment_number, ci.invoice_number
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            LEFT JOIN customer_invoices ci ON pa.invoice_id = ci.id
            WHERE pa.id = %s AND cp.company_id = %s
        """, (allocation_id, company_id))
        
        alloc = cursor.fetchone()
        if not alloc:
            raise HTTPException(status_code=404, detail="Payment allocation not found")
        
        return {
            'id': str(alloc['id']),
            'payment_id': str(alloc['payment_id']),
            'payment_number': alloc.get('payment_number'),
            'invoice_id': str(alloc['invoice_id']) if alloc.get('invoice_id') else None,
            'invoice_number': alloc.get('invoice_number'),
            'allocated_amount': float(alloc.get('allocated_amount', 0)),
            'created_at': alloc['created_at'].isoformat() if alloc.get('created_at') else None,
            'updated_at': alloc['updated_at'].isoformat() if alloc.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@payment_allocations_router.delete("/{allocation_id}")
async def delete_payment_allocation(
    allocation_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a payment allocation"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT pa.payment_id
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            WHERE pa.id = %s AND cp.company_id = %s
        """, (allocation_id, company_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Payment allocation not found")
        
        payment_id = result['payment_id']
        
        cursor.execute("DELETE FROM payment_allocations WHERE id = %s", (allocation_id,))
        
        cursor.execute("SELECT COUNT(*) as count FROM payment_allocations WHERE payment_id = %s", (payment_id,))
        count = cursor.fetchone()['count']
        
        if count == 0:
            cursor.execute("""
                UPDATE customer_payments SET status = 'unallocated', updated_at = NOW()
                WHERE id = %s
            """, (payment_id,))
        
        conn.commit()
        return {"message": "Payment allocation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
