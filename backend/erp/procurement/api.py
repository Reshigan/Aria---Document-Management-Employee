"""Procurement ERP API"""
from fastapi import APIRouter
from .models import ProcurementItem

router = APIRouter(prefix="/api/v1/erp/procurement", tags=["Procurement ERP"])

@router.post("/items")
async def create_item(item: ProcurementItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
