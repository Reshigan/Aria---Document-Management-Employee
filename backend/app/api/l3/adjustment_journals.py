from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class AdjustmentJournalLineCreate(BaseModel):
    adjustment_journal_id: int
    product_id: int
    warehouse_id: int
    bin_location: Optional[str] = None
    lot_number: Optional[str] = None
    adjustment_quantity: float
    reason_code: str


@router.get("/adjustment-journal/{journal_id}/lines")
async def get_adjustment_journal_lines(
    journal_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for an inventory adjustment journal"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                aj.journal_number,
                aj.adjustment_date,
                aj.reason,
                aj.status,
                aj.notes
            FROM adjustment_journals aj
            WHERE aj.id = :journal_id AND aj.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "journal_id": journal_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Adjustment journal not found")
        
        lines_query = text("""
            SELECT 
                ajl.id,
                ajl.line_number,
                ajl.product_id,
                p.name as product_name,
                p.product_code,
                ajl.warehouse_id,
                w.name as warehouse_name,
                ajl.bin_location,
                ajl.lot_number,
                ajl.adjustment_quantity,
                ajl.reason_code,
                p.unit_cost,
                ajl.adjustment_quantity * p.unit_cost as adjustment_value
            FROM adjustment_journal_lines ajl
            JOIN adjustment_journals aj ON ajl.adjustment_journal_id = aj.id
            JOIN products p ON ajl.product_id = p.id
            JOIN warehouses w ON ajl.warehouse_id = w.id
            WHERE aj.id = :journal_id AND aj.company_id = :company_id
            ORDER BY ajl.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "journal_id": journal_id,
            "company_id": company_id
        })
        
        lines = []
        total_value = 0
        positive_adjustments = 0
        negative_adjustments = 0
        
        for row in lines_result.fetchall():
            adjustment_qty = float(row[9]) if row[9] else 0
            adjustment_value = float(row[12]) if row[12] else 0
            
            total_value += adjustment_value
            
            if adjustment_qty > 0:
                positive_adjustments += 1
            elif adjustment_qty < 0:
                negative_adjustments += 1
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "warehouse_id": row[5],
                "warehouse_name": row[6],
                "bin_location": row[7],
                "lot_number": row[8],
                "adjustment_quantity": adjustment_qty,
                "reason_code": row[10],
                "unit_cost": float(row[11]) if row[11] else 0,
                "adjustment_value": adjustment_value
            })
        
        return {
            "journal": {
                "journal_number": header_result[0],
                "adjustment_date": str(header_result[1]) if header_result[1] else None,
                "reason": header_result[2],
                "status": header_result[3],
                "notes": header_result[4]
            },
            "lines": lines,
            "summary": {
                "total_lines": len(lines),
                "total_adjustment_value": total_value,
                "positive_adjustments": positive_adjustments,
                "negative_adjustments": negative_adjustments
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adjustment-journal/{journal_id}/line")
async def add_adjustment_journal_line(
    journal_id: int,
    line: AdjustmentJournalLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to an adjustment journal"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM adjustment_journal_lines ajl
            JOIN adjustment_journals aj ON ajl.adjustment_journal_id = aj.id
            WHERE aj.id = :journal_id AND aj.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "journal_id": journal_id,
            "company_id": company_id
        }).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO adjustment_journal_lines (
                adjustment_journal_id, line_number, product_id, warehouse_id,
                bin_location, lot_number, adjustment_quantity, reason_code,
                company_id, created_by, created_at
            ) VALUES (
                :adjustment_journal_id, :line_number, :product_id, :warehouse_id,
                :bin_location, :lot_number, :adjustment_quantity, :reason_code,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "adjustment_journal_id": journal_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "warehouse_id": line.warehouse_id,
            "bin_location": line.bin_location,
            "lot_number": line.lot_number,
            "adjustment_quantity": line.adjustment_quantity,
            "reason_code": line.reason_code,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Adjustment journal line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/adjustment-journal-line/{line_id}")
async def delete_adjustment_journal_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an adjustment journal line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM adjustment_journal_lines ajl
            USING adjustment_journals aj
            WHERE ajl.adjustment_journal_id = aj.id
                AND ajl.id = :line_id
                AND aj.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Adjustment journal line deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adjustment-journal/{journal_id}/post")
async def post_adjustment_journal(
    journal_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Post adjustment journal to inventory"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        journal_query = text("""
            SELECT 
                aj.journal_number,
                aj.adjustment_date,
                aj.status
            FROM adjustment_journals aj
            WHERE aj.id = :journal_id AND aj.company_id = :company_id
        """)
        
        journal_result = db.execute(journal_query, {
            "journal_id": journal_id,
            "company_id": company_id
        }).fetchone()
        
        if not journal_result:
            raise HTTPException(status_code=404, detail="Adjustment journal not found")
        
        if journal_result[2] == "POSTED":
            raise HTTPException(status_code=400, detail="Adjustment journal already posted")
        
        lines_query = text("""
            SELECT 
                ajl.product_id,
                ajl.warehouse_id,
                ajl.bin_location,
                ajl.lot_number,
                ajl.adjustment_quantity
            FROM adjustment_journal_lines ajl
            JOIN adjustment_journals aj ON ajl.adjustment_journal_id = aj.id
            WHERE aj.id = :journal_id AND aj.company_id = :company_id
        """)
        
        lines_result = db.execute(lines_query, {
            "journal_id": journal_id,
            "company_id": company_id
        })
        
        for row in lines_result.fetchall():
            adjustment_qty = float(row[4]) if row[4] else 0
            
            ledger_query = text("""
                INSERT INTO item_ledger_entries (
                    product_id, transaction_date, transaction_type,
                    document_type, document_number, warehouse_id,
                    bin_location, lot_number, 
                    quantity_in, quantity_out,
                    company_id, created_by, created_at
                ) VALUES (
                    :product_id, :adjustment_date, 'ADJUSTMENT',
                    'ADJUSTMENT_JOURNAL', :journal_number, :warehouse_id,
                    :bin_location, :lot_number,
                    CASE WHEN :adjustment_qty > 0 THEN :adjustment_qty ELSE 0 END,
                    CASE WHEN :adjustment_qty < 0 THEN ABS(:adjustment_qty) ELSE 0 END,
                    :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(ledger_query, {
                "product_id": row[0],
                "adjustment_date": journal_result[1],
                "journal_number": journal_result[0],
                "warehouse_id": row[1],
                "bin_location": row[2],
                "lot_number": row[3],
                "adjustment_qty": adjustment_qty,
                "company_id": company_id,
                "created_by": user_email
            })
        
        update_query = text("""
            UPDATE adjustment_journals
            SET status = 'POSTED', updated_at = NOW()
            WHERE id = :journal_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"journal_id": journal_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Adjustment journal posted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/adjustment-journals/reason-analysis")
async def get_adjustment_reason_analysis(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get analysis of adjustment reasons"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["aj.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("aj.adjustment_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("aj.adjustment_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                ajl.reason_code,
                COUNT(*) as line_count,
                SUM(ajl.adjustment_quantity) as total_quantity,
                SUM(ajl.adjustment_quantity * p.unit_cost) as total_value
            FROM adjustment_journal_lines ajl
            JOIN adjustment_journals aj ON ajl.adjustment_journal_id = aj.id
            JOIN products p ON ajl.product_id = p.id
            WHERE {where_clause}
            GROUP BY ajl.reason_code
            ORDER BY ABS(total_value) DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        analysis = []
        for row in rows:
            analysis.append({
                "reason_code": row[0],
                "line_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "total_value": float(row[3]) if row[3] else 0
            })
        
        return {"reason_analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/adjustment-history")
async def get_product_adjustment_history(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get adjustment history for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                aj.journal_number,
                aj.adjustment_date,
                ajl.adjustment_quantity,
                ajl.reason_code,
                w.name as warehouse_name,
                ajl.bin_location,
                ajl.lot_number
            FROM adjustment_journal_lines ajl
            JOIN adjustment_journals aj ON ajl.adjustment_journal_id = aj.id
            JOIN warehouses w ON ajl.warehouse_id = w.id
            WHERE ajl.product_id = :product_id AND aj.company_id = :company_id
            ORDER BY aj.adjustment_date DESC
            LIMIT 100
        """)
        
        result = db.execute(query, {"product_id": product_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "journal_number": row[0],
                "adjustment_date": str(row[1]) if row[1] else None,
                "adjustment_quantity": float(row[2]) if row[2] else 0,
                "reason_code": row[3],
                "warehouse_name": row[4],
                "bin_location": row[5],
                "lot_number": row[6]
            })
        
        return {
            "adjustment_history": history,
            "total_count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
