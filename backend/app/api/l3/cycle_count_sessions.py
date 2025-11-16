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


class CycleCountLineCreate(BaseModel):
    cycle_count_id: int
    product_id: int
    bin_location: Optional[str] = None
    lot_number: Optional[str] = None
    expected_quantity: float
    counted_quantity: Optional[float] = None


@router.get("/cycle-count/{cycle_count_id}/lines")
async def get_cycle_count_lines(
    cycle_count_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for a cycle count session"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                cc.count_number,
                cc.warehouse_id,
                w.name as warehouse_name,
                cc.count_date,
                cc.status,
                cc.count_type,
                cc.notes
            FROM cycle_counts cc
            LEFT JOIN warehouses w ON cc.warehouse_id = w.id
            WHERE cc.id = :cycle_count_id AND cc.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "cycle_count_id": cycle_count_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Cycle count not found")
        
        lines_query = text("""
            SELECT 
                ccl.id,
                ccl.line_number,
                ccl.product_id,
                p.name as product_name,
                p.product_code,
                ccl.bin_location,
                ccl.lot_number,
                ccl.serial_number,
                ccl.expected_quantity,
                ccl.counted_quantity,
                ccl.variance_quantity,
                ccl.variance_value,
                ccl.status,
                ccl.counted_by,
                ccl.counted_at,
                p.unit_cost
            FROM cycle_count_lines ccl
            JOIN cycle_counts cc ON ccl.cycle_count_id = cc.id
            JOIN products p ON ccl.product_id = p.id
            WHERE cc.id = :cycle_count_id AND cc.company_id = :company_id
            ORDER BY ccl.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "cycle_count_id": cycle_count_id,
            "company_id": company_id
        })
        
        lines = []
        total_variance_value = 0
        lines_with_variance = 0
        
        for row in lines_result.fetchall():
            variance_qty = float(row[10]) if row[10] else 0
            variance_value = float(row[11]) if row[11] else 0
            
            if variance_qty != 0:
                lines_with_variance += 1
            
            total_variance_value += variance_value
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "bin_location": row[5],
                "lot_number": row[6],
                "serial_number": row[7],
                "expected_quantity": float(row[8]) if row[8] else 0,
                "counted_quantity": float(row[9]) if row[9] is not None else None,
                "variance_quantity": variance_qty,
                "variance_value": variance_value,
                "status": row[12],
                "counted_by": row[13],
                "counted_at": str(row[14]) if row[14] else None,
                "unit_cost": float(row[15]) if row[15] else 0
            })
        
        return {
            "cycle_count": {
                "count_number": header_result[0],
                "warehouse_id": header_result[1],
                "warehouse_name": header_result[2],
                "count_date": str(header_result[3]) if header_result[3] else None,
                "status": header_result[4],
                "count_type": header_result[5],
                "notes": header_result[6]
            },
            "lines": lines,
            "summary": {
                "total_lines": len(lines),
                "lines_with_variance": lines_with_variance,
                "total_variance_value": total_variance_value
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cycle-count/{cycle_count_id}/line")
async def add_cycle_count_line(
    cycle_count_id: int,
    line: CycleCountLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a cycle count"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM cycle_count_lines ccl
            JOIN cycle_counts cc ON ccl.cycle_count_id = cc.id
            WHERE cc.id = :cycle_count_id AND cc.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "cycle_count_id": cycle_count_id,
            "company_id": company_id
        }).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO cycle_count_lines (
                cycle_count_id, line_number, product_id, bin_location,
                lot_number, expected_quantity, counted_quantity,
                company_id, created_by, created_at
            ) VALUES (
                :cycle_count_id, :line_number, :product_id, :bin_location,
                :lot_number, :expected_quantity, :counted_quantity,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "cycle_count_id": cycle_count_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "bin_location": line.bin_location,
            "lot_number": line.lot_number,
            "expected_quantity": line.expected_quantity,
            "counted_quantity": line.counted_quantity,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Cycle count line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/cycle-count-line/{line_id}/count")
async def record_count(
    line_id: int,
    counted_quantity: float,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record counted quantity for a cycle count line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        get_query = text("""
            SELECT 
                ccl.expected_quantity,
                p.unit_cost
            FROM cycle_count_lines ccl
            JOIN cycle_counts cc ON ccl.cycle_count_id = cc.id
            JOIN products p ON ccl.product_id = p.id
            WHERE ccl.id = :line_id AND cc.company_id = :company_id
        """)
        
        result = db.execute(get_query, {"line_id": line_id, "company_id": company_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Cycle count line not found")
        
        expected_qty = float(result[0]) if result[0] else 0
        unit_cost = float(result[1]) if result[1] else 0
        
        variance_qty = counted_quantity - expected_qty
        variance_value = variance_qty * unit_cost
        
        update_query = text("""
            UPDATE cycle_count_lines ccl
            SET 
                counted_quantity = :counted_quantity,
                variance_quantity = :variance_quantity,
                variance_value = :variance_value,
                status = CASE 
                    WHEN :variance_quantity = 0 THEN 'MATCHED'
                    ELSE 'VARIANCE'
                END,
                counted_by = :counted_by,
                counted_at = NOW(),
                updated_at = NOW()
            FROM cycle_counts cc
            WHERE ccl.cycle_count_id = cc.id
                AND ccl.id = :line_id
                AND cc.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "counted_quantity": counted_quantity,
            "variance_quantity": variance_qty,
            "variance_value": variance_value,
            "counted_by": user_email,
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Count recorded successfully",
            "variance_quantity": variance_qty,
            "variance_value": variance_value
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cycle-count/{cycle_count_id}/finalize")
async def finalize_cycle_count(
    cycle_count_id: int,
    create_adjustments: bool = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Finalize a cycle count and optionally create inventory adjustments"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        check_query = text("""
            SELECT COUNT(*)
            FROM cycle_count_lines ccl
            JOIN cycle_counts cc ON ccl.cycle_count_id = cc.id
            WHERE cc.id = :cycle_count_id 
                AND cc.company_id = :company_id
                AND ccl.counted_quantity IS NULL
        """)
        
        uncounted = db.execute(check_query, {
            "cycle_count_id": cycle_count_id,
            "company_id": company_id
        }).fetchone()[0]
        
        if uncounted > 0:
            raise HTTPException(
                status_code=400,
                detail=f"{uncounted} lines have not been counted yet"
            )
        
        if create_adjustments:
            variance_query = text("""
                SELECT 
                    ccl.product_id,
                    ccl.bin_location,
                    ccl.lot_number,
                    ccl.variance_quantity,
                    cc.warehouse_id
                FROM cycle_count_lines ccl
                JOIN cycle_counts cc ON ccl.cycle_count_id = cc.id
                WHERE cc.id = :cycle_count_id 
                    AND cc.company_id = :company_id
                    AND ccl.variance_quantity != 0
            """)
            
            variance_result = db.execute(variance_query, {
                "cycle_count_id": cycle_count_id,
                "company_id": company_id
            })
            
            for row in variance_result.fetchall():
                adjustment_query = text("""
                    INSERT INTO inventory_adjustments (
                        product_id, warehouse_id, bin_location, lot_number,
                        adjustment_quantity, reason, reference_type, reference_id,
                        company_id, created_by, created_at
                    ) VALUES (
                        :product_id, :warehouse_id, :bin_location, :lot_number,
                        :adjustment_quantity, 'CYCLE_COUNT', 'CYCLE_COUNT', :cycle_count_id,
                        :company_id, :created_by, NOW()
                    )
                """)
                
                db.execute(adjustment_query, {
                    "product_id": row[0],
                    "warehouse_id": row[4],
                    "bin_location": row[1],
                    "lot_number": row[2],
                    "adjustment_quantity": row[3],
                    "cycle_count_id": cycle_count_id,
                    "company_id": company_id,
                    "created_by": user_email
                })
        
        update_query = text("""
            UPDATE cycle_counts
            SET status = 'FINALIZED', updated_at = NOW()
            WHERE id = :cycle_count_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"cycle_count_id": cycle_count_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Cycle count finalized successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cycle-count/{cycle_count_id}/variance-report")
async def get_variance_report(
    cycle_count_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get variance report for a cycle count"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ccl.product_id,
                p.name as product_name,
                p.product_code,
                ccl.bin_location,
                ccl.lot_number,
                ccl.expected_quantity,
                ccl.counted_quantity,
                ccl.variance_quantity,
                ccl.variance_value,
                ccl.counted_by,
                ccl.counted_at
            FROM cycle_count_lines ccl
            JOIN cycle_counts cc ON ccl.cycle_count_id = cc.id
            JOIN products p ON ccl.product_id = p.id
            WHERE cc.id = :cycle_count_id 
                AND cc.company_id = :company_id
                AND ccl.variance_quantity != 0
            ORDER BY ABS(ccl.variance_value) DESC
        """)
        
        result = db.execute(query, {"cycle_count_id": cycle_count_id, "company_id": company_id})
        rows = result.fetchall()
        
        variances = []
        for row in rows:
            variances.append({
                "product_id": row[0],
                "product_name": row[1],
                "product_code": row[2],
                "bin_location": row[3],
                "lot_number": row[4],
                "expected_quantity": float(row[5]) if row[5] else 0,
                "counted_quantity": float(row[6]) if row[6] else 0,
                "variance_quantity": float(row[7]) if row[7] else 0,
                "variance_value": float(row[8]) if row[8] else 0,
                "counted_by": row[9],
                "counted_at": str(row[10]) if row[10] else None
            })
        
        return {"variances": variances, "total_variances": len(variances)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
