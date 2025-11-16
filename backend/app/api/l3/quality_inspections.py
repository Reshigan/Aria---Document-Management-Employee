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
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class InspectionResultCreate(BaseModel):
    inspection_id: int
    test_parameter: str
    expected_value: Optional[str] = None
    actual_value: str
    result: str
    notes: Optional[str] = None


@router.get("/manufacturing-order/{mo_id}/inspections")
async def get_mo_inspections(
    mo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all quality inspections for a manufacturing order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                qi.id,
                qi.inspection_number,
                qi.inspection_date,
                qi.inspector_name,
                qi.status,
                qi.overall_result,
                COUNT(qir.id) as test_count,
                SUM(CASE WHEN qir.result = 'PASS' THEN 1 ELSE 0 END) as passed_tests,
                SUM(CASE WHEN qir.result = 'FAIL' THEN 1 ELSE 0 END) as failed_tests
            FROM quality_inspections qi
            LEFT JOIN quality_inspection_results qir ON qi.id = qir.inspection_id
            WHERE qi.manufacturing_order_id = :mo_id AND qi.company_id = :company_id
            GROUP BY qi.id, qi.inspection_number, qi.inspection_date, qi.inspector_name, qi.status, qi.overall_result
            ORDER BY qi.inspection_date DESC
        """)
        
        result = db.execute(query, {"mo_id": mo_id, "company_id": company_id})
        rows = result.fetchall()
        
        inspections = []
        for row in rows:
            inspections.append({
                "id": row[0],
                "inspection_number": row[1],
                "inspection_date": str(row[2]) if row[2] else None,
                "inspector_name": row[3],
                "status": row[4],
                "overall_result": row[5],
                "test_count": row[6] if row[6] else 0,
                "passed_tests": row[7] if row[7] else 0,
                "failed_tests": row[8] if row[8] else 0
            })
        
        return {"inspections": inspections, "total_count": len(inspections)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inspection/{inspection_id}/results")
async def get_inspection_results(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all test results for an inspection"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                qi.inspection_number,
                qi.inspection_date,
                qi.inspector_name,
                qi.status,
                qi.overall_result,
                qi.notes,
                mo.mo_number,
                p.name as product_name
            FROM quality_inspections qi
            JOIN manufacturing_orders mo ON qi.manufacturing_order_id = mo.id
            JOIN products p ON mo.product_id = p.id
            WHERE qi.id = :inspection_id AND qi.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "inspection_id": inspection_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        results_query = text("""
            SELECT 
                qir.id,
                qir.test_parameter,
                qir.expected_value,
                qir.actual_value,
                qir.result,
                qir.notes,
                qir.tested_by,
                qir.tested_at
            FROM quality_inspection_results qir
            WHERE qir.inspection_id = :inspection_id AND qir.company_id = :company_id
            ORDER BY qir.test_parameter
        """)
        
        results_result = db.execute(results_query, {
            "inspection_id": inspection_id,
            "company_id": company_id
        })
        
        results = []
        passed = 0
        failed = 0
        
        for row in results_result.fetchall():
            result_status = row[4]
            if result_status == "PASS":
                passed += 1
            elif result_status == "FAIL":
                failed += 1
            
            results.append({
                "id": row[0],
                "test_parameter": row[1],
                "expected_value": row[2],
                "actual_value": row[3],
                "result": result_status,
                "notes": row[5],
                "tested_by": row[6],
                "tested_at": str(row[7]) if row[7] else None
            })
        
        return {
            "inspection": {
                "inspection_number": header_result[0],
                "inspection_date": str(header_result[1]) if header_result[1] else None,
                "inspector_name": header_result[2],
                "status": header_result[3],
                "overall_result": header_result[4],
                "notes": header_result[5],
                "mo_number": header_result[6],
                "product_name": header_result[7]
            },
            "results": results,
            "summary": {
                "total_tests": len(results),
                "passed_tests": passed,
                "failed_tests": failed,
                "pass_rate": (passed / len(results) * 100) if len(results) > 0 else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inspection/{inspection_id}/result")
async def add_inspection_result(
    inspection_id: int,
    result: InspectionResultCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a test result to an inspection"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO quality_inspection_results (
                inspection_id, test_parameter, expected_value, actual_value,
                result, notes, tested_by, tested_at, company_id, created_by, created_at
            ) VALUES (
                :inspection_id, :test_parameter, :expected_value, :actual_value,
                :result, :notes, :tested_by, NOW(), :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result_obj = db.execute(insert_query, {
            "inspection_id": inspection_id,
            "test_parameter": result.test_parameter,
            "expected_value": result.expected_value,
            "actual_value": result.actual_value,
            "result": result.result,
            "notes": result.notes,
            "tested_by": user_email,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_query = text("""
            UPDATE quality_inspections qi
            SET 
                overall_result = CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM quality_inspection_results 
                        WHERE inspection_id = qi.id AND result = 'FAIL'
                    ) THEN 'FAIL'
                    WHEN EXISTS (
                        SELECT 1 FROM quality_inspection_results 
                        WHERE inspection_id = qi.id AND result = 'PASS'
                    ) THEN 'PASS'
                    ELSE 'PENDING'
                END,
                updated_at = NOW()
            WHERE qi.id = :inspection_id AND qi.company_id = :company_id
        """)
        
        db.execute(update_query, {"inspection_id": inspection_id, "company_id": company_id})
        
        db.commit()
        result_id = result_obj.fetchone()[0]
        
        return {"id": result_id, "message": "Inspection result added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inspection/{inspection_id}/complete")
async def complete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark inspection as complete"""
    try:
        company_id = current_user.get("company_id", "default")
        
        check_query = text("""
            SELECT COUNT(*)
            FROM quality_inspection_results
            WHERE inspection_id = :inspection_id AND company_id = :company_id
        """)
        
        result_count = db.execute(check_query, {
            "inspection_id": inspection_id,
            "company_id": company_id
        }).fetchone()[0]
        
        if result_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot complete inspection without test results"
            )
        
        update_query = text("""
            UPDATE quality_inspections
            SET status = 'COMPLETED', updated_at = NOW()
            WHERE id = :inspection_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"inspection_id": inspection_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Inspection completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quality-inspections/statistics")
async def get_inspection_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get quality inspection statistics"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["qi.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("qi.inspection_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("qi.inspection_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                COUNT(DISTINCT qi.id) as total_inspections,
                SUM(CASE WHEN qi.overall_result = 'PASS' THEN 1 ELSE 0 END) as passed_inspections,
                SUM(CASE WHEN qi.overall_result = 'FAIL' THEN 1 ELSE 0 END) as failed_inspections,
                COUNT(DISTINCT qir.id) as total_tests,
                SUM(CASE WHEN qir.result = 'PASS' THEN 1 ELSE 0 END) as passed_tests,
                SUM(CASE WHEN qir.result = 'FAIL' THEN 1 ELSE 0 END) as failed_tests
            FROM quality_inspections qi
            LEFT JOIN quality_inspection_results qir ON qi.id = qir.inspection_id
            WHERE {where_clause}
        """)
        
        result = db.execute(query, params).fetchone()
        
        total_inspections = result[0] if result[0] else 0
        passed_inspections = result[1] if result[1] else 0
        failed_inspections = result[2] if result[2] else 0
        total_tests = result[3] if result[3] else 0
        passed_tests = result[4] if result[4] else 0
        failed_tests = result[5] if result[5] else 0
        
        return {
            "inspections": {
                "total": total_inspections,
                "passed": passed_inspections,
                "failed": failed_inspections,
                "pass_rate": (passed_inspections / total_inspections * 100) if total_inspections > 0 else 0
            },
            "tests": {
                "total": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "pass_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quality-inspections/failure-analysis")
async def get_failure_analysis(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get analysis of failed tests"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["qi.company_id = :company_id", "qir.result = 'FAIL'"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("qi.inspection_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("qi.inspection_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                qir.test_parameter,
                COUNT(*) as failure_count,
                p.name as product_name,
                COUNT(DISTINCT qi.manufacturing_order_id) as affected_orders
            FROM quality_inspection_results qir
            JOIN quality_inspections qi ON qir.inspection_id = qi.id
            JOIN manufacturing_orders mo ON qi.manufacturing_order_id = mo.id
            JOIN products p ON mo.product_id = p.id
            WHERE {where_clause}
            GROUP BY qir.test_parameter, p.name
            ORDER BY failure_count DESC
            LIMIT 20
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        failures = []
        for row in rows:
            failures.append({
                "test_parameter": row[0],
                "failure_count": row[1],
                "product_name": row[2],
                "affected_orders": row[3]
            })
        
        return {"failure_analysis": failures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
