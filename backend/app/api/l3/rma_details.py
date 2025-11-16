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


class RMALineCreate(BaseModel):
    rma_id: int
    product_id: int
    quantity: float
    reason: str
    condition: str
    resolution: Optional[str] = None


@router.get("/rma/{rma_id}/lines")
async def get_rma_lines(
    rma_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for an RMA"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                r.rma_number,
                r.rma_date,
                r.customer_id,
                c.name as customer_name,
                r.sales_order_id,
                so.order_number,
                r.status,
                r.return_reason
            FROM rmas r
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN sales_orders so ON r.sales_order_id = so.id
            WHERE r.id = :rma_id AND r.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "rma_id": rma_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="RMA not found")
        
        lines_query = text("""
            SELECT 
                rl.id,
                rl.line_number,
                rl.product_id,
                p.name as product_name,
                p.product_code,
                rl.quantity,
                rl.quantity_received,
                rl.reason,
                rl.condition,
                rl.resolution,
                rl.status,
                rl.inspection_notes,
                p.unit_price
            FROM rma_lines rl
            JOIN rmas r ON rl.rma_id = r.id
            JOIN products p ON rl.product_id = p.id
            WHERE r.id = :rma_id AND r.company_id = :company_id
            ORDER BY rl.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "rma_id": rma_id,
            "company_id": company_id
        })
        
        lines = []
        total_quantity = 0
        total_received = 0
        total_value = 0
        
        for row in lines_result.fetchall():
            quantity = float(row[5]) if row[5] else 0
            qty_received = float(row[6]) if row[6] else 0
            unit_price = float(row[12]) if row[12] else 0
            
            total_quantity += quantity
            total_received += qty_received
            total_value += quantity * unit_price
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "quantity": quantity,
                "quantity_received": qty_received,
                "reason": row[7],
                "condition": row[8],
                "resolution": row[9],
                "status": row[10],
                "inspection_notes": row[11],
                "unit_price": unit_price,
                "line_value": quantity * unit_price
            })
        
        return {
            "rma": {
                "rma_number": header_result[0],
                "rma_date": str(header_result[1]) if header_result[1] else None,
                "customer_id": header_result[2],
                "customer_name": header_result[3],
                "sales_order_id": header_result[4],
                "order_number": header_result[5],
                "status": header_result[6],
                "return_reason": header_result[7]
            },
            "lines": lines,
            "summary": {
                "total_lines": len(lines),
                "total_quantity": total_quantity,
                "total_received": total_received,
                "total_value": total_value
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rma/{rma_id}/line")
async def add_rma_line(
    rma_id: int,
    line: RMALineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to an RMA"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM rma_lines rl
            JOIN rmas r ON rl.rma_id = r.id
            WHERE r.id = :rma_id AND r.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "rma_id": rma_id,
            "company_id": company_id
        }).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO rma_lines (
                rma_id, line_number, product_id, quantity,
                reason, condition, resolution, company_id, created_by, created_at
            ) VALUES (
                :rma_id, :line_number, :product_id, :quantity,
                :reason, :condition, :resolution, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "rma_id": rma_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "quantity": line.quantity,
            "reason": line.reason,
            "condition": line.condition,
            "resolution": line.resolution,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "RMA line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rma-line/{line_id}/receive")
async def receive_rma_line(
    line_id: int,
    quantity_received: float,
    condition: str,
    inspection_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record receipt of RMA line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE rma_lines rl
            SET 
                quantity_received = :quantity_received,
                condition = :condition,
                inspection_notes = :inspection_notes,
                status = CASE 
                    WHEN :quantity_received >= quantity THEN 'RECEIVED'
                    WHEN :quantity_received > 0 THEN 'PARTIAL'
                    ELSE 'PENDING'
                END,
                received_by = :received_by,
                received_at = NOW(),
                updated_at = NOW()
            FROM rmas r
            WHERE rl.rma_id = r.id
                AND rl.id = :line_id
                AND r.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "quantity_received": quantity_received,
            "condition": condition,
            "inspection_notes": inspection_notes,
            "received_by": user_email,
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "RMA line receipt recorded successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rma-line/{line_id}/resolve")
async def resolve_rma_line(
    line_id: int,
    resolution: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Set resolution for an RMA line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE rma_lines rl
            SET 
                resolution = :resolution,
                inspection_notes = COALESCE(:notes, inspection_notes),
                status = 'RESOLVED',
                updated_at = NOW()
            FROM rmas r
            WHERE rl.rma_id = r.id
                AND rl.id = :line_id
                AND r.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "resolution": resolution,
            "notes": notes,
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "RMA line resolved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rma-line/{line_id}")
async def delete_rma_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an RMA line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM rma_lines rl
            USING rmas r
            WHERE rl.rma_id = r.id
                AND rl.id = :line_id
                AND r.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        db.commit()
        
        return {"message": "RMA line deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rma/{rma_id}/reason-analysis")
async def get_rma_reason_analysis(
    rma_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get analysis of RMA reasons"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                rl.reason,
                COUNT(*) as line_count,
                SUM(rl.quantity) as total_quantity,
                SUM(rl.quantity * p.unit_price) as total_value
            FROM rma_lines rl
            JOIN rmas r ON rl.rma_id = r.id
            JOIN products p ON rl.product_id = p.id
            WHERE r.id = :rma_id AND r.company_id = :company_id
            GROUP BY rl.reason
            ORDER BY total_value DESC
        """)
        
        result = db.execute(query, {"rma_id": rma_id, "company_id": company_id})
        rows = result.fetchall()
        
        analysis = []
        for row in rows:
            analysis.append({
                "reason": row[0],
                "line_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "total_value": float(row[3]) if row[3] else 0
            })
        
        return {"reason_analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rma/{rma_id}/condition-summary")
async def get_rma_condition_summary(
    rma_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get summary of returned item conditions"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                rl.condition,
                COUNT(*) as line_count,
                SUM(rl.quantity_received) as total_quantity
            FROM rma_lines rl
            JOIN rmas r ON rl.rma_id = r.id
            WHERE r.id = :rma_id AND r.company_id = :company_id
            GROUP BY rl.condition
            ORDER BY total_quantity DESC
        """)
        
        result = db.execute(query, {"rma_id": rma_id, "company_id": company_id})
        rows = result.fetchall()
        
        summary = []
        for row in rows:
            summary.append({
                "condition": row[0],
                "line_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0
            })
        
        return {"condition_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer/{customer_id}/rma-history")
async def get_customer_rma_history(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get RMA history for a customer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                r.id,
                r.rma_number,
                r.rma_date,
                r.status,
                r.return_reason,
                COUNT(rl.id) as line_count,
                SUM(rl.quantity) as total_quantity
            FROM rmas r
            LEFT JOIN rma_lines rl ON r.id = rl.rma_id
            WHERE r.customer_id = :customer_id AND r.company_id = :company_id
            GROUP BY r.id, r.rma_number, r.rma_date, r.status, r.return_reason
            ORDER BY r.rma_date DESC
            LIMIT 50
        """)
        
        result = db.execute(query, {"customer_id": customer_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "rma_number": row[1],
                "rma_date": str(row[2]) if row[2] else None,
                "status": row[3],
                "return_reason": row[4],
                "line_count": row[5] if row[5] else 0,
                "total_quantity": float(row[6]) if row[6] else 0
            })
        
        return {
            "rmas": history,
            "total_count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
