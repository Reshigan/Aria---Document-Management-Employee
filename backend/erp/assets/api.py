"""Assets ERP API"""
from fastapi import APIRouter
from .models import AssetsItem

router = APIRouter(prefix="/api/v1/erp/assets", tags=["Assets ERP"])

@router.post("/items")
async def create_item(item: AssetsItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
