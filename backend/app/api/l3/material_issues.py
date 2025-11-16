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


class MaterialIssueLineCreate(BaseModel):
    material_issue_id: int
    product_id: int
    quantity: float
    bin_location: Optional[str] = None
    lot_number: Optional[str] = None


@router.get("/manufacturing-order/{mo_id}/material-issues")
async def get_material_issues(
    mo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all material issues for a manufacturing order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                mo.mo_number,
                mo.product_id,
                p.name as product_name,
                mo.quantity,
                mo.status
            FROM manufacturing_orders mo
            JOIN products p ON mo.product_id = p.id
            WHERE mo.id = :mo_id AND mo.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "mo_id": mo_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Manufacturing order not found")
        
        issues_query = text("""
            SELECT 
                mi.id,
                mi.issue_number,
                mi.issue_date,
                mi.status,
                mi.notes,
                COUNT(mil.id) as line_count,
                SUM(mil.quantity * p.unit_cost) as total_value
            FROM material_issues mi
            LEFT JOIN material_issue_lines mil ON mi.id = mil.material_issue_id
            LEFT JOIN products p ON mil.product_id = p.id
            WHERE mi.manufacturing_order_id = :mo_id AND mi.company_id = :company_id
            GROUP BY mi.id, mi.issue_number, mi.issue_date, mi.status, mi.notes
            ORDER BY mi.issue_date DESC
        """)
        
        issues_result = db.execute(issues_query, {
            "mo_id": mo_id,
            "company_id": company_id
        })
        
        issues = []
        for row in issues_result.fetchall():
            issues.append({
                "id": row[0],
                "issue_number": row[1],
                "issue_date": str(row[2]) if row[2] else None,
                "status": row[3],
                "notes": row[4],
                "line_count": row[5] if row[5] else 0,
                "total_value": float(row[6]) if row[6] else 0
            })
        
        return {
            "manufacturing_order": {
                "mo_number": header_result[0],
                "product_id": header_result[1],
                "product_name": header_result[2],
                "quantity": float(header_result[3]) if header_result[3] else 0,
                "status": header_result[4]
            },
            "material_issues": issues,
            "total_issues": len(issues)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/material-issue/{issue_id}/lines")
async def get_material_issue_lines(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for a material issue"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                mil.id,
                mil.line_number,
                mil.product_id,
                p.name as product_name,
                p.product_code,
                mil.quantity,
                mil.bin_location,
                mil.lot_number,
                mil.serial_number,
                p.unit_cost,
                mil.quantity * p.unit_cost as line_value
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            JOIN products p ON mil.product_id = p.id
            WHERE mi.id = :issue_id AND mi.company_id = :company_id
            ORDER BY mil.line_number
        """)
        
        result = db.execute(query, {"issue_id": issue_id, "company_id": company_id})
        rows = result.fetchall()
        
        lines = []
        total_value = 0
        
        for row in rows:
            line_value = float(row[10]) if row[10] else 0
            total_value += line_value
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "quantity": float(row[5]) if row[5] else 0,
                "bin_location": row[6],
                "lot_number": row[7],
                "serial_number": row[8],
                "unit_cost": float(row[9]) if row[9] else 0,
                "line_value": line_value
            })
        
        return {
            "lines": lines,
            "total_lines": len(lines),
            "total_value": total_value
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/material-issue/{issue_id}/line")
async def add_material_issue_line(
    issue_id: int,
    line: MaterialIssueLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a material issue"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            WHERE mi.id = :issue_id AND mi.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "issue_id": issue_id,
            "company_id": company_id
        }).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO material_issue_lines (
                material_issue_id, line_number, product_id, quantity,
                bin_location, lot_number, company_id, created_by, created_at
            ) VALUES (
                :material_issue_id, :line_number, :product_id, :quantity,
                :bin_location, :lot_number, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "material_issue_id": issue_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "quantity": line.quantity,
            "bin_location": line.bin_location,
            "lot_number": line.lot_number,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Material issue line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/material-issue-line/{line_id}")
async def delete_material_issue_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a material issue line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM material_issue_lines mil
            USING material_issues mi
            WHERE mil.material_issue_id = mi.id
                AND mil.id = :line_id
                AND mi.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Material issue line deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/material-issue/{issue_id}/post")
async def post_material_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Post material issue to inventory"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        issue_query = text("""
            SELECT 
                mi.issue_number,
                mi.issue_date,
                mi.manufacturing_order_id,
                mo.warehouse_id,
                mi.status
            FROM material_issues mi
            JOIN manufacturing_orders mo ON mi.manufacturing_order_id = mo.id
            WHERE mi.id = :issue_id AND mi.company_id = :company_id
        """)
        
        issue_result = db.execute(issue_query, {
            "issue_id": issue_id,
            "company_id": company_id
        }).fetchone()
        
        if not issue_result:
            raise HTTPException(status_code=404, detail="Material issue not found")
        
        if issue_result[4] == "POSTED":
            raise HTTPException(status_code=400, detail="Material issue already posted")
        
        lines_query = text("""
            SELECT 
                mil.product_id,
                mil.quantity,
                mil.bin_location,
                mil.lot_number
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            WHERE mi.id = :issue_id AND mi.company_id = :company_id
        """)
        
        lines_result = db.execute(lines_query, {
            "issue_id": issue_id,
            "company_id": company_id
        })
        
        for row in lines_result.fetchall():
            ledger_query = text("""
                INSERT INTO item_ledger_entries (
                    product_id, transaction_date, transaction_type,
                    document_type, document_number, warehouse_id,
                    bin_location, lot_number, quantity_in, quantity_out,
                    company_id, created_by, created_at
                ) VALUES (
                    :product_id, :issue_date, 'MATERIAL_ISSUE',
                    'MATERIAL_ISSUE', :issue_number, :warehouse_id,
                    :bin_location, :lot_number, 0, :quantity,
                    :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(ledger_query, {
                "product_id": row[0],
                "issue_date": issue_result[1],
                "issue_number": issue_result[0],
                "warehouse_id": issue_result[3],
                "bin_location": row[2],
                "lot_number": row[3],
                "quantity": row[1],
                "company_id": company_id,
                "created_by": user_email
            })
        
        update_query = text("""
            UPDATE material_issues
            SET status = 'POSTED', updated_at = NOW()
            WHERE id = :issue_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"issue_id": issue_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Material issue posted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/material-issue/{issue_id}/variance")
async def get_material_variance(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get variance between BOM requirements and actual material issued"""
    try:
        company_id = current_user.get("company_id", "default")
        
        mo_query = text("""
            SELECT 
                mi.manufacturing_order_id,
                mo.bom_id,
                mo.quantity
            FROM material_issues mi
            JOIN manufacturing_orders mo ON mi.manufacturing_order_id = mo.id
            WHERE mi.id = :issue_id AND mi.company_id = :company_id
        """)
        
        mo_result = db.execute(mo_query, {
            "issue_id": issue_id,
            "company_id": company_id
        }).fetchone()
        
        if not mo_result or not mo_result[1]:
            raise HTTPException(status_code=404, detail="BOM not found for manufacturing order")
        
        mo_id = mo_result[0]
        bom_id = mo_result[1]
        mo_quantity = float(mo_result[2]) if mo_result[2] else 0
        
        bom_query = text("""
            SELECT 
                bc.product_id,
                p.name as product_name,
                bc.quantity_per_unit * :mo_quantity as expected_quantity
            FROM bom_components bc
            JOIN products p ON bc.product_id = p.id
            WHERE bc.bom_id = :bom_id AND bc.company_id = :company_id
        """)
        
        bom_result = db.execute(bom_query, {
            "bom_id": bom_id,
            "mo_quantity": mo_quantity,
            "company_id": company_id
        })
        
        expected = {}
        for row in bom_result.fetchall():
            expected[row[0]] = {
                "product_name": row[1],
                "expected_quantity": float(row[2]) if row[2] else 0
            }
        
        issued_query = text("""
            SELECT 
                mil.product_id,
                SUM(mil.quantity) as issued_quantity
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            WHERE mi.manufacturing_order_id = :mo_id AND mi.company_id = :company_id
            GROUP BY mil.product_id
        """)
        
        issued_result = db.execute(issued_query, {
            "mo_id": mo_id,
            "company_id": company_id
        })
        
        issued = {}
        for row in issued_result.fetchall():
            issued[row[0]] = float(row[1]) if row[1] else 0
        
        variance = []
        all_products = set(expected.keys()) | set(issued.keys())
        
        for product_id in all_products:
            expected_qty = expected.get(product_id, {}).get("expected_quantity", 0)
            issued_qty = issued.get(product_id, 0)
            variance_qty = issued_qty - expected_qty
            
            variance.append({
                "product_id": product_id,
                "product_name": expected.get(product_id, {}).get("product_name", "Unknown"),
                "expected_quantity": expected_qty,
                "issued_quantity": issued_qty,
                "variance_quantity": variance_qty,
                "variance_percent": (variance_qty / expected_qty * 100) if expected_qty > 0 else 0
            })
        
        return {"variance": variance}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
