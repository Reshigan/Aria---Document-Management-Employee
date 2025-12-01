"""
ARIA ERP - HR Attendance Module (PostgreSQL)
Provides full CRUD operations for Attendance
Matches frontend API contract: /api/hr/attendance
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

attendance_router = APIRouter(prefix="/api/hr/attendance", tags=["HR Attendance"])

@attendance_router.get("")
async def list_attendance(
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all attendance records"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT 
                a.id, a.date, a.check_in, a.check_out, a.status, a.hours_worked, a.notes, a.created_at,
                a.employee_id, u.first_name || ' ' || u.last_name as employee_name, u.employee_number
            FROM attendance_records a
            LEFT JOIN users u ON a.employee_id = u.id
            WHERE a.company_id = %s
        """
        params = [company_id]
        
        if date:
            query += " AND a.date = %s"
            params.append(date)
        if status:
            query += " AND a.status = %s"
            params.append(status)
        if employee_id:
            query += " AND a.employee_id = %s"
            params.append(employee_id)
        
        query += " ORDER BY a.date DESC, a.employee_id"
        
        cursor.execute(query, params)
        attendance_records = cursor.fetchall()
        
        result = []
        for record in attendance_records:
            result.append({
                'id': str(record['id']),
                'employee_id': str(record['employee_id']) if record.get('employee_id') else None,
                'employee_name': record.get('employee_name'),
                'employee_number': record.get('employee_number'),
                'date': record['date'].isoformat() if record.get('date') else None,
                'check_in': str(record['check_in']) if record.get('check_in') else None,
                'check_out': str(record['check_out']) if record.get('check_out') else None,
                'status': record.get('status'),
                'hours_worked': float(record['hours_worked']) if record.get('hours_worked') else 0.0,
                'notes': record.get('notes'),
                'created_at': record['created_at'].isoformat() if record.get('created_at') else None
            })
        
        return {'attendance': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@attendance_router.get("/{attendance_id}")
async def get_attendance(
    attendance_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single attendance record"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT 
                a.*, u.first_name || ' ' || u.last_name as employee_name, u.employee_number
            FROM attendance_records a
            LEFT JOIN users u ON a.employee_id = u.id
            WHERE a.id = %s AND a.company_id = %s
        """, (attendance_id, company_id))
        
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        return {
            'id': str(record['id']),
            'employee_id': str(record['employee_id']) if record.get('employee_id') else None,
            'employee_name': record.get('employee_name'),
            'employee_number': record.get('employee_number'),
            'date': record['date'].isoformat() if record.get('date') else None,
            'check_in': str(record['check_in']) if record.get('check_in') else None,
            'check_out': str(record['check_out']) if record.get('check_out') else None,
            'status': record.get('status'),
            'hours_worked': float(record['hours_worked']) if record.get('hours_worked') else 0.0,
            'notes': record.get('notes'),
            'created_at': record['created_at'].isoformat() if record.get('created_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@attendance_router.post("")
async def create_attendance(
    attendance_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new attendance record"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        attendance_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO attendance_records (id, company_id, employee_id, date, check_in, check_out, status, hours_worked, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (attendance_id, company_id, attendance_data.get('employee_id'), attendance_data.get('date'),
              attendance_data.get('check_in'), attendance_data.get('check_out'), attendance_data.get('status', 'PRESENT'),
              attendance_data.get('hours_worked'), attendance_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'message': 'Attendance record created successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@attendance_router.put("/{attendance_id}")
async def update_attendance(
    attendance_id: str = Path(...),
    attendance_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update an attendance record"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE attendance_records
            SET check_in = %s, check_out = %s, status = %s, hours_worked = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (attendance_data.get('check_in'), attendance_data.get('check_out'), attendance_data.get('status'),
              attendance_data.get('hours_worked'), attendance_data.get('notes'), attendance_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        conn.commit()
        return {"message": "Attendance record updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@attendance_router.delete("/{attendance_id}")
async def delete_attendance(
    attendance_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete an attendance record"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM attendance_records WHERE id = %s AND company_id = %s", (attendance_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        conn.commit()
        return {"message": "Attendance record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
