"""
Fixed Assets API
Provides endpoints for asset management, depreciation, and disposal
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from core.database import get_db
from core.auth import get_current_user
from app.models.user import User
from app.models.fixed_asset import FixedAsset, AssetStatus
from app.services.fixed_assets_service import FixedAssetsService

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
    asset_account_number: str = "1500"  # Default Fixed Assets account
    depreciation_expense_account: str = "6300"  # Default Depreciation Expense
    accumulated_depreciation_account: str = "1510"  # Default Accumulated Depreciation

class FixedAssetResponse(BaseModel):
    id: int
    asset_code: str
    asset_name: str
    asset_category: str
    acquisition_date: date
    purchase_cost: Decimal
    accumulated_depreciation: Decimal
    net_book_value: Decimal
    status: str
    location: Optional[str]
    department: Optional[str]
    created_at: date

    class Config:
        from_attributes = True

# ===================== ENDPOINTS =====================

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_fixed_asset(
    asset: FixedAssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new fixed asset"""
    service = FixedAssetsService(db)
    
    asset_data = asset.dict()
    asset_data['created_by'] = current_user.id
    
    result = service.create_asset(asset_data)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@router.get("/", response_model=List[FixedAssetResponse])
def list_fixed_assets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List fixed assets with optional filters"""
    query = db.query(FixedAsset)
    
    if category:
        query = query.filter(FixedAsset.asset_category == category)
    if status:
        query = query.filter(FixedAsset.status == status)
    
    assets = query.order_by(FixedAsset.asset_code).offset(skip).limit(limit).all()
    return assets

@router.get("/{asset_id}", response_model=FixedAssetResponse)
def get_fixed_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific fixed asset"""
    asset = db.query(FixedAsset).filter(FixedAsset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return asset

@router.delete("/{asset_id}")
def delete_fixed_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a fixed asset (soft delete by marking as RETIRED)"""
    asset = db.query(FixedAsset).filter(FixedAsset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset.status = AssetStatus.RETIRED
    asset.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": "Asset retired successfully"}

@router.post("/{asset_id}/depreciate")
def depreciate_asset(
    asset_id: int,
    period_end_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate and post depreciation for an asset"""
    service = FixedAssetsService(db)
    result = service.calculate_depreciation(asset_id, period_end_date)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@router.post("/{asset_id}/dispose")
def dispose_asset(
    asset_id: int,
    disposal_date: str,
    disposal_proceeds: Decimal = Decimal("0"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dispose of a fixed asset"""
    service = FixedAssetsService(db)
    
    disposal_data = {
        'asset_id': asset_id,
        'disposal_date': disposal_date,
        'disposal_proceeds': disposal_proceeds
    }
    
    result = service.dispose_asset(disposal_data)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@router.get("/reports/register")
def get_asset_register(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get asset register report"""
    service = FixedAssetsService(db)
    result = service.get_asset_register(category)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result
