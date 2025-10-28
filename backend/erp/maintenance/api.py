"""Maintenance ERP API"""
from fastapi import APIRouter
from .models import MaintenanceItem

router = APIRouter(prefix="/api/v1/erp/maintenance", tags=["Maintenance ERP"])

@router.post("/items")
async def create_item(item: MaintenanceItem):
    return {"success": True}

@router.get("/items")
async def get_items():
    return []
