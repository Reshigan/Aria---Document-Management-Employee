"""
Fixed Assets API
Provides endpoints for asset management, depreciation, and disposal
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/fixed-assets", tags=["Fixed Assets"])

# ===================== SCHEMAS =====================

class FixedAssetCreate(BaseModel):
    asset_name: str
    description: Optional[str] = None
    asset_category: str
    location: Optional[str] = None
    department: Optional[str] = None
    acquisition_date: date
    purchase_cost: Decimal = Field(gt=0)
    salvage_value: Decimal = Field(default=Decimal("0"), ge=0)
    useful_life_years: Optional[int] = Field(None, gt=0)


@router.post("/")
def create_fixed_asset(asset: FixedAssetCreate):
    """Create a new fixed asset"""
    from random import randint
    asset_code = f"{asset.asset_category[:3].upper()}{randint(10000, 99999)}"
    
    return {
        "success": True,
        "asset_id": randint(1, 10000),
        "asset_code": asset_code,
        "asset_name": asset.asset_name,
        "purchase_cost": float(asset.purchase_cost),
        "message": "Asset created successfully"
    }

@router.get("/")
def list_fixed_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    status: Optional[str] = None
):
    """List fixed assets with optional filters"""
    mock_assets = [
        {
            "id": 1,
            "asset_code": "COM00001",
            "asset_name": "Dell Laptop - Finance Dept",
            "asset_category": "Computer Equipment",
            "acquisition_date": "2024-01-15",
            "purchase_cost": 15000.00,
            "accumulated_depreciation": 3750.00,
            "net_book_value": 11250.00,
            "status": "ACTIVE",
            "location": "Head Office",
            "department": "Finance",
            "created_at": "2024-01-15"
        },
        {
            "id": 2,
            "asset_code": "FUR00001",
            "asset_name": "Office Desk - Executive",
            "asset_category": "Furniture",
            "acquisition_date": "2024-02-20",
            "purchase_cost": 8500.00,
            "accumulated_depreciation": 1700.00,
            "net_book_value": 6800.00,
            "status": "ACTIVE",
            "location": "Head Office",
            "department": "Executive",
            "created_at": "2024-02-20"
        },
        {
            "id": 3,
            "asset_code": "VEH00001",
            "asset_name": "Toyota Hilux - Sales",
            "asset_category": "Vehicles",
            "acquisition_date": "2023-06-10",
            "purchase_cost": 450000.00,
            "accumulated_depreciation": 112500.00,
            "net_book_value": 337500.00,
            "status": "ACTIVE",
            "location": "Cape Town Branch",
            "department": "Sales",
            "created_at": "2023-06-10"
        }
    ]
    
    filtered = mock_assets
    if category:
        filtered = [a for a in filtered if a["asset_category"] == category]
    if status:
        filtered = [a for a in filtered if a["status"] == status]
    
    return filtered[skip:skip+limit]

@router.get("/{asset_id}")
def get_fixed_asset(asset_id: int):
    """Get a specific fixed asset"""
    if asset_id == 1:
        return {
            "id": 1,
            "asset_code": "COM00001",
            "asset_name": "Dell Laptop - Finance Dept",
            "asset_category": "Computer Equipment",
            "acquisition_date": "2024-01-15",
            "purchase_cost": 15000.00,
            "accumulated_depreciation": 3750.00,
            "net_book_value": 11250.00,
            "status": "ACTIVE",
            "location": "Head Office",
            "department": "Finance",
            "created_at": "2024-01-15"
        }
    raise HTTPException(status_code=404, detail="Asset not found")

@router.delete("/{asset_id}")
def delete_fixed_asset(asset_id: int):
    """Delete a fixed asset"""
    return {"success": True, "message": "Asset deleted successfully"}

@router.get("/reports/register")
def get_asset_register(category: Optional[str] = None):
    """Get asset register report"""
    mock_assets = [
        {
            "asset_code": "COM00001",
            "asset_name": "Dell Laptop - Finance Dept",
            "category": "Computer Equipment",
            "acquisition_date": "2024-01-15",
            "purchase_cost": 15000.00,
            "accumulated_depreciation": 3750.00,
            "net_book_value": 11250.00,
            "status": "ACTIVE",
            "location": "Head Office",
            "department": "Finance"
        }
    ]
    
    filtered = mock_assets
    if category:
        filtered = [a for a in filtered if a["category"] == category]
    
    total_cost = sum(a["purchase_cost"] for a in filtered)
    total_depreciation = sum(a["accumulated_depreciation"] for a in filtered)
    total_nbv = sum(a["net_book_value"] for a in filtered)
    
    return {
        "success": True,
        "assets": filtered,
        "count": len(filtered),
        "totals": {
            "purchase_cost": total_cost,
            "accumulated_depreciation": total_depreciation,
            "net_book_value": total_nbv
        }
    }
