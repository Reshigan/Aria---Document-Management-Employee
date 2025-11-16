"""
GL/Financial Admin Configuration API
Fiscal calendar, period management, posting profiles, dimensions, tax setup, currency setup, rounding rules
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal

try:
    from app.database import get_db
except ImportError:
    from database import get_db

try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter(prefix="/api/gl-admin-config", tags=["GL/Financial Admin Configuration"])

# ===================== SCHEMAS =====================

class FiscalYearCreate(BaseModel):
    year_code: str
    start_date: date
    end_date: date
    is_active: bool = True

class FiscalPeriodCreate(BaseModel):
    fiscal_year_id: int
    period_number: int
    period_name: str
    start_date: date
    end_date: date
    is_open: bool = True

class PostingProfileCreate(BaseModel):
    profile_name: str
    module: str  # AR, AP, Inventory, etc.
    debit_account: str
    credit_account: str
    is_active: bool = True

class DimensionCreate(BaseModel):
    dimension_code: str
    dimension_name: str
    dimension_type: str  # cost_center, department, project, etc.
    parent_dimension_code: Optional[str] = None
    is_active: bool = True

class TaxCodeCreate(BaseModel):
    tax_code: str
    tax_name: str
    tax_rate: Decimal
    tax_type: str  # VAT, Sales Tax, etc.
    gl_account: str
    is_active: bool = True

class CurrencySetupCreate(BaseModel):
    currency_code: str
    currency_name: str
    symbol: str
    decimal_places: int = 2
    is_base_currency: bool = False
    is_active: bool = True

class RoundingRuleCreate(BaseModel):
    rule_name: str
    rounding_type: str  # amount, unit_price, tax, etc.
    rounding_method: str  # nearest, up, down
    decimal_places: int
    is_active: bool = True


@router.get("/fiscal-years")
async def get_fiscal_years(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all fiscal years"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                year_code,
                start_date,
                end_date,
                is_active,
                created_at,
                updated_at
            FROM fiscal_years
            WHERE company_id = :company_id
            ORDER BY start_date DESC
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        fiscal_years = []
        for row in rows:
            fiscal_years.append({
                "id": row[0],
                "year_code": row[1],
                "start_date": str(row[2]) if row[2] else None,
                "end_date": str(row[3]) if row[3] else None,
                "is_active": row[4],
                "created_at": str(row[5]) if row[5] else None,
                "updated_at": str(row[6]) if row[6] else None
            })
        
        return {"fiscal_years": fiscal_years}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiscal-years")
async def create_fiscal_year(
    fiscal_year: FiscalYearCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new fiscal year"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO fiscal_years (
                company_id, year_code, start_date, end_date, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :year_code, :start_date, :end_date, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "year_code": fiscal_year.year_code,
            "start_date": fiscal_year.start_date,
            "end_date": fiscal_year.end_date,
            "is_active": fiscal_year.is_active,
            "created_by": user_email
        })
        
        db.commit()
        fiscal_year_id = result.fetchone()[0]
        
        return {"id": fiscal_year_id, "message": "Fiscal year created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/fiscal-periods")
async def get_fiscal_periods(
    fiscal_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all fiscal periods"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                fp.id,
                fp.fiscal_year_id,
                fy.year_code,
                fp.period_number,
                fp.period_name,
                fp.start_date,
                fp.end_date,
                fp.is_open,
                fp.closed_by,
                fp.closed_at,
                fp.created_at,
                fp.updated_at
            FROM fiscal_periods fp
            JOIN fiscal_years fy ON fp.fiscal_year_id = fy.id
            WHERE fp.company_id = :company_id
            """ + (" AND fp.fiscal_year_id = :fiscal_year_id" if fiscal_year_id else "") + """
            ORDER BY fp.start_date
        """)
        
        params = {"company_id": company_id}
        if fiscal_year_id:
            params["fiscal_year_id"] = fiscal_year_id
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        periods = []
        for row in rows:
            periods.append({
                "id": row[0],
                "fiscal_year_id": row[1],
                "year_code": row[2],
                "period_number": row[3],
                "period_name": row[4],
                "start_date": str(row[5]) if row[5] else None,
                "end_date": str(row[6]) if row[6] else None,
                "is_open": row[7],
                "closed_by": row[8],
                "closed_at": str(row[9]) if row[9] else None,
                "created_at": str(row[10]) if row[10] else None,
                "updated_at": str(row[11]) if row[11] else None
            })
        
        return {"fiscal_periods": periods}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiscal-periods")
