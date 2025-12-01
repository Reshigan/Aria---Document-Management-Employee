"""
ARIA ERP - Quality Management Module (PostgreSQL)
Provides full CRUD operations for Quality Dashboard and Inspections
Matches frontend API contract: /api/quality/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
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
# QUALITY DASHBOARD
# ========================================

quality_dashboard_router = APIRouter(prefix="/api/quality", tags=["Quality Dashboard"])

@quality_dashboard_router.get("/metrics")
async def get_quality_metrics(
    current_user: Dict = Depends(get_current_user)
):
    """Get quality dashboard metrics"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT COUNT(*) as inspections_completed
            FROM quality_inspections
            WHERE company_id = %s AND status IN ('PASSED', 'FAILED')
        """, [company_id])
        inspections_completed = cursor.fetchone()['inspections_completed']
        
        cursor.execute("""
            SELECT COUNT(*) as inspections_pending
            FROM quality_inspections
            WHERE company_id = %s AND status = 'PENDING'
        """, [company_id])
        inspections_pending = cursor.fetchone()['inspections_pending']
        
        cursor.execute("""
            SELECT COUNT(*) as passed_inspections
            FROM quality_inspections
            WHERE company_id = %s AND status = 'PASSED'
        """, [company_id])
        passed_inspections = cursor.fetchone()['passed_inspections']
        
        cursor.execute("""
            SELECT COUNT(*) as non_conformances
            FROM non_conformances
            WHERE company_id = %s AND status = 'OPEN'
        """, [company_id])
        non_conformances = cursor.fetchone()['non_conformances']
        
        total_inspections = inspections_completed
        pass_rate = 100.0 if total_inspections == 0 else (passed_inspections / total_inspections * 100)
        defect_rate = 100.0 - pass_rate
        overall_quality_score = max(0, 100 - (non_conformances * 2) - defect_rate)
        
        return {
            'overall_quality_score': round(overall_quality_score, 1),
            'inspections_completed': inspections_completed,
            'inspections_pending': inspections_pending,
            'pass_rate': round(pass_rate, 1),
            'defect_rate': round(defect_rate, 1),
            'non_conformances': non_conformances,
            'corrective_actions': 0,
            'preventive_actions': 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quality_dashboard_router.get("/inspections")
async def list_inspections(
    status: Optional[str] = Query(None),
    inspection_type: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all quality inspections"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT qi.id, qi.inspection_number, qi.inspection_type, qi.product_id,
                   p.name as product_name, qi.batch_number,
                   qi.inspector_id, u.name as inspector,
                   qi.inspection_date, qi.status, qi.defects_found, qi.notes, qi.created_at
            FROM quality_inspections qi
            LEFT JOIN products p ON qi.product_id = p.id
            LEFT JOIN users u ON qi.inspector_id = u.id
            WHERE qi.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND qi.status = %s"
            params.append(status)
        if inspection_type:
            query += " AND qi.inspection_type = %s"
            params.append(inspection_type)
        
        query += " ORDER BY qi.inspection_date DESC, qi.created_at DESC"
        
        cursor.execute(query, params)
        inspections = cursor.fetchall()
        
        result = []
        for inspection in inspections:
            result.append({
                'id': str(inspection['id']),
                'inspection_number': inspection.get('inspection_number'),
                'inspection_type': inspection.get('inspection_type'),
                'product_id': str(inspection['product_id']) if inspection.get('product_id') else None,
                'product_name': inspection.get('product_name'),
                'batch_number': inspection.get('batch_number'),
                'inspector_id': str(inspection['inspector_id']) if inspection.get('inspector_id') else None,
                'inspector': inspection.get('inspector'),
                'inspection_date': inspection['inspection_date'].isoformat() if inspection.get('inspection_date') else None,
                'status': inspection.get('status'),
                'defects_found': inspection.get('defects_found', 0),
                'notes': inspection.get('notes'),
                'created_at': inspection['created_at'].isoformat() if inspection.get('created_at') else None
            })
        
        return {'inspections': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quality_dashboard_router.get("/inspections/{inspection_id}")
async def get_inspection(
    inspection_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single inspection"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT qi.id, qi.inspection_number, qi.inspection_type, qi.product_id,
                   p.name as product_name, qi.batch_number,
                   qi.inspector_id, u.name as inspector,
                   qi.inspection_date, qi.status, qi.defects_found, qi.notes, qi.created_at
            FROM quality_inspections qi
            LEFT JOIN products p ON qi.product_id = p.id
            LEFT JOIN users u ON qi.inspector_id = u.id
            WHERE qi.id = %s AND qi.company_id = %s
        """
        
        cursor.execute(query, [inspection_id, company_id])
        inspection = cursor.fetchone()
        
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        return {
            'id': str(inspection['id']),
            'inspection_number': inspection.get('inspection_number'),
            'inspection_type': inspection.get('inspection_type'),
            'product_id': str(inspection['product_id']) if inspection.get('product_id') else None,
            'product_name': inspection.get('product_name'),
            'batch_number': inspection.get('batch_number'),
            'inspector_id': str(inspection['inspector_id']) if inspection.get('inspector_id') else None,
            'inspector': inspection.get('inspector'),
            'inspection_date': inspection['inspection_date'].isoformat() if inspection.get('inspection_date') else None,
            'status': inspection.get('status'),
            'defects_found': inspection.get('defects_found', 0),
            'notes': inspection.get('notes'),
            'created_at': inspection['created_at'].isoformat() if inspection.get('created_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quality_dashboard_router.post("/inspections")
async def create_inspection(
    inspection_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new inspection"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        inspection_number = f'QI-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}'
        
        query = """
            INSERT INTO quality_inspections (
                company_id, inspection_number, inspection_type, product_id,
                batch_number, inspector_id, inspection_date, status, defects_found, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, inspection_number
        """
        
        cursor.execute(query, [
            company_id,
            inspection_number,
            inspection_data.get('inspection_type'),
            inspection_data.get('product_id'),
            inspection_data.get('batch_number'),
            inspection_data.get('inspector_id'),
            inspection_data.get('inspection_date'),
            inspection_data.get('status', 'PENDING'),
            inspection_data.get('defects_found', 0),
            inspection_data.get('notes')
        ])
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'inspection_number': result['inspection_number'],
            'message': 'Inspection created successfully'
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quality_dashboard_router.put("/inspections/{inspection_id}")
async def update_inspection(
    inspection_id: str = Path(...),
    inspection_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update an inspection"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM quality_inspections WHERE id = %s AND company_id = %s", [inspection_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        update_fields = []
        params = []
        
        if 'inspection_type' in inspection_data:
            update_fields.append("inspection_type = %s")
            params.append(inspection_data['inspection_type'])
        if 'product_id' in inspection_data:
            update_fields.append("product_id = %s")
            params.append(inspection_data['product_id'])
        if 'batch_number' in inspection_data:
            update_fields.append("batch_number = %s")
            params.append(inspection_data['batch_number'])
        if 'inspector_id' in inspection_data:
            update_fields.append("inspector_id = %s")
            params.append(inspection_data['inspector_id'])
        if 'inspection_date' in inspection_data:
            update_fields.append("inspection_date = %s")
            params.append(inspection_data['inspection_date'])
        if 'status' in inspection_data:
            update_fields.append("status = %s")
            params.append(inspection_data['status'])
        if 'defects_found' in inspection_data:
            update_fields.append("defects_found = %s")
            params.append(inspection_data['defects_found'])
        if 'notes' in inspection_data:
            update_fields.append("notes = %s")
            params.append(inspection_data['notes'])
        
        if not update_fields:
            return {"message": "No fields to update"}
        
        update_fields.append("updated_at = NOW()")
        params.extend([inspection_id, company_id])
        
        query = f"UPDATE quality_inspections SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
        cursor.execute(query, params)
        conn.commit()
        
        return {"message": "Inspection updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@quality_dashboard_router.delete("/inspections/{inspection_id}")
async def delete_inspection(
    inspection_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete an inspection"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM quality_inspections WHERE id = %s AND company_id = %s", [inspection_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        cursor.execute("DELETE FROM quality_inspections WHERE id = %s AND company_id = %s", [inspection_id, company_id])
        conn.commit()
        
        return {"message": "Inspection deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# NON-CONFORMANCES
# ========================================

non_conformances_router = APIRouter(prefix="/api/quality/non-conformances", tags=["Non-Conformances"])

@non_conformances_router.get("")
async def list_non_conformances(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all non-conformances"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT nc.id, nc.nc_number, nc.description, nc.severity, nc.status,
                   nc.reported_by, u.name as reported_by_name, nc.reported_date,
                   nc.corrective_action, nc.due_date, nc.completed_date, nc.notes, nc.created_at
            FROM non_conformances nc
            LEFT JOIN users u ON nc.reported_by = u.id
            WHERE nc.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND nc.status = %s"
            params.append(status)
        
        query += " ORDER BY nc.reported_date DESC, nc.created_at DESC"
        
        cursor.execute(query, params)
        non_conformances = cursor.fetchall()
        
        result = []
        for nc in non_conformances:
            result.append({
                'id': str(nc['id']),
                'nc_number': nc.get('nc_number'),
                'description': nc.get('description'),
                'severity': nc.get('severity'),
                'status': nc.get('status'),
                'reported_by': str(nc['reported_by']) if nc.get('reported_by') else None,
                'reported_by_name': nc.get('reported_by_name'),
                'reported_date': nc['reported_date'].isoformat() if nc.get('reported_date') else None,
                'corrective_action': nc.get('corrective_action'),
                'due_date': nc['due_date'].isoformat() if nc.get('due_date') else None,
                'completed_date': nc['completed_date'].isoformat() if nc.get('completed_date') else None,
                'notes': nc.get('notes'),
                'created_at': nc['created_at'].isoformat() if nc.get('created_at') else None
            })
        
        return {'non_conformances': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@non_conformances_router.post("")
async def create_non_conformance(
    nc_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new non-conformance"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_id = current_user.get('user_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        nc_number = f'NC-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}'
        
        query = """
            INSERT INTO non_conformances (
                company_id, nc_number, description, severity, status,
                reported_by, reported_date, corrective_action, due_date, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nc_number
        """
        
        cursor.execute(query, [
            company_id,
            nc_number,
            nc_data.get('description'),
            nc_data.get('severity', 'MINOR'),
            nc_data.get('status', 'OPEN'),
            nc_data.get('reported_by', user_id),
            nc_data.get('reported_date'),
            nc_data.get('corrective_action'),
            nc_data.get('due_date'),
            nc_data.get('notes')
        ])
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'nc_number': result['nc_number'],
            'message': 'Non-conformance created successfully'
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@non_conformances_router.put("/{nc_id}")
async def update_non_conformance(
    nc_id: str = Path(...),
    nc_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a non-conformance"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM non_conformances WHERE id = %s AND company_id = %s", [nc_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Non-conformance not found")
        
        update_fields = []
        params = []
        
        if 'description' in nc_data:
            update_fields.append("description = %s")
            params.append(nc_data['description'])
        if 'severity' in nc_data:
            update_fields.append("severity = %s")
            params.append(nc_data['severity'])
        if 'status' in nc_data:
            update_fields.append("status = %s")
            params.append(nc_data['status'])
        if 'reported_by' in nc_data:
            update_fields.append("reported_by = %s")
            params.append(nc_data['reported_by'])
        if 'reported_date' in nc_data:
            update_fields.append("reported_date = %s")
            params.append(nc_data['reported_date'])
        if 'corrective_action' in nc_data:
            update_fields.append("corrective_action = %s")
            params.append(nc_data['corrective_action'])
        if 'due_date' in nc_data:
            update_fields.append("due_date = %s")
            params.append(nc_data['due_date'])
        if 'completed_date' in nc_data:
            update_fields.append("completed_date = %s")
            params.append(nc_data['completed_date'])
        if 'notes' in nc_data:
            update_fields.append("notes = %s")
            params.append(nc_data['notes'])
        
        if not update_fields:
            return {"message": "No fields to update"}
        
        update_fields.append("updated_at = NOW()")
        params.extend([nc_id, company_id])
        
        query = f"UPDATE non_conformances SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
        cursor.execute(query, params)
        conn.commit()
        
        return {"message": "Non-conformance updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@non_conformances_router.delete("/{nc_id}")
async def delete_non_conformance(
    nc_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a non-conformance"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM non_conformances WHERE id = %s AND company_id = %s", [nc_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Non-conformance not found")
        
        cursor.execute("DELETE FROM non_conformances WHERE id = %s AND company_id = %s", [nc_id, company_id])
        conn.commit()
        
        return {"message": "Non-conformance deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
