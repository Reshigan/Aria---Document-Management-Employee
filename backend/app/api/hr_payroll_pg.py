"""
ARIA ERP - HR & Payroll Module (PostgreSQL)
Provides full CRUD operations for Employees, Payroll Runs, Leave Requests
Matches frontend API contract: /api/hr/* or /api/payroll/*
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

employees_router = APIRouter(prefix="/api/hr/employees", tags=["HR Employees"])

@employees_router.get("")
async def list_employees(
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all employees"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT id, employee_number, first_name, last_name, email, phone, department,
                   position, employment_type, status, hire_date, termination_date,
                   salary, created_at, updated_at
            FROM users
            WHERE company_id = %s AND role != 'system'
        """
        params = [company_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        if department:
            query += " AND department = %s"
            params.append(department)
        
        query += " ORDER BY last_name, first_name"
        
        cursor.execute(query, params)
        employees = cursor.fetchall()
        
        result = []
        for emp in employees:
            result.append({
                'id': str(emp['id']),
                'employee_number': emp.get('employee_number'),
                'first_name': emp.get('first_name'),
                'last_name': emp.get('last_name'),
                'full_name': f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
                'email': emp.get('email'),
                'phone': emp.get('phone'),
                'department': emp.get('department'),
                'position': emp.get('position'),
                'employment_type': emp.get('employment_type'),
                'status': emp.get('status', 'active'),
                'hire_date': emp['hire_date'].isoformat() if emp.get('hire_date') else None,
                'termination_date': emp['termination_date'].isoformat() if emp.get('termination_date') else None,
                'salary': float(emp['salary']) if emp.get('salary') else None,
                'created_at': emp['created_at'].isoformat() if emp.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@employees_router.get("/{employee_id}")
async def get_employee(
    employee_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single employee"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM users
            WHERE id = %s AND company_id = %s
        """, (employee_id, company_id))
        
        emp = cursor.fetchone()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {
            'id': str(emp['id']),
            'employee_number': emp.get('employee_number'),
            'first_name': emp.get('first_name'),
            'last_name': emp.get('last_name'),
            'full_name': f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
            'email': emp.get('email'),
            'phone': emp.get('phone'),
            'department': emp.get('department'),
            'position': emp.get('position'),
            'employment_type': emp.get('employment_type'),
            'status': emp.get('status', 'active'),
            'hire_date': emp['hire_date'].isoformat() if emp.get('hire_date') else None,
            'termination_date': emp['termination_date'].isoformat() if emp.get('termination_date') else None,
            'salary': float(emp['salary']) if emp.get('salary') else None,
            'created_at': emp['created_at'].isoformat() if emp.get('created_at') else None,
            'updated_at': emp['updated_at'].isoformat() if emp.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@employees_router.post("")
async def create_employee(
    employee_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new employee"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 'EMP-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM users WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        employee_number = f"EMP-{next_num:05d}"
        
        employee_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO users (id, company_id, employee_number, first_name, last_name, email, phone,
                             department, position, employment_type, status, hire_date, salary, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, employee_number
        """, (employee_id, company_id, employee_number, employee_data.get('first_name'),
              employee_data.get('last_name'), employee_data.get('email'), employee_data.get('phone'),
              employee_data.get('department'), employee_data.get('position'),
              employee_data.get('employment_type'), employee_data.get('status', 'active'),
              employee_data.get('hire_date'), employee_data.get('salary')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'employee_number': result['employee_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@employees_router.put("/{employee_id}")
async def update_employee(
    employee_id: str = Path(...),
    employee_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update an employee"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE users
            SET first_name = %s, last_name = %s, email = %s, phone = %s,
                department = %s, position = %s, employment_type = %s, status = %s,
                salary = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (employee_data.get('first_name'), employee_data.get('last_name'),
              employee_data.get('email'), employee_data.get('phone'),
              employee_data.get('department'), employee_data.get('position'),
              employee_data.get('employment_type'), employee_data.get('status'),
              employee_data.get('salary'), employee_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        conn.commit()
        return {"message": "Employee updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@employees_router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete an employee"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM users WHERE id = %s AND company_id = %s", (employee_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        conn.commit()
        return {"message": "Employee deleted successfully"}
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

payroll_runs_router = APIRouter(prefix="/api/payroll/runs", tags=["Payroll Runs"])

@payroll_runs_router.get("")
async def list_payroll_runs(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all payroll runs"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT pr.*, 
                   COUNT(ps.id) as employee_count,
                   COALESCE(SUM(ps.gross_pay), 0) as total_gross,
                   COALESCE(SUM(ps.net_pay), 0) as total_net
            FROM payroll_runs pr
            LEFT JOIN payslips ps ON pr.id = ps.payroll_run_id
            WHERE pr.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND pr.status = %s"
            params.append(status)
        
        query += " GROUP BY pr.id ORDER BY pr.period_start DESC"
        
        cursor.execute(query, params)
        runs = cursor.fetchall()
        
        result = []
        for run in runs:
            result.append({
                'id': str(run['id']),
                'run_number': run.get('run_number'),
                'period_start': run['period_start'].isoformat() if run.get('period_start') else None,
                'period_end': run['period_end'].isoformat() if run.get('period_end') else None,
                'payment_date': run['payment_date'].isoformat() if run.get('payment_date') else None,
                'status': run.get('status'),
                'employee_count': int(run.get('employee_count', 0)),
                'total_gross': float(run.get('total_gross', 0)),
                'total_net': float(run.get('total_net', 0)),
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

@payroll_runs_router.get("/{run_id}")
async def get_payroll_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single payroll run with payslips"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM payroll_runs
            WHERE id = %s AND company_id = %s
        """, (run_id, company_id))
        
        run = cursor.fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        cursor.execute("""
            SELECT ps.*, u.first_name, u.last_name, u.employee_number
            FROM payslips ps
            JOIN users u ON ps.employee_id = u.id
            WHERE ps.payroll_run_id = %s
            ORDER BY u.last_name, u.first_name
        """, (run_id,))
        
        payslips = cursor.fetchall()
        
        return {
            'id': str(run['id']),
            'run_number': run.get('run_number'),
            'period_start': run['period_start'].isoformat() if run.get('period_start') else None,
            'period_end': run['period_end'].isoformat() if run.get('period_end') else None,
            'payment_date': run['payment_date'].isoformat() if run.get('payment_date') else None,
            'status': run.get('status'),
            'created_at': run['created_at'].isoformat() if run.get('created_at') else None,
            'updated_at': run['updated_at'].isoformat() if run.get('updated_at') else None,
            'payslips': [{
                'id': str(ps['id']),
                'employee_id': str(ps['employee_id']),
                'employee_number': ps.get('employee_number'),
                'employee_name': f"{ps.get('first_name', '')} {ps.get('last_name', '')}".strip(),
                'gross_pay': float(ps.get('gross_pay', 0)),
                'deductions': float(ps.get('deductions', 0)),
                'net_pay': float(ps.get('net_pay', 0))
            } for ps in payslips]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@payroll_runs_router.post("")
async def create_payroll_run(
    run_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new payroll run"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(run_number FROM 'PR-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM payroll_runs WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        run_number = f"PR-{next_num:05d}"
        
        run_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO payroll_runs (id, company_id, run_number, period_start, period_end, payment_date, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, run_number
        """, (run_id, company_id, run_number, run_data.get('period_start'),
              run_data.get('period_end'), run_data.get('payment_date'), 'draft'))
        
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

@payroll_runs_router.post("/{run_id}/process")
async def process_payroll_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Process a payroll run"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE payroll_runs 
            SET status = 'processed', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (run_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        conn.commit()
        return {"message": "Payroll run processed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@payroll_runs_router.delete("/{run_id}")
async def delete_payroll_run(
    run_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a payroll run"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM payslips WHERE payroll_run_id = %s", (run_id,))
        cursor.execute("DELETE FROM payroll_runs WHERE id = %s AND company_id = %s", (run_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        conn.commit()
        return {"message": "Payroll run deleted successfully"}
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

leave_requests_router = APIRouter(prefix="/api/hr/leave-requests", tags=["HR Leave Requests"])

@leave_requests_router.get("")
async def list_leave_requests(
    status: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all leave requests"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT lr.*, u.first_name, u.last_name, u.employee_number, lt.leave_type_name
            FROM leave_requests lr
            JOIN users u ON lr.employee_id = u.id
            LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
            WHERE u.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND lr.status = %s"
            params.append(status)
        if employee_id:
            query += " AND lr.employee_id = %s"
            params.append(employee_id)
        
        query += " ORDER BY lr.start_date DESC"
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        result = []
        for req in requests:
            result.append({
                'id': str(req['id']),
                'employee_id': str(req['employee_id']),
                'employee_number': req.get('employee_number'),
                'employee_name': f"{req.get('first_name', '')} {req.get('last_name', '')}".strip(),
                'leave_type_id': str(req['leave_type_id']) if req.get('leave_type_id') else None,
                'leave_type_name': req.get('leave_type_name'),
                'start_date': req['start_date'].isoformat() if req.get('start_date') else None,
                'end_date': req['end_date'].isoformat() if req.get('end_date') else None,
                'days_requested': float(req.get('days_requested', 0)),
                'status': req.get('status'),
                'reason': req.get('reason'),
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

@leave_requests_router.post("")
async def create_leave_request(
    request_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new leave request"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        request_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days_requested, reason, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """, (request_id, request_data.get('employee_id'), request_data.get('leave_type_id'),
              request_data.get('start_date'), request_data.get('end_date'),
              request_data.get('days_requested'), request_data.get('reason'), 'pending'))
        
        result = cursor.fetchone()
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

@leave_requests_router.post("/{request_id}/approve")
async def approve_leave_request(
    request_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a leave request"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        user_email = current_user.get('email')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE leave_requests lr
            SET status = 'approved', approved_by = %s, approved_at = NOW(), updated_at = NOW()
            FROM users u
            WHERE lr.employee_id = u.id AND lr.id = %s AND u.company_id = %s
        """, (user_email, request_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        conn.commit()
        return {"message": "Leave request approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@leave_requests_router.delete("/{request_id}")
async def delete_leave_request(
    request_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a leave request"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            DELETE FROM leave_requests lr
            USING users u
            WHERE lr.employee_id = u.id AND lr.id = %s AND u.company_id = %s
        """, (request_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        conn.commit()
        return {"message": "Leave request deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
