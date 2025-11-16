from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class RoutingOperationCreate(BaseModel):
    routing_id: int
    operation_sequence: int
    work_center_id: int
    operation_description: str
    setup_time_minutes: Optional[int] = 0
    run_time_per_unit_minutes: Optional[float] = 0
    queue_time_minutes: Optional[int] = 0
    move_time_minutes: Optional[int] = 0
    notes: Optional[str] = None


@router.get("/routing/{routing_id}/operations")
async def get_routing_operations(
    routing_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all operations for a routing"""
    try:
        company_id = current_user.get("company_id", "default")
        
        routing_query = text("""
            SELECT 
                r.routing_number,
                r.product_id,
                p.name as product_name,
                r.version,
                r.status,
                r.effective_date
            FROM routings r
            JOIN products p ON r.product_id = p.id
            WHERE r.id = :routing_id AND r.company_id = :company_id
        """)
        
        routing_result = db.execute(routing_query, {
            "routing_id": routing_id,
            "company_id": company_id
        }).fetchone()
        
        if not routing_result:
            raise HTTPException(status_code=404, detail="Routing not found")
        
        operations_query = text("""
            SELECT 
                ro.id,
                ro.operation_sequence,
                ro.work_center_id,
                wc.name as work_center_name,
                wc.hourly_rate,
                ro.operation_description,
                ro.setup_time_minutes,
                ro.run_time_per_unit_minutes,
                ro.queue_time_minutes,
                ro.move_time_minutes,
                ro.notes,
                ro.setup_time_minutes + ro.run_time_per_unit_minutes + 
                    ro.queue_time_minutes + ro.move_time_minutes as total_time_per_unit,
                (ro.setup_time_minutes + ro.run_time_per_unit_minutes + 
                    ro.queue_time_minutes + ro.move_time_minutes) / 60.0 * wc.hourly_rate as cost_per_unit
            FROM routing_operations ro
            JOIN routings r ON ro.routing_id = r.id
            JOIN work_centers wc ON ro.work_center_id = wc.id
            WHERE r.id = :routing_id AND r.company_id = :company_id
            ORDER BY ro.operation_sequence
        """)
        
        operations_result = db.execute(operations_query, {
            "routing_id": routing_id,
            "company_id": company_id
        })
        
        operations = []
        total_time = 0
        total_cost = 0
        
        for row in operations_result.fetchall():
            time_per_unit = float(row[11]) if row[11] else 0
            cost_per_unit = float(row[12]) if row[12] else 0
            
            total_time += time_per_unit
            total_cost += cost_per_unit
            
            operations.append({
                "id": row[0],
                "operation_sequence": row[1],
                "work_center_id": row[2],
                "work_center_name": row[3],
                "hourly_rate": float(row[4]) if row[4] else 0,
                "operation_description": row[5],
                "setup_time_minutes": row[6],
                "run_time_per_unit_minutes": float(row[7]) if row[7] else 0,
                "queue_time_minutes": row[8],
                "move_time_minutes": row[9],
                "notes": row[10],
                "total_time_per_unit_minutes": time_per_unit,
                "cost_per_unit": cost_per_unit
            })
        
        return {
            "routing": {
                "routing_number": routing_result[0],
                "product_id": routing_result[1],
                "product_name": routing_result[2],
                "version": routing_result[3],
                "status": routing_result[4],
                "effective_date": str(routing_result[5]) if routing_result[5] else None
            },
            "operations": operations,
            "totals": {
                "total_time_per_unit_minutes": total_time,
                "total_cost_per_unit": total_cost
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/routing/{routing_id}/operation")
async def create_routing_operation(
    routing_id: int,
    operation: RoutingOperationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add an operation to a routing"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO routing_operations (
                routing_id, operation_sequence, work_center_id, operation_description,
                setup_time_minutes, run_time_per_unit_minutes, queue_time_minutes,
                move_time_minutes, notes, company_id, created_by, created_at
            ) VALUES (
                :routing_id, :operation_sequence, :work_center_id, :operation_description,
                :setup_time_minutes, :run_time_per_unit_minutes, :queue_time_minutes,
                :move_time_minutes, :notes, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "routing_id": routing_id,
            "operation_sequence": operation.operation_sequence,
            "work_center_id": operation.work_center_id,
            "operation_description": operation.operation_description,
            "setup_time_minutes": operation.setup_time_minutes,
            "run_time_per_unit_minutes": operation.run_time_per_unit_minutes,
            "queue_time_minutes": operation.queue_time_minutes,
            "move_time_minutes": operation.move_time_minutes,
            "notes": operation.notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        operation_id = result.fetchone()[0]
        
        return {"id": operation_id, "message": "Operation added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/routing-operation/{operation_id}")
async def update_routing_operation(
    operation_id: int,
    setup_time_minutes: Optional[int] = None,
    run_time_per_unit_minutes: Optional[float] = None,
    queue_time_minutes: Optional[int] = None,
    move_time_minutes: Optional[int] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a routing operation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"operation_id": operation_id, "company_id": company_id}
        
        if setup_time_minutes is not None:
            updates.append("setup_time_minutes = :setup_time_minutes")
            params["setup_time_minutes"] = setup_time_minutes
        
        if run_time_per_unit_minutes is not None:
            updates.append("run_time_per_unit_minutes = :run_time_per_unit_minutes")
            params["run_time_per_unit_minutes"] = run_time_per_unit_minutes
        
        if queue_time_minutes is not None:
            updates.append("queue_time_minutes = :queue_time_minutes")
            params["queue_time_minutes"] = queue_time_minutes
        
        if move_time_minutes is not None:
            updates.append("move_time_minutes = :move_time_minutes")
            params["move_time_minutes"] = move_time_minutes
        
        if notes is not None:
            updates.append("notes = :notes")
            params["notes"] = notes
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE routing_operations ro
            SET {update_clause}
            FROM routings r
            WHERE ro.routing_id = r.id
                AND ro.id = :operation_id
                AND r.company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Operation updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/routing-operation/{operation_id}")
async def delete_routing_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a routing operation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM routing_operations ro
            USING routings r
            WHERE ro.routing_id = r.id
                AND ro.id = :operation_id
                AND r.company_id = :company_id
        """)
        
        db.execute(delete_query, {"operation_id": operation_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Operation deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/work-center/{work_center_id}/operations")
async def get_work_center_operations(
    work_center_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all operations assigned to a work center"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ro.id,
                r.routing_number,
                r.product_id,
                p.name as product_name,
                ro.operation_sequence,
                ro.operation_description,
                ro.setup_time_minutes,
                ro.run_time_per_unit_minutes,
                r.status
            FROM routing_operations ro
            JOIN routings r ON ro.routing_id = r.id
            JOIN products p ON r.product_id = p.id
            WHERE ro.work_center_id = :work_center_id 
                AND r.company_id = :company_id
                AND r.status = 'ACTIVE'
            ORDER BY p.name, ro.operation_sequence
        """)
        
        result = db.execute(query, {
            "work_center_id": work_center_id,
            "company_id": company_id
        })
        rows = result.fetchall()
        
        operations = []
        for row in rows:
            operations.append({
                "id": row[0],
                "routing_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "operation_sequence": row[4],
                "operation_description": row[5],
                "setup_time_minutes": row[6],
                "run_time_per_unit_minutes": float(row[7]) if row[7] else 0,
                "status": row[8]
            })
        
        return {"operations": operations, "total_count": len(operations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
