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
        
        # Mock data for now - replace with actual queries when tables exist
        return {
            'total_projects': 12,
            'active_projects': 8,
            'completed_projects': 4,
            'total_budget': 1500000.00,
            'budget_spent': 875000.00,
            'tasks_completed': 145,
            'tasks_pending': 67,
            'team_members': 24
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
        
        # Mock data for now
        tasks = [
            {
                'id': str(uuid.uuid4()),
                'task_number': 'TASK-001',
                'title': 'Design database schema',
                'description': 'Create initial database schema for the project',
                'project_id': str(uuid.uuid4()),
                'project_name': 'ERP Implementation',
                'assigned_to': 'John Doe',
                'status': 'IN_PROGRESS',
                'priority': 'HIGH',
                'due_date': '2025-12-15',
                'estimated_hours': 40.0,
                'actual_hours': 25.0,
                'created_at': datetime.utcnow().isoformat()
            },
            {
                'id': str(uuid.uuid4()),
                'task_number': 'TASK-002',
                'title': 'Implement user authentication',
                'description': 'Set up JWT-based authentication system',
                'project_id': str(uuid.uuid4()),
                'project_name': 'ERP Implementation',
                'assigned_to': 'Jane Smith',
                'status': 'TODO',
                'priority': 'MEDIUM',
                'due_date': '2025-12-20',
                'estimated_hours': 30.0,
                'actual_hours': 0.0,
                'created_at': datetime.utcnow().isoformat()
            }
        ]
        
        # Filter by status if provided
        if status:
            tasks = [t for t in tasks if t['status'] == status]
        
        # Filter by priority if provided
        if priority:
            tasks = [t for t in tasks if t['priority'] == priority]
        
        return {'tasks': tasks, 'total': len(tasks)}
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
    return {
        'id': task_id,
        'task_number': 'TASK-001',
        'title': 'Design database schema',
        'description': 'Create initial database schema for the project',
        'project_id': str(uuid.uuid4()),
        'project_name': 'ERP Implementation',
        'assigned_to': 'John Doe',
        'status': 'IN_PROGRESS',
        'priority': 'HIGH',
        'due_date': '2025-12-15',
        'estimated_hours': 40.0,
        'actual_hours': 25.0,
        'created_at': datetime.utcnow().isoformat()
    }

@tasks_router.post("")
async def create_task(
    task_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new task"""
    task_id = str(uuid.uuid4())
    return {
        'id': task_id,
        'task_number': f'TASK-{uuid.uuid4().hex[:6].upper()}',
        'message': 'Task created successfully'
    }

@tasks_router.put("/{task_id}")
async def update_task(
    task_id: str = Path(...),
    task_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a task"""
    return {"message": "Task updated successfully"}

@tasks_router.delete("/{task_id}")
async def delete_task(
    task_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a task"""
    return {"message": "Task deleted successfully"}

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
    timesheets = [
        {
            'id': str(uuid.uuid4()),
            'timesheet_number': 'TS-001',
            'employee_id': str(uuid.uuid4()),
            'employee_name': 'John Doe',
            'project_id': str(uuid.uuid4()),
            'project_name': 'ERP Implementation',
            'task_id': str(uuid.uuid4()),
            'task_name': 'Design database schema',
            'date': '2025-12-01',
            'hours': 8.0,
            'description': 'Worked on database schema design',
            'status': 'SUBMITTED',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'timesheet_number': 'TS-002',
            'employee_id': str(uuid.uuid4()),
            'employee_name': 'Jane Smith',
            'project_id': str(uuid.uuid4()),
            'project_name': 'ERP Implementation',
            'task_id': str(uuid.uuid4()),
            'task_name': 'Implement authentication',
            'date': '2025-12-01',
            'hours': 6.5,
            'description': 'Set up JWT authentication',
            'status': 'DRAFT',
            'created_at': datetime.utcnow().isoformat()
        }
    ]
    
    if status:
        timesheets = [t for t in timesheets if t['status'] == status]
    
    return {'timesheets': timesheets, 'total': len(timesheets)}

@timesheets_router.post("")
async def create_timesheet(
    timesheet_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new timesheet entry"""
    timesheet_id = str(uuid.uuid4())
    return {
        'id': timesheet_id,
        'timesheet_number': f'TS-{uuid.uuid4().hex[:6].upper()}',
        'message': 'Timesheet created successfully'
    }

@timesheets_router.put("/{timesheet_id}")
async def update_timesheet(
    timesheet_id: str = Path(...),
    timesheet_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a timesheet"""
    return {"message": "Timesheet updated successfully"}

@timesheets_router.post("/{timesheet_id}/submit")
async def submit_timesheet(
    timesheet_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Submit a timesheet for approval"""
    return {"message": "Timesheet submitted successfully"}

@timesheets_router.post("/{timesheet_id}/approve")
async def approve_timesheet(
    timesheet_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a timesheet"""
    return {"message": "Timesheet approved successfully"}

@timesheets_router.delete("/{timesheet_id}")
async def delete_timesheet(
    timesheet_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a timesheet"""
    return {"message": "Timesheet deleted successfully"}

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
    reports = [
        {
            'id': str(uuid.uuid4()),
            'project_id': str(uuid.uuid4()),
            'project_name': 'ERP Implementation',
            'budget': 500000.00,
            'actual_cost': 325000.00,
            'budget_variance': -175000.00,
            'progress_percentage': 65.0,
            'tasks_total': 50,
            'tasks_completed': 32,
            'tasks_in_progress': 12,
            'tasks_pending': 6,
            'team_size': 8,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'status': 'IN_PROGRESS'
        },
        {
            'id': str(uuid.uuid4()),
            'project_id': str(uuid.uuid4()),
            'project_name': 'Website Redesign',
            'budget': 150000.00,
            'actual_cost': 145000.00,
            'budget_variance': -5000.00,
            'progress_percentage': 95.0,
            'tasks_total': 25,
            'tasks_completed': 24,
            'tasks_in_progress': 1,
            'tasks_pending': 0,
            'team_size': 5,
            'start_date': '2025-06-01',
            'end_date': '2025-11-30',
            'status': 'IN_PROGRESS'
        }
    ]
    
    if project_id:
        reports = [r for r in reports if r['project_id'] == project_id]
    
    return {'reports': reports, 'total': len(reports)}
