"""Wms ERP API"""
from fastapi import APIRouter
from .models import WmsItem

router = APIRouter(prefix="/api/v1/erp/wms", tags=["Wms ERP"])

@router.post("/items")
async def create_item(item: WmsItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
