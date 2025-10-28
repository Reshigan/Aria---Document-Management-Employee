"""Planning ERP API"""
from fastapi import APIRouter
from .models import PlanningItem

router = APIRouter(prefix="/api/v1/erp/planning", tags=["Planning ERP"])

@router.post("/items")
async def create_item(item: PlanningItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
