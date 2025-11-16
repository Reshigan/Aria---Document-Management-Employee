from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class TestResult(BaseModel):
    test_parameter: str
    expected_value: str
    actual_value: str
    pass_fail: str
    notes: str = None


@router.get("/quality-inspection/{inspection_id}/test-results")
async def get_inspection_test_results(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed test results for a quality inspection"""
    try:
        company_id = current_user.get("company_id", "default")
        
        inspection_query = text("""
            SELECT 
                qi.id,
                qi.inspection_number,
                qi.inspection_date,
                qi.product_id,
                p.product_code,
                p.name as product_name,
                qi.batch_number,
                qi.lot_number,
                qi.inspector_id,
                e.first_name || ' ' || e.last_name as inspector_name,
                qi.inspection_type,
                qi.status,
                qi.overall_result,
                qi.reference_type,
                qi.reference_id,
                qi.notes
            FROM quality_inspections qi
            JOIN products p ON qi.product_id = p.id
            LEFT JOIN employees e ON qi.inspector_id = e.id
            WHERE qi.id = :inspection_id AND qi.company_id = :company_id
        """)
        
        inspection_result = db.execute(inspection_query, {
            "inspection_id": inspection_id,
            "company_id": company_id
        }).fetchone()
        
        if not inspection_result:
            raise HTTPException(status_code=404, detail="Quality inspection not found")
        
        test_query = text("""
            SELECT 
                qtr.id,
                qtr.test_parameter,
                qtr.expected_value,
                qtr.actual_value,
                qtr.pass_fail,
                qtr.measurement_unit,
                qtr.tolerance_min,
                qtr.tolerance_max,
                qtr.test_method,
                qtr.notes,
                qtr.tested_at,
                qtr.tested_by
            FROM quality_test_results qtr
            WHERE qtr.inspection_id = :inspection_id
                AND qtr.company_id = :company_id
            ORDER BY qtr.test_sequence, qtr.id
        """)
        
        test_result = db.execute(test_query, {
            "inspection_id": inspection_id,
            "company_id": company_id
        })
        
        test_results = []
        pass_count = 0
        fail_count = 0
        
        for row in test_result.fetchall():
            pass_fail = row[4]
            if pass_fail == "PASS":
                pass_count += 1
            elif pass_fail == "FAIL":
                fail_count += 1
            
            test_results.append({
                "id": row[0],
                "test_parameter": row[1],
                "expected_value": row[2],
                "actual_value": row[3],
                "pass_fail": pass_fail,
                "measurement_unit": row[5],
                "tolerance_min": float(row[6]) if row[6] else None,
                "tolerance_max": float(row[7]) if row[7] else None,
                "test_method": row[8],
                "notes": row[9],
                "tested_at": str(row[10]) if row[10] else None,
                "tested_by": row[11]
            })
        
        nc_query = text("""
            SELECT 
                nc.id,
                nc.nc_number,
                nc.description,
                nc.severity,
                nc.status,
                nc.corrective_action
            FROM nonconformances nc
            WHERE nc.reference_type = 'QUALITY_INSPECTION'
                AND nc.reference_id = :inspection_id
                AND nc.company_id = :company_id
        """)
        
        nc_result = db.execute(nc_query, {
            "inspection_id": inspection_id,
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
                "corrective_action": row[5]
            })
        
        source_document = None
        if inspection_result[13] and inspection_result[14]:
            ref_type = inspection_result[13]
            ref_id = inspection_result[14]
            
            if ref_type == "GOODS_RECEIPT":
                source_query = text("""
                    SELECT 
                        gr.receipt_number,
                        gr.receipt_date,
                        po.po_number,
                        s.name as supplier_name
                    FROM goods_receipts gr
                    JOIN purchase_orders po ON gr.purchase_order_id = po.id
                    JOIN suppliers s ON po.supplier_id = s.id
                    WHERE gr.id = :ref_id AND gr.company_id = :company_id
                """)
                
                source_result = db.execute(source_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if source_result:
                    source_document = {
                        "type": "GOODS_RECEIPT",
                        "receipt_number": source_result[0],
                        "receipt_date": str(source_result[1]) if source_result[1] else None,
                        "po_number": source_result[2],
                        "supplier_name": source_result[3]
                    }
            
            elif ref_type == "MANUFACTURING_ORDER":
                source_query = text("""
                    SELECT 
                        mo.mo_number,
                        mo.start_date,
                        mo.quantity,
                        mo.status
                    FROM manufacturing_orders mo
                    WHERE mo.id = :ref_id AND mo.company_id = :company_id
                """)
                
                source_result = db.execute(source_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if source_result:
                    source_document = {
                        "type": "MANUFACTURING_ORDER",
                        "mo_number": source_result[0],
                        "start_date": str(source_result[1]) if source_result[1] else None,
                        "quantity": float(source_result[2]) if source_result[2] else 0,
                        "status": source_result[3]
                    }
        
        return {
            "inspection": {
                "id": inspection_result[0],
                "inspection_number": inspection_result[1],
                "inspection_date": str(inspection_result[2]) if inspection_result[2] else None,
                "product_id": inspection_result[3],
                "product_code": inspection_result[4],
                "product_name": inspection_result[5],
                "batch_number": inspection_result[6],
                "lot_number": inspection_result[7],
                "inspector_id": inspection_result[8],
                "inspector_name": inspection_result[9],
                "inspection_type": inspection_result[10],
                "status": inspection_result[11],
                "overall_result": inspection_result[12],
                "reference_type": inspection_result[13],
                "reference_id": inspection_result[14],
                "notes": inspection_result[15]
            },
            "test_results": test_results,
            "test_summary": {
                "total_tests": len(test_results),
                "pass_count": pass_count,
                "fail_count": fail_count,
                "pass_rate": (pass_count / len(test_results) * 100) if test_results else 0
            },
            "nonconformances": nonconformances,
            "source_document": source_document
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quality-inspection/{inspection_id}/test-results")
async def create_test_results(
    inspection_id: int,
    test_results: List[TestResult],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create test results for a quality inspection"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        verify_query = text("""
            SELECT id FROM quality_inspections
            WHERE id = :inspection_id AND company_id = :company_id
        """)
        
        verify_result = db.execute(verify_query, {
            "inspection_id": inspection_id,
            "company_id": company_id
        }).fetchone()
        
        if not verify_result:
            raise HTTPException(status_code=404, detail="Quality inspection not found")
        
        insert_query = text("""
            INSERT INTO quality_test_results (
                inspection_id, test_parameter, expected_value,
                actual_value, pass_fail, notes,
                tested_at, tested_by,
                company_id, created_at
            ) VALUES (
                :inspection_id, :test_parameter, :expected_value,
                :actual_value, :pass_fail, :notes,
                NOW(), :tested_by,
                :company_id, NOW()
            )
        """)
        
        fail_count = 0
        for test in test_results:
            db.execute(insert_query, {
                "inspection_id": inspection_id,
                "test_parameter": test.test_parameter,
                "expected_value": test.expected_value,
                "actual_value": test.actual_value,
                "pass_fail": test.pass_fail,
                "notes": test.notes,
                "tested_by": user_email,
                "company_id": company_id
            })
            
            if test.pass_fail == "FAIL":
                fail_count += 1
        
        overall_result = "REJECTED" if fail_count > 0 else "APPROVED"
        
        update_query = text("""
            UPDATE quality_inspections
            SET 
                overall_result = :overall_result,
                status = 'COMPLETED',
                updated_at = NOW()
            WHERE id = :inspection_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "overall_result": overall_result,
            "inspection_id": inspection_id,
            "company_id": company_id
        })
        
        if fail_count > 0:
            nc_query = text("""
                INSERT INTO nonconformances (
                    nc_number, reference_type, reference_id,
                    description, severity, status,
                    company_id, created_by, created_at
                ) VALUES (
                    'NC-' || LPAD(NEXTVAL('nc_seq')::TEXT, 6, '0'),
                    'QUALITY_INSPECTION', :inspection_id,
                    :description, 'HIGH', 'OPEN',
                    :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(nc_query, {
                "inspection_id": inspection_id,
                "description": f"Quality inspection failed {fail_count} test(s)",
                "company_id": company_id,
                "created_by": user_email
            })
        
        db.commit()
        
        return {
            "message": "Test results recorded successfully",
            "total_tests": len(test_results),
            "fail_count": fail_count,
            "overall_result": overall_result
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/quality-test-result/{result_id}")
async def update_test_result(
    result_id: int,
    actual_value: str,
    pass_fail: str,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a test result"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE quality_test_results
            SET 
                actual_value = :actual_value,
                pass_fail = :pass_fail,
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            WHERE id = :result_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "actual_value": actual_value,
            "pass_fail": pass_fail,
            "notes": notes,
            "result_id": result_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Test result updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/quality-test-result/{result_id}")
async def delete_test_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a test result"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM quality_test_results
            WHERE id = :result_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {
            "result_id": result_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Test result deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
