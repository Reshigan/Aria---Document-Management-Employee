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

# ========================================
# ========================================

## Employee endpoints removed. Use ORM-based /hr/employees endpoints in hr.py


## Employee update/delete endpoints removed. Use ORM-based /hr/employees endpoints in hr.py

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
