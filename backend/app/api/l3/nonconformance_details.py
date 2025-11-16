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


class NonconformanceActionCreate(BaseModel):
    nonconformance_id: int
    action_type: str
    description: str
    assigned_to: int
    due_date: str


@router.get("/nonconformance/{nc_id}/details")
async def get_nonconformance_details(
    nc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a nonconformance"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                nc.nc_number,
                nc.nc_date,
                nc.product_id,
                p.name as product_name,
                p.product_code,
                nc.manufacturing_order_id,
                mo.mo_number,
                nc.quantity_affected,
                nc.severity,
                nc.status,
                nc.description,
                nc.root_cause,
                nc.reported_by,
                nc.created_at
            FROM nonconformances nc
            LEFT JOIN products p ON nc.product_id = p.id
            LEFT JOIN manufacturing_orders mo ON nc.manufacturing_order_id = mo.id
            WHERE nc.id = :nc_id AND nc.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "nc_id": nc_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Nonconformance not found")
        
        actions_query = text("""
            SELECT 
                nca.id,
                nca.action_type,
                nca.description,
                nca.assigned_to,
                e.first_name || ' ' || e.last_name as assigned_to_name,
                nca.due_date,
                nca.completed_date,
                nca.status,
                nca.notes
            FROM nonconformance_actions nca
            LEFT JOIN employees e ON nca.assigned_to = e.id
            WHERE nca.nonconformance_id = :nc_id AND nca.company_id = :company_id
            ORDER BY nca.action_type, nca.created_at
        """)
        
        actions_result = db.execute(actions_query, {
            "nc_id": nc_id,
            "company_id": company_id
        })
        
        actions = []
        completed_actions = 0
        
        for row in actions_result.fetchall():
            if row[7] == "COMPLETED":
                completed_actions += 1
            
            actions.append({
                "id": row[0],
                "action_type": row[1],
                "description": row[2],
                "assigned_to": row[3],
                "assigned_to_name": row[4],
                "due_date": str(row[5]) if row[5] else None,
                "completed_date": str(row[6]) if row[6] else None,
                "status": row[7],
                "notes": row[8]
            })
        
        return {
            "nonconformance": {
                "nc_number": header_result[0],
                "nc_date": str(header_result[1]) if header_result[1] else None,
                "product_id": header_result[2],
                "product_name": header_result[3],
                "product_code": header_result[4],
                "manufacturing_order_id": header_result[5],
                "mo_number": header_result[6],
                "quantity_affected": float(header_result[7]) if header_result[7] else 0,
                "severity": header_result[8],
                "status": header_result[9],
                "description": header_result[10],
                "root_cause": header_result[11],
                "reported_by": header_result[12],
                "created_at": str(header_result[13]) if header_result[13] else None
            },
            "actions": actions,
            "summary": {
                "total_actions": len(actions),
                "completed_actions": completed_actions,
                "pending_actions": len(actions) - completed_actions
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/nonconformance/{nc_id}/action")
async def add_nonconformance_action(
    nc_id: int,
    action: NonconformanceActionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a corrective/preventive action to a nonconformance"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO nonconformance_actions (
                nonconformance_id, action_type, description,
                assigned_to, due_date, company_id, created_by, created_at
            ) VALUES (
                :nonconformance_id, :action_type, :description,
                :assigned_to, :due_date, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "nonconformance_id": nc_id,
            "action_type": action.action_type,
            "description": action.description,
            "assigned_to": action.assigned_to,
            "due_date": action.due_date,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        action_id = result.fetchone()[0]
        
        return {"id": action_id, "message": "Nonconformance action added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/nonconformance-action/{action_id}/complete")
async def complete_nonconformance_action(
    action_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a nonconformance action as completed"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE nonconformance_actions nca
            SET 
                status = 'COMPLETED',
                completed_date = CURRENT_DATE,
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            FROM nonconformances nc
            WHERE nca.nonconformance_id = nc.id
                AND nca.id = :action_id
                AND nc.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "notes": notes,
            "action_id": action_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Nonconformance action completed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/nonconformance-action/{action_id}")
async def delete_nonconformance_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a nonconformance action"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM nonconformance_actions nca
            USING nonconformances nc
            WHERE nca.nonconformance_id = nc.id
                AND nca.id = :action_id
                AND nc.company_id = :company_id
        """)
        
        db.execute(delete_query, {"action_id": action_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Nonconformance action deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nonconformances/by-severity")
async def get_nonconformances_by_severity(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get nonconformances grouped by severity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                nc.severity,
                COUNT(*) as nc_count,
                SUM(nc.quantity_affected) as total_quantity,
                SUM(CASE WHEN nc.status = 'CLOSED' THEN 1 ELSE 0 END) as closed_count
            FROM nonconformances nc
            WHERE nc.company_id = :company_id
            GROUP BY nc.severity
            ORDER BY 
                CASE nc.severity
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'MAJOR' THEN 2
                    WHEN 'MINOR' THEN 3
                END
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        summary = []
        for row in rows:
            summary.append({
                "severity": row[0],
                "nc_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "closed_count": row[3],
                "open_count": row[1] - row[3]
            })
        
        return {"severity_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/nonconformance-history")
async def get_product_nonconformance_history(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get nonconformance history for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                nc.nc_number,
                nc.nc_date,
                nc.severity,
                nc.quantity_affected,
                nc.status,
                nc.description,
                nc.root_cause
            FROM nonconformances nc
            WHERE nc.product_id = :product_id AND nc.company_id = :company_id
            ORDER BY nc.nc_date DESC
            LIMIT 50
        """)
        
        result = db.execute(query, {"product_id": product_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        total_quantity = 0
        
        for row in rows:
            quantity = float(row[3]) if row[3] else 0
            total_quantity += quantity
            
            history.append({
                "nc_number": row[0],
                "nc_date": str(row[1]) if row[1] else None,
                "severity": row[2],
                "quantity_affected": quantity,
                "status": row[4],
                "description": row[5],
                "root_cause": row[6]
            })
        
        return {
            "nonconformance_history": history,
            "total_count": len(history),
            "total_quantity_affected": total_quantity
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}/assigned-actions")
async def get_employee_assigned_actions(
    employee_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get nonconformance actions assigned to an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["nca.assigned_to = :employee_id", "nc.company_id = :company_id"]
        params = {"employee_id": employee_id, "company_id": company_id}
        
        if status:
            where_clauses.append("nca.status = :status")
            params["status"] = status
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                nc.nc_number,
                nc.severity,
                nca.action_type,
                nca.description,
                nca.due_date,
                nca.status,
                CASE 
                    WHEN nca.due_date < CURRENT_DATE AND nca.status != 'COMPLETED' THEN true
                    ELSE false
                END as is_overdue
            FROM nonconformance_actions nca
            JOIN nonconformances nc ON nca.nonconformance_id = nc.id
            WHERE {where_clause}
            ORDER BY nca.due_date
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        actions = []
        overdue_count = 0
        
        for row in rows:
            if row[6]:
                overdue_count += 1
            
            actions.append({
                "nc_number": row[0],
                "severity": row[1],
                "action_type": row[2],
                "description": row[3],
                "due_date": str(row[4]) if row[4] else None,
                "status": row[5],
                "is_overdue": row[6]
            })
        
        return {
            "assigned_actions": actions,
            "total_count": len(actions),
            "overdue_count": overdue_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nonconformances/root-cause-analysis")
async def get_root_cause_analysis(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get root cause analysis for nonconformances"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["nc.company_id = :company_id", "nc.root_cause IS NOT NULL"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("nc.nc_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("nc.nc_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                nc.root_cause,
                COUNT(*) as nc_count,
                SUM(nc.quantity_affected) as total_quantity,
                AVG(CASE nc.severity 
                    WHEN 'CRITICAL' THEN 3
                    WHEN 'MAJOR' THEN 2
                    WHEN 'MINOR' THEN 1
                END) as avg_severity
            FROM nonconformances nc
            WHERE {where_clause}
            GROUP BY nc.root_cause
            ORDER BY nc_count DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        analysis = []
        for row in rows:
            analysis.append({
                "root_cause": row[0],
                "nc_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "avg_severity": float(row[3]) if row[3] else 0
            })
        
        return {"root_cause_analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
