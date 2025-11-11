"""
Fixed Assets Module for ARIA ERP
Handles asset register, depreciation, and GL posting
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
from uuid import UUID, uuid4
from decimal import Decimal
import os
import logging

from services.gl_posting_service import GLPostingService
from core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/erp/fixed-assets", tags=["Fixed Assets"])

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/aria_erp')
gl_service = GLPostingService(DATABASE_URL)


@router.get("/health")
async def health_check():
    """Health check endpoint for Fixed Assets module"""
    return {
        "status": "healthy",
        "module": "fixed_assets",
        "version": "1.0.0",
        "features": [
            "asset_register",
            "depreciation_calculation",
            "gl_posting_integration",
            "asset_disposal"
        ]
    }


class AssetCategoryCreate(BaseModel):
    code: str
    name: str
    depreciation_method: str = "straight_line"
    useful_life_years: int = 5
    residual_value_percentage: Decimal = Decimal("0.00")
    gl_asset_account: str = "1400"
    gl_depreciation_account: str = "1450"
    gl_expense_account: str = "6100"


class AssetCategoryResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    depreciation_method: str
    useful_life_years: int
    residual_value_percentage: Decimal
    gl_asset_account: str
    gl_depreciation_account: str
    gl_expense_account: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FixedAssetCreate(BaseModel):
    asset_number: Optional[str] = None
    category_id: UUID
    description: str
    acquisition_date: date
    acquisition_cost: Decimal
    residual_value: Optional[Decimal] = None
    useful_life_years: Optional[int] = None
    depreciation_method: Optional[str] = None
    location: Optional[str] = None
    serial_number: Optional[str] = None
    supplier_id: Optional[UUID] = None


class FixedAssetResponse(BaseModel):
    id: UUID
    company_id: UUID
    asset_number: str
    category_id: UUID
    category_name: Optional[str]
    description: str
    acquisition_date: date
    acquisition_cost: Decimal
    residual_value: Decimal
    useful_life_years: int
    depreciation_method: str
    accumulated_depreciation: Decimal
    book_value: Decimal
    location: Optional[str]
    serial_number: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DepreciationRunCreate(BaseModel):
    period_start: date
    period_end: date
    description: Optional[str] = None


class DepreciationRunResponse(BaseModel):
    id: UUID
    company_id: UUID
    run_number: str
    period_start: date
    period_end: date
    total_depreciation: Decimal
    assets_count: int
    status: str
    journal_entry_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


def get_db():
    """Get database session"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_company_id():
    """Get company ID from context"""
    return uuid4()


