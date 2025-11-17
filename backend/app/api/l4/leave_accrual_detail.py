"""
L4 API: Leave Accrual Detail
Stub implementation - returns 501 Not Implemented
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/l4/leave-accrual-detail", tags=["L4 Leave Accrual Detail"])

@router.get("/health")
async def health():
    return {"status": "ok", "service": "leave_accrual_detail"}

@router.get("/")
async def list_accruals():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Leave accrual detail endpoint not yet implemented"
    )
