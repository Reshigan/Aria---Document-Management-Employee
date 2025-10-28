"""Quality ERP API"""
from fastapi import APIRouter
from .models import QualityItem

router = APIRouter(prefix="/api/v1/erp/quality", tags=["Quality ERP"])

@router.post("/items")
async def create_item(item: QualityItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
