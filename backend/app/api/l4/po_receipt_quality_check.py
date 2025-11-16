from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class QualityCheckResult(BaseModel):
    check_parameter: str
    expected_value: Optional[str] = None
    actual_value: str
    pass_fail: str
    notes: Optional[str] = None


@router.get("/po-receipt-line/{receipt_line_id}/quality-check")
async def get_receipt_quality_check(
    receipt_line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get quality check details for a PO receipt line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                grl.id,
                grl.goods_receipt_id,
                gr.receipt_number,
                gr.receipt_date,
                grl.purchase_order_id,
                po.po_number,
                grl.product_id,
                p.product_code,
                p.name as product_name,
                grl.quantity_received,
                grl.quantity_accepted,
                grl.quantity_rejected,
                grl.unit_price,
                po.supplier_id,
                s.name as supplier_name,
                grl.quality_status,
                grl.inspection_notes
            FROM goods_receipt_lines grl
            JOIN goods_receipts gr ON grl.goods_receipt_id = gr.id
            JOIN purchase_orders po ON grl.purchase_order_id = po.id
            JOIN suppliers s ON po.supplier_id = s.id
            JOIN products p ON grl.product_id = p.id
            WHERE grl.id = :receipt_line_id AND gr.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Receipt line not found")
        
        qc_query = text("""
            SELECT 
                qc.id,
                qc.check_date,
                qc.inspector_id,
                u.email as inspector_email,
                qc.check_parameter,
                qc.expected_value,
                qc.actual_value,
                qc.pass_fail,
                qc.notes,
                qc.created_at
            FROM quality_checks qc
            LEFT JOIN users u ON qc.inspector_id = u.id
            WHERE qc.reference_type = 'GOODS_RECEIPT_LINE'
                AND qc.reference_id = :receipt_line_id
                AND qc.company_id = :company_id
            ORDER BY qc.check_date DESC, qc.created_at DESC
        """)
        
        qc_result = db.execute(qc_query, {
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        })
        
        quality_checks = []
        pass_count = 0
        fail_count = 0
        
        for row in qc_result.fetchall():
            pass_fail = row[7]
            if pass_fail == "PASS":
                pass_count += 1
            elif pass_fail == "FAIL":
                fail_count += 1
            
            quality_checks.append({
                "id": row[0],
                "check_date": str(row[1]) if row[1] else None,
                "inspector_id": row[2],
                "inspector_email": row[3],
                "check_parameter": row[4],
                "expected_value": row[5],
                "actual_value": row[6],
                "pass_fail": pass_fail,
                "notes": row[8],
                "created_at": str(row[9]) if row[9] else None
            })
        
        nc_query = text("""
            SELECT 
                nc.id,
                nc.nc_number,
                nc.description,
                nc.severity,
                nc.status,
                nc.corrective_action,
                nc.created_at
            FROM nonconformances nc
            WHERE nc.reference_type = 'GOODS_RECEIPT_LINE'
                AND nc.reference_id = :receipt_line_id
                AND nc.company_id = :company_id
            ORDER BY nc.created_at DESC
        """)
        
        nc_result = db.execute(nc_query, {
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        })
        
        nonconformances = []
        for row in nc_result.fetchall():
            nonconformances.append({
                "id": row[0],
                "nc_number": row[1],
                "description": row[2],
                "severity": row[3],
                "status": row[4],
                "corrective_action": row[5],
                "created_at": str(row[6]) if row[6] else None
            })
        
        return {
            "receipt_line": {
                "id": line_result[0],
                "goods_receipt_id": line_result[1],
                "receipt_number": line_result[2],
                "receipt_date": str(line_result[3]) if line_result[3] else None,
                "purchase_order_id": line_result[4],
                "po_number": line_result[5],
                "product_id": line_result[6],
                "product_code": line_result[7],
                "product_name": line_result[8],
                "quantity_received": float(line_result[9]) if line_result[9] else 0,
                "quantity_accepted": float(line_result[10]) if line_result[10] else 0,
                "quantity_rejected": float(line_result[11]) if line_result[11] else 0,
                "unit_price": float(line_result[12]) if line_result[12] else 0,
                "supplier_id": line_result[13],
                "supplier_name": line_result[14],
                "quality_status": line_result[15],
                "inspection_notes": line_result[16]
            },
            "quality_checks": quality_checks,
            "quality_summary": {
                "total_checks": len(quality_checks),
                "pass_count": pass_count,
                "fail_count": fail_count,
                "pass_rate": (pass_count / len(quality_checks) * 100) if quality_checks else 0
            },
            "nonconformances": nonconformances
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/po-receipt-line/{receipt_line_id}/quality-check")
async def create_quality_check(
    receipt_line_id: int,
    checks: List[QualityCheckResult],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create quality check results for a receipt line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_id = current_user.get("id")
        user_email = current_user.get("email", "unknown")
        
        verify_query = text("""
            SELECT grl.id
            FROM goods_receipt_lines grl
            JOIN goods_receipts gr ON grl.goods_receipt_id = gr.id
            WHERE grl.id = :receipt_line_id AND gr.company_id = :company_id
        """)
        
        verify_result = db.execute(verify_query, {
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        }).fetchone()
        
        if not verify_result:
            raise HTTPException(status_code=404, detail="Receipt line not found")
        
        insert_query = text("""
            INSERT INTO quality_checks (
                reference_type, reference_id, check_date,
                inspector_id, check_parameter, expected_value,
                actual_value, pass_fail, notes,
                company_id, created_by, created_at
            ) VALUES (
                'GOODS_RECEIPT_LINE', :receipt_line_id, CURRENT_DATE,
                :inspector_id, :check_parameter, :expected_value,
                :actual_value, :pass_fail, :notes,
                :company_id, :created_by, NOW()
            )
        """)
        
        fail_count = 0
        for check in checks:
            db.execute(insert_query, {
                "receipt_line_id": receipt_line_id,
                "inspector_id": user_id,
                "check_parameter": check.check_parameter,
                "expected_value": check.expected_value,
                "actual_value": check.actual_value,
                "pass_fail": check.pass_fail,
                "notes": check.notes,
                "company_id": company_id,
                "created_by": user_email
            })
            
            if check.pass_fail == "FAIL":
                fail_count += 1
        
        overall_status = "REJECTED" if fail_count > 0 else "APPROVED"
        
        update_query = text("""
            UPDATE goods_receipt_lines grl
            SET 
                quality_status = :quality_status,
                quantity_accepted = CASE 
                    WHEN :quality_status = 'APPROVED' THEN quantity_received
                    ELSE 0
                END,
                quantity_rejected = CASE 
                    WHEN :quality_status = 'REJECTED' THEN quantity_received
                    ELSE 0
                END,
                updated_at = NOW()
            FROM goods_receipts gr
            WHERE grl.goods_receipt_id = gr.id
                AND grl.id = :receipt_line_id
                AND gr.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "quality_status": overall_status,
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Quality check completed successfully",
            "total_checks": len(checks),
            "fail_count": fail_count,
            "overall_status": overall_status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/po-receipt-line/{receipt_line_id}/accept")
async def accept_receipt_line(
    receipt_line_id: int,
    accepted_quantity: float,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Accept a receipt line after quality check"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE goods_receipt_lines grl
            SET 
                quantity_accepted = :accepted_quantity,
                quantity_rejected = quantity_received - :accepted_quantity,
                quality_status = 'APPROVED',
                inspection_notes = COALESCE(:notes, inspection_notes),
                updated_at = NOW()
            FROM goods_receipts gr
            WHERE grl.goods_receipt_id = gr.id
                AND grl.id = :receipt_line_id
                AND gr.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "accepted_quantity": accepted_quantity,
            "notes": notes,
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Receipt line accepted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/po-receipt-line/{receipt_line_id}/reject")
async def reject_receipt_line(
    receipt_line_id: int,
    rejected_quantity: float,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reject a receipt line after quality check"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE goods_receipt_lines grl
            SET 
                quantity_rejected = :rejected_quantity,
                quantity_accepted = quantity_received - :rejected_quantity,
                quality_status = 'REJECTED',
                inspection_notes = :rejection_reason,
                updated_at = NOW()
            FROM goods_receipts gr
            WHERE grl.goods_receipt_id = gr.id
                AND grl.id = :receipt_line_id
                AND gr.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "rejected_quantity": rejected_quantity,
            "rejection_reason": rejection_reason,
            "receipt_line_id": receipt_line_id,
            "company_id": company_id
        })
        
        nc_query = text("""
            INSERT INTO nonconformances (
                nc_number, reference_type, reference_id,
                description, severity, status,
                company_id, created_by, created_at
            ) VALUES (
                'NC-' || LPAD(NEXTVAL('nc_seq')::TEXT, 6, '0'),
                'GOODS_RECEIPT_LINE', :receipt_line_id,
                :rejection_reason, 'MEDIUM', 'OPEN',
                :company_id, :created_by, NOW()
            )
        """)
        
        db.execute(nc_query, {
            "receipt_line_id": receipt_line_id,
            "rejection_reason": rejection_reason,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        
        return {"message": "Receipt line rejected and nonconformance created"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