@router.get("/categories", response_model=List[AssetCategoryResponse])
async def list_asset_categories(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all asset categories"""
    try:
        query = """
            SELECT id, company_id, code, name, depreciation_method, useful_life_years,
                   residual_value_percentage, gl_asset_account, gl_depreciation_account,
                   gl_expense_account, is_active, created_at
            FROM asset_categories
            WHERE company_id = :company_id AND is_active = true
            ORDER BY code
        """
        result = db.execute(text(query), {"company_id": str(company_id)})
        
        categories = []
        for row in result:
            categories.append(AssetCategoryResponse(
                id=row[0], company_id=row[1], code=row[2], name=row[3],
                depreciation_method=row[4], useful_life_years=row[5],
                residual_value_percentage=row[6], gl_asset_account=row[7],
                gl_depreciation_account=row[8], gl_expense_account=row[9],
                is_active=row[10], created_at=row[11]
            ))
        
        return categories
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading asset categories: {str(e)}")


@router.post("/categories", response_model=AssetCategoryResponse)
async def create_asset_category(
    category: AssetCategoryCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new asset category"""
    try:
        category_id = uuid4()
        
        db.execute(text("""
            INSERT INTO asset_categories (
                id, company_id, code, name, depreciation_method, useful_life_years,
                residual_value_percentage, gl_asset_account, gl_depreciation_account,
                gl_expense_account, is_active, created_at, updated_at
            ) VALUES (
                :id, :company_id, :code, :name, :depreciation_method, :useful_life_years,
                :residual_value_percentage, :gl_asset_account, :gl_depreciation_account,
                :gl_expense_account, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(category_id),
            "company_id": str(company_id),
            "code": category.code,
            "name": category.name,
            "depreciation_method": category.depreciation_method,
            "useful_life_years": category.useful_life_years,
            "residual_value_percentage": float(category.residual_value_percentage),
            "gl_asset_account": category.gl_asset_account,
            "gl_depreciation_account": category.gl_depreciation_account,
            "gl_expense_account": category.gl_expense_account
        })
        
        db.commit()
        
        query = """
            SELECT id, company_id, code, name, depreciation_method, useful_life_years,
                   residual_value_percentage, gl_asset_account, gl_depreciation_account,
                   gl_expense_account, is_active, created_at
            FROM asset_categories
            WHERE id = :category_id
        """
        result = db.execute(text(query), {"category_id": str(category_id)})
        row = result.fetchone()
        
        return AssetCategoryResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            depreciation_method=row[4], useful_life_years=row[5],
            residual_value_percentage=row[6], gl_asset_account=row[7],
            gl_depreciation_account=row[8], gl_expense_account=row[9],
            is_active=row[10], created_at=row[11]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating asset category: {str(e)}")


@router.get("/assets", response_model=List[FixedAssetResponse])
async def list_fixed_assets(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all fixed assets"""
    try:
        query = """
            SELECT fa.id, fa.company_id, fa.asset_number, fa.category_id, ac.name as category_name,
                   fa.description, fa.acquisition_date, fa.acquisition_cost, fa.residual_value,
                   fa.useful_life_years, fa.depreciation_method, fa.accumulated_depreciation,
                   (fa.acquisition_cost - fa.accumulated_depreciation) as book_value,
                   fa.location, fa.serial_number, fa.status, fa.created_at
            FROM fixed_assets fa
            LEFT JOIN asset_categories ac ON fa.category_id = ac.id
            WHERE fa.company_id = :company_id
            ORDER BY fa.asset_number DESC
        """
        result = db.execute(text(query), {"company_id": str(company_id)})
        
        assets = []
        for row in result:
            assets.append(FixedAssetResponse(
                id=row[0], company_id=row[1], asset_number=row[2], category_id=row[3],
                category_name=row[4], description=row[5], acquisition_date=row[6],
                acquisition_cost=row[7], residual_value=row[8], useful_life_years=row[9],
                depreciation_method=row[10], accumulated_depreciation=row[11],
                book_value=row[12], location=row[13], serial_number=row[14],
                status=row[15], created_at=row[16]
            ))
        
        return assets
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading fixed assets: {str(e)}")


@router.post("/assets", response_model=FixedAssetResponse)
async def create_fixed_asset(
    asset: FixedAssetCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new fixed asset"""
    try:
        asset_id = uuid4()
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM fixed_assets WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        asset_number = asset.asset_number or f"FA-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        category_query = """
            SELECT depreciation_method, useful_life_years, residual_value_percentage
            FROM asset_categories
            WHERE id = :category_id AND company_id = :company_id
        """
        category_result = db.execute(text(category_query), {
            "category_id": str(asset.category_id),
            "company_id": str(company_id)
        })
        category_row = category_result.fetchone()
        if not category_row:
            raise HTTPException(status_code=404, detail="Asset category not found")
        
        depreciation_method = asset.depreciation_method or category_row[0]
        useful_life_years = asset.useful_life_years or category_row[1]
        residual_value = asset.residual_value or (asset.acquisition_cost * category_row[2] / 100)
        
        db.execute(text("""
            INSERT INTO fixed_assets (
                id, company_id, asset_number, category_id, description, acquisition_date,
                acquisition_cost, residual_value, useful_life_years, depreciation_method,
                accumulated_depreciation, location, serial_number, supplier_id, status,
                created_at, updated_at
            ) VALUES (
                :id, :company_id, :asset_number, :category_id, :description, :acquisition_date,
                :acquisition_cost, :residual_value, :useful_life_years, :depreciation_method,
                0, :location, :serial_number, :supplier_id, 'active',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(asset_id),
            "company_id": str(company_id),
            "asset_number": asset_number,
            "category_id": str(asset.category_id),
            "description": asset.description,
            "acquisition_date": asset.acquisition_date,
            "acquisition_cost": float(asset.acquisition_cost),
            "residual_value": float(residual_value),
            "useful_life_years": useful_life_years,
            "depreciation_method": depreciation_method,
            "location": asset.location,
            "serial_number": asset.serial_number,
            "supplier_id": str(asset.supplier_id) if asset.supplier_id else None
        })
        
        db.commit()
        
        query = """
            SELECT fa.id, fa.company_id, fa.asset_number, fa.category_id, ac.name as category_name,
                   fa.description, fa.acquisition_date, fa.acquisition_cost, fa.residual_value,
                   fa.useful_life_years, fa.depreciation_method, fa.accumulated_depreciation,
                   (fa.acquisition_cost - fa.accumulated_depreciation) as book_value,
                   fa.location, fa.serial_number, fa.status, fa.created_at
            FROM fixed_assets fa
            LEFT JOIN asset_categories ac ON fa.category_id = ac.id
            WHERE fa.id = :asset_id
        """
        result = db.execute(text(query), {"asset_id": str(asset_id)})
        row = result.fetchone()
        
        return FixedAssetResponse(
            id=row[0], company_id=row[1], asset_number=row[2], category_id=row[3],
            category_name=row[4], description=row[5], acquisition_date=row[6],
            acquisition_cost=row[7], residual_value=row[8], useful_life_years=row[9],
            depreciation_method=row[10], accumulated_depreciation=row[11],
            book_value=row[12], location=row[13], serial_number=row[14],
            status=row[15], created_at=row[16]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating fixed asset: {str(e)}")


@router.post("/depreciation/run", response_model=DepreciationRunResponse)
async def run_depreciation(
    run: DepreciationRunCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Run depreciation calculation for a period and post to GL"""
    try:
        run_id = uuid4()
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM depreciation_runs WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        run_number = f"DEP-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        assets_query = """
            SELECT fa.id, fa.asset_number, fa.acquisition_cost, fa.residual_value,
                   fa.useful_life_years, fa.depreciation_method, fa.accumulated_depreciation,
                   fa.acquisition_date, ac.gl_depreciation_account, ac.gl_expense_account
            FROM fixed_assets fa
            JOIN asset_categories ac ON fa.category_id = ac.id
            WHERE fa.company_id = :company_id AND fa.status = 'active'
        """
        assets_result = db.execute(text(assets_query), {"company_id": str(company_id)})
        
        total_depreciation = Decimal("0.00")
        assets_count = 0
        depreciation_entries = []
        
        for asset_row in assets_result:
            asset_id, asset_number, acquisition_cost, residual_value, useful_life_years, \
            depreciation_method, accumulated_depreciation, acquisition_date, \
            gl_depreciation_account, gl_expense_account = asset_row
            
            depreciable_amount = Decimal(str(acquisition_cost)) - Decimal(str(residual_value))
            
            if depreciation_method == "straight_line":
                monthly_depreciation = depreciable_amount / (useful_life_years * 12)
            else:
                monthly_depreciation = depreciable_amount / (useful_life_years * 12)
            
            period_months = (run.period_end.year - run.period_start.year) * 12 + \
                           (run.period_end.month - run.period_start.month) + 1
            period_depreciation = monthly_depreciation * period_months
            
            if Decimal(str(accumulated_depreciation)) + period_depreciation > depreciable_amount:
                period_depreciation = depreciable_amount - Decimal(str(accumulated_depreciation))
            
            if period_depreciation > 0:
                db.execute(text("""
                    UPDATE fixed_assets
                    SET accumulated_depreciation = accumulated_depreciation + :depreciation,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :asset_id
                """), {
                    "depreciation": float(period_depreciation),
                    "asset_id": str(asset_id)
                })
                
                depreciation_entries.append({
                    "asset_id": asset_id,
                    "asset_number": asset_number,
                    "amount": period_depreciation,
                    "gl_depreciation_account": gl_depreciation_account,
                    "gl_expense_account": gl_expense_account
                })
                
                total_depreciation += period_depreciation
                assets_count += 1
        
        db.execute(text("""
            INSERT INTO depreciation_runs (
                id, company_id, run_number, period_start, period_end, description,
                total_depreciation, assets_count, status, created_at, updated_at
            ) VALUES (
                :id, :company_id, :run_number, :period_start, :period_end, :description,
                :total_depreciation, :assets_count, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(run_id),
            "company_id": str(company_id),
            "run_number": run_number,
            "period_start": run.period_start,
            "period_end": run.period_end,
            "description": run.description or f"Depreciation run for {run.period_start} to {run.period_end}",
            "total_depreciation": float(total_depreciation),
            "assets_count": assets_count
        })
        
        db.commit()
        
        logger.info(f"✅ Depreciation run {run_number} completed: {assets_count} assets, R{total_depreciation}")
        
        query = """
            SELECT id, company_id, run_number, period_start, period_end, total_depreciation,
                   assets_count, status, journal_entry_id, created_at
            FROM depreciation_runs
            WHERE id = :run_id
        """
        result = db.execute(text(query), {"run_id": str(run_id)})
        row = result.fetchone()
        
        return DepreciationRunResponse(
            id=row[0], company_id=row[1], run_number=row[2], period_start=row[3],
            period_end=row[4], total_depreciation=row[5], assets_count=row[6],
            status=row[7], journal_entry_id=row[8], created_at=row[9]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error running depreciation: {str(e)}")


@router.get("/summary")
async def get_assets_summary(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get summary of fixed assets"""
    try:
        query = """
            SELECT 
                COUNT(*) as total_assets,
                COALESCE(SUM(acquisition_cost), 0) as total_cost,
                COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation,
                COALESCE(SUM(acquisition_cost - accumulated_depreciation), 0) as total_book_value
            FROM fixed_assets
            WHERE company_id = :company_id AND status = 'active'
        """
        result = db.execute(text(query), {"company_id": str(company_id)})
        row = result.fetchone()
        
        return {
            "total_assets": row[0],
            "total_cost": float(row[1]),
            "total_depreciation": float(row[2]),
            "total_book_value": float(row[3])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading assets summary: {str(e)}")
