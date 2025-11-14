"""
ARIA ERP - Order-to-Cash Module (PostgreSQL)
Provides full CRUD operations for Quotes, Sales Orders, Invoices, Deliveries
Matches frontend API contract: /erp/order-to-cash/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime, timedelta
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

quotes_router = APIRouter(prefix="/erp/order-to-cash/quotes", tags=["Order-to-Cash Quotes"])

@quotes_router.get("")
async def list_quotes(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List all quotes with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT q.id, q.quote_number, q.customer_id, c.customer_name, c.email as customer_email,
                   q.quote_date, q.valid_until, q.status, q.subtotal, q.tax_amount, q.total_amount,
                   q.notes, q.created_at, q.updated_at
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.company_id = %s
        """
        params = [company_id]
        
        if customer_id:
            query += " AND q.customer_id = %s"
            params.append(customer_id)
        if status:
            query += " AND q.status = %s"
            params.append(status)
        
        query += " ORDER BY q.created_at DESC"
        
        cursor.execute(query, params)
        quotes = cursor.fetchall()
        
        result = []
        for quote in quotes:
            result.append({
                'id': str(quote['id']),
                'quote_number': quote['quote_number'],
                'customer_id': str(quote['customer_id']) if quote['customer_id'] else None,
                'customer_name': quote['customer_name'],
                'customer_email': quote['customer_email'],
                'quote_date': quote['quote_date'].isoformat() if quote['quote_date'] else None,
                'valid_until': quote['valid_until'].isoformat() if quote['valid_until'] else None,
                'status': quote['status'],
                'subtotal': float(quote['subtotal']) if quote['subtotal'] else 0.0,
                'tax_amount': float(quote['tax_amount']) if quote['tax_amount'] else 0.0,
                'total_amount': float(quote['total_amount']) if quote['total_amount'] else 0.0,
                'notes': quote['notes'],
                'created_at': quote['created_at'].isoformat() if quote['created_at'] else None,
                'updated_at': quote['updated_at'].isoformat() if quote['updated_at'] else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.get("/{quote_id}")
async def get_quote(
    quote_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single quote with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT q.*, c.customer_name, c.email as customer_email
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = %s AND q.company_id = %s
        """, (quote_id, company_id))
        
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        cursor.execute("""
            SELECT ql.*, p.product_code, p.product_name
            FROM quote_lines ql
            LEFT JOIN products p ON ql.product_id = p.id
            WHERE ql.quote_id = %s
            ORDER BY ql.line_number
        """, (quote_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(quote['id']),
            'quote_number': quote['quote_number'],
            'customer_id': str(quote['customer_id']) if quote['customer_id'] else None,
            'customer_name': quote['customer_name'],
            'customer_email': quote['customer_email'],
            'quote_date': quote['quote_date'].isoformat() if quote['quote_date'] else None,
            'valid_until': quote['valid_until'].isoformat() if quote['valid_until'] else None,
            'status': quote['status'],
            'subtotal': float(quote['subtotal']) if quote['subtotal'] else 0.0,
            'tax_amount': float(quote['tax_amount']) if quote['tax_amount'] else 0.0,
            'total_amount': float(quote['total_amount']) if quote['total_amount'] else 0.0,
            'notes': quote['notes'],
            'terms_and_conditions': quote.get('terms_and_conditions'),
            'created_at': quote['created_at'].isoformat() if quote['created_at'] else None,
            'updated_at': quote['updated_at'].isoformat() if quote['updated_at'] else None,
            'created_by': quote.get('created_by'),
            'gl_entry_id': str(quote['gl_entry_id']) if quote.get('gl_entry_id') else None,
            'gl_posted': quote.get('gl_posted', False),
            'posted_at': quote['posted_at'].isoformat() if quote.get('posted_at') else None,
            'posted_by': quote.get('posted_by'),
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'product_id': str(line['product_id']) if line['product_id'] else None,
                'product_code': line['product_code'],
                'product_name': line['product_name'],
                'description': line['description'],
                'quantity': float(line['quantity']) if line['quantity'] else 0.0,
                'unit_price': float(line['unit_price']) if line['unit_price'] else 0.0,
                'discount_percent': float(line['discount_percent']) if line['discount_percent'] else 0.0,
                'tax_rate': float(line['tax_rate']) if line['tax_rate'] else 0.0,
                'line_total': float(line['line_total']) if line['line_total'] else 0.0
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.post("")
async def create_quote(
    quote_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new quote"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QT-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM quotes WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        quote_number = f"QT-{next_num:05d}"
        
        lines = quote_data.get('lines', [])
        subtotal = sum(float(line.get('quantity', 0)) * float(line.get('unit_price', 0)) * (1 - float(line.get('discount_percent', 0))/100) for line in lines)
        tax_amount = sum(float(line.get('quantity', 0)) * float(line.get('unit_price', 0)) * (1 - float(line.get('discount_percent', 0))/100) * float(line.get('tax_rate', 0))/100 for line in lines)
        total_amount = subtotal + tax_amount
        
        quote_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO quotes (id, company_id, quote_number, customer_id, quote_date, valid_until, status, subtotal, tax_amount, total_amount, notes, terms_and_conditions, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, quote_number
        """, (quote_id, company_id, quote_number, quote_data.get('customer_id'), quote_data.get('quote_date'), quote_data.get('valid_until'), 'draft', subtotal, tax_amount, total_amount, quote_data.get('notes'), quote_data.get('terms_and_conditions'), user_email))
        
        result = cursor.fetchone()
        
        for idx, line in enumerate(lines, 1):
            line_total = float(line.get('quantity', 0)) * float(line.get('unit_price', 0)) * (1 - float(line.get('discount_percent', 0))/100) * (1 + float(line.get('tax_rate', 0))/100)
            cursor.execute("""
                INSERT INTO quote_lines (id, quote_id, line_number, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), quote_id, idx, line.get('product_id'), line.get('description'), line.get('quantity'), line.get('unit_price'), line.get('discount_percent', 0), line.get('tax_rate', 0), line_total))
        
        conn.commit()
        return {'id': str(result['id']), 'quote_number': result['quote_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.delete("/{quote_id}")
async def delete_quote(
    quote_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a quote"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM quote_lines WHERE quote_id = %s", (quote_id,))
        cursor.execute("DELETE FROM quotes WHERE id = %s AND company_id = %s", (quote_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        conn.commit()
        return {"message": "Quote deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.post("/{quote_id}/approve")
async def approve_quote(
    quote_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a quote"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("UPDATE quotes SET status = 'approved', updated_at = NOW() WHERE id = %s AND company_id = %s", (quote_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        conn.commit()
        return {"message": "Quote approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.post("/{quote_id}/send")
async def send_quote(
    quote_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Send a quote to customer"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("UPDATE quotes SET status = 'sent', updated_at = NOW() WHERE id = %s AND company_id = %s", (quote_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        conn.commit()
        return {"message": "Quote sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.post("/{quote_id}/accept")
async def accept_quote(
    quote_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Accept a quote and create a sales order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT * FROM quotes WHERE id = %s AND company_id = %s", (quote_id, company_id))
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'SO-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM sales_orders WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        order_number = f"SO-{next_num:05d}"
        
        sales_order_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO sales_orders (id, company_id, order_number, customer_id, quote_id, order_date, status, subtotal, tax_amount, total_amount, notes, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, order_number
        """, (sales_order_id, company_id, order_number, quote['customer_id'], quote_id, datetime.now().date(), 'draft', quote['subtotal'], quote['tax_amount'], quote['total_amount'], quote['notes'], user_email))
        
        result = cursor.fetchone()
        
        cursor.execute("SELECT * FROM quote_lines WHERE quote_id = %s ORDER BY line_number", (quote_id,))
        quote_lines = cursor.fetchall()
        
        for line in quote_lines:
            cursor.execute("""
                INSERT INTO sales_order_lines (id, order_id, line_number, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), sales_order_id, line['line_number'], line['product_id'], line['description'], line['quantity'], line['unit_price'], line['discount_percent'], line['tax_rate'], line['line_total']))
        
        cursor.execute("UPDATE quotes SET status = 'accepted', updated_at = NOW() WHERE id = %s", (quote_id,))
        
        conn.commit()
        return {'sales_order_id': str(result['id']), 'sales_order_number': result['order_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_router.post("/{quote_id}/reject")
async def reject_quote(
    quote_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Reject a quote"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("UPDATE quotes SET status = 'rejected', updated_at = NOW() WHERE id = %s AND company_id = %s", (quote_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        conn.commit()
        return {"message": "Quote rejected successfully"}
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

sales_orders_router = APIRouter(prefix="/erp/order-to-cash/sales-orders", tags=["Order-to-Cash Sales Orders"])

@sales_orders_router.get("")
async def list_sales_orders(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List all sales orders with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT so.id, so.order_number, so.customer_id, c.customer_name,
                   so.order_date, so.required_date, so.status, so.subtotal, so.tax_amount, so.total_amount,
                   so.created_at, so.updated_at
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE so.company_id = %s
        """
        params = [company_id]
        
        if customer_id:
            query += " AND so.customer_id = %s"
            params.append(customer_id)
        if status:
            query += " AND so.status = %s"
            params.append(status)
        
        query += " ORDER BY so.created_at DESC"
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        
        result = []
        for order in orders:
            result.append({
                'id': str(order['id']),
                'order_number': order['order_number'],
                'customer_id': str(order['customer_id']) if order['customer_id'] else None,
                'customer_name': order['customer_name'],
                'order_date': order['order_date'].isoformat() if order['order_date'] else None,
                'required_date': order['required_date'].isoformat() if order.get('required_date') else None,
                'status': order['status'],
                'subtotal': float(order['subtotal']) if order['subtotal'] else 0.0,
                'tax_amount': float(order['tax_amount']) if order['tax_amount'] else 0.0,
                'total_amount': float(order['total_amount']) if order['total_amount'] else 0.0,
                'created_at': order['created_at'].isoformat() if order['created_at'] else None,
                'updated_at': order['updated_at'].isoformat() if order['updated_at'] else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@sales_orders_router.get("/{order_id}")
async def get_sales_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single sales order with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT so.*, c.customer_name, c.email as customer_email, q.quote_number
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN quotes q ON so.quote_id = q.id
            WHERE so.id = %s AND so.company_id = %s
        """, (order_id, company_id))
        
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Sales order not found")
        
        cursor.execute("""
            SELECT sol.*, p.product_code, p.product_name,
                   COALESCE((SELECT SUM(dl.quantity_delivered) FROM delivery_lines dl 
                            JOIN deliveries d ON dl.delivery_id = d.id 
                            WHERE dl.sales_order_line_id = sol.id), 0) as quantity_delivered
            FROM sales_order_lines sol
            LEFT JOIN products p ON sol.product_id = p.id
            WHERE sol.order_id = %s
            ORDER BY sol.line_number
        """, (order_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(order['id']),
            'order_number': order['order_number'],
            'customer_id': str(order['customer_id']) if order['customer_id'] else None,
            'customer_name': order['customer_name'],
            'customer_email': order['customer_email'],
            'quote_id': str(order['quote_id']) if order.get('quote_id') else None,
            'quote_number': order.get('quote_number'),
            'order_date': order['order_date'].isoformat() if order['order_date'] else None,
            'required_date': order['required_date'].isoformat() if order.get('required_date') else None,
            'status': order['status'],
            'subtotal': float(order['subtotal']) if order['subtotal'] else 0.0,
            'tax_amount': float(order['tax_amount']) if order['tax_amount'] else 0.0,
            'total_amount': float(order['total_amount']) if order['total_amount'] else 0.0,
            'notes': order.get('notes'),
            'warehouse_id': str(order['warehouse_id']) if order.get('warehouse_id') else None,
            'created_at': order['created_at'].isoformat() if order['created_at'] else None,
            'updated_at': order['updated_at'].isoformat() if order['updated_at'] else None,
            'gl_entry_id': str(order['gl_entry_id']) if order.get('gl_entry_id') else None,
            'gl_posted': order.get('gl_posted', False),
            'posted_at': order['posted_at'].isoformat() if order.get('posted_at') else None,
            'posted_by': order.get('posted_by'),
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'product_id': str(line['product_id']) if line['product_id'] else None,
                'product_code': line.get('product_code'),
                'product_name': line.get('product_name'),
                'description': line['description'],
                'quantity': float(line['quantity']) if line['quantity'] else 0.0,
                'unit_price': float(line['unit_price']) if line['unit_price'] else 0.0,
                'discount_percent': float(line['discount_percent']) if line['discount_percent'] else 0.0,
                'tax_rate': float(line['tax_rate']) if line['tax_rate'] else 0.0,
                'line_total': float(line['line_total']) if line['line_total'] else 0.0,
                'quantity_delivered': float(line.get('quantity_delivered', 0)),
                'quantity_remaining': float(line['quantity']) - float(line.get('quantity_delivered', 0)) if line['quantity'] else 0.0
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@sales_orders_router.post("/{order_id}/approve")
async def approve_sales_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a sales order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("UPDATE sales_orders SET status = 'approved', updated_at = NOW() WHERE id = %s AND company_id = %s", (order_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sales order not found")
        
        conn.commit()
        return {"message": "Sales order approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@sales_orders_router.delete("/{order_id}")
async def delete_sales_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a sales order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM sales_order_lines WHERE order_id = %s", (order_id,))
        cursor.execute("DELETE FROM sales_orders WHERE id = %s AND company_id = %s", (order_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sales order not found")
        
        conn.commit()
        return {"message": "Sales order deleted successfully"}
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

deliveries_router = APIRouter(prefix="/erp/order-to-cash/deliveries", tags=["Order-to-Cash Deliveries"])

@deliveries_router.get("")
async def list_deliveries(
    sales_order_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List all deliveries with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT d.id, d.delivery_number, d.sales_order_id, so.order_number,
                   d.delivery_date, d.status, d.notes, d.created_at
            FROM deliveries d
            LEFT JOIN sales_orders so ON d.sales_order_id = so.id
            WHERE d.company_id = %s
        """
        params = [company_id]
        
        if sales_order_id:
            query += " AND d.sales_order_id = %s"
            params.append(sales_order_id)
        
        query += " ORDER BY d.created_at DESC"
        
        cursor.execute(query, params)
        deliveries = cursor.fetchall()
        
        result = []
        for delivery in deliveries:
            result.append({
                'id': str(delivery['id']),
                'delivery_number': delivery['delivery_number'],
                'sales_order_id': str(delivery['sales_order_id']) if delivery['sales_order_id'] else None,
                'order_number': delivery.get('order_number'),
                'delivery_date': delivery['delivery_date'].isoformat() if delivery['delivery_date'] else None,
                'status': delivery['status'],
                'notes': delivery.get('notes'),
                'created_at': delivery['created_at'].isoformat() if delivery['created_at'] else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@deliveries_router.post("")
async def create_delivery(
    delivery_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new delivery from a sales order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        sales_order_id = delivery_data.get('sales_order_id')
        if not sales_order_id:
            raise HTTPException(status_code=400, detail="sales_order_id is required")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM 'DN-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM deliveries WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        delivery_number = f"DN-{next_num:05d}"
        
        delivery_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO deliveries (id, company_id, delivery_number, sales_order_id, delivery_date, status, notes, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, delivery_number
        """, (delivery_id, company_id, delivery_number, sales_order_id, datetime.now().date(), 'draft', delivery_data.get('notes'), user_email))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'delivery_number': result['delivery_number']}
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

invoices_router = APIRouter(prefix="/erp/order-to-cash/invoices", tags=["Order-to-Cash Invoices"])

@invoices_router.get("")
async def list_invoices(
    sales_order_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List all AR invoices with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT ci.id, ci.invoice_number, ci.customer_id, c.customer_name,
                   ci.invoice_date, ci.due_date, ci.status, ci.payment_status,
                   ci.total_amount, ci.amount_paid, ci.amount_outstanding,
                   ci.created_at
            FROM customer_invoices ci
            LEFT JOIN customers c ON ci.customer_id = c.id
            WHERE ci.company_id = %s
        """
        params = [company_id]
        
        if sales_order_id:
            query += " AND ci.sales_order_id = %s"
            params.append(sales_order_id)
        if customer_id:
            query += " AND ci.customer_id = %s"
            params.append(customer_id)
        
        query += " ORDER BY ci.created_at DESC"
        
        cursor.execute(query, params)
        invoices = cursor.fetchall()
        
        result = []
        for invoice in invoices:
            result.append({
                'id': str(invoice['id']),
                'invoice_number': invoice['invoice_number'],
                'customer_id': str(invoice['customer_id']) if invoice['customer_id'] else None,
                'customer_name': invoice.get('customer_name'),
                'invoice_date': invoice['invoice_date'].isoformat() if invoice['invoice_date'] else None,
                'due_date': invoice['due_date'].isoformat() if invoice['due_date'] else None,
                'status': invoice['status'],
                'payment_status': invoice.get('payment_status', 'unpaid'),
                'total_amount': float(invoice['total_amount']) if invoice['total_amount'] else 0.0,
                'amount_paid': float(invoice.get('amount_paid', 0)),
                'amount_due': float(invoice.get('amount_outstanding', 0)),
                'created_at': invoice['created_at'].isoformat() if invoice['created_at'] else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@invoices_router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single AR invoice with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT ci.*, c.customer_name
            FROM customer_invoices ci
            LEFT JOIN customers c ON ci.customer_id = c.id
            WHERE ci.id = %s AND ci.company_id = %s
        """, (invoice_id, company_id))
        
        invoice = cursor.fetchone()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        cursor.execute("""
            SELECT il.*, p.product_code, p.product_name
            FROM invoice_line_items il
            LEFT JOIN products p ON il.product_id = p.id
            WHERE il.invoice_id = %s
            ORDER BY il.line_number
        """, (invoice_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(invoice['id']),
            'invoice_number': invoice['invoice_number'],
            'customer_id': str(invoice['customer_id']) if invoice['customer_id'] else None,
            'customer_name': invoice.get('customer_name'),
            'invoice_date': invoice['invoice_date'].isoformat() if invoice['invoice_date'] else None,
            'due_date': invoice['due_date'].isoformat() if invoice['due_date'] else None,
            'status': invoice['status'],
            'payment_status': invoice.get('payment_status', 'unpaid'),
            'sales_order_id': str(invoice['sales_order_id']) if invoice.get('sales_order_id') else None,
            'delivery_id': str(invoice['delivery_id']) if invoice.get('delivery_id') else None,
            'subtotal': float(invoice['subtotal']) if invoice.get('subtotal') else 0.0,
            'tax_amount': float(invoice['tax_amount']) if invoice.get('tax_amount') else 0.0,
            'total_amount': float(invoice['total_amount']) if invoice['total_amount'] else 0.0,
            'amount_paid': float(invoice.get('amount_paid', 0)),
            'amount_outstanding': float(invoice.get('amount_outstanding', 0)),
            'notes': invoice.get('notes'),
            'terms_and_conditions': invoice.get('terms_and_conditions'),
            'created_at': invoice['created_at'].isoformat() if invoice['created_at'] else None,
            'updated_at': invoice['updated_at'].isoformat() if invoice.get('updated_at') else None,
            'journal_entry_id': str(invoice['journal_entry_id']) if invoice.get('journal_entry_id') else None,
            'posted_at': invoice['posted_at'].isoformat() if invoice.get('posted_at') else None,
            'posted_by': invoice.get('posted_by'),
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'product_id': str(line['product_id']) if line.get('product_id') else None,
                'product_code': line.get('product_code'),
                'product_name': line.get('product_name'),
                'description': line['description'],
                'quantity': float(line['quantity']) if line['quantity'] else 0.0,
                'unit_price': float(line['unit_price']) if line['unit_price'] else 0.0,
                'discount_percent': float(line.get('discount_percent', 0)),
                'tax_rate': float(line.get('tax_rate', 0)),
                'tax_amount': float(line.get('tax_amount', 0)),
                'total_amount': float(line['total_amount']) if line['total_amount'] else 0.0
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@invoices_router.post("/{invoice_id}/cancel")
async def cancel_invoice(
    invoice_id: str = Path(...),
    cancel_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(get_current_user)
):
    """Cancel an AR invoice (only allowed for draft or approved status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status, invoice_number FROM customer_invoices WHERE id = %s AND company_id = %s", (invoice_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        status, invoice_number = result['status'], result['invoice_number']
        if status not in ['draft', 'approved']:
            raise HTTPException(status_code=400, detail=f"Cannot cancel invoice with status: {status}")
        
        cursor.execute("UPDATE customer_invoices SET status = 'cancelled', updated_at = NOW() WHERE id = %s AND company_id = %s", (invoice_id, company_id))
        conn.commit()
        
        return {
            "message": f"Invoice {invoice_number} cancelled successfully",
            "invoice_id": invoice_id,
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
