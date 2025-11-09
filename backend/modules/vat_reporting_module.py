"""
VAT Reporting Module - Priority 8
South African VAT201, EMP201, BBBEE reporting and period close
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import asyncpg
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/vat-reporting", tags=["VAT Reporting"])


# ============================================================================
# Pydantic Models
# ============================================================================

class TaxCodeCreate(BaseModel):
    company_id: Optional[str] = None
    code: str
    description: str
    tax_type: str
    rate: Decimal
    is_input_tax: bool = False
    is_output_tax: bool = False
    gl_account_payable: Optional[str] = None
    gl_account_receivable: Optional[str] = None
    is_exempt: bool = False
    is_zero_rated: bool = False

class VAT201Create(BaseModel):
    company_id: str
    period: str  # YYYY-MM format
    period_start_date: date
    period_end_date: date

class EMP201Create(BaseModel):
    company_id: str
    period: str  # YYYY-MM format
    period_start_date: date
    period_end_date: date

class PeriodCloseCreate(BaseModel):
    company_id: str
    period: str  # YYYY-MM format
    period_start_date: date
    period_end_date: date
    checklist: Optional[Dict[str, Any]] = None


# ============================================================================
# ============================================================================

async def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    
    try:
        conn = await asyncpg.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ============================================================================
# ============================================================================

@router.post("/tax-codes")
async def create_tax_code(tax_code: TaxCodeCreate):
    """Create a new tax code"""
    conn = await get_db_connection()
    
    try:
        new_tax_code = await conn.fetchrow(
            """
            INSERT INTO tax_codes 
            (company_id, code, description, tax_type, rate, is_input_tax, is_output_tax,
             gl_account_payable, gl_account_receivable, is_exempt, is_zero_rated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, code, description, rate, created_at
            """,
            tax_code.company_id, tax_code.code, tax_code.description, tax_code.tax_type,
            tax_code.rate, tax_code.is_input_tax, tax_code.is_output_tax,
            tax_code.gl_account_payable, tax_code.gl_account_receivable,
            tax_code.is_exempt, tax_code.is_zero_rated
        )
        
        return {
            "status": "success",
            "message": f"Tax code {tax_code.code} created successfully",
            "tax_code": {
                "id": str(new_tax_code['id']),
                "code": new_tax_code['code'],
                "description": new_tax_code['description'],
                "rate": float(new_tax_code['rate']),
                "created_at": new_tax_code['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating tax code: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create tax code: {str(e)}")
    finally:
        await conn.close()


@router.get("/tax-codes")
async def list_tax_codes(
    company_id: Optional[str] = None,
    tax_type: Optional[str] = None,
    is_active: bool = True
):
    """List tax codes"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, code, description, tax_type, rate, is_input_tax, is_output_tax, is_exempt, is_zero_rated FROM tax_codes WHERE is_active = $1"
        params = [is_active]
        
        if company_id:
            query += " AND (company_id = $2 OR company_id IS NULL)"
            params.append(company_id)
        
        if tax_type:
            query += f" AND tax_type = ${len(params) + 1}"
            params.append(tax_type)
        
        query += " ORDER BY code"
        
        tax_codes = await conn.fetch(query, *params)
        
        return {
            "tax_codes": [
                {
                    "id": str(tc['id']),
                    "code": tc['code'],
                    "description": tc['description'],
                    "tax_type": tc['tax_type'],
                    "rate": float(tc['rate']),
                    "is_input_tax": tc['is_input_tax'],
                    "is_output_tax": tc['is_output_tax'],
                    "is_exempt": tc['is_exempt'],
                    "is_zero_rated": tc['is_zero_rated']
                }
                for tc in tax_codes
            ],
            "total": len(tax_codes)
        }
    
    except Exception as e:
        logger.error(f"Error listing tax codes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list tax codes: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/vat201")
async def create_vat201_return(vat201: VAT201Create):
    """Create a new VAT201 return"""
    conn = await get_db_connection()
    
    try:
        output_tax = await conn.fetchval(
            """
            SELECT COALESCE(SUM(tax_amount), 0)
            FROM vat_transactions
            WHERE company_id = $1 AND vat_period = $2 AND tax_type = 'output'
            """,
            vat201.company_id, vat201.period
        ) or Decimal('0')
        
        input_tax = await conn.fetchval(
            """
            SELECT COALESCE(SUM(tax_amount), 0)
            FROM vat_transactions
            WHERE company_id = $1 AND vat_period = $2 AND tax_type = 'input'
            """,
            vat201.company_id, vat201.period
        ) or Decimal('0')
        
        net_vat = output_tax - input_tax
        vat_payable = net_vat if net_vat > 0 else Decimal('0')
        vat_refundable = abs(net_vat) if net_vat < 0 else Decimal('0')
        
        new_vat201 = await conn.fetchrow(
            """
            INSERT INTO vat_returns 
            (company_id, period, period_start_date, period_end_date,
             output_tax, input_tax, vat_payable, vat_refundable, net_vat)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, period, status, net_vat, created_at
            """,
            vat201.company_id, vat201.period, vat201.period_start_date, vat201.period_end_date,
            output_tax, input_tax, vat_payable, vat_refundable, net_vat
        )
        
        return {
            "status": "success",
            "message": f"VAT201 return for {vat201.period} created successfully",
            "vat201": {
                "id": str(new_vat201['id']),
                "period": new_vat201['period'],
                "status": new_vat201['status'],
                "output_tax": float(output_tax),
                "input_tax": float(input_tax),
                "net_vat": float(new_vat201['net_vat']),
                "created_at": new_vat201['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating VAT201: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create VAT201: {str(e)}")
    finally:
        await conn.close()


@router.get("/vat201")
async def list_vat201_returns(
    company_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List VAT201 returns"""
    conn = await get_db_connection()
    
    try:
        if status:
            returns = await conn.fetch(
                """
                SELECT id, period, period_start_date, period_end_date, status,
                       output_tax, input_tax, net_vat, submitted_at, created_at
                FROM vat_returns
                WHERE company_id = $1 AND status = $2
                ORDER BY period DESC
                LIMIT $3
                """,
                company_id, status, limit
            )
        else:
            returns = await conn.fetch(
                """
                SELECT id, period, period_start_date, period_end_date, status,
                       output_tax, input_tax, net_vat, submitted_at, created_at
                FROM vat_returns
                WHERE company_id = $1
                ORDER BY period DESC
                LIMIT $2
                """,
                company_id, limit
            )
        
        return {
            "vat201_returns": [
                {
                    "id": str(r['id']),
                    "period": r['period'],
                    "period_start_date": r['period_start_date'].isoformat(),
                    "period_end_date": r['period_end_date'].isoformat(),
                    "status": r['status'],
                    "output_tax": float(r['output_tax']),
                    "input_tax": float(r['input_tax']),
                    "net_vat": float(r['net_vat']),
                    "submitted_at": r['submitted_at'].isoformat() if r['submitted_at'] else None,
                    "created_at": r['created_at'].isoformat()
                }
                for r in returns
            ],
            "total": len(returns)
        }
    
    except Exception as e:
        logger.error(f"Error listing VAT201 returns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list VAT201 returns: {str(e)}")
    finally:
        await conn.close()


@router.post("/vat201/{vat201_id}/submit")
async def submit_vat201_return(vat201_id: str, submitted_by: str):
    """Submit a VAT201 return"""
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            """
            UPDATE vat_returns
            SET status = 'submitted', submitted_by = $2, submitted_at = NOW(), updated_at = NOW()
            WHERE id = $1
            """,
            vat201_id, submitted_by
        )
        
        return {
            "status": "success",
            "message": "VAT201 return submitted successfully"
        }
    
    except Exception as e:
        logger.error(f"Error submitting VAT201: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit VAT201: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/emp201")
async def create_emp201_return(emp201: EMP201Create):
    """Create a new EMP201 return"""
    conn = await get_db_connection()
    
    try:
        paye_amount = Decimal('0')  # TODO: Calculate from payroll
        uif_employee = Decimal('0')  # TODO: Calculate from payroll
        uif_employer = Decimal('0')  # TODO: Calculate from payroll
        sdl_amount = Decimal('0')  # TODO: Calculate from payroll
        
        uif_total = uif_employee + uif_employer
        total_amount = paye_amount + uif_total + sdl_amount
        
        new_emp201 = await conn.fetchrow(
            """
            INSERT INTO emp201_returns 
            (company_id, period, period_start_date, period_end_date,
             paye_amount, uif_employee, uif_employer, uif_total, sdl_amount, total_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, period, status, total_amount, created_at
            """,
            emp201.company_id, emp201.period, emp201.period_start_date, emp201.period_end_date,
            paye_amount, uif_employee, uif_employer, uif_total, sdl_amount, total_amount
        )
        
        return {
            "status": "success",
            "message": f"EMP201 return for {emp201.period} created successfully",
            "emp201": {
                "id": str(new_emp201['id']),
                "period": new_emp201['period'],
                "status": new_emp201['status'],
                "total_amount": float(new_emp201['total_amount']),
                "created_at": new_emp201['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating EMP201: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create EMP201: {str(e)}")
    finally:
        await conn.close()


@router.get("/emp201")
async def list_emp201_returns(
    company_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List EMP201 returns"""
    conn = await get_db_connection()
    
    try:
        if status:
            returns = await conn.fetch(
                """
                SELECT id, period, period_start_date, period_end_date, status,
                       paye_amount, uif_total, sdl_amount, total_amount, submitted_at, created_at
                FROM emp201_returns
                WHERE company_id = $1 AND status = $2
                ORDER BY period DESC
                LIMIT $3
                """,
                company_id, status, limit
            )
        else:
            returns = await conn.fetch(
                """
                SELECT id, period, period_start_date, period_end_date, status,
                       paye_amount, uif_total, sdl_amount, total_amount, submitted_at, created_at
                FROM emp201_returns
                WHERE company_id = $1
                ORDER BY period DESC
                LIMIT $2
                """,
                company_id, limit
            )
        
        return {
            "emp201_returns": [
                {
                    "id": str(r['id']),
                    "period": r['period'],
                    "period_start_date": r['period_start_date'].isoformat(),
                    "period_end_date": r['period_end_date'].isoformat(),
                    "status": r['status'],
                    "paye_amount": float(r['paye_amount']),
                    "uif_total": float(r['uif_total']),
                    "sdl_amount": float(r['sdl_amount']),
                    "total_amount": float(r['total_amount']),
                    "submitted_at": r['submitted_at'].isoformat() if r['submitted_at'] else None,
                    "created_at": r['created_at'].isoformat()
                }
                for r in returns
            ],
            "total": len(returns)
        }
    
    except Exception as e:
        logger.error(f"Error listing EMP201 returns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list EMP201 returns: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/period-close")
async def create_period_close(period_close: PeriodCloseCreate):
    """Create a new period close"""
    conn = await get_db_connection()
    
    try:
        new_period_close = await conn.fetchrow(
            """
            INSERT INTO period_close 
            (company_id, period, period_start_date, period_end_date, checklist)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, period, status, created_at
            """,
            period_close.company_id, period_close.period,
            period_close.period_start_date, period_close.period_end_date,
            period_close.checklist
        )
        
        return {
            "status": "success",
            "message": f"Period close for {period_close.period} created successfully",
            "period_close": {
                "id": str(new_period_close['id']),
                "period": new_period_close['period'],
                "status": new_period_close['status'],
                "created_at": new_period_close['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating period close: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create period close: {str(e)}")
    finally:
        await conn.close()


@router.get("/period-close")
async def list_period_closes(
    company_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List period closes"""
    conn = await get_db_connection()
    
    try:
        if status:
            periods = await conn.fetch(
                """
                SELECT id, period, period_start_date, period_end_date, status, is_locked, closed_at, created_at
                FROM period_close
                WHERE company_id = $1 AND status = $2
                ORDER BY period DESC
                LIMIT $3
                """,
                company_id, status, limit
            )
        else:
            periods = await conn.fetch(
                """
                SELECT id, period, period_start_date, period_end_date, status, is_locked, closed_at, created_at
                FROM period_close
                WHERE company_id = $1
                ORDER BY period DESC
                LIMIT $2
                """,
                company_id, limit
            )
        
        return {
            "period_closes": [
                {
                    "id": str(p['id']),
                    "period": p['period'],
                    "period_start_date": p['period_start_date'].isoformat(),
                    "period_end_date": p['period_end_date'].isoformat(),
                    "status": p['status'],
                    "is_locked": p['is_locked'],
                    "closed_at": p['closed_at'].isoformat() if p['closed_at'] else None,
                    "created_at": p['created_at'].isoformat()
                }
                for p in periods
            ],
            "total": len(periods)
        }
    
    except Exception as e:
        logger.error(f"Error listing period closes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list period closes: {str(e)}")
    finally:
        await conn.close()


@router.post("/period-close/{period_close_id}/close")
async def close_period(period_close_id: str, closed_by: str):
    """Close a period (lock it to prevent backdated postings)"""
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            """
            UPDATE period_close
            SET status = 'closed', is_locked = true, closed_by = $2, closed_at = NOW(), updated_at = NOW()
            WHERE id = $1
            """,
            period_close_id, closed_by
        )
        
        return {
            "status": "success",
            "message": "Period closed and locked successfully"
        }
    
    except Exception as e:
        logger.error(f"Error closing period: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to close period: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/bbbee/procurement")
async def get_bbbee_procurement_report(
    company_id: str,
    period: str
):
    """Get BBBEE procurement report for a period"""
    conn = await get_db_connection()
    
    try:
        procurement = await conn.fetch(
            """
            SELECT supplier_id, supplier_name, bbbee_level, procurement_spend,
                   recognition_percentage, recognized_spend
            FROM bbbee_procurement
            WHERE company_id = $1 AND period = $2
            ORDER BY procurement_spend DESC
            """,
            company_id, period
        )
        
        total_spend = sum(float(p['procurement_spend']) for p in procurement)
        total_recognized = sum(float(p['recognized_spend']) for p in procurement)
        
        return {
            "period": period,
            "total_spend": total_spend,
            "total_recognized_spend": total_recognized,
            "procurement": [
                {
                    "supplier_id": str(p['supplier_id']),
                    "supplier_name": p['supplier_name'],
                    "bbbee_level": p['bbbee_level'],
                    "procurement_spend": float(p['procurement_spend']),
                    "recognition_percentage": float(p['recognition_percentage']) if p['recognition_percentage'] else 0,
                    "recognized_spend": float(p['recognized_spend'])
                }
                for p in procurement
            ],
            "total": len(procurement)
        }
    
    except Exception as e:
        logger.error(f"Error getting BBBEE procurement report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get BBBEE report: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for VAT reporting module"""
    conn = await get_db_connection()
    
    try:
        tax_codes_count = await conn.fetchval("SELECT COUNT(*) FROM tax_codes WHERE is_active = true")
        vat201_count = await conn.fetchval("SELECT COUNT(*) FROM vat_returns")
        emp201_count = await conn.fetchval("SELECT COUNT(*) FROM emp201_returns")
        period_close_count = await conn.fetchval("SELECT COUNT(*) FROM period_close")
        
        return {
            "status": "healthy",
            "module": "vat_reporting",
            "tax_codes": tax_codes_count,
            "vat201_returns": vat201_count,
            "emp201_returns": emp201_count,
            "period_closes": period_close_count
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "vat_reporting",
            "error": str(e)
        }
    finally:
        await conn.close()