async def create_fiscal_period(
    period: FiscalPeriodCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new fiscal period"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO fiscal_periods (
                company_id, fiscal_year_id, period_number, period_name, start_date, end_date, is_open,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :fiscal_year_id, :period_number, :period_name, :start_date, :end_date, :is_open,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "fiscal_year_id": period.fiscal_year_id,
            "period_number": period.period_number,
            "period_name": period.period_name,
            "start_date": period.start_date,
            "end_date": period.end_date,
            "is_open": period.is_open,
            "created_by": user_email
        })
        
        db.commit()
        period_id = result.fetchone()[0]
        
        return {"id": period_id, "message": "Fiscal period created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiscal-periods/{period_id}/close")
async def close_fiscal_period(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Close a fiscal period"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE fiscal_periods
            SET is_open = FALSE, closed_by = :closed_by, closed_at = NOW(), updated_at = NOW()
            WHERE id = :period_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "period_id": period_id,
            "company_id": company_id,
            "closed_by": user_email
        })
        db.commit()
        
        return {"message": "Fiscal period closed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fiscal-periods/{period_id}/reopen")
async def reopen_fiscal_period(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reopen a fiscal period"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE fiscal_periods
            SET is_open = TRUE, closed_by = NULL, closed_at = NULL, updated_at = NOW()
            WHERE id = :period_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"period_id": period_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Fiscal period reopened successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/posting-profiles")
async def get_posting_profiles(
    module: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all posting profiles"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                profile_name,
                module,
                debit_account,
                credit_account,
                is_active,
                created_at,
                updated_at
            FROM posting_profiles
            WHERE company_id = :company_id
            """ + (" AND module = :module" if module else "") + """
            ORDER BY module, profile_name
        """)
        
        params = {"company_id": company_id}
        if module:
            params["module"] = module
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        profiles = []
        for row in rows:
            profiles.append({
                "id": row[0],
                "profile_name": row[1],
                "module": row[2],
                "debit_account": row[3],
                "credit_account": row[4],
                "is_active": row[5],
                "created_at": str(row[6]) if row[6] else None,
                "updated_at": str(row[7]) if row[7] else None
            })
        
        return {"posting_profiles": profiles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posting-profiles")
async def create_posting_profile(
    profile: PostingProfileCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new posting profile"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO posting_profiles (
                company_id, profile_name, module, debit_account, credit_account, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :profile_name, :module, :debit_account, :credit_account, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "profile_name": profile.profile_name,
            "module": profile.module,
            "debit_account": profile.debit_account,
            "credit_account": profile.credit_account,
            "is_active": profile.is_active,
            "created_by": user_email
        })
        
        db.commit()
        profile_id = result.fetchone()[0]
        
        return {"id": profile_id, "message": "Posting profile created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/dimensions")
async def get_dimensions(
    dimension_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all dimensions"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                dimension_code,
                dimension_name,
                dimension_type,
                parent_dimension_code,
                is_active,
                created_at,
                updated_at
            FROM dimensions
            WHERE company_id = :company_id
            """ + (" AND dimension_type = :dimension_type" if dimension_type else "") + """
            ORDER BY dimension_type, dimension_code
        """)
        
        params = {"company_id": company_id}
        if dimension_type:
            params["dimension_type"] = dimension_type
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        dimensions = []
        for row in rows:
            dimensions.append({
                "id": row[0],
                "dimension_code": row[1],
                "dimension_name": row[2],
                "dimension_type": row[3],
                "parent_dimension_code": row[4],
                "is_active": row[5],
                "created_at": str(row[6]) if row[6] else None,
                "updated_at": str(row[7]) if row[7] else None
            })
        
        return {"dimensions": dimensions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dimensions")
async def create_dimension(
    dimension: DimensionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new dimension"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO dimensions (
                company_id, dimension_code, dimension_name, dimension_type, parent_dimension_code, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :dimension_code, :dimension_name, :dimension_type, :parent_dimension_code, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "dimension_code": dimension.dimension_code,
            "dimension_name": dimension.dimension_name,
            "dimension_type": dimension.dimension_type,
            "parent_dimension_code": dimension.parent_dimension_code,
            "is_active": dimension.is_active,
            "created_by": user_email
        })
        
        db.commit()
        dimension_id = result.fetchone()[0]
        
        return {"id": dimension_id, "message": "Dimension created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/tax-codes")
async def get_tax_codes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all tax codes"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                tax_code,
                tax_name,
                tax_rate,
                tax_type,
                gl_account,
                is_active,
                created_at,
                updated_at
            FROM tax_codes
            WHERE company_id = :company_id
            ORDER BY tax_code
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        tax_codes = []
        for row in rows:
            tax_codes.append({
                "id": row[0],
                "tax_code": row[1],
                "tax_name": row[2],
                "tax_rate": float(row[3]) if row[3] else 0,
                "tax_type": row[4],
                "gl_account": row[5],
                "is_active": row[6],
                "created_at": str(row[7]) if row[7] else None,
                "updated_at": str(row[8]) if row[8] else None
            })
        
        return {"tax_codes": tax_codes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tax-codes")
async def create_tax_code(
    tax_code: TaxCodeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new tax code"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO tax_codes (
                company_id, tax_code, tax_name, tax_rate, tax_type, gl_account, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :tax_code, :tax_name, :tax_rate, :tax_type, :gl_account, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "tax_code": tax_code.tax_code,
            "tax_name": tax_code.tax_name,
            "tax_rate": float(tax_code.tax_rate),
            "tax_type": tax_code.tax_type,
            "gl_account": tax_code.gl_account,
            "is_active": tax_code.is_active,
            "created_by": user_email
        })
        
        db.commit()
        tax_code_id = result.fetchone()[0]
        
        return {"id": tax_code_id, "message": "Tax code created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/currency-setup")
async def get_currency_setup(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all currency setups"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                currency_code,
                currency_name,
                symbol,
                decimal_places,
                is_base_currency,
                is_active,
                created_at,
                updated_at
            FROM currency_setup
            WHERE company_id = :company_id
            ORDER BY currency_code
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        currencies = []
        for row in rows:
            currencies.append({
                "id": row[0],
                "currency_code": row[1],
                "currency_name": row[2],
                "symbol": row[3],
                "decimal_places": row[4],
                "is_base_currency": row[5],
                "is_active": row[6],
                "created_at": str(row[7]) if row[7] else None,
                "updated_at": str(row[8]) if row[8] else None
            })
        
        return {"currency_setup": currencies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/currency-setup")
async def create_currency_setup(
    currency: CurrencySetupCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new currency setup"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO currency_setup (
                company_id, currency_code, currency_name, symbol, decimal_places, is_base_currency, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :currency_code, :currency_name, :symbol, :decimal_places, :is_base_currency, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "currency_code": currency.currency_code,
            "currency_name": currency.currency_name,
            "symbol": currency.symbol,
            "decimal_places": currency.decimal_places,
            "is_base_currency": currency.is_base_currency,
            "is_active": currency.is_active,
            "created_by": user_email
        })
        
        db.commit()
        currency_id = result.fetchone()[0]
        
        return {"id": currency_id, "message": "Currency setup created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/rounding-rules")
async def get_rounding_rules(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all rounding rules"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                rule_name,
                rounding_type,
                rounding_method,
                decimal_places,
                is_active,
                created_at,
                updated_at
            FROM rounding_rules
            WHERE company_id = :company_id
            ORDER BY rounding_type, rule_name
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        rules = []
        for row in rows:
            rules.append({
                "id": row[0],
                "rule_name": row[1],
                "rounding_type": row[2],
                "rounding_method": row[3],
                "decimal_places": row[4],
                "is_active": row[5],
                "created_at": str(row[6]) if row[6] else None,
                "updated_at": str(row[7]) if row[7] else None
            })
        
        return {"rounding_rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rounding-rules")
async def create_rounding_rule(
    rule: RoundingRuleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new rounding rule"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO rounding_rules (
                company_id, rule_name, rounding_type, rounding_method, decimal_places, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :rule_name, :rounding_type, :rounding_method, :decimal_places, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "rule_name": rule.rule_name,
            "rounding_type": rule.rounding_type,
            "rounding_method": rule.rounding_method,
            "decimal_places": rule.decimal_places,
            "is_active": rule.is_active,
            "created_by": user_email
        })
        
        db.commit()
        rule_id = result.fetchone()[0]
        
        return {"id": rule_id, "message": "Rounding rule created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


print("✅ GL/Financial Admin Configuration API loaded")
