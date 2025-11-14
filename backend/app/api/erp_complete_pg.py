"""
ARIA ERP - Complete API Endpoints (PostgreSQL)
Provides all missing endpoints for AR, Banking, Payroll, and Line Items
"""

from fastapi import APIRouter, HTTPException, Query, Depends, Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import psycopg2
import psycopg2.extras
import os

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# ========================================

ar_router = APIRouter(prefix="/api/ar", tags=["Accounts Receivable"])

@ar_router.get("/customers")
async def list_customers(
    company_id: Optional[str] = Query(None, description="Company ID"),
    is_active: bool = True,
    current_user: Dict = Depends(get_current_user)
):
    """List all customers for a company"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        comp_id = company_id or current_user.get('organization_id')
        
        if not comp_id:
            return []
        
        cursor.execute("""
            SELECT 
                id, name, email, phone, address_line1, address_line2,
                city, state, postal_code, country, credit_limit,
                is_active, company_id, created_at, updated_at
            FROM customers
            WHERE company_id = %s AND is_active = %s
            ORDER BY name
        """, (comp_id, is_active))
        
        customers = cursor.fetchall()
        
        result = []
        for customer in customers:
            result.append({
                'id': str(customer['id']),
                'name': customer['name'],
                'email': customer['email'],
                'phone': customer['phone'],
                'address_line1': customer['address_line1'],
                'address_line2': customer['address_line2'],
                'city': customer['city'],
                'state': customer['state'],
                'postal_code': customer['postal_code'],
                'country': customer['country'],
                'credit_limit': float(customer['credit_limit']) if customer['credit_limit'] else 0.0,
                'is_active': customer['is_active'],
                'created_at': customer['created_at'].isoformat() if customer['created_at'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@ar_router.get("/invoices")
async def list_ar_invoices(
    company_id: Optional[str] = Query(None, description="Company ID"),
    status: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List all AR invoices for a company"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        comp_id = company_id or current_user.get('organization_id')
        
        if not comp_id:
            return []
        
        query = """
            SELECT 
                id, invoice_number, customer_id, invoice_date, due_date,
                total_amount, amount_paid, status, company_id, created_at
            FROM customer_invoices
            WHERE company_id = %s
        """
        params = [comp_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY invoice_date DESC"
        
        cursor.execute(query, params)
        invoices = cursor.fetchall()
        
        result = []
        for invoice in invoices:
            result.append({
                'id': str(invoice['id']),
                'invoice_number': invoice['invoice_number'],
                'customer_id': str(invoice['customer_id']) if invoice['customer_id'] else None,
                'invoice_date': invoice['invoice_date'].isoformat() if invoice['invoice_date'] else None,
                'due_date': invoice['due_date'].isoformat() if invoice['due_date'] else None,
                'total_amount': float(invoice['total_amount']) if invoice['total_amount'] else 0.0,
                'amount_paid': float(invoice['amount_paid']) if invoice['amount_paid'] else 0.0,
                'status': invoice['status'],
                'created_at': invoice['created_at'].isoformat() if invoice['created_at'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@ar_router.get("/invoices/{invoice_id}/line-items")
async def get_ar_invoice_line_items(
    invoice_id: str = Path(..., description="Invoice ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for an AR invoice"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                id, invoice_id, line_number, description, quantity,
                unit_price, tax_amount, total_amount, product_id, created_at
            FROM invoice_line_items
            WHERE invoice_id = %s
            ORDER BY line_number
        """, (invoice_id,))
        
        line_items = cursor.fetchall()
        
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'invoice_id': str(item['invoice_id']),
                'line_number': item['line_number'],
                'description': item['description'],
                'quantity': float(item['quantity']) if item['quantity'] else 0.0,
                'unit_price': float(item['unit_price']) if item['unit_price'] else 0.0,
                'tax_amount': float(item['tax_amount']) if item['tax_amount'] else 0.0,
                'total_amount': float(item['total_amount']) if item['total_amount'] else 0.0,
                'product_id': str(item['product_id']) if item['product_id'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================================
# ========================================

banking_router = APIRouter(prefix="/api/banking", tags=["Banking"])

@banking_router.get("/accounts")
async def list_bank_accounts(
    company_id: Optional[str] = Query(None, description="Company ID"),
    is_active: bool = True,
    current_user: Dict = Depends(get_current_user)
):
    """List all bank accounts for a company"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        comp_id = company_id or current_user.get('organization_id')
        
        if not comp_id:
            return []
        
        cursor.execute("""
            SELECT 
                id, account_number, bank_name, branch_code, currency,
                balance, is_active, company_id, created_at, updated_at
            FROM bank_accounts
            WHERE company_id = %s AND is_active = %s
            ORDER BY bank_name, account_number
        """, (comp_id, is_active))
        
        accounts = cursor.fetchall()
        
        result = []
        for account in accounts:
            result.append({
                'id': str(account['id']),
                'account_number': account['account_number'],
                'bank_name': account['bank_name'],
                'branch_code': account['branch_code'],
                'currency': account['currency'],
                'balance': float(account['balance']) if account['balance'] else 0.0,
                'is_active': account['is_active'],
                'created_at': account['created_at'].isoformat() if account['created_at'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================================
# ========================================

payroll_router = APIRouter(prefix="/api/payroll", tags=["Payroll"])

@payroll_router.get("/employees")
async def list_employees(
    company_id: Optional[str] = Query(None, description="Company ID"),
    is_active: bool = True,
    current_user: Dict = Depends(get_current_user)
):
    """List all employees for a company"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        comp_id = company_id or current_user.get('organization_id')
        
        if not comp_id:
            return []
        
        cursor.execute("""
            SELECT 
                id, email, first_name, last_name, role,
                is_active, company_id, created_at
            FROM users
            WHERE company_id = %s AND is_active = %s
            ORDER BY first_name, last_name
        """, (comp_id, is_active))
        
        users = cursor.fetchall()
        
        result = []
        for user in users:
            result.append({
                'id': str(user['id']),
                'employee_number': str(user['id'])[:8],
                'name': f"{user['first_name']} {user['last_name']}".strip(),
                'email': user['email'],
                'department': user['role'],
                'position': user['role'],
                'type': 'Permanent',
                'salary': 0.0,
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================================
# ========================================

sales_orders_router = APIRouter(prefix="/api/sales-orders", tags=["Sales Orders"])

@sales_orders_router.get("/{order_id}/line-items")
async def get_sales_order_line_items(
    order_id: str = Path(..., description="Sales Order ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a sales order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                id, order_id, line_number, product_id, description,
                quantity, unit_price, discount_percent, tax_rate,
                line_total, created_at, updated_at
            FROM sales_order_lines
            WHERE order_id = %s
            ORDER BY line_number
        """, (order_id,))
        
        line_items = cursor.fetchall()
        
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'order_id': str(item['order_id']),
                'line_number': item['line_number'],
                'product_id': str(item['product_id']) if item['product_id'] else None,
                'description': item['description'],
                'quantity': float(item['quantity']) if item['quantity'] else 0.0,
                'unit_price': float(item['unit_price']) if item['unit_price'] else 0.0,
                'discount_percent': float(item['discount_percent']) if item['discount_percent'] else 0.0,
                'tax_rate': float(item['tax_rate']) if item['tax_rate'] else 0.0,
                'line_total': float(item['line_total']) if item['line_total'] else 0.0,
                'created_at': item['created_at'].isoformat() if item['created_at'] else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@sales_orders_router.post("/{order_id}/line-items")
async def create_sales_order_line_item(
    order_id: str = Path(..., description="Sales Order ID"),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a sales order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT COALESCE(MAX(line_number), 0) + 1 as next_line
            FROM sales_order_lines
            WHERE order_id = %s
        """, (order_id,))
        
        next_line = cursor.fetchone()['next_line']
        
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        discount_percent = float(line_item.get('discount_percent', 0))
        tax_rate = float(line_item.get('tax_rate', 0))
        
        subtotal = quantity * unit_price
        discount_amount = subtotal * (discount_percent / 100)
        taxable_amount = subtotal - discount_amount
        tax_amount = taxable_amount * (tax_rate / 100)
        line_total = taxable_amount + tax_amount
        
        cursor.execute("""
            INSERT INTO sales_order_lines (
                order_id, line_number, product_id, description,
                quantity, unit_price, discount_percent, tax_rate,
                line_total, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, order_id, line_number, description, quantity, unit_price, line_total
        """, (
            order_id, next_line, line_item.get('product_id'),
            line_item.get('description'), quantity, unit_price,
            discount_percent, tax_rate, line_total
        ))
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'order_id': str(result['order_id']),
            'line_number': result['line_number'],
            'description': result['description'],
            'quantity': float(result['quantity']),
            'unit_price': float(result['unit_price']),
            'line_total': float(result['line_total'])
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@sales_orders_router.put("/{order_id}/line-items/{line_item_id}")
async def update_sales_order_line_item(
    order_id: str = Path(..., description="Sales Order ID"),
    line_item_id: str = Path(..., description="Line Item ID"),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a sales order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        discount_percent = float(line_item.get('discount_percent', 0))
        tax_rate = float(line_item.get('tax_rate', 0))
        
        subtotal = quantity * unit_price
        discount_amount = subtotal * (discount_percent / 100)
        taxable_amount = subtotal - discount_amount
        tax_amount = taxable_amount * (tax_rate / 100)
        line_total = taxable_amount + tax_amount
        
        cursor.execute("""
            UPDATE sales_order_lines
            SET description = %s, quantity = %s, unit_price = %s,
                discount_percent = %s, tax_rate = %s, line_total = %s,
                updated_at = NOW()
            WHERE id = %s AND order_id = %s
            RETURNING id, description, quantity, unit_price, line_total
        """, (
            line_item.get('description'), quantity, unit_price,
            discount_percent, tax_rate, line_total,
            line_item_id, order_id
        ))
        
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        
        conn.commit()
        
        return {
            'id': str(result['id']),
            'description': result['description'],
            'quantity': float(result['quantity']),
            'unit_price': float(result['unit_price']),
            'line_total': float(result['line_total'])
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@sales_orders_router.delete("/{order_id}/line-items/{line_item_id}")
async def delete_sales_order_line_item(
    order_id: str = Path(..., description="Sales Order ID"),
    line_item_id: str = Path(..., description="Line Item ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a sales order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            DELETE FROM sales_order_lines
            WHERE id = %s AND order_id = %s
        """, (line_item_id, order_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Line item not found")
        
        conn.commit()
        
        return {"message": "Line item deleted successfully"}
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

quotes_router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

@quotes_router.get("/{quote_id}/line-items")
async def get_quote_line_items(
    quote_id: str = Path(..., description="Quote ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a quote"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                id, quote_id, line_number, product_id, description,
                quantity, unit_price, discount_percent, tax_rate,
                line_total, created_at, updated_at
            FROM quote_lines
            WHERE quote_id = %s
            ORDER BY line_number
        """, (quote_id,))
        
        line_items = cursor.fetchall()
        
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'quote_id': str(item['quote_id']),
                'line_number': item['line_number'],
                'product_id': str(item['product_id']) if item['product_id'] else None,
                'description': item['description'],
                'quantity': float(item['quantity']) if item['quantity'] else 0.0,
                'unit_price': float(item['unit_price']) if item['unit_price'] else 0.0,
                'discount_percent': float(item['discount_percent']) if item['discount_percent'] else 0.0,
                'tax_rate': float(item['tax_rate']) if item['tax_rate'] else 0.0,
                'line_total': float(item['line_total']) if item['line_total'] else 0.0
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================================
# ========================================

ap_invoices_router = APIRouter(prefix="/api/ap/invoices", tags=["AP Invoices"])

@ap_invoices_router.get("/{invoice_id}/line-items")
async def get_ap_invoice_line_items(
    invoice_id: str = Path(..., description="Invoice ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for an AP invoice"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                id, invoice_id, line_number, description, quantity,
                unit_price, tax_amount, total_amount, created_at
            FROM supplier_invoice_line_items
            WHERE invoice_id = %s
            ORDER BY line_number
        """, (invoice_id,))
        
        line_items = cursor.fetchall()
        
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'invoice_id': str(item['invoice_id']),
                'line_number': item['line_number'],
                'description': item['description'],
                'quantity': float(item['quantity']) if item['quantity'] else 0.0,
                'unit_price': float(item['unit_price']) if item['unit_price'] else 0.0,
                'tax_amount': float(item['tax_amount']) if item['tax_amount'] else 0.0,
                'total_amount': float(item['total_amount']) if item['total_amount'] else 0.0
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ========================================
# ========================================

deliveries_router = APIRouter(prefix="/api/deliveries", tags=["Deliveries"])

@deliveries_router.get("/{delivery_id}/line-items")
async def get_delivery_line_items(
    delivery_id: str = Path(..., description="Delivery ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a delivery"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                id, delivery_id, line_number, product_id, description,
                quantity_ordered, quantity_delivered, unit_of_measure,
                created_at, updated_at
            FROM delivery_lines
            WHERE delivery_id = %s
            ORDER BY line_number
        """, (delivery_id,))
        
        line_items = cursor.fetchall()
        
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'delivery_id': str(item['delivery_id']),
                'line_number': item['line_number'],
                'product_id': str(item['product_id']) if item['product_id'] else None,
                'description': item['description'],
                'quantity_ordered': float(item['quantity_ordered']) if item['quantity_ordered'] else 0.0,
                'quantity_delivered': float(item['quantity_delivered']) if item['quantity_delivered'] else 0.0,
                'unit_of_measure': item['unit_of_measure']
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
