"""Inventory ERP API"""
from fastapi import APIRouter
from .models import InventoryItem

router = APIRouter(prefix="/api/v1/erp/inventory", tags=["Inventory ERP"])

@router.post("/items")
async def create_item(item: InventoryItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
