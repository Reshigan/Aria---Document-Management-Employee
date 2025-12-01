"""
ARIA ERP - Projects Module (PostgreSQL)
Provides full CRUD operations for Projects, Tasks, Timesheets, Reports
Matches frontend API contract: /api/projects/*
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
# PROJECTS DASHBOARD
# ========================================

projects_dashboard_router = APIRouter(prefix="/api/projects", tags=["Projects Dashboard"])

@projects_dashboard_router.get("/metrics")
async def get_projects_metrics(
    current_user: Dict = Depends(get_current_user)
):
    """Get projects dashboard metrics"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        # Get project counts
        cursor.execute("""
            SELECT 
                COUNT(*) as total_projects,
                COUNT(*) FILTER (WHERE status IN ('PLANNING', 'IN_PROGRESS')) as active_projects,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_projects,
                COALESCE(SUM(budget), 0) as total_budget,
                COALESCE(SUM(actual_cost), 0) as budget_spent
            FROM projects
            WHERE company_id = %s
        """, (company_id,))
        project_stats = cursor.fetchone()
        
        # Get task counts
        cursor.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as tasks_completed,
                COUNT(*) FILTER (WHERE status != 'COMPLETED') as tasks_pending
            FROM project_tasks
            WHERE company_id = %s
        """, (company_id,))
        task_stats = cursor.fetchone()
        
        # Get team member count
        cursor.execute("""
            SELECT COUNT(DISTINCT assigned_to) as team_members
            FROM project_tasks
            WHERE company_id = %s AND assigned_to IS NOT NULL
        """, (company_id,))
        team_stats = cursor.fetchone()
        
        return {
            'total_projects': int(project_stats.get('total_projects', 0)),
            'active_projects': int(project_stats.get('active_projects', 0)),
            'completed_projects': int(project_stats.get('completed_projects', 0)),
            'total_budget': float(project_stats.get('total_budget', 0)),
            'budget_spent': float(project_stats.get('budget_spent', 0)),
            'tasks_completed': int(task_stats.get('tasks_completed', 0)),
            'tasks_pending': int(task_stats.get('tasks_pending', 0)),
            'team_members': int(team_stats.get('team_members', 0))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# TASKS
# ========================================

tasks_router = APIRouter(prefix="/api/projects/tasks", tags=["Project Tasks"])

@tasks_router.get("")
async def list_tasks(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all tasks"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT 
                t.id, t.task_number, t.title, t.description, t.status, t.priority,
                t.due_date, t.estimated_hours, t.actual_hours, t.created_at,
                t.project_id, p.project_name,
                u.first_name || ' ' || u.last_name as assigned_to
            FROM project_tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.company_id = %s
        """
        params = [company_id]
        
        if project_id:
            query += " AND t.project_id = %s"
            params.append(project_id)
        if status:
            query += " AND t.status = %s"
            params.append(status)
        if priority:
            query += " AND t.priority = %s"
            params.append(priority)
        
        query += " ORDER BY t.due_date, t.priority DESC"
        
        cursor.execute(query, params)
        tasks = cursor.fetchall()
        
        result = []
        for task in tasks:
            result.append({
                'id': str(task['id']),
                'task_number': task.get('task_number'),
                'title': task.get('title'),
                'description': task.get('description'),
                'project_id': str(task['project_id']) if task.get('project_id') else None,
                'project_name': task.get('project_name'),
                'assigned_to': task.get('assigned_to'),
                'status': task.get('status'),
                'priority': task.get('priority'),
                'due_date': task['due_date'].isoformat() if task.get('due_date') else None,
                'estimated_hours': float(task['estimated_hours']) if task.get('estimated_hours') else None,
                'actual_hours': float(task['actual_hours']) if task.get('actual_hours') else 0.0,
                'created_at': task['created_at'].isoformat() if task.get('created_at') else None
            })
        
        return {'tasks': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tasks_router.get("/{task_id}")
async def get_task(
    task_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single task"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT 
                t.*, p.project_name,
                u.first_name || ' ' || u.last_name as assigned_to_name
            FROM project_tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.id = %s AND t.company_id = %s
        """, (task_id, company_id))
        
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            'id': str(task['id']),
            'task_number': task.get('task_number'),
            'title': task.get('title'),
            'description': task.get('description'),
            'project_id': str(task['project_id']) if task.get('project_id') else None,
            'project_name': task.get('project_name'),
            'assigned_to': task.get('assigned_to_name'),
            'status': task.get('status'),
            'priority': task.get('priority'),
            'due_date': task['due_date'].isoformat() if task.get('due_date') else None,
            'estimated_hours': float(task['estimated_hours']) if task.get('estimated_hours') else None,
            'actual_hours': float(task['actual_hours']) if task.get('actual_hours') else 0.0,
            'created_at': task['created_at'].isoformat() if task.get('created_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tasks_router.post("")
async def create_task(
    task_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new task"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        # Generate task number
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM 'TASK-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM project_tasks WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        task_number = f"TASK-{next_num:05d}"
        
        task_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO project_tasks (id, company_id, task_number, title, description, project_id, assigned_to, status, priority, due_date, estimated_hours, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, task_number
        """, (task_id, company_id, task_number, task_data.get('title'), task_data.get('description'),
              task_data.get('project_id'), task_data.get('assigned_to'), task_data.get('status', 'TODO'),
              task_data.get('priority', 'MEDIUM'), task_data.get('due_date'), task_data.get('estimated_hours')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'task_number': result['task_number'], 'message': 'Task created successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tasks_router.put("/{task_id}")
async def update_task(
    task_id: str = Path(...),
    task_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a task"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE project_tasks
            SET title = %s, description = %s, assigned_to = %s, status = %s, priority = %s, due_date = %s, estimated_hours = %s, actual_hours = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (task_data.get('title'), task_data.get('description'), task_data.get('assigned_to'),
              task_data.get('status'), task_data.get('priority'), task_data.get('due_date'),
              task_data.get('estimated_hours'), task_data.get('actual_hours'), task_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        conn.commit()
        return {"message": "Task updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tasks_router.delete("/{task_id}")
async def delete_task(
    task_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a task"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM project_tasks WHERE id = %s AND company_id = %s", (task_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        conn.commit()
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# TIMESHEETS
# ========================================

timesheets_router = APIRouter(prefix="/api/projects/timesheets", tags=["Timesheets"])

@timesheets_router.get("")
async def list_timesheets(
    employee_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all timesheets"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT 
                ts.id, ts.timesheet_number, ts.date, ts.hours, ts.description, ts.status, ts.created_at,
                ts.employee_id, u.first_name || ' ' || u.last_name as employee_name,
                ts.project_id, p.project_name,
                ts.task_id, t.title as task_name
            FROM project_timesheets ts
            LEFT JOIN users u ON ts.employee_id = u.id
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN project_tasks t ON ts.task_id = t.id
            WHERE ts.company_id = %s
        """
        params = [company_id]
        
        if employee_id:
            query += " AND ts.employee_id = %s"
            params.append(employee_id)
        if project_id:
            query += " AND ts.project_id = %s"
            params.append(project_id)
        if status:
            query += " AND ts.status = %s"
            params.append(status)
        
        query += " ORDER BY ts.date DESC"
        
        cursor.execute(query, params)
        timesheets = cursor.fetchall()
        
        result = []
        for ts in timesheets:
            result.append({
                'id': str(ts['id']),
                'timesheet_number': ts.get('timesheet_number'),
                'employee_id': str(ts['employee_id']) if ts.get('employee_id') else None,
                'employee_name': ts.get('employee_name'),
                'project_id': str(ts['project_id']) if ts.get('project_id') else None,
                'project_name': ts.get('project_name'),
                'task_id': str(ts['task_id']) if ts.get('task_id') else None,
                'task_name': ts.get('task_name'),
                'date': ts['date'].isoformat() if ts.get('date') else None,
                'hours': float(ts['hours']) if ts.get('hours') else 0.0,
                'description': ts.get('description'),
                'status': ts.get('status'),
                'created_at': ts['created_at'].isoformat() if ts.get('created_at') else None
            })
        
        return {'timesheets': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@timesheets_router.post("")
async def create_timesheet(
    timesheet_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new timesheet entry"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(timesheet_number FROM 'TS-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM project_timesheets WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        timesheet_number = f"TS-{next_num:05d}"
        
        timesheet_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO project_timesheets (id, company_id, timesheet_number, employee_id, project_id, task_id, date, hours, description, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, timesheet_number
        """, (timesheet_id, company_id, timesheet_number, timesheet_data.get('employee_id'),
              timesheet_data.get('project_id'), timesheet_data.get('task_id'), timesheet_data.get('date'),
              timesheet_data.get('hours'), timesheet_data.get('description'), timesheet_data.get('status', 'DRAFT')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'timesheet_number': result['timesheet_number'], 'message': 'Timesheet created successfully'}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@timesheets_router.put("/{timesheet_id}")
async def update_timesheet(
    timesheet_id: str = Path(...),
    timesheet_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a timesheet"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE project_timesheets
            SET project_id = %s, task_id = %s, date = %s, hours = %s, description = %s, status = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (timesheet_data.get('project_id'), timesheet_data.get('task_id'), timesheet_data.get('date'),
              timesheet_data.get('hours'), timesheet_data.get('description'), timesheet_data.get('status'),
              timesheet_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        conn.commit()
        return {"message": "Timesheet updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@timesheets_router.post("/{timesheet_id}/submit")
async def submit_timesheet(
    timesheet_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Submit a timesheet for approval"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE project_timesheets
            SET status = 'SUBMITTED', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (timesheet_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        conn.commit()
        return {"message": "Timesheet submitted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@timesheets_router.post("/{timesheet_id}/approve")
async def approve_timesheet(
    timesheet_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a timesheet"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_id = current_user.get('id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE project_timesheets
            SET status = 'APPROVED', approved_by = %s, approved_at = NOW(), updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (user_id, timesheet_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        conn.commit()
        return {"message": "Timesheet approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@timesheets_router.delete("/{timesheet_id}")
async def delete_timesheet(
    timesheet_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a timesheet"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM project_timesheets WHERE id = %s AND company_id = %s", (timesheet_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        conn.commit()
        return {"message": "Timesheet deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# PROJECT REPORTS
# ========================================

reports_router = APIRouter(prefix="/api/projects/reports", tags=["Project Reports"])

@reports_router.get("")
async def get_project_reports(
    project_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """Get project performance reports"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT 
                p.id, p.project_name, p.budget, p.actual_cost, p.progress_percentage,
                p.start_date, p.end_date, p.status,
                (p.budget - p.actual_cost) as budget_variance,
                COUNT(t.id) as tasks_total,
                COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as tasks_completed,
                COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS') as tasks_in_progress,
                COUNT(t.id) FILTER (WHERE t.status = 'TODO') as tasks_pending,
                COUNT(DISTINCT t.assigned_to) as team_size
            FROM projects p
            LEFT JOIN project_tasks t ON p.id = t.project_id
            WHERE p.company_id = %s
        """
        params = [company_id]
        
        if project_id:
            query += " AND p.id = %s"
            params.append(project_id)
        
        query += " GROUP BY p.id ORDER BY p.start_date DESC"
        
        cursor.execute(query, params)
        reports = cursor.fetchall()
        
        result = []
        for report in reports:
            result.append({
                'id': str(report['id']),
                'project_id': str(report['id']),
                'project_name': report.get('project_name'),
                'budget': float(report.get('budget', 0)),
                'actual_cost': float(report.get('actual_cost', 0)),
                'budget_variance': float(report.get('budget_variance', 0)),
                'progress_percentage': float(report.get('progress_percentage', 0)),
                'tasks_total': int(report.get('tasks_total', 0)),
                'tasks_completed': int(report.get('tasks_completed', 0)),
                'tasks_in_progress': int(report.get('tasks_in_progress', 0)),
                'tasks_pending': int(report.get('tasks_pending', 0)),
                'team_size': int(report.get('team_size', 0)),
                'start_date': report['start_date'].isoformat() if report.get('start_date') else None,
                'end_date': report['end_date'].isoformat() if report.get('end_date') else None,
                'status': report.get('status')
            })
        
        return {'reports': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
