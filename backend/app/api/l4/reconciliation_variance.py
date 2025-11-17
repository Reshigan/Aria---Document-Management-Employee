"""
L4 API: Reconciliation Variance
Stub implementation - returns 501 Not Implemented
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/l4/reconciliation-variance", tags=["L4 Reconciliation Variance"])

@router.get("/health")
async def health():
    return {"status": "ok", "service": "reconciliation_variance"}

@router.get("/")
async def list_variances():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Reconciliation variance endpoint not yet implemented"
    )
