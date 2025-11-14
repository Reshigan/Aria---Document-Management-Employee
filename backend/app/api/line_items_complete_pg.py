"""
ARIA ERP - Complete Line Items API (PostgreSQL)
Provides full CRUD operations for ALL line item types across ALL modules
"""

from fastapi import APIRouter, HTTPException, Path, Depends
from typing import Dict, Any
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

quotes_line_items_router = APIRouter(prefix="/api/quotes", tags=["Quotes Line Items"])

@quotes_line_items_router.post("/{quote_id}/line-items")
async def create_quote_line_item(
    quote_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a quote"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM quote_lines WHERE quote_id = %s", (quote_id,))
        next_line = cursor.fetchone()['next_line']
        
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        discount_percent = float(line_item.get('discount_percent', 0))
        tax_rate = float(line_item.get('tax_rate', 0))
        line_total = quantity * unit_price * (1 - discount_percent/100) * (1 + tax_rate/100)
        
        cursor.execute("""
            INSERT INTO quote_lines (quote_id, line_number, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, quote_id, line_number, description, quantity, unit_price, line_total
        """, (quote_id, next_line, line_item.get('product_id'), line_item.get('description'), quantity, unit_price, discount_percent, tax_rate, line_total))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'quote_id': str(result['quote_id']), 'line_number': result['line_number'], 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'line_total': float(result['line_total'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_line_items_router.put("/{quote_id}/line-items/{line_item_id}")
async def update_quote_line_item(
    quote_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a quote"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        discount_percent = float(line_item.get('discount_percent', 0))
        tax_rate = float(line_item.get('tax_rate', 0))
        line_total = quantity * unit_price * (1 - discount_percent/100) * (1 + tax_rate/100)
        
        cursor.execute("""
            UPDATE quote_lines SET description = %s, quantity = %s, unit_price = %s, discount_percent = %s, tax_rate = %s, line_total = %s, updated_at = NOW()
            WHERE id = %s AND quote_id = %s
            RETURNING id, description, quantity, unit_price, line_total
        """, (line_item.get('description'), quantity, unit_price, discount_percent, tax_rate, line_total, line_item_id, quote_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'line_total': float(result['line_total'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quotes_line_items_router.delete("/{quote_id}/line-items/{line_item_id}")
async def delete_quote_line_item(
    quote_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a quote"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM quote_lines WHERE id = %s AND quote_id = %s", (line_item_id, quote_id))
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

ar_invoice_line_items_router = APIRouter(prefix="/api/ar/invoices", tags=["AR Invoice Line Items"])

@ar_invoice_line_items_router.post("/{invoice_id}/line-items")
async def create_ar_invoice_line_item(
    invoice_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for an AR invoice"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM invoice_line_items WHERE invoice_id = %s", (invoice_id,))
        next_line = cursor.fetchone()['next_line']
        
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        tax_amount = float(line_item.get('tax_amount', 0))
        total_amount = (quantity * unit_price) + tax_amount
        
        cursor.execute("""
            INSERT INTO invoice_line_items (invoice_id, line_number, description, quantity, unit_price, tax_amount, total_amount, product_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, invoice_id, line_number, description, quantity, unit_price, total_amount
        """, (invoice_id, next_line, line_item.get('description'), quantity, unit_price, tax_amount, total_amount, line_item.get('product_id')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'invoice_id': str(result['invoice_id']), 'line_number': result['line_number'], 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'total_amount': float(result['total_amount'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@ar_invoice_line_items_router.put("/{invoice_id}/line-items/{line_item_id}")
async def update_ar_invoice_line_item(
    invoice_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for an AR invoice"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        tax_amount = float(line_item.get('tax_amount', 0))
        total_amount = (quantity * unit_price) + tax_amount
        
        cursor.execute("""
            UPDATE invoice_line_items SET description = %s, quantity = %s, unit_price = %s, tax_amount = %s, total_amount = %s
            WHERE id = %s AND invoice_id = %s
            RETURNING id, description, quantity, unit_price, total_amount
        """, (line_item.get('description'), quantity, unit_price, tax_amount, total_amount, line_item_id, invoice_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'total_amount': float(result['total_amount'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@ar_invoice_line_items_router.delete("/{invoice_id}/line-items/{line_item_id}")
async def delete_ar_invoice_line_item(
    invoice_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from an AR invoice"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM invoice_line_items WHERE id = %s AND invoice_id = %s", (line_item_id, invoice_id))
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

ap_invoice_line_items_router = APIRouter(prefix="/api/ap/invoices", tags=["AP Invoice Line Items"])

@ap_invoice_line_items_router.post("/{invoice_id}/line-items")
async def create_ap_invoice_line_item(
    invoice_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for an AP invoice"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM supplier_invoice_line_items WHERE invoice_id = %s", (invoice_id,))
        next_line = cursor.fetchone()['next_line']
        
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        tax_amount = float(line_item.get('tax_amount', 0))
        total_amount = (quantity * unit_price) + tax_amount
        
        cursor.execute("""
            INSERT INTO supplier_invoice_line_items (invoice_id, line_number, description, quantity, unit_price, tax_amount, total_amount, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, invoice_id, line_number, description, quantity, unit_price, total_amount
        """, (invoice_id, next_line, line_item.get('description'), quantity, unit_price, tax_amount, total_amount))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'invoice_id': str(result['invoice_id']), 'line_number': result['line_number'], 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'total_amount': float(result['total_amount'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@ap_invoice_line_items_router.put("/{invoice_id}/line-items/{line_item_id}")
async def update_ap_invoice_line_item(
    invoice_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for an AP invoice"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        tax_amount = float(line_item.get('tax_amount', 0))
        total_amount = (quantity * unit_price) + tax_amount
        
        cursor.execute("""
            UPDATE supplier_invoice_line_items SET description = %s, quantity = %s, unit_price = %s, tax_amount = %s, total_amount = %s
            WHERE id = %s AND invoice_id = %s
            RETURNING id, description, quantity, unit_price, total_amount
        """, (line_item.get('description'), quantity, unit_price, tax_amount, total_amount, line_item_id, invoice_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'total_amount': float(result['total_amount'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@ap_invoice_line_items_router.delete("/{invoice_id}/line-items/{line_item_id}")
async def delete_ap_invoice_line_item(
    invoice_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from an AP invoice"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM supplier_invoice_line_items WHERE id = %s AND invoice_id = %s", (line_item_id, invoice_id))
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

delivery_line_items_router = APIRouter(prefix="/api/deliveries", tags=["Delivery Line Items"])

@delivery_line_items_router.post("/{delivery_id}/line-items")
async def create_delivery_line_item(
    delivery_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a delivery"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM delivery_lines WHERE delivery_id = %s", (delivery_id,))
        next_line = cursor.fetchone()['next_line']
        
        cursor.execute("""
            INSERT INTO delivery_lines (delivery_id, line_number, product_id, description, quantity_ordered, quantity_delivered, unit_of_measure, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, delivery_id, line_number, description, quantity_ordered, quantity_delivered
        """, (delivery_id, next_line, line_item.get('product_id'), line_item.get('description'), line_item.get('quantity_ordered', 0), line_item.get('quantity_delivered', 0), line_item.get('unit_of_measure', 'EA')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'delivery_id': str(result['delivery_id']), 'line_number': result['line_number'], 'description': result['description'], 'quantity_ordered': float(result['quantity_ordered']), 'quantity_delivered': float(result['quantity_delivered'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@delivery_line_items_router.put("/{delivery_id}/line-items/{line_item_id}")
async def update_delivery_line_item(
    delivery_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a delivery"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            UPDATE delivery_lines SET description = %s, quantity_ordered = %s, quantity_delivered = %s, unit_of_measure = %s, updated_at = NOW()
            WHERE id = %s AND delivery_id = %s
            RETURNING id, description, quantity_ordered, quantity_delivered
        """, (line_item.get('description'), line_item.get('quantity_ordered', 0), line_item.get('quantity_delivered', 0), line_item.get('unit_of_measure', 'EA'), line_item_id, delivery_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'quantity_ordered': float(result['quantity_ordered']), 'quantity_delivered': float(result['quantity_delivered'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@delivery_line_items_router.delete("/{delivery_id}/line-items/{line_item_id}")
async def delete_delivery_line_item(
    delivery_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a delivery"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM delivery_lines WHERE id = %s AND delivery_id = %s", (line_item_id, delivery_id))
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

purchase_order_router = APIRouter(prefix="/api/purchase-orders", tags=["Purchase Orders"])

@purchase_order_router.get("/{po_id}/line-items")
async def get_purchase_order_line_items(
    po_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a purchase order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, purchase_order_id, line_number, product_id, description, quantity, unit_price, tax_rate, line_total, created_at, updated_at
            FROM purchase_order_lines WHERE purchase_order_id = %s ORDER BY line_number
        """, (po_id,))
        
        line_items = cursor.fetchall()
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'purchase_order_id': str(item['purchase_order_id']),
                'line_number': item['line_number'],
                'product_id': str(item['product_id']) if item['product_id'] else None,
                'description': item['description'],
                'quantity': float(item['quantity']) if item['quantity'] else 0.0,
                'unit_price': float(item['unit_price']) if item['unit_price'] else 0.0,
                'tax_rate': float(item['tax_rate']) if item['tax_rate'] else 0.0,
                'line_total': float(item['line_total']) if item['line_total'] else 0.0
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_order_router.post("/{po_id}/line-items")
async def create_purchase_order_line_item(
    po_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a purchase order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM purchase_order_lines WHERE purchase_order_id = %s", (po_id,))
        next_line = cursor.fetchone()['next_line']
        
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        tax_rate = float(line_item.get('tax_rate', 0))
        line_total = quantity * unit_price * (1 + tax_rate/100)
        
        cursor.execute("""
            INSERT INTO purchase_order_lines (purchase_order_id, line_number, product_id, description, quantity, unit_price, tax_rate, line_total, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, purchase_order_id, line_number, description, quantity, unit_price, line_total
        """, (po_id, next_line, line_item.get('product_id'), line_item.get('description'), quantity, unit_price, tax_rate, line_total))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'purchase_order_id': str(result['purchase_order_id']), 'line_number': result['line_number'], 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'line_total': float(result['line_total'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_order_router.put("/{po_id}/line-items/{line_item_id}")
async def update_purchase_order_line_item(
    po_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a purchase order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        quantity = float(line_item.get('quantity', 1))
        unit_price = float(line_item.get('unit_price', 0))
        tax_rate = float(line_item.get('tax_rate', 0))
        line_total = quantity * unit_price * (1 + tax_rate/100)
        
        cursor.execute("""
            UPDATE purchase_order_lines SET description = %s, quantity = %s, unit_price = %s, tax_rate = %s, line_total = %s, updated_at = NOW()
            WHERE id = %s AND purchase_order_id = %s
            RETURNING id, description, quantity, unit_price, line_total
        """, (line_item.get('description'), quantity, unit_price, tax_rate, line_total, line_item_id, po_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'quantity': float(result['quantity']), 'unit_price': float(result['unit_price']), 'line_total': float(result['line_total'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@purchase_order_router.delete("/{po_id}/line-items/{line_item_id}")
async def delete_purchase_order_line_item(
    po_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a purchase order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM purchase_order_lines WHERE id = %s AND purchase_order_id = %s", (line_item_id, po_id))
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

goods_receipt_router = APIRouter(prefix="/api/goods-receipts", tags=["Goods Receipts"])

@goods_receipt_router.get("/{gr_id}/line-items")
async def get_goods_receipt_line_items(
    gr_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a goods receipt"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, goods_receipt_id, line_number, product_id, description, quantity_ordered, quantity_received, unit_of_measure, created_at, updated_at
            FROM goods_receipt_lines WHERE goods_receipt_id = %s ORDER BY line_number
        """, (gr_id,))
        
        line_items = cursor.fetchall()
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'goods_receipt_id': str(item['goods_receipt_id']),
                'line_number': item['line_number'],
                'product_id': str(item['product_id']) if item['product_id'] else None,
                'description': item['description'],
                'quantity_ordered': float(item['quantity_ordered']) if item['quantity_ordered'] else 0.0,
                'quantity_received': float(item['quantity_received']) if item['quantity_received'] else 0.0,
                'unit_of_measure': item['unit_of_measure']
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@goods_receipt_router.post("/{gr_id}/line-items")
async def create_goods_receipt_line_item(
    gr_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a goods receipt"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM goods_receipt_lines WHERE goods_receipt_id = %s", (gr_id,))
        next_line = cursor.fetchone()['next_line']
        
        cursor.execute("""
            INSERT INTO goods_receipt_lines (goods_receipt_id, line_number, product_id, description, quantity_ordered, quantity_received, unit_of_measure, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, goods_receipt_id, line_number, description, quantity_ordered, quantity_received
        """, (gr_id, next_line, line_item.get('product_id'), line_item.get('description'), line_item.get('quantity_ordered', 0), line_item.get('quantity_received', 0), line_item.get('unit_of_measure', 'EA')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'goods_receipt_id': str(result['goods_receipt_id']), 'line_number': result['line_number'], 'description': result['description'], 'quantity_ordered': float(result['quantity_ordered']), 'quantity_received': float(result['quantity_received'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@goods_receipt_router.put("/{gr_id}/line-items/{line_item_id}")
async def update_goods_receipt_line_item(
    gr_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a goods receipt"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            UPDATE goods_receipt_lines SET description = %s, quantity_ordered = %s, quantity_received = %s, unit_of_measure = %s, updated_at = NOW()
            WHERE id = %s AND goods_receipt_id = %s
            RETURNING id, description, quantity_ordered, quantity_received
        """, (line_item.get('description'), line_item.get('quantity_ordered', 0), line_item.get('quantity_received', 0), line_item.get('unit_of_measure', 'EA'), line_item_id, gr_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'quantity_ordered': float(result['quantity_ordered']), 'quantity_received': float(result['quantity_received'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@goods_receipt_router.delete("/{gr_id}/line-items/{line_item_id}")
async def delete_goods_receipt_line_item(
    gr_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a goods receipt"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM goods_receipt_lines WHERE id = %s AND goods_receipt_id = %s", (line_item_id, gr_id))
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

journal_entry_router = APIRouter(prefix="/api/journal-entries", tags=["Journal Entries"])

@journal_entry_router.get("/{je_id}/line-items")
async def get_journal_entry_line_items(
    je_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a journal entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount, created_at, updated_at
            FROM journal_entry_lines WHERE journal_entry_id = %s ORDER BY line_number
        """, (je_id,))
        
        line_items = cursor.fetchall()
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'journal_entry_id': str(item['journal_entry_id']),
                'line_number': item['line_number'],
                'account_id': str(item['account_id']) if item['account_id'] else None,
                'description': item['description'],
                'debit_amount': float(item['debit_amount']) if item['debit_amount'] else 0.0,
                'credit_amount': float(item['credit_amount']) if item['credit_amount'] else 0.0
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entry_router.post("/{je_id}/line-items")
async def create_journal_entry_line_item(
    je_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a journal entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM journal_entry_lines WHERE journal_entry_id = %s", (je_id,))
        next_line = cursor.fetchone()['next_line']
        
        cursor.execute("""
            INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit_amount, credit_amount, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, journal_entry_id, line_number, description, debit_amount, credit_amount
        """, (je_id, next_line, line_item.get('account_id'), line_item.get('description'), line_item.get('debit_amount', 0), line_item.get('credit_amount', 0)))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'journal_entry_id': str(result['journal_entry_id']), 'line_number': result['line_number'], 'description': result['description'], 'debit_amount': float(result['debit_amount']), 'credit_amount': float(result['credit_amount'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entry_router.put("/{je_id}/line-items/{line_item_id}")
async def update_journal_entry_line_item(
    je_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a journal entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            UPDATE journal_entry_lines SET account_id = %s, description = %s, debit_amount = %s, credit_amount = %s, updated_at = NOW()
            WHERE id = %s AND journal_entry_id = %s
            RETURNING id, description, debit_amount, credit_amount
        """, (line_item.get('account_id'), line_item.get('description'), line_item.get('debit_amount', 0), line_item.get('credit_amount', 0), line_item_id, je_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'debit_amount': float(result['debit_amount']), 'credit_amount': float(result['credit_amount'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@journal_entry_router.delete("/{je_id}/line-items/{line_item_id}")
async def delete_journal_entry_line_item(
    je_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a journal entry"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM journal_entry_lines WHERE id = %s AND journal_entry_id = %s", (line_item_id, je_id))
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

budget_router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

@budget_router.get("/{budget_id}/line-items")
async def get_budget_line_items(
    budget_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get line items for a budget"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, budget_id, line_number, account_id, description, budgeted_amount, actual_amount, variance, created_at, updated_at
            FROM budget_line_items WHERE budget_id = %s ORDER BY line_number
        """, (budget_id,))
        
        line_items = cursor.fetchall()
        result = []
        for item in line_items:
            result.append({
                'id': str(item['id']),
                'budget_id': str(item['budget_id']),
                'line_number': item['line_number'],
                'account_id': str(item['account_id']) if item['account_id'] else None,
                'description': item['description'],
                'budgeted_amount': float(item['budgeted_amount']) if item['budgeted_amount'] else 0.0,
                'actual_amount': float(item['actual_amount']) if item['actual_amount'] else 0.0,
                'variance': float(item['variance']) if item['variance'] else 0.0
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budget_router.post("/{budget_id}/line-items")
async def create_budget_line_item(
    budget_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new line item for a budget"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("SELECT COALESCE(MAX(line_number), 0) + 1 as next_line FROM budget_line_items WHERE budget_id = %s", (budget_id,))
        next_line = cursor.fetchone()['next_line']
        
        budgeted_amount = float(line_item.get('budgeted_amount', 0))
        actual_amount = float(line_item.get('actual_amount', 0))
        variance = budgeted_amount - actual_amount
        
        cursor.execute("""
            INSERT INTO budget_line_items (budget_id, line_number, account_id, description, budgeted_amount, actual_amount, variance, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, budget_id, line_number, description, budgeted_amount, actual_amount, variance
        """, (budget_id, next_line, line_item.get('account_id'), line_item.get('description'), budgeted_amount, actual_amount, variance))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'budget_id': str(result['budget_id']), 'line_number': result['line_number'], 'description': result['description'], 'budgeted_amount': float(result['budgeted_amount']), 'actual_amount': float(result['actual_amount']), 'variance': float(result['variance'])}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budget_router.put("/{budget_id}/line-items/{line_item_id}")
async def update_budget_line_item(
    budget_id: str = Path(...),
    line_item_id: str = Path(...),
    line_item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update a line item for a budget"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        budgeted_amount = float(line_item.get('budgeted_amount', 0))
        actual_amount = float(line_item.get('actual_amount', 0))
        variance = budgeted_amount - actual_amount
        
        cursor.execute("""
            UPDATE budget_line_items SET account_id = %s, description = %s, budgeted_amount = %s, actual_amount = %s, variance = %s, updated_at = NOW()
            WHERE id = %s AND budget_id = %s
            RETURNING id, description, budgeted_amount, actual_amount, variance
        """, (line_item.get('account_id'), line_item.get('description'), budgeted_amount, actual_amount, variance, line_item_id, budget_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Line item not found")
        conn.commit()
        return {'id': str(result['id']), 'description': result['description'], 'budgeted_amount': float(result['budgeted_amount']), 'actual_amount': float(result['actual_amount']), 'variance': float(result['variance'])}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budget_router.delete("/{budget_id}/line-items/{line_item_id}")
async def delete_budget_line_item(
    budget_id: str = Path(...),
    line_item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a line item from a budget"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM budget_line_items WHERE id = %s AND budget_id = %s", (line_item_id, budget_id))
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

price_list_router = APIRouter(prefix="/api/price-lists", tags=["Price Lists"])

@price_list_router.get("/{price_list_id}/items")
async def get_price_list_items(
    price_list_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get items for a price list"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, price_list_id, product_id, unit_price, min_quantity, max_quantity, is_active, created_at, updated_at
            FROM price_list_items WHERE price_list_id = %s ORDER BY product_id
        """, (price_list_id,))
        
        items = cursor.fetchall()
        result = []
        for item in items:
            result.append({
                'id': str(item['id']),
                'price_list_id': str(item['price_list_id']),
                'product_id': str(item['product_id']) if item['product_id'] else None,
                'unit_price': float(item['unit_price']) if item['unit_price'] else 0.0,
                'min_quantity': float(item['min_quantity']) if item['min_quantity'] else 0.0,
                'max_quantity': float(item['max_quantity']) if item['max_quantity'] else 0.0,
                'is_active': item['is_active']
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_list_router.post("/{price_list_id}/items")
async def create_price_list_item(
    price_list_id: str = Path(...),
    item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new item for a price list"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            INSERT INTO price_list_items (price_list_id, product_id, unit_price, min_quantity, max_quantity, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, price_list_id, product_id, unit_price, min_quantity, max_quantity, is_active
        """, (price_list_id, item.get('product_id'), item.get('unit_price', 0), item.get('min_quantity', 0), item.get('max_quantity', 0), item.get('is_active', True)))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'price_list_id': str(result['price_list_id']), 'product_id': str(result['product_id']) if result['product_id'] else None, 'unit_price': float(result['unit_price']), 'min_quantity': float(result['min_quantity']), 'max_quantity': float(result['max_quantity']), 'is_active': result['is_active']}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_list_router.put("/{price_list_id}/items/{item_id}")
async def update_price_list_item(
    price_list_id: str = Path(...),
    item_id: str = Path(...),
    item: Dict[str, Any] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Update an item for a price list"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            UPDATE price_list_items SET unit_price = %s, min_quantity = %s, max_quantity = %s, is_active = %s, updated_at = NOW()
            WHERE id = %s AND price_list_id = %s
            RETURNING id, unit_price, min_quantity, max_quantity, is_active
        """, (item.get('unit_price', 0), item.get('min_quantity', 0), item.get('max_quantity', 0), item.get('is_active', True), item_id, price_list_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Item not found")
        conn.commit()
        return {'id': str(result['id']), 'unit_price': float(result['unit_price']), 'min_quantity': float(result['min_quantity']), 'max_quantity': float(result['max_quantity']), 'is_active': result['is_active']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_list_router.delete("/{price_list_id}/items/{item_id}")
async def delete_price_list_item(
    price_list_id: str = Path(...),
    item_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete an item from a price list"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM price_list_items WHERE id = %s AND price_list_id = %s", (item_id, price_list_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        conn.commit()
        return {"message": "Item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
