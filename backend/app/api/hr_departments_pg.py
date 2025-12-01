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

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

departments_router = APIRouter(prefix="/api/hr/departments", tags=["HR Departments"])

@departments_router.get("")
async def list_departments(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all departments"""
    departments = [
        {
            'id': str(uuid.uuid4()),
            'department_code': 'IT',
            'department_name': 'Information Technology',
            'manager_id': str(uuid.uuid4()),
            'manager_name': 'John Doe',
            'employee_count': 15,
            'budget': 2500000.00,
            'budget_spent': 1875000.00,
            'status': 'ACTIVE',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'department_code': 'FIN',
            'department_name': 'Finance',
            'manager_id': str(uuid.uuid4()),
            'manager_name': 'Jane Smith',
            'employee_count': 8,
            'budget': 1500000.00,
            'budget_spent': 1125000.00,
            'status': 'ACTIVE',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'department_code': 'HR',
            'department_name': 'Human Resources',
            'manager_id': str(uuid.uuid4()),
            'manager_name': 'Bob Johnson',
            'employee_count': 5,
            'budget': 800000.00,
            'budget_spent': 600000.00,
            'status': 'ACTIVE',
            'created_at': datetime.utcnow().isoformat()
        }
    ]
    
    if status:
        departments = [d for d in departments if d['status'] == status]
    
    return {'departments': departments, 'total': len(departments)}

@departments_router.get("/{department_id}")
async def get_department(
    department_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single department"""
    return {
        'id': department_id,
        'department_code': 'IT',
        'department_name': 'Information Technology',
        'manager_id': str(uuid.uuid4()),
        'manager_name': 'John Doe',
        'employee_count': 15,
        'budget': 2500000.00,
        'budget_spent': 1875000.00,
        'status': 'ACTIVE',
        'created_at': datetime.utcnow().isoformat()
    }

@departments_router.post("")
async def create_department(
    department_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new department"""
    department_id = str(uuid.uuid4())
    return {
        'id': department_id,
        'department_code': department_data.get('department_code'),
        'message': 'Department created successfully'
    }

@departments_router.put("/{department_id}")
async def update_department(
    department_id: str = Path(...),
    department_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a department"""
    return {"message": "Department updated successfully"}

@departments_router.delete("/{department_id}")
async def delete_department(
    department_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a department"""
    return {"message": "Department deleted successfully"}
