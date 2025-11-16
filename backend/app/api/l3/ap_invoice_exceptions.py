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


class ExceptionResolution(BaseModel):
    resolution_action: str
    notes: Optional[str] = None


@router.get("/ap-invoice/{invoice_id}/exceptions")
async def get_ap_invoice_exceptions(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all matching exceptions for an AP invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                api.invoice_number,
                api.invoice_date,
                api.supplier_id,
                s.name as supplier_name,
                api.purchase_order_id,
                po.po_number,
                api.total_amount,
                api.status
            FROM ap_invoices api
            LEFT JOIN suppliers s ON api.supplier_id = s.id
            LEFT JOIN purchase_orders po ON api.purchase_order_id = po.id
            WHERE api.id = :invoice_id AND api.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "invoice_id": invoice_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="AP invoice not found")
        
        exceptions_query = text("""
            SELECT 
                aie.id,
                aie.exception_type,
                aie.severity,
                aie.description,
                aie.expected_value,
                aie.actual_value,
                aie.variance_amount,
                aie.status,
                aie.resolution_action,
                aie.resolved_by,
                aie.resolved_at,
                aie.notes
            FROM ap_invoice_exceptions aie
            WHERE aie.ap_invoice_id = :invoice_id AND aie.company_id = :company_id
            ORDER BY 
                CASE aie.severity 
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                END,
                aie.created_at
        """)
        
        exceptions_result = db.execute(exceptions_query, {
            "invoice_id": invoice_id,
            "company_id": company_id
        })
        
        exceptions = []
        total_variance = 0
        unresolved_count = 0
        
        for row in exceptions_result.fetchall():
            variance = float(row[6]) if row[6] else 0
            total_variance += abs(variance)
            
            if row[7] != "RESOLVED":
                unresolved_count += 1
            
            exceptions.append({
                "id": row[0],
                "exception_type": row[1],
                "severity": row[2],
                "description": row[3],
                "expected_value": row[4],
                "actual_value": row[5],
                "variance_amount": variance,
                "status": row[7],
                "resolution_action": row[8],
                "resolved_by": row[9],
                "resolved_at": str(row[10]) if row[10] else None,
                "notes": row[11]
            })
        
        return {
            "invoice": {
                "invoice_number": header_result[0],
                "invoice_date": str(header_result[1]) if header_result[1] else None,
                "supplier_id": header_result[2],
                "supplier_name": header_result[3],
                "purchase_order_id": header_result[4],
                "po_number": header_result[5],
                "total_amount": float(header_result[6]) if header_result[6] else 0,
                "status": header_result[7]
            },
            "exceptions": exceptions,
            "summary": {
                "total_exceptions": len(exceptions),
                "unresolved_exceptions": unresolved_count,
                "total_variance": total_variance
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ap-invoice/{invoice_id}/exception")
async def create_ap_invoice_exception(
    invoice_id: int,
    exception_type: str,
    severity: str,
    description: str,
    expected_value: Optional[str] = None,
    actual_value: Optional[str] = None,
    variance_amount: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create an exception for an AP invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO ap_invoice_exceptions (
                ap_invoice_id, exception_type, severity, description,
                expected_value, actual_value, variance_amount,
                company_id, created_by, created_at
            ) VALUES (
                :ap_invoice_id, :exception_type, :severity, :description,
                :expected_value, :actual_value, :variance_amount,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "ap_invoice_id": invoice_id,
            "exception_type": exception_type,
            "severity": severity,
            "description": description,
            "expected_value": expected_value,
            "actual_value": actual_value,
            "variance_amount": variance_amount,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        exception_id = result.fetchone()[0]
        
        return {"id": exception_id, "message": "Exception created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/ap-invoice-exception/{exception_id}/resolve")
async def resolve_exception(
    exception_id: int,
    resolution: ExceptionResolution,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Resolve an AP invoice exception"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE ap_invoice_exceptions aie
            SET 
                status = 'RESOLVED',
                resolution_action = :resolution_action,
                notes = :notes,
                resolved_by = :resolved_by,
                resolved_at = NOW(),
                updated_at = NOW()
            FROM ap_invoices api
            WHERE aie.ap_invoice_id = api.id
                AND aie.id = :exception_id
                AND api.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "resolution_action": resolution.resolution_action,
            "notes": resolution.notes,
            "resolved_by": user_email,
            "exception_id": exception_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Exception resolved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ap-invoice-exceptions/summary")
async def get_exceptions_summary(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get summary of AP invoice exceptions"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["api.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if status:
            where_clauses.append("aie.status = :status")
            params["status"] = status
        
        if severity:
            where_clauses.append("aie.severity = :severity")
            params["severity"] = severity
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                aie.exception_type,
                aie.severity,
                COUNT(*) as exception_count,
                SUM(CASE WHEN aie.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_count,
                SUM(ABS(aie.variance_amount)) as total_variance
            FROM ap_invoice_exceptions aie
            JOIN ap_invoices api ON aie.ap_invoice_id = api.id
            WHERE {where_clause}
            GROUP BY aie.exception_type, aie.severity
            ORDER BY exception_count DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        summary = []
        for row in rows:
            summary.append({
                "exception_type": row[0],
                "severity": row[1],
                "exception_count": row[2],
                "resolved_count": row[3],
                "total_variance": float(row[4]) if row[4] else 0
            })
        
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier/{supplier_id}/exception-history")
async def get_supplier_exception_history(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get exception history for a supplier"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                api.invoice_number,
                api.invoice_date,
                aie.exception_type,
                aie.severity,
                aie.description,
                aie.variance_amount,
                aie.status
            FROM ap_invoice_exceptions aie
            JOIN ap_invoices api ON aie.ap_invoice_id = api.id
            WHERE api.supplier_id = :supplier_id AND api.company_id = :company_id
            ORDER BY api.invoice_date DESC
            LIMIT 100
        """)
        
        result = db.execute(query, {"supplier_id": supplier_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "invoice_number": row[0],
                "invoice_date": str(row[1]) if row[1] else None,
                "exception_type": row[2],
                "severity": row[3],
                "description": row[4],
                "variance_amount": float(row[5]) if row[5] else 0,
                "status": row[6]
            })
        
        return {"exception_history": history, "total_count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
