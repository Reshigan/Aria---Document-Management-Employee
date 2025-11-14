"""
ARIA ERP - Fixed Assets Module (PostgreSQL)
Provides full CRUD operations for Fixed Assets and Depreciation
Matches frontend API contract: /api/fixed-assets/*
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

fixed_assets_router = APIRouter(prefix="/api/fixed-assets", tags=["Fixed Assets"])

@fixed_assets_router.get("")
async def list_fixed_assets(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all fixed assets"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT fa.*, ac.category_name
            FROM fixed_assets fa
            LEFT JOIN asset_categories ac ON fa.category_id = ac.id
            WHERE fa.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND fa.status = %s"
            params.append(status)
        if category:
            query += " AND fa.category_id = %s"
            params.append(category)
        
        query += " ORDER BY fa.asset_code"
        
        cursor.execute(query, params)
        assets = cursor.fetchall()
        
        result = []
        for asset in assets:
            result.append({
                'id': str(asset['id']),
                'asset_code': asset.get('asset_code'),
                'asset_name': asset.get('asset_name'),
                'category_id': str(asset['category_id']) if asset.get('category_id') else None,
                'category_name': asset.get('category_name'),
                'purchase_date': asset['purchase_date'].isoformat() if asset.get('purchase_date') else None,
                'purchase_cost': float(asset.get('purchase_cost', 0)),
                'accumulated_depreciation': float(asset.get('accumulated_depreciation', 0)),
                'net_book_value': float(asset.get('purchase_cost', 0)) - float(asset.get('accumulated_depreciation', 0)),
                'status': asset.get('status'),
                'created_at': asset['created_at'].isoformat() if asset.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@fixed_assets_router.get("/{asset_id}")
async def get_fixed_asset(
    asset_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single fixed asset"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT fa.*, ac.category_name
            FROM fixed_assets fa
            LEFT JOIN asset_categories ac ON fa.category_id = ac.id
            WHERE fa.id = %s AND fa.company_id = %s
        """, (asset_id, company_id))
        
        asset = cursor.fetchone()
        if not asset:
            raise HTTPException(status_code=404, detail="Fixed asset not found")
        
        return {
            'id': str(asset['id']),
            'asset_code': asset.get('asset_code'),
            'asset_name': asset.get('asset_name'),
            'category_id': str(asset['category_id']) if asset.get('category_id') else None,
            'category_name': asset.get('category_name'),
            'purchase_date': asset['purchase_date'].isoformat() if asset.get('purchase_date') else None,
            'purchase_cost': float(asset.get('purchase_cost', 0)),
            'salvage_value': float(asset.get('salvage_value', 0)),
            'useful_life_years': float(asset.get('useful_life_years', 0)),
            'depreciation_method': asset.get('depreciation_method'),
            'accumulated_depreciation': float(asset.get('accumulated_depreciation', 0)),
            'net_book_value': float(asset.get('purchase_cost', 0)) - float(asset.get('accumulated_depreciation', 0)),
            'status': asset.get('status'),
            'location': asset.get('location'),
            'notes': asset.get('notes'),
            'created_at': asset['created_at'].isoformat() if asset.get('created_at') else None,
            'updated_at': asset['updated_at'].isoformat() if asset.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@fixed_assets_router.post("")
async def create_fixed_asset(
    asset_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new fixed asset"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM 'FA-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM fixed_assets WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        asset_code = f"FA-{next_num:05d}"
        
        asset_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO fixed_assets (id, company_id, asset_code, asset_name, category_id, purchase_date,
                                     purchase_cost, salvage_value, useful_life_years, depreciation_method,
                                     accumulated_depreciation, status, location, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, asset_code
        """, (asset_id, company_id, asset_code, asset_data.get('asset_name'),
              asset_data.get('category_id'), asset_data.get('purchase_date'),
              asset_data.get('purchase_cost'), asset_data.get('salvage_value', 0),
              asset_data.get('useful_life_years'), asset_data.get('depreciation_method', 'straight_line'),
              0, asset_data.get('status', 'active'), asset_data.get('location'),
              asset_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'asset_code': result['asset_code']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@fixed_assets_router.put("/{asset_id}")
async def update_fixed_asset(
    asset_id: str = Path(...),
    asset_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a fixed asset"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE fixed_assets
            SET asset_name = %s, category_id = %s, status = %s, location = %s,
                notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (asset_data.get('asset_name'), asset_data.get('category_id'),
              asset_data.get('status'), asset_data.get('location'),
              asset_data.get('notes'), asset_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Fixed asset not found")
        
        conn.commit()
        return {"message": "Fixed asset updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@fixed_assets_router.delete("/{asset_id}")
async def delete_fixed_asset(
    asset_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a fixed asset"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM fixed_assets WHERE id = %s AND company_id = %s", (asset_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Fixed asset not found")
        
        conn.commit()
        return {"message": "Fixed asset deleted successfully"}
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

depreciation_runs_router = APIRouter(prefix="/api/fixed-assets/depreciation-runs", tags=["Fixed Assets Depreciation"])

@depreciation_runs_router.get("")
async def list_depreciation_runs(
    current_user: Dict = Depends(get_current_user)
):
    """List all depreciation runs"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM depreciation_runs
            WHERE company_id = %s
            ORDER BY run_date DESC
        """, (company_id,))
        
        runs = cursor.fetchall()
        
        result = []
        for run in runs:
            result.append({
                'id': str(run['id']),
                'run_number': run.get('run_number'),
                'run_date': run['run_date'].isoformat() if run.get('run_date') else None,
                'period_start': run['period_start'].isoformat() if run.get('period_start') else None,
                'period_end': run['period_end'].isoformat() if run.get('period_end') else None,
                'total_depreciation': float(run.get('total_depreciation', 0)),
                'status': run.get('status'),
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

@depreciation_runs_router.get("/{run_id}")
async def get_depreciation_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single depreciation run"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM depreciation_runs
            WHERE id = %s AND company_id = %s
        """, (run_id, company_id))
        
        run = cursor.fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Depreciation run not found")
        
        return {
            'id': str(run['id']),
            'run_number': run.get('run_number'),
            'run_date': run['run_date'].isoformat() if run.get('run_date') else None,
            'period_start': run['period_start'].isoformat() if run.get('period_start') else None,
            'period_end': run['period_end'].isoformat() if run.get('period_end') else None,
            'total_depreciation': float(run.get('total_depreciation', 0)),
            'status': run.get('status'),
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

@depreciation_runs_router.post("")
async def create_depreciation_run(
    run_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new depreciation run"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(run_number FROM 'DEP-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM depreciation_runs WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        run_number = f"DEP-{next_num:05d}"
        
        run_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO depreciation_runs (id, company_id, run_number, run_date, period_start, period_end,
                                          total_depreciation, status, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, run_number
        """, (run_id, company_id, run_number, run_data.get('run_date'),
              run_data.get('period_start'), run_data.get('period_end'),
              run_data.get('total_depreciation', 0), 'draft', run_data.get('notes')))
        
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

@depreciation_runs_router.post("/{run_id}/post")
async def post_depreciation_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Post a depreciation run"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE depreciation_runs 
            SET status = 'posted', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (run_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Depreciation run not found")
        
        conn.commit()
        return {"message": "Depreciation run posted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@depreciation_runs_router.delete("/{run_id}")
async def delete_depreciation_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a depreciation run"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM depreciation_runs WHERE id = %s AND company_id = %s", (run_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Depreciation run not found")
        
        conn.commit()
        return {"message": "Depreciation run deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
