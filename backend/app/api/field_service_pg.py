"""
ARIA ERP - Field Service Module (PostgreSQL)
Provides full CRUD operations for Service Requests, Technicians
Matches frontend API contract: /api/field-service/*
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

service_requests_router = APIRouter(prefix="/api/field-service/service-requests", tags=["Field Service Requests"])

@service_requests_router.get("")
async def list_service_requests(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all service requests"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT sr.*, c.customer_name, t.technician_name
            FROM service_requests sr
            LEFT JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN technicians t ON sr.assigned_technician_id = t.id
            WHERE sr.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND sr.status = %s"
            params.append(status)
        if priority:
            query += " AND sr.priority = %s"
            params.append(priority)
        
        query += " ORDER BY sr.created_at DESC"
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        result = []
        for req in requests:
            result.append({
                'id': str(req['id']),
                'request_number': req.get('request_number'),
                'customer_id': str(req['customer_id']) if req.get('customer_id') else None,
                'customer_name': req.get('customer_name'),
                'description': req.get('description'),
                'status': req.get('status'),
                'priority': req.get('priority'),
                'assigned_technician_id': str(req['assigned_technician_id']) if req.get('assigned_technician_id') else None,
                'technician_name': req.get('technician_name'),
                'scheduled_date': req['scheduled_date'].isoformat() if req.get('scheduled_date') else None,
                'completed_date': req['completed_date'].isoformat() if req.get('completed_date') else None,
                'created_at': req['created_at'].isoformat() if req.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_requests_router.get("/{request_id}")
async def get_service_request(
    request_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single service request"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT sr.*, c.customer_name, t.technician_name
            FROM service_requests sr
            LEFT JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN technicians t ON sr.assigned_technician_id = t.id
            WHERE sr.id = %s AND sr.company_id = %s
        """, (request_id, company_id))
        
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        return {
            'id': str(req['id']),
            'request_number': req.get('request_number'),
            'customer_id': str(req['customer_id']) if req.get('customer_id') else None,
            'customer_name': req.get('customer_name'),
            'description': req.get('description'),
            'status': req.get('status'),
            'priority': req.get('priority'),
            'assigned_technician_id': str(req['assigned_technician_id']) if req.get('assigned_technician_id') else None,
            'technician_name': req.get('technician_name'),
            'scheduled_date': req['scheduled_date'].isoformat() if req.get('scheduled_date') else None,
            'completed_date': req['completed_date'].isoformat() if req.get('completed_date') else None,
            'notes': req.get('notes'),
            'created_at': req['created_at'].isoformat() if req.get('created_at') else None,
            'updated_at': req['updated_at'].isoformat() if req.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_requests_router.post("")
async def create_service_request(
    request_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new service request"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'SR-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM service_requests WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        request_number = f"SR-{next_num:05d}"
        
        request_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO service_requests (id, company_id, request_number, customer_id, description,
                                         status, priority, assigned_technician_id, scheduled_date,
                                         notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, request_number
        """, (request_id, company_id, request_number, request_data.get('customer_id'),
              request_data.get('description'), request_data.get('status', 'open'),
              request_data.get('priority', 'medium'), request_data.get('assigned_technician_id'),
              request_data.get('scheduled_date'), request_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'request_number': result['request_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_requests_router.put("/{request_id}")
async def update_service_request(
    request_id: str = Path(...),
    request_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a service request"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE service_requests
            SET description = %s, status = %s, priority = %s, assigned_technician_id = %s,
                scheduled_date = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (request_data.get('description'), request_data.get('status'),
              request_data.get('priority'), request_data.get('assigned_technician_id'),
              request_data.get('scheduled_date'), request_data.get('notes'),
              request_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        conn.commit()
        return {"message": "Service request updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_requests_router.post("/{request_id}/complete")
async def complete_service_request(
    request_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Complete a service request"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE service_requests 
            SET status = 'completed', completed_date = NOW(), updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (request_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        conn.commit()
        return {"message": "Service request completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_requests_router.delete("/{request_id}")
async def delete_service_request(
    request_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a service request"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM service_requests WHERE id = %s AND company_id = %s", (request_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        conn.commit()
        return {"message": "Service request deleted successfully"}
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

technicians_router = APIRouter(prefix="/api/field-service/technicians", tags=["Field Service Technicians"])

@technicians_router.get("")
async def list_technicians(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all technicians"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT * FROM technicians
            WHERE company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY technician_name"
        
        cursor.execute(query, params)
        technicians = cursor.fetchall()
        
        result = []
        for tech in technicians:
            result.append({
                'id': str(tech['id']),
                'technician_code': tech.get('technician_code'),
                'technician_name': tech.get('technician_name'),
                'email': tech.get('email'),
                'phone': tech.get('phone'),
                'specialization': tech.get('specialization'),
                'status': tech.get('status'),
                'created_at': tech['created_at'].isoformat() if tech.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@technicians_router.get("/{technician_id}")
async def get_technician(
    technician_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single technician"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM technicians
            WHERE id = %s AND company_id = %s
        """, (technician_id, company_id))
        
        tech = cursor.fetchone()
        if not tech:
            raise HTTPException(status_code=404, detail="Technician not found")
        
        return {
            'id': str(tech['id']),
            'technician_code': tech.get('technician_code'),
            'technician_name': tech.get('technician_name'),
            'email': tech.get('email'),
            'phone': tech.get('phone'),
            'specialization': tech.get('specialization'),
            'status': tech.get('status'),
            'created_at': tech['created_at'].isoformat() if tech.get('created_at') else None,
            'updated_at': tech['updated_at'].isoformat() if tech.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@technicians_router.post("")
async def create_technician(
    technician_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new technician"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(technician_code FROM 'TECH-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM technicians WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        technician_code = f"TECH-{next_num:05d}"
        
        technician_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO technicians (id, company_id, technician_code, technician_name, email, phone,
                                    specialization, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, technician_code
        """, (technician_id, company_id, technician_code, technician_data.get('technician_name'),
              technician_data.get('email'), technician_data.get('phone'),
              technician_data.get('specialization'), technician_data.get('status', 'active')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'technician_code': result['technician_code']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@technicians_router.put("/{technician_id}")
async def update_technician(
    technician_id: str = Path(...),
    technician_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a technician"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE technicians
            SET technician_name = %s, email = %s, phone = %s, specialization = %s,
                status = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (technician_data.get('technician_name'), technician_data.get('email'),
              technician_data.get('phone'), technician_data.get('specialization'),
              technician_data.get('status'), technician_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Technician not found")
        
        conn.commit()
        return {"message": "Technician updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@technicians_router.delete("/{technician_id}")
async def delete_technician(
    technician_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a technician"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM technicians WHERE id = %s AND company_id = %s", (technician_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Technician not found")
        
        conn.commit()
        return {"message": "Technician deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
