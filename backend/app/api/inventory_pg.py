"""
ARIA ERP - Inventory/WMS Module (PostgreSQL)
Provides full CRUD operations for Stock Movements, Warehouses, Stock Adjustments
Matches frontend API contract: /api/inventory/* or /api/wms/*
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

warehouses_router = APIRouter(prefix="/api/inventory/warehouses", tags=["Inventory Warehouses"])

@warehouses_router.get("")
async def list_warehouses(
    current_user: Dict = Depends(get_current_user)
):
    """List all warehouses"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM warehouses
            WHERE company_id = %s
            ORDER BY warehouse_name
        """, (company_id,))
        
        warehouses = cursor.fetchall()
        
        result = []
        for wh in warehouses:
            result.append({
                'id': str(wh['id']),
                'warehouse_code': wh.get('warehouse_code'),
                'warehouse_name': wh.get('warehouse_name'),
                'address': wh.get('address'),
                'city': wh.get('city'),
                'country': wh.get('country'),
                'is_active': wh.get('is_active', True),
                'created_at': wh['created_at'].isoformat() if wh.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@warehouses_router.get("/{warehouse_id}")
async def get_warehouse(
    warehouse_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single warehouse"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM warehouses
            WHERE id = %s AND company_id = %s
        """, (warehouse_id, company_id))
        
        wh = cursor.fetchone()
        if not wh:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        
        return {
            'id': str(wh['id']),
            'warehouse_code': wh.get('warehouse_code'),
            'warehouse_name': wh.get('warehouse_name'),
            'address': wh.get('address'),
            'city': wh.get('city'),
            'country': wh.get('country'),
            'is_active': wh.get('is_active', True),
            'created_at': wh['created_at'].isoformat() if wh.get('created_at') else None,
            'updated_at': wh['updated_at'].isoformat() if wh.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@warehouses_router.post("")
async def create_warehouse(
    warehouse_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new warehouse"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        warehouse_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO warehouses (id, company_id, warehouse_code, warehouse_name, address, city, country, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, warehouse_code, warehouse_name
        """, (warehouse_id, company_id, warehouse_data.get('warehouse_code'),
              warehouse_data.get('warehouse_name'), warehouse_data.get('address'),
              warehouse_data.get('city'), warehouse_data.get('country'),
              warehouse_data.get('is_active', True)))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'warehouse_code': result['warehouse_code'], 'warehouse_name': result['warehouse_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@warehouses_router.put("/{warehouse_id}")
async def update_warehouse(
    warehouse_id: str = Path(...),
    warehouse_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a warehouse"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE warehouses
            SET warehouse_name = %s, address = %s, city = %s, country = %s, is_active = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (warehouse_data.get('warehouse_name'), warehouse_data.get('address'),
              warehouse_data.get('city'), warehouse_data.get('country'),
              warehouse_data.get('is_active', True), warehouse_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        
        conn.commit()
        return {"message": "Warehouse updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@warehouses_router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a warehouse"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM warehouses WHERE id = %s AND company_id = %s", (warehouse_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        
        conn.commit()
        return {"message": "Warehouse deleted successfully"}
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

stock_movements_router = APIRouter(prefix="/api/inventory/stock-movements", tags=["Inventory Stock Movements"])

@stock_movements_router.get("")
async def list_stock_movements(
    product_id: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all stock movements"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT sm.*, p.product_code, p.product_name, w.warehouse_name
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN warehouses w ON sm.warehouse_id = w.id
            WHERE sm.company_id = %s
        """
        params = [company_id]
        
        if product_id:
            query += " AND sm.product_id = %s"
            params.append(product_id)
        if warehouse_id:
            query += " AND sm.warehouse_id = %s"
            params.append(warehouse_id)
        if movement_type:
            query += " AND sm.movement_type = %s"
            params.append(movement_type)
        
        query += " ORDER BY sm.movement_date DESC, sm.created_at DESC"
        
        cursor.execute(query, params)
        movements = cursor.fetchall()
        
        result = []
        for mov in movements:
            result.append({
                'id': str(mov['id']),
                'product_id': str(mov['product_id']) if mov.get('product_id') else None,
                'product_code': mov.get('product_code'),
                'product_name': mov.get('product_name'),
                'warehouse_id': str(mov['warehouse_id']) if mov.get('warehouse_id') else None,
                'warehouse_name': mov.get('warehouse_name'),
                'movement_type': mov.get('movement_type'),
                'quantity': float(mov.get('quantity', 0)),
                'movement_date': mov['movement_date'].isoformat() if mov.get('movement_date') else None,
                'reference': mov.get('reference'),
                'notes': mov.get('notes'),
                'created_at': mov['created_at'].isoformat() if mov.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@stock_movements_router.get("/{movement_id}")
async def get_stock_movement(
    movement_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single stock movement"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT sm.*, p.product_code, p.product_name, w.warehouse_name
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN warehouses w ON sm.warehouse_id = w.id
            WHERE sm.id = %s AND sm.company_id = %s
        """, (movement_id, company_id))
        
        mov = cursor.fetchone()
        if not mov:
            raise HTTPException(status_code=404, detail="Stock movement not found")
        
        return {
            'id': str(mov['id']),
            'product_id': str(mov['product_id']) if mov.get('product_id') else None,
            'product_code': mov.get('product_code'),
            'product_name': mov.get('product_name'),
            'warehouse_id': str(mov['warehouse_id']) if mov.get('warehouse_id') else None,
            'warehouse_name': mov.get('warehouse_name'),
            'movement_type': mov.get('movement_type'),
            'quantity': float(mov.get('quantity', 0)),
            'movement_date': mov['movement_date'].isoformat() if mov.get('movement_date') else None,
            'reference': mov.get('reference'),
            'notes': mov.get('notes'),
            'created_at': mov['created_at'].isoformat() if mov.get('created_at') else None,
            'updated_at': mov['updated_at'].isoformat() if mov.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@stock_movements_router.post("")
async def create_stock_movement(
    movement_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new stock movement"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        movement_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO stock_movements (id, company_id, product_id, warehouse_id, movement_type, 
                                        quantity, movement_date, reference, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (movement_id, company_id, movement_data.get('product_id'),
              movement_data.get('warehouse_id'), movement_data.get('movement_type'),
              movement_data.get('quantity'), movement_data.get('movement_date'),
              movement_data.get('reference'), movement_data.get('notes')))
        
        result = cursor.fetchone()
        
        movement_type = movement_data.get('movement_type')
        quantity = float(movement_data.get('quantity', 0))
        
        if movement_type in ['receipt', 'adjustment_in', 'transfer_in']:
            quantity_change = quantity
        elif movement_type in ['issue', 'adjustment_out', 'transfer_out']:
            quantity_change = -quantity
        else:
            quantity_change = 0
        
        cursor.execute("""
            INSERT INTO stock_on_hand (id, company_id, product_id, warehouse_id, quantity, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (product_id, warehouse_id) 
            DO UPDATE SET quantity = stock_on_hand.quantity + %s, updated_at = NOW()
        """, (str(uuid.uuid4()), company_id, movement_data.get('product_id'),
              movement_data.get('warehouse_id'), quantity_change, quantity_change))
        
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

@stock_movements_router.delete("/{movement_id}")
async def delete_stock_movement(
    movement_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a stock movement"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM stock_movements WHERE id = %s AND company_id = %s", (movement_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Stock movement not found")
        
        conn.commit()
        return {"message": "Stock movement deleted successfully"}
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

stock_on_hand_router = APIRouter(prefix="/api/inventory/stock-on-hand", tags=["Inventory Stock On Hand"])

@stock_on_hand_router.get("")
async def list_stock_on_hand(
    product_id: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all stock on hand"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT soh.*, p.product_code, p.product_name, w.warehouse_name
            FROM stock_on_hand soh
            LEFT JOIN products p ON soh.product_id = p.id
            LEFT JOIN warehouses w ON soh.warehouse_id = w.id
            WHERE soh.company_id = %s
        """
        params = [company_id]
        
        if product_id:
            query += " AND soh.product_id = %s"
            params.append(product_id)
        if warehouse_id:
            query += " AND soh.warehouse_id = %s"
            params.append(warehouse_id)
        
        query += " ORDER BY p.product_code, w.warehouse_name"
        
        cursor.execute(query, params)
        stock = cursor.fetchall()
        
        result = []
        for item in stock:
            result.append({
                'id': str(item['id']),
                'product_id': str(item['product_id']) if item.get('product_id') else None,
                'product_code': item.get('product_code'),
                'product_name': item.get('product_name'),
                'warehouse_id': str(item['warehouse_id']) if item.get('warehouse_id') else None,
                'warehouse_name': item.get('warehouse_name'),
                'quantity': float(item.get('quantity', 0)),
                'updated_at': item['updated_at'].isoformat() if item.get('updated_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
