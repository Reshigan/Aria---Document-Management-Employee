"""
L4 API: Payslip GL Posting
Stub implementation - returns 501 Not Implemented
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/l4/payslip-gl-posting", tags=["L4 Payslip GL Posting"])

@router.get("/health")
async def health():
    return {"status": "ok", "service": "payslip_gl_posting"}

@router.get("/")
async def list_postings():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payslip GL posting endpoint not yet implemented"
    )
