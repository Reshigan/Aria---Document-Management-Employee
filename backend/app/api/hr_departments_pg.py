"""
ARIA ERP - HR Departments Module (PostgreSQL)
Provides full CRUD operations for Departments
Matches frontend API contract: /api/hr/departments
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import uuid

from core.auth import AuthService
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

TEST_COMPANY_ID = os.getenv("TEST_COMPANY_ID", "6dbbf872-eebc-4341-8e2c-cac36587a5cb")
AUTH_MODE = os.getenv("AUTH_MODE", "development")
security = HTTPBearer(auto_error=False)

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """
    Get current user identity from Bearer token (decode-only, no DB lookup)
    Supports testing mode for go-live validation
    """
    if credentials:
        try:
            payload = AuthService.decode_token(credentials.credentials)
            company_id = payload.get("company_id") or payload.get("sub")
            email = payload.get("email", "user@test.com")
            return {"company_id": company_id, "email": email}
        except HTTPException:
            pass
    
    if AUTH_MODE == "development":
        return {"company_id": TEST_COMPANY_ID, "email": "test@local"}
    
    raise HTTPException(
        status_code=401,
        detail="Not authenticated. Provide Bearer token.",
        headers={"WWW-Authenticate": "Bearer"}
    )

departments_router = APIRouter(prefix="/api/hr/departments", tags=["HR Departments"])

@departments_router.get("")
async def list_departments(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all departments"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT 
                d.id, d.department_code, d.department_name, d.budget, d.budget_spent, d.status, d.created_at,
                d.manager_id, u.first_name || ' ' || u.last_name as manager_name,
                COUNT(e.id) as employee_count
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
            LEFT JOIN users e ON e.department = d.department_name AND e.company_id = d.company_id
            WHERE d.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND d.status = %s"
            params.append(status)
        
        query += " GROUP BY d.id, u.first_name, u.last_name ORDER BY d.department_name"
        
        cursor.execute(query, params)
        departments = cursor.fetchall()
        
        result = []
        for dept in departments:
            result.append({
                'id': str(dept['id']),
                'department_code': dept.get('department_code'),
                'department_name': dept.get('department_name'),
                'manager_id': str(dept['manager_id']) if dept.get('manager_id') else None,
                'manager_name': dept.get('manager_name'),
                'employee_count': int(dept.get('employee_count', 0)),
                'budget': float(dept.get('budget', 0)),
                'budget_spent': float(dept.get('budget_spent', 0)),
                'status': dept.get('status'),
                'created_at': dept['created_at'].isoformat() if dept.get('created_at') else None
            })
        
        return {'departments': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@departments_router.get("/{department_id}")
async def get_department(
    department_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single department"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT 
                d.*, u.first_name || ' ' || u.last_name as manager_name,
                COUNT(e.id) as employee_count
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
            LEFT JOIN users e ON e.department = d.department_name AND e.company_id = d.company_id
            WHERE d.id = %s AND d.company_id = %s
            GROUP BY d.id, u.first_name, u.last_name
        """, (department_id, company_id))
        
        dept = cursor.fetchone()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        return {
            'id': str(dept['id']),
            'department_code': dept.get('department_code'),
            'department_name': dept.get('department_name'),
            'manager_id': str(dept['manager_id']) if dept.get('manager_id') else None,
            'manager_name': dept.get('manager_name'),
            'employee_count': int(dept.get('employee_count', 0)),
            'budget': float(dept.get('budget', 0)),
            'budget_spent': float(dept.get('budget_spent', 0)),
            'status': dept.get('status'),
            'created_at': dept['created_at'].isoformat() if dept.get('created_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@departments_router.post("")
async def create_department(
    department_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new department"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        department_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO departments (id, company_id, department_code, department_name, manager_id, budget, budget_spent, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, department_code
        """, (department_id, company_id, department_data.get('department_code'), department_data.get('department_name'),
              department_data.get('manager_id'), department_data.get('budget', 0), department_data.get('budget_spent', 0),
              department_data.get('status', 'ACTIVE')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'department_code': result['department_code'], 'message': 'Department created successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@departments_router.put("/{department_id}")
async def update_department(
    department_id: str = Path(...),
    department_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a department"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE departments
            SET department_name = %s, manager_id = %s, budget = %s, budget_spent = %s, status = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (department_data.get('department_name'), department_data.get('manager_id'),
              department_data.get('budget'), department_data.get('budget_spent'),
              department_data.get('status'), department_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Department not found")
        
        conn.commit()
        return {"message": "Department updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@departments_router.delete("/{department_id}")
async def delete_department(
    department_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a department"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM departments WHERE id = %s AND company_id = %s", (department_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Department not found")
        
        conn.commit()
        return {"message": "Department deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
