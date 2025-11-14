"""
ARIA ERP - Manufacturing Module (PostgreSQL)
Provides full CRUD operations for Work Orders, BOMs, Production Runs
Matches frontend API contract: /api/manufacturing/*
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

work_orders_router = APIRouter(prefix="/api/manufacturing/work-orders", tags=["Manufacturing Work Orders"])

@work_orders_router.get("")
async def list_work_orders(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all work orders"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT wo.*, p.product_code, p.product_name
            FROM work_orders wo
            LEFT JOIN products p ON wo.product_id = p.id
            WHERE wo.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND wo.status = %s"
            params.append(status)
        
        query += " ORDER BY wo.created_at DESC"
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        
        result = []
        for order in orders:
            result.append({
                'id': str(order['id']),
                'work_order_number': order.get('work_order_number'),
                'product_id': str(order['product_id']) if order.get('product_id') else None,
                'product_code': order.get('product_code'),
                'product_name': order.get('product_name'),
                'quantity_to_produce': float(order.get('quantity_to_produce', 0)),
                'quantity_produced': float(order.get('quantity_produced', 0)),
                'status': order.get('status'),
                'start_date': order['start_date'].isoformat() if order.get('start_date') else None,
                'end_date': order['end_date'].isoformat() if order.get('end_date') else None,
                'created_at': order['created_at'].isoformat() if order.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@work_orders_router.get("/{order_id}")
async def get_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single work order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT wo.*, p.product_code, p.product_name
            FROM work_orders wo
            LEFT JOIN products p ON wo.product_id = p.id
            WHERE wo.id = %s AND wo.company_id = %s
        """, (order_id, company_id))
        
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        return {
            'id': str(order['id']),
            'work_order_number': order.get('work_order_number'),
            'product_id': str(order['product_id']) if order.get('product_id') else None,
            'product_code': order.get('product_code'),
            'product_name': order.get('product_name'),
            'quantity_to_produce': float(order.get('quantity_to_produce', 0)),
            'quantity_produced': float(order.get('quantity_produced', 0)),
            'status': order.get('status'),
            'start_date': order['start_date'].isoformat() if order.get('start_date') else None,
            'end_date': order['end_date'].isoformat() if order.get('end_date') else None,
            'notes': order.get('notes'),
            'created_at': order['created_at'].isoformat() if order.get('created_at') else None,
            'updated_at': order['updated_at'].isoformat() if order.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@work_orders_router.post("")
async def create_work_order(
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new work order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 'WO-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM work_orders WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        work_order_number = f"WO-{next_num:05d}"
        
        order_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO work_orders (id, company_id, work_order_number, product_id, quantity_to_produce, 
                                    quantity_produced, status, start_date, end_date, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, work_order_number
        """, (order_id, company_id, work_order_number, order_data.get('product_id'),
              order_data.get('quantity_to_produce'), 0, 'draft',
              order_data.get('start_date'), order_data.get('end_date'), order_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'work_order_number': result['work_order_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@work_orders_router.post("/{order_id}/start")
async def start_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Start a work order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE work_orders 
            SET status = 'in_progress', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (order_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        conn.commit()
        return {"message": "Work order started successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@work_orders_router.post("/{order_id}/complete")
async def complete_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Complete a work order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE work_orders 
            SET status = 'completed', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (order_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        conn.commit()
        return {"message": "Work order completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@work_orders_router.delete("/{order_id}")
async def delete_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a work order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM work_orders WHERE id = %s AND company_id = %s", (order_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        conn.commit()
        return {"message": "Work order deleted successfully"}
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

production_runs_router = APIRouter(prefix="/api/manufacturing/production-runs", tags=["Manufacturing Production Runs"])

@production_runs_router.get("")
async def list_production_runs(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all production runs"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT pr.*, wo.work_order_number, p.product_code, p.product_name
            FROM production_runs pr
            LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
            LEFT JOIN products p ON pr.product_id = p.id
            WHERE pr.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND pr.status = %s"
            params.append(status)
        
        query += " ORDER BY pr.created_at DESC"
        
        cursor.execute(query, params)
        runs = cursor.fetchall()
        
        result = []
        for run in runs:
            result.append({
                'id': str(run['id']),
                'run_number': run.get('run_number'),
                'work_order_id': str(run['work_order_id']) if run.get('work_order_id') else None,
                'work_order_number': run.get('work_order_number'),
                'product_id': str(run['product_id']) if run.get('product_id') else None,
                'product_code': run.get('product_code'),
                'product_name': run.get('product_name'),
                'quantity_produced': float(run.get('quantity_produced', 0)),
                'status': run.get('status'),
                'start_time': run['start_time'].isoformat() if run.get('start_time') else None,
                'end_time': run['end_time'].isoformat() if run.get('end_time') else None,
                'created_at': run['created_at'].isoformat() if run.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@production_runs_router.get("/{run_id}")
async def get_production_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single production run"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT pr.*, wo.work_order_number, p.product_code, p.product_name
            FROM production_runs pr
            LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
            LEFT JOIN products p ON pr.product_id = p.id
            WHERE pr.id = %s AND pr.company_id = %s
        """, (run_id, company_id))
        
        run = cursor.fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Production run not found")
        
        return {
            'id': str(run['id']),
            'run_number': run.get('run_number'),
            'work_order_id': str(run['work_order_id']) if run.get('work_order_id') else None,
            'work_order_number': run.get('work_order_number'),
            'product_id': str(run['product_id']) if run.get('product_id') else None,
            'product_code': run.get('product_code'),
            'product_name': run.get('product_name'),
            'quantity_produced': float(run.get('quantity_produced', 0)),
            'status': run.get('status'),
            'start_time': run['start_time'].isoformat() if run.get('start_time') else None,
            'end_time': run['end_time'].isoformat() if run.get('end_time') else None,
            'notes': run.get('notes'),
            'created_at': run['created_at'].isoformat() if run.get('created_at') else None,
            'updated_at': run['updated_at'].isoformat() if run.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@production_runs_router.post("")
async def create_production_run(
    run_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new production run"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(run_number FROM 'PR-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM production_runs WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        run_number = f"PR-{next_num:05d}"
        
        run_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO production_runs (id, company_id, run_number, work_order_id, product_id, 
                                        quantity_produced, status, start_time, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, run_number
        """, (run_id, company_id, run_number, run_data.get('work_order_id'),
              run_data.get('product_id'), run_data.get('quantity_produced', 0),
              'in_progress', run_data.get('start_time'), run_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'run_number': result['run_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@production_runs_router.delete("/{run_id}")
async def delete_production_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a production run"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM production_runs WHERE id = %s AND company_id = %s", (run_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Production run not found")
        
        conn.commit()
        return {"message": "Production run deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
