"""
ARIA ERP - Field Service Orders & Scheduling Module (PostgreSQL)
Provides full CRUD operations for Service Orders and Scheduling
Matches frontend API contract: /api/field-service/*
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
# SERVICE ORDERS
# ========================================

service_orders_router = APIRouter(prefix="/api/field-service/orders", tags=["Service Orders"])

@service_orders_router.get("")
async def list_service_orders(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all service orders"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT so.id, so.order_number, so.customer_id, c.name as customer_name,
                   so.service_type, so.description, so.priority, so.status,
                   so.technician_id, u.name as technician_name,
                   so.scheduled_date, so.scheduled_time, so.estimated_duration,
                   so.actual_duration, so.completion_notes, so.created_at
            FROM service_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON so.technician_id = u.id
            WHERE so.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND so.status = %s"
            params.append(status)
        if priority:
            query += " AND so.priority = %s"
            params.append(priority)
        
        query += " ORDER BY so.scheduled_date DESC, so.created_at DESC"
        
        cursor.execute(query, params)
        orders = cursor.fetchall()
        
        result = []
        for order in orders:
            result.append({
                'id': str(order['id']),
                'order_number': order.get('order_number'),
                'customer_id': str(order['customer_id']) if order.get('customer_id') else None,
                'customer_name': order.get('customer_name'),
                'service_type': order.get('service_type'),
                'description': order.get('description'),
                'priority': order.get('priority'),
                'status': order.get('status'),
                'technician_id': str(order['technician_id']) if order.get('technician_id') else None,
                'technician_name': order.get('technician_name'),
                'scheduled_date': order['scheduled_date'].isoformat() if order.get('scheduled_date') else None,
                'scheduled_time': str(order['scheduled_time']) if order.get('scheduled_time') else None,
                'estimated_duration': float(order.get('estimated_duration', 0)),
                'actual_duration': float(order.get('actual_duration', 0)) if order.get('actual_duration') else None,
                'completion_notes': order.get('completion_notes'),
                'created_at': order['created_at'].isoformat() if order.get('created_at') else None
            })
        
        return {'orders': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_orders_router.get("/{order_id}")
async def get_service_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single service order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT so.id, so.order_number, so.customer_id, c.name as customer_name,
                   so.service_type, so.description, so.priority, so.status,
                   so.technician_id, u.name as technician_name,
                   so.scheduled_date, so.scheduled_time, so.estimated_duration,
                   so.actual_duration, so.completion_notes, so.created_at
            FROM service_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON so.technician_id = u.id
            WHERE so.id = %s AND so.company_id = %s
        """
        
        cursor.execute(query, [order_id, company_id])
        order = cursor.fetchone()
        
        if not order:
            raise HTTPException(status_code=404, detail="Service order not found")
        
        return {
            'id': str(order['id']),
            'order_number': order.get('order_number'),
            'customer_id': str(order['customer_id']) if order.get('customer_id') else None,
            'customer_name': order.get('customer_name'),
            'service_type': order.get('service_type'),
            'description': order.get('description'),
            'priority': order.get('priority'),
            'status': order.get('status'),
            'technician_id': str(order['technician_id']) if order.get('technician_id') else None,
            'technician_name': order.get('technician_name'),
            'scheduled_date': order['scheduled_date'].isoformat() if order.get('scheduled_date') else None,
            'scheduled_time': str(order['scheduled_time']) if order.get('scheduled_time') else None,
            'estimated_duration': float(order.get('estimated_duration', 0)),
            'actual_duration': float(order.get('actual_duration', 0)) if order.get('actual_duration') else None,
            'completion_notes': order.get('completion_notes'),
            'created_at': order['created_at'].isoformat() if order.get('created_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_orders_router.post("")
async def create_service_order(
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new service order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_id = current_user.get('user_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        order_number = f'SO-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}'
        
        query = """
            INSERT INTO service_orders (
                company_id, order_number, customer_id, service_type, description,
                priority, status, technician_id, scheduled_date, scheduled_time,
                estimated_duration, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, order_number
        """
        
        cursor.execute(query, [
            company_id,
            order_number,
            order_data.get('customer_id'),
            order_data.get('service_type'),
            order_data.get('description'),
            order_data.get('priority', 'MEDIUM'),
            order_data.get('status', 'PENDING'),
            order_data.get('technician_id'),
            order_data.get('scheduled_date'),
            order_data.get('scheduled_time'),
            order_data.get('estimated_duration'),
            user_id
        ])
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'order_number': result['order_number'],
            'message': 'Service order created successfully'
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_orders_router.put("/{order_id}")
async def update_service_order(
    order_id: str = Path(...),
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a service order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM service_orders WHERE id = %s AND company_id = %s", [order_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Service order not found")
        
        update_fields = []
        params = []
        
        if 'customer_id' in order_data:
            update_fields.append("customer_id = %s")
            params.append(order_data['customer_id'])
        if 'service_type' in order_data:
            update_fields.append("service_type = %s")
            params.append(order_data['service_type'])
        if 'description' in order_data:
            update_fields.append("description = %s")
            params.append(order_data['description'])
        if 'priority' in order_data:
            update_fields.append("priority = %s")
            params.append(order_data['priority'])
        if 'status' in order_data:
            update_fields.append("status = %s")
            params.append(order_data['status'])
        if 'technician_id' in order_data:
            update_fields.append("technician_id = %s")
            params.append(order_data['technician_id'])
        if 'scheduled_date' in order_data:
            update_fields.append("scheduled_date = %s")
            params.append(order_data['scheduled_date'])
        if 'scheduled_time' in order_data:
            update_fields.append("scheduled_time = %s")
            params.append(order_data['scheduled_time'])
        if 'estimated_duration' in order_data:
            update_fields.append("estimated_duration = %s")
            params.append(order_data['estimated_duration'])
        if 'actual_duration' in order_data:
            update_fields.append("actual_duration = %s")
            params.append(order_data['actual_duration'])
        if 'completion_notes' in order_data:
            update_fields.append("completion_notes = %s")
            params.append(order_data['completion_notes'])
        
        if not update_fields:
            return {"message": "No fields to update"}
        
        update_fields.append("updated_at = NOW()")
        params.extend([order_id, company_id])
        
        query = f"UPDATE service_orders SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
        cursor.execute(query, params)
        conn.commit()
        
        return {"message": "Service order updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_orders_router.post("/{order_id}/assign")
async def assign_technician(
    order_id: str = Path(...),
    assignment_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Assign a technician to a service order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM service_orders WHERE id = %s AND company_id = %s", [order_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Service order not found")
        
        technician_id = assignment_data.get('technician_id')
        if not technician_id:
            raise HTTPException(status_code=400, detail="technician_id is required")
        
        query = """
            UPDATE service_orders 
            SET technician_id = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """
        cursor.execute(query, [technician_id, order_id, company_id])
        conn.commit()
        
        return {"message": "Technician assigned successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_orders_router.post("/{order_id}/complete")
async def complete_service_order(
    order_id: str = Path(...),
    completion_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Mark a service order as completed"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM service_orders WHERE id = %s AND company_id = %s", [order_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Service order not found")
        
        query = """
            UPDATE service_orders 
            SET status = 'COMPLETED', 
                actual_duration = %s,
                completion_notes = %s,
                updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """
        cursor.execute(query, [
            completion_data.get('actual_duration'),
            completion_data.get('completion_notes'),
            order_id,
            company_id
        ])
        conn.commit()
        
        return {"message": "Service order completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@service_orders_router.delete("/{order_id}")
async def delete_service_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a service order"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM service_orders WHERE id = %s AND company_id = %s", [order_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Service order not found")
        
        cursor.execute("DELETE FROM service_orders WHERE id = %s AND company_id = %s", [order_id, company_id])
        conn.commit()
        
        return {"message": "Service order deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# SCHEDULING
# ========================================

scheduling_router = APIRouter(prefix="/api/field-service/scheduling", tags=["Field Service Scheduling"])

@scheduling_router.get("")
async def list_schedules(
    date: Optional[str] = Query(None),
    technician_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all scheduled service appointments"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT ss.id, ss.schedule_number, ss.service_order_id, so.order_number,
                   ss.technician_id, u.name as technician_name,
                   c.name as customer_name, so.service_type,
                   ss.date, ss.start_time, ss.end_time, ss.duration,
                   ss.status, ss.notes, ss.created_at
            FROM service_schedules ss
            LEFT JOIN service_orders so ON ss.service_order_id = so.id
            LEFT JOIN users u ON ss.technician_id = u.id
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE ss.company_id = %s
        """
        params = [company_id]
        
        if date:
            query += " AND ss.date = %s"
            params.append(date)
        if technician_id:
            query += " AND ss.technician_id = %s"
            params.append(technician_id)
        
        query += " ORDER BY ss.date DESC, ss.start_time DESC"
        
        cursor.execute(query, params)
        schedules = cursor.fetchall()
        
        result = []
        for schedule in schedules:
            result.append({
                'id': str(schedule['id']),
                'schedule_number': schedule.get('schedule_number'),
                'service_order_id': str(schedule['service_order_id']) if schedule.get('service_order_id') else None,
                'order_number': schedule.get('order_number'),
                'technician_id': str(schedule['technician_id']) if schedule.get('technician_id') else None,
                'technician_name': schedule.get('technician_name'),
                'customer_name': schedule.get('customer_name'),
                'service_type': schedule.get('service_type'),
                'date': schedule['date'].isoformat() if schedule.get('date') else None,
                'start_time': str(schedule['start_time']) if schedule.get('start_time') else None,
                'end_time': str(schedule['end_time']) if schedule.get('end_time') else None,
                'duration': float(schedule.get('duration', 0)),
                'status': schedule.get('status'),
                'notes': schedule.get('notes'),
                'created_at': schedule['created_at'].isoformat() if schedule.get('created_at') else None
            })
        
        return {'schedules': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@scheduling_router.post("")
async def create_schedule(
    schedule_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new schedule"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        schedule_number = f'SCH-{datetime.utcnow().strftime("%Y%m%d")}-{uuid.uuid4().hex[:6].upper()}'
        
        query = """
            INSERT INTO service_schedules (
                company_id, schedule_number, service_order_id, technician_id,
                date, start_time, end_time, duration, status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, schedule_number
        """
        
        cursor.execute(query, [
            company_id,
            schedule_number,
            schedule_data.get('service_order_id'),
            schedule_data.get('technician_id'),
            schedule_data.get('date'),
            schedule_data.get('start_time'),
            schedule_data.get('end_time'),
            schedule_data.get('duration'),
            schedule_data.get('status', 'SCHEDULED'),
            schedule_data.get('notes')
        ])
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'schedule_number': result['schedule_number'],
            'message': 'Schedule created successfully'
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@scheduling_router.put("/{schedule_id}")
async def update_schedule(
    schedule_id: str = Path(...),
    schedule_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a schedule"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM service_schedules WHERE id = %s AND company_id = %s", [schedule_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        update_fields = []
        params = []
        
        if 'service_order_id' in schedule_data:
            update_fields.append("service_order_id = %s")
            params.append(schedule_data['service_order_id'])
        if 'technician_id' in schedule_data:
            update_fields.append("technician_id = %s")
            params.append(schedule_data['technician_id'])
        if 'date' in schedule_data:
            update_fields.append("date = %s")
            params.append(schedule_data['date'])
        if 'start_time' in schedule_data:
            update_fields.append("start_time = %s")
            params.append(schedule_data['start_time'])
        if 'end_time' in schedule_data:
            update_fields.append("end_time = %s")
            params.append(schedule_data['end_time'])
        if 'duration' in schedule_data:
            update_fields.append("duration = %s")
            params.append(schedule_data['duration'])
        if 'status' in schedule_data:
            update_fields.append("status = %s")
            params.append(schedule_data['status'])
        if 'notes' in schedule_data:
            update_fields.append("notes = %s")
            params.append(schedule_data['notes'])
        
        if not update_fields:
            return {"message": "No fields to update"}
        
        update_fields.append("updated_at = NOW()")
        params.extend([schedule_id, company_id])
        
        query = f"UPDATE service_schedules SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
        cursor.execute(query, params)
        conn.commit()
        
        return {"message": "Schedule updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@scheduling_router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a schedule"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM service_schedules WHERE id = %s AND company_id = %s", [schedule_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        cursor.execute("DELETE FROM service_schedules WHERE id = %s AND company_id = %s", [schedule_id, company_id])
        conn.commit()
        
        return {"message": "Schedule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
