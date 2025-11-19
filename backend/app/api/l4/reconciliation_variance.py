"""
L4 API: Reconciliation Variance
Tracks individual variance items found during bank reconciliation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import date

try:
    from core.database import get_db
except ImportError:
    try:
        from auth import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

try:
    from core.auth import get_current_user
except ImportError:
    try:
        from app.auth import get_current_user
    except ImportError:
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/reconciliation/{reconciliation_id}/variances")
async def list_reconciliation_variances(
    reconciliation_id: int,
    status: Optional[str] = Query(None, description="Filter by status: open, resolved"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all variance items for a specific bank reconciliation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                rsi.id,
                rsi.reconciliation_session_id,
                rsi.item_type as transaction_type,
                rsi.reference as transaction_id,
                rsi.transaction_date,
                rsi.description,
                COALESCE(rsi.debit_amount, 0) - COALESCE(rsi.credit_amount, 0) as amount,
                CASE WHEN rsi.reconciled THEN 'resolved' ELSE 'open' END as status,
                rsi.created_at
            FROM reconciliation_session_items rsi
            JOIN reconciliation_sessions rs ON rsi.reconciliation_session_id = rs.id
            WHERE rsi.reconciliation_session_id = :reconciliation_id
                AND rs.company_id = :company_id
                AND (:status IS NULL OR (CASE WHEN rsi.reconciled THEN 'resolved' ELSE 'open' END) = :status)
            ORDER BY rsi.created_at DESC
        """)
        
        result = db.execute(query, {
            "reconciliation_id": reconciliation_id,
            "company_id": company_id,
            "status": status
        })
        
        variances = []
        for row in result.fetchall():
            variances.append({
                "id": row[0],
                "reconciliation_id": row[1],
                "transaction_type": row[2],
                "transaction_id": row[3],
                "transaction_date": str(row[4]) if row[4] else None,
                "description": row[5],
                "amount": float(row[6]) if row[6] else 0,
                "status": row[7],
                "created_at": str(row[8]) if row[8] else None
            })
        
        return {"variances": variances, "count": len(variances)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconciliation-variance/{variance_id}")
async def get_reconciliation_variance(
    variance_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific reconciliation variance"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                rsi.id,
                rsi.reconciliation_session_id,
                rs.session_name,
                rs.start_date,
                rsi.item_type as transaction_type,
                rsi.reference as transaction_id,
                rsi.transaction_date,
                rsi.description,
                COALESCE(rsi.debit_amount, 0) - COALESCE(rsi.credit_amount, 0) as amount,
                CASE WHEN rsi.reconciled THEN 'resolved' ELSE 'open' END as status,
                rsi.created_at
            FROM reconciliation_session_items rsi
            JOIN reconciliation_sessions rs ON rsi.reconciliation_session_id = rs.id
            WHERE rsi.id = :variance_id AND rs.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "variance_id": variance_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Reconciliation variance not found")
        
        return {
            "variance": {
                "id": result[0],
                "reconciliation_id": result[1],
                "session_name": result[2],
                "session_start_date": str(result[3]) if result[3] else None,
                "transaction_type": result[4],
                "transaction_id": result[5],
                "transaction_date": str(result[6]) if result[6] else None,
                "description": result[7],
                "amount": float(result[8]) if result[8] else 0,
                "status": result[9],
                "created_at": str(result[10]) if result[10] else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/reconciliation-variance/{variance_id}/resolve")
async def resolve_variance(
    variance_id: int,
    resolution_note: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Resolve a reconciliation variance"""
    try:
        company_id = current_user.get("company_id", "default")
        
        check_query = text("""
            SELECT rsi.id
            FROM reconciliation_session_items rsi
            JOIN reconciliation_sessions rs ON rsi.reconciliation_session_id = rs.id
            WHERE rsi.id = :variance_id AND rs.company_id = :company_id
        """)
        
        check_result = db.execute(check_query, {
            "variance_id": variance_id,
            "company_id": company_id
        }).fetchone()
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Reconciliation variance not found")
        
        update_query = text("""
            UPDATE reconciliation_session_items
            SET 
                reconciled = true,
                updated_at = NOW()
            WHERE id = :variance_id
        """)
        
        db.execute(update_query, {"variance_id": variance_id})
        db.commit()
        
        return {"message": "Variance resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "reconciliation_variance"}
