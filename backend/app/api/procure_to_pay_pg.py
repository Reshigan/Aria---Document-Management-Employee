"""
ARIA ERP - Procure-to-Pay Module (PostgreSQL)
Provides full CRUD operations for Purchase Orders, Goods Receipts, AP Invoices
Matches frontend API contract: /erp/procure-to-pay/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import uuid
import logging
from decimal import Decimal

from core.auth import get_current_user
from core.rbac import require_permission, Permission
from services.gl_posting_service_sync import GLPostingServiceSync

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# Initialize GL posting service
gl_posting_service = GLPostingServiceSync(DATABASE_URL)

# ========================================
# ========================================

purchase_orders_router = APIRouter(prefix="/erp/procure-to-pay/purchase-orders", tags=["Procure-to-Pay Purchase Orders"])

@purchase_orders_router.get("")
async def list_purchase_orders(
    supplier_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all purchase orders with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT po.id, po.po_number, po.supplier_id, s.supplier_name,
                   po.order_date, po.expected_delivery_date, po.status,
                   po.subtotal, po.tax_amount, po.total_amount,
                   po.created_at, po.updated_at
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.company_id = %s
        """
        params = [company_id]
        
        if supplier_id:
            query += " AND po.supplier_id = %s"
            params.append(supplier_id)
        if status:
            query += " AND po.status = %s"
            params.append(status)
        
        query += " ORDER BY po.created_at DESC"
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        
        result = []
        for order in orders:
            result.append({
                'id': str(order['id']),
                'po_number': order['po_number'],
                'supplier_id': str(order['supplier_id']) if order['supplier_id'] else None,
                'supplier_name': order.get('supplier_name'),
                'order_date': order['order_date'].isoformat() if order['order_date'] else None,
                'expected_delivery_date': order['expected_delivery_date'].isoformat() if order.get('expected_delivery_date') else None,
                'status': order['status'],
                'subtotal': float(order['subtotal']) if order.get('subtotal') else 0.0,
                'tax_amount': float(order['tax_amount']) if order.get('tax_amount') else 0.0,
                'total_amount': float(order['total_amount']) if order['total_amount'] else 0.0,
                'created_at': order['created_at'].isoformat() if order.get('created_at') else None,
                'updated_at': order['updated_at'].isoformat() if order.get('updated_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_orders_router.get("/{po_id}")
async def get_purchase_order(
    po_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single purchase order with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT po.*, s.supplier_name, s.email as supplier_email
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = %s AND po.company_id = %s
        """, (po_id, company_id))
        
        po = cursor.fetchone()
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        cursor.execute("""
            SELECT pol.*, p.product_code, p.product_name,
                   COALESCE((SELECT SUM(grl.quantity_received) FROM goods_receipt_lines grl
                            JOIN goods_receipts gr ON grl.receipt_id = gr.id
                            WHERE grl.purchase_order_line_id = pol.id), 0) as quantity_received
            FROM purchase_order_lines pol
            LEFT JOIN products p ON pol.product_id = p.id
            WHERE pol.order_id = %s
            ORDER BY pol.line_number
        """, (po_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(po['id']),
            'po_number': po['po_number'],
            'supplier_id': str(po['supplier_id']) if po['supplier_id'] else None,
            'supplier_name': po.get('supplier_name'),
            'supplier_email': po.get('supplier_email'),
            'order_date': po['order_date'].isoformat() if po['order_date'] else None,
            'expected_delivery_date': po['expected_delivery_date'].isoformat() if po.get('expected_delivery_date') else None,
            'status': po['status'],
            'subtotal': float(po['subtotal']) if po.get('subtotal') else 0.0,
            'tax_amount': float(po['tax_amount']) if po.get('tax_amount') else 0.0,
            'total_amount': float(po['total_amount']) if po['total_amount'] else 0.0,
            'notes': po.get('notes'),
            'terms_and_conditions': po.get('terms_and_conditions'),
            'created_at': po['created_at'].isoformat() if po.get('created_at') else None,
            'updated_at': po['updated_at'].isoformat() if po.get('updated_at') else None,
            'created_by': po.get('created_by'),
            'gl_entry_id': str(po['gl_entry_id']) if po.get('gl_entry_id') else None,
            'gl_posted': po.get('gl_posted', False),
            'posted_at': po['posted_at'].isoformat() if po.get('posted_at') else None,
            'posted_by': po.get('posted_by'),
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'product_id': str(line['product_id']) if line['product_id'] else None,
                'product_code': line.get('product_code'),
                'product_name': line.get('product_name'),
                'description': line['description'],
                'quantity': float(line['quantity']) if line['quantity'] else 0.0,
                'unit_price': float(line['unit_price']) if line['unit_price'] else 0.0,
                'discount_percent': float(line.get('discount_percent', 0)),
                'tax_rate': float(line.get('tax_rate', 0)),
                'line_total': float(line['line_total']) if line['line_total'] else 0.0,
                'quantity_received': float(line.get('quantity_received', 0)),
                'quantity_remaining': float(line['quantity']) - float(line.get('quantity_received', 0)) if line['quantity'] else 0.0
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_orders_router.post("")
async def create_purchase_order(
    po_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new purchase order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 'PO-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM purchase_orders WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        po_number = f"PO-{next_num:05d}"
        
        lines = po_data.get('lines', [])
        subtotal = sum(float(line.get('quantity', 0)) * float(line.get('unit_price', 0)) * (1 - float(line.get('discount_percent', 0))/100) for line in lines)
        tax_amount = sum(float(line.get('quantity', 0)) * float(line.get('unit_price', 0)) * (1 - float(line.get('discount_percent', 0))/100) * float(line.get('tax_rate', 0))/100 for line in lines)
        total_amount = subtotal + tax_amount
        
        po_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO purchase_orders (id, company_id, po_number, supplier_id, order_date, expected_delivery_date, status, subtotal, tax_amount, total_amount, notes, terms_and_conditions, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, po_number
        """, (po_id, company_id, po_number, po_data.get('supplier_id'), po_data.get('order_date'), 
              po_data.get('expected_delivery_date'), 'draft', subtotal, tax_amount, total_amount,
              po_data.get('notes'), po_data.get('terms_and_conditions'), user_email))
        
        result = cursor.fetchone()
        
        for idx, line in enumerate(lines, 1):
            line_total = float(line.get('quantity', 0)) * float(line.get('unit_price', 0)) * (1 - float(line.get('discount_percent', 0))/100) * (1 + float(line.get('tax_rate', 0))/100)
            cursor.execute("""
                INSERT INTO purchase_order_lines (id, order_id, line_number, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), po_id, idx, line.get('product_id'), line.get('description'),
                  line.get('quantity'), line.get('unit_price'), line.get('discount_percent', 0),
                  line.get('tax_rate', 0), line_total))
        
        conn.commit()
        return {'id': str(result['id']), 'po_number': result['po_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_orders_router.post("/{po_id}/cancel")
async def cancel_purchase_order(
    po_id: str = Path(...),
    cancel_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(require_permission(Permission.PURCHASE_DELETE))
):
    """Cancel a purchase order (only allowed for draft or approved status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status, po_number FROM purchase_orders WHERE id = %s AND company_id = %s", (po_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        status, po_number = result['status'], result['po_number']
        if status not in ['draft', 'approved']:
            raise HTTPException(status_code=400, detail=f"Cannot cancel purchase order with status: {status}")
        
        cursor.execute("UPDATE purchase_orders SET status = 'cancelled', updated_at = NOW() WHERE id = %s AND company_id = %s", (po_id, company_id))
        conn.commit()
        
        return {
            "message": f"Purchase order {po_number} cancelled successfully",
            "po_id": po_id,
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

@purchase_orders_router.patch("/{po_id}")
async def update_purchase_order(
    po_id: str = Path(...),
    update_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a purchase order (only allowed in draft status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status FROM purchase_orders WHERE id = %s AND company_id = %s", (po_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        if result['status'] != 'draft':
            raise HTTPException(status_code=400, detail="Can only update draft purchase orders")
        
        update_fields = []
        params = []
        
        if 'order_date' in update_data:
            update_fields.append("order_date = %s")
            params.append(update_data['order_date'])
        if 'expected_delivery_date' in update_data:
            update_fields.append("expected_delivery_date = %s")
            params.append(update_data['expected_delivery_date'])
        if 'notes' in update_data:
            update_fields.append("notes = %s")
            params.append(update_data['notes'])
        
        if update_fields:
            update_fields.append("updated_at = NOW()")
            params.extend([po_id, company_id])
            query = f"UPDATE purchase_orders SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
            cursor.execute(query, params)
            conn.commit()
        
        return {"message": "Purchase order updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_orders_router.post("/{po_id}/approve")
async def approve_purchase_order(
    po_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a purchase order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("UPDATE purchase_orders SET status = 'approved', updated_at = NOW() WHERE id = %s AND company_id = %s", (po_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        conn.commit()
        return {"message": "Purchase order approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_orders_router.delete("/{po_id}")
async def delete_purchase_order(
    po_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a purchase order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM purchase_order_lines WHERE order_id = %s", (po_id,))
        cursor.execute("DELETE FROM purchase_orders WHERE id = %s AND company_id = %s", (po_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        conn.commit()
        return {"message": "Purchase order deleted successfully"}
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

goods_receipts_router = APIRouter(prefix="/erp/procure-to-pay/goods-receipts", tags=["Procure-to-Pay Goods Receipts"])

@goods_receipts_router.get("")
async def list_goods_receipts(
    purchase_order_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all goods receipts with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT gr.id, gr.receipt_number, gr.purchase_order_id, po.po_number,
                   gr.receipt_date, gr.status, gr.notes, gr.created_at
            FROM goods_receipts gr
            LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
            WHERE gr.company_id = %s
        """
        params = [company_id]
        
        if purchase_order_id:
            query += " AND gr.purchase_order_id = %s"
            params.append(purchase_order_id)
        
        query += " ORDER BY gr.created_at DESC"
        
        cursor.execute(query, params)
        receipts = cursor.fetchall()
        
        result = []
        for receipt in receipts:
            result.append({
                'id': str(receipt['id']),
                'receipt_number': receipt['receipt_number'],
                'purchase_order_id': str(receipt['purchase_order_id']) if receipt['purchase_order_id'] else None,
                'po_number': receipt.get('po_number'),
                'receipt_date': receipt['receipt_date'].isoformat() if receipt['receipt_date'] else None,
                'status': receipt['status'],
                'notes': receipt.get('notes'),
                'created_at': receipt['created_at'].isoformat() if receipt.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@goods_receipts_router.get("/{receipt_id}")
async def get_goods_receipt(
    receipt_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single goods receipt with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT gr.*, po.po_number, s.supplier_name
            FROM goods_receipts gr
            LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE gr.id = %s AND gr.company_id = %s
        """, (receipt_id, company_id))
        
        receipt = cursor.fetchone()
        if not receipt:
            raise HTTPException(status_code=404, detail="Goods receipt not found")
        
        cursor.execute("""
            SELECT grl.*, p.product_code, p.product_name
            FROM goods_receipt_lines grl
            LEFT JOIN products p ON grl.product_id = p.id
            WHERE grl.receipt_id = %s
            ORDER BY grl.line_number
        """, (receipt_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(receipt['id']),
            'receipt_number': receipt['receipt_number'],
            'purchase_order_id': str(receipt['purchase_order_id']) if receipt['purchase_order_id'] else None,
            'po_number': receipt.get('po_number'),
            'supplier_name': receipt.get('supplier_name'),
            'receipt_date': receipt['receipt_date'].isoformat() if receipt['receipt_date'] else None,
            'status': receipt['status'],
            'notes': receipt.get('notes'),
            'created_at': receipt['created_at'].isoformat() if receipt.get('created_at') else None,
            'updated_at': receipt['updated_at'].isoformat() if receipt.get('updated_at') else None,
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'product_id': str(line['product_id']) if line['product_id'] else None,
                'product_code': line.get('product_code'),
                'product_name': line.get('product_name'),
                'description': line.get('description'),
                'quantity_received': float(line['quantity_received']) if line['quantity_received'] else 0.0,
                'unit_price': float(line.get('unit_price', 0))
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@goods_receipts_router.post("/{receipt_id}/cancel")
async def cancel_goods_receipt(
    receipt_id: str = Path(...),
    cancel_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(get_current_user)
):
    """Cancel a goods receipt (only allowed for draft or pending status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status, receipt_number FROM goods_receipts WHERE id = %s AND company_id = %s", (receipt_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Goods receipt not found")
        
        status, receipt_number = result['status'], result['receipt_number']
        if status not in ['draft', 'pending']:
            raise HTTPException(status_code=400, detail=f"Cannot cancel goods receipt with status: {status}")
        
        cursor.execute("UPDATE goods_receipts SET status = 'cancelled', updated_at = NOW() WHERE id = %s AND company_id = %s", (receipt_id, company_id))
        conn.commit()
        
        return {
            "message": f"Goods receipt {receipt_number} cancelled successfully",
            "receipt_id": receipt_id,
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

@goods_receipts_router.post("")
async def create_goods_receipt(
    receipt_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new goods receipt"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        purchase_order_id = receipt_data.get('purchase_order_id')
        if not purchase_order_id:
            raise HTTPException(status_code=400, detail="purchase_order_id is required")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 'GR-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM goods_receipts WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        receipt_number = f"GR-{next_num:05d}"
        
        receipt_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO goods_receipts (id, company_id, receipt_number, purchase_order_id, receipt_date, status, notes, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, receipt_number
        """, (receipt_id, company_id, receipt_number, purchase_order_id, datetime.now().date(),
              'draft', receipt_data.get('notes'), user_email))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'receipt_number': result['receipt_number']}
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

ap_invoices_router = APIRouter(prefix="/erp/procure-to-pay/invoices", tags=["Procure-to-Pay AP Invoices"])

@ap_invoices_router.get("")
async def list_ap_invoices(
    supplier_id: Optional[str] = Query(None),
    purchase_order_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all AP invoices with optional filters"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT si.id, si.invoice_number, si.supplier_id, s.supplier_name,
                   si.invoice_date, si.due_date, si.status, si.payment_status,
                   si.total_amount, si.amount_paid, si.amount_outstanding,
                   si.created_at
            FROM supplier_invoices si
            LEFT JOIN suppliers s ON si.supplier_id = s.id
            WHERE si.company_id = %s
        """
        params = [company_id]
        
        if supplier_id:
            query += " AND si.supplier_id = %s"
            params.append(supplier_id)
        if purchase_order_id:
            query += " AND si.purchase_order_id = %s"
            params.append(purchase_order_id)
        
        query += " ORDER BY si.created_at DESC"
        
        cursor.execute(query, params)
        invoices = cursor.fetchall()
        
        result = []
        for invoice in invoices:
            result.append({
                'id': str(invoice['id']),
                'invoice_number': invoice['invoice_number'],
                'supplier_id': str(invoice['supplier_id']) if invoice['supplier_id'] else None,
                'supplier_name': invoice.get('supplier_name'),
                'invoice_date': invoice['invoice_date'].isoformat() if invoice['invoice_date'] else None,
                'due_date': invoice['due_date'].isoformat() if invoice['due_date'] else None,
                'status': invoice['status'],
                'payment_status': invoice.get('payment_status', 'unpaid'),
                'total_amount': float(invoice['total_amount']) if invoice['total_amount'] else 0.0,
                'amount_paid': float(invoice.get('amount_paid', 0)),
                'amount_outstanding': float(invoice.get('amount_outstanding', 0)),
                'created_at': invoice['created_at'].isoformat() if invoice.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@ap_invoices_router.get("/{invoice_id}")
async def get_ap_invoice(
    invoice_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single AP invoice with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT si.*, s.supplier_name
            FROM supplier_invoices si
            LEFT JOIN suppliers s ON si.supplier_id = s.id
            WHERE si.id = %s AND si.company_id = %s
        """, (invoice_id, company_id))
        
        invoice = cursor.fetchone()
        if not invoice:
            raise HTTPException(status_code=404, detail="AP invoice not found")
        
        cursor.execute("""
            SELECT sil.*, p.product_code, p.product_name
            FROM supplier_invoice_line_items sil
            LEFT JOIN products p ON sil.product_id = p.id
            WHERE sil.invoice_id = %s
            ORDER BY sil.line_number
        """, (invoice_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(invoice['id']),
            'invoice_number': invoice['invoice_number'],
            'supplier_id': str(invoice['supplier_id']) if invoice['supplier_id'] else None,
            'supplier_name': invoice.get('supplier_name'),
            'invoice_date': invoice['invoice_date'].isoformat() if invoice['invoice_date'] else None,
            'due_date': invoice['due_date'].isoformat() if invoice['due_date'] else None,
            'status': invoice['status'],
            'payment_status': invoice.get('payment_status', 'unpaid'),
            'purchase_order_id': str(invoice['purchase_order_id']) if invoice.get('purchase_order_id') else None,
            'goods_receipt_id': str(invoice['goods_receipt_id']) if invoice.get('goods_receipt_id') else None,
            'subtotal': float(invoice.get('subtotal', 0)),
            'tax_amount': float(invoice.get('tax_amount', 0)),
            'total_amount': float(invoice['total_amount']) if invoice['total_amount'] else 0.0,
            'amount_paid': float(invoice.get('amount_paid', 0)),
            'amount_outstanding': float(invoice.get('amount_outstanding', 0)),
            'notes': invoice.get('notes'),
            'created_at': invoice['created_at'].isoformat() if invoice.get('created_at') else None,
            'updated_at': invoice['updated_at'].isoformat() if invoice.get('updated_at') else None,
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'product_id': str(line['product_id']) if line.get('product_id') else None,
                'product_code': line.get('product_code'),
                'product_name': line.get('product_name'),
                'description': line.get('description'),
                'quantity': float(line['quantity']) if line['quantity'] else 0.0,
                'unit_price': float(line['unit_price']) if line['unit_price'] else 0.0,
                'discount_percent': float(line.get('discount_percent', 0)),
                'tax_rate': float(line.get('tax_rate', 0)),
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

@ap_invoices_router.post("")
async def create_ap_invoice(
    invoice_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new AP invoice (supplier invoice)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email', 'system')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        supplier_id = invoice_data.get('supplier_id')
        if not supplier_id:
            raise HTTPException(status_code=400, detail="supplier_id is required")
        
        # Generate invoice number
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'BILL-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM supplier_invoices WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        invoice_number = f"BILL-{next_num:05d}"
        
        # Calculate totals
        lines = invoice_data.get('lines', [])
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        
        for line in lines:
            quantity = Decimal(str(line.get('quantity', 0)))
            unit_price = Decimal(str(line.get('unit_price', 0)))
            tax_rate = Decimal(str(line.get('tax_rate', 0)))
            line_subtotal = quantity * unit_price
            subtotal += line_subtotal
            tax_amount += line_subtotal * tax_rate
        
        total_amount = subtotal + tax_amount
        
        # Get supplier name for GL posting
        cursor.execute("SELECT supplier_name FROM suppliers WHERE id = %s", (supplier_id,))
        supplier_result = cursor.fetchone()
        supplier_name = supplier_result['supplier_name'] if supplier_result else f"Supplier {supplier_id}"
        
        # Create invoice
        invoice_id = str(uuid.uuid4())
        invoice_date = invoice_data.get('invoice_date', datetime.now().date())
        due_date = invoice_data.get('due_date')
        
        cursor.execute("""
            INSERT INTO supplier_invoices (
                id, company_id, invoice_number, supplier_id, invoice_date, due_date,
                subtotal, tax_amount, total_amount, amount_paid, amount_outstanding,
                status, payment_status, purchase_order_id, goods_receipt_id, notes,
                created_by, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
            ) RETURNING id, invoice_number
        """, (
            invoice_id, company_id, invoice_number, supplier_id, invoice_date, due_date,
            float(subtotal), float(tax_amount), float(total_amount), 0.0, float(total_amount),
            'draft', 'unpaid', invoice_data.get('purchase_order_id'), invoice_data.get('goods_receipt_id'),
            invoice_data.get('notes'), user_email
        ))
        
        result = cursor.fetchone()
        
        # Create invoice line items
        for idx, line in enumerate(lines, start=1):
            line_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO supplier_invoice_line_items (
                    id, invoice_id, line_number, product_id, description,
                    quantity, unit_price, discount_percent, tax_rate, total_amount,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                line_id, invoice_id, idx, line.get('product_id'),
                line.get('description'), line.get('quantity'), line.get('unit_price'),
                line.get('discount_percent', 0), line.get('tax_rate', 0),
                float(Decimal(str(line.get('quantity', 0))) * Decimal(str(line.get('unit_price', 0))))
            ))
        
        conn.commit()
        
        # Post to GL (GRNI, VAT Input, AP)
        try:
            journal_entry_id = gl_posting_service.post_supplier_bill(
                company_id=company_id,
                bill_id=invoice_id,
                bill_number=invoice_number,
                bill_date=invoice_date,
                supplier_name=supplier_name,
                subtotal=subtotal,
                vat_amount=tax_amount,
                total_amount=total_amount,
                user_id=user_email
            )
            if journal_entry_id:
                logger.info(f"✅ GL posting created for supplier invoice {invoice_number}: JE-{journal_entry_id}")
            else:
                logger.warning(f"⚠️ GL posting skipped for supplier invoice {invoice_number}")
        except Exception as e:
            logger.error(f"❌ Failed to post supplier invoice {invoice_number} to GL: {e}")
            # Don't fail the invoice creation if GL posting fails
        
        return {'id': str(result['id']), 'invoice_number': result['invoice_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@ap_invoices_router.post("/{invoice_id}/cancel")
async def cancel_ap_invoice(
    invoice_id: str = Path(...),
    cancel_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(require_permission(Permission.AP_DELETE))
):
    """Cancel an AP invoice (only allowed for draft or approved status)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT status, invoice_number FROM supplier_invoices WHERE id = %s AND company_id = %s", (invoice_id, company_id))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        status, invoice_number = result['status'], result['invoice_number']
        if status not in ['draft', 'approved']:
            raise HTTPException(status_code=400, detail=f"Cannot cancel invoice with status: {status}")
        
        cursor.execute("UPDATE supplier_invoices SET status = 'cancelled', updated_at = NOW() WHERE id = %s AND company_id = %s", (invoice_id, company_id))
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
