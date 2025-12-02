"""
Comprehensive Reports API
Provides endpoints for all financial and operational reports
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from app.dependencies import get_current_user
from app.services.financial_reports import financial_reports_service

router = APIRouter(prefix="/api/reports", tags=["Comprehensive Reports"])


@router.get("/financial/balance-sheet")
async def get_balance_sheet(
    as_of_date: Optional[str] = Query(None, description="Report date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """Get Balance Sheet report"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        if not as_of_date:
            as_of_date = datetime.now().strftime("%Y-%m-%d")
        
        report = financial_reports_service.get_balance_sheet(company_id, as_of_date)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/financial/income-statement")
async def get_income_statement(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """Get Income Statement (P&L) report"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        
        report = financial_reports_service.get_income_statement(company_id, start_date, end_date)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/financial/cash-flow")
async def get_cash_flow_statement(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """Get Cash Flow Statement"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        
        report = financial_reports_service.get_cash_flow_statement(company_id, start_date, end_date)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/financial/trial-balance")
async def get_trial_balance(
    as_of_date: Optional[str] = Query(None, description="Report date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """Get Trial Balance report"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        if not as_of_date:
            as_of_date = datetime.now().strftime("%Y-%m-%d")
        
        report = financial_reports_service.get_trial_balance(company_id, as_of_date)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/financial/aged-debtors")
async def get_aged_debtors(
    as_of_date: Optional[str] = Query(None, description="Report date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """Get Aged Debtors (AR Aging) report"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        if not as_of_date:
            as_of_date = datetime.now().strftime("%Y-%m-%d")
        
        report = financial_reports_service.get_aged_debtors(company_id, as_of_date)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/financial/aged-creditors")
async def get_aged_creditors(
    as_of_date: Optional[str] = Query(None, description="Report date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """Get Aged Creditors (AP Aging) report"""
    try:
        company_id = current_user.get("organization_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID not found")
        
        if not as_of_date:
            as_of_date = datetime.now().strftime("%Y-%m-%d")
        
        report = financial_reports_service.get_aged_creditors(company_id, as_of_date)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")
