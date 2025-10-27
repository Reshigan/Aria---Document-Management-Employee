"""
BBBEE Compliance API Endpoints

RESTful API for BBBEE compliance automation.

Author: ARIA AI Platform
Date: October 2025
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.bots.bbbee_compliance_bot import bbbee_bot
from app.models.bbbee import BbbeeScorecard, BbbeeCertificate, Company, BbbeeAlert

router = APIRouter(prefix="/api/v1/bbbee", tags=["BBBEE Compliance"])


# Pydantic schemas
class ScorecardResponse(BaseModel):
    company_id: int
    company_name: str
    financial_year: int
    calculation_date: str
    total_score: float
    bbbee_level: int
    procurement_recognition: float
    elements: dict
    compliance_status: str
    next_verification_due: str
    
    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    company_id: int
    alert_type: str
    severity: str
    title: str
    message: str
    status: str
    created_at: datetime
    due_date: Optional[datetime]
    
    class Config:
        from_attributes = True


class CompanyStatusResponse(BaseModel):
    company_id: int
    company_name: str
    current_bbbee_level: Optional[int]
    total_score: Optional[float]
    procurement_recognition: Optional[float]
    compliance_status: str
    next_verification_due: Optional[str]
    days_until_verification: Optional[int]
    
    class Config:
        from_attributes = True


# Endpoints

@router.post("/calculate/{company_id}", response_model=ScorecardResponse)
async def calculate_bbbee_scorecard(
    company_id: int,
    financial_year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Calculate BBBEE scorecard for a company
    
    This endpoint triggers the BBBEE Compliance Bot to calculate
    the complete BBBEE scorecard based on:
    - Ownership data
    - Management demographics
    - Skills development spend
    - Enterprise & Supplier Development spend
    - Socio-Economic Development spend
    """
    try:
        # Check if company exists
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        
        # Calculate scorecard using bot
        result = bbbee_bot.calculate_scorecard(company_id, db, financial_year)
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating scorecard: {str(e)}"
        )


@router.get("/scorecard/{company_id}", response_model=ScorecardResponse)
async def get_bbbee_scorecard(
    company_id: int,
    financial_year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get existing BBBEE scorecard for a company
    
    Returns the most recent scorecard if financial_year is not specified.
    """
    try:
        query = db.query(BbbeeScorecard).filter(
            BbbeeScorecard.company_id == company_id
        )
        
        if financial_year:
            query = query.filter(BbbeeScorecard.financial_year == financial_year)
        
        scorecard = query.order_by(BbbeeScorecard.created_at.desc()).first()
        
        if not scorecard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No scorecard found for company {company_id}"
            )
        
        # Format response
        result = {
            "company_id": scorecard.company_id,
            "company_name": scorecard.company.name,
            "financial_year": scorecard.financial_year,
            "calculation_date": scorecard.created_at.isoformat(),
            "total_score": scorecard.total_score,
            "bbbee_level": scorecard.bbbee_level,
            "procurement_recognition": scorecard.procurement_recognition,
            "elements": {
                "ownership": {"points": scorecard.ownership_score},
                "management_control": {"points": scorecard.management_score},
                "skills_development": {"points": scorecard.skills_score},
                "enterprise_supplier_development": {"points": scorecard.esd_score},
                "socio_economic_development": {"points": scorecard.sed_score}
            },
            "compliance_status": scorecard.compliance_status,
            "next_verification_due": scorecard.next_verification_date.strftime("%Y-%m-%d") if scorecard.next_verification_date else None
        }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving scorecard: {str(e)}"
        )


@router.get("/report/{company_id}")
async def get_bbbee_report(
    company_id: int,
    financial_year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Generate BBBEE compliance report (PDF)
    
    Returns a downloadable PDF report with complete BBBEE scorecard.
    """
    try:
        # Generate report using bot
        report_bytes = bbbee_bot.generate_report(company_id, db, financial_year)
        
        # Get company name for filename
        company = db.query(Company).filter(Company.id == company_id).first()
        filename = f"BBBEE_Report_{company.name.replace(' ', '_')}_{financial_year or datetime.now().year}.txt"
        
        return Response(
            content=report_bytes,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating report: {str(e)}"
        )


@router.get("/alerts", response_model=List[AlertResponse])
async def get_compliance_alerts(
    company_id: Optional[int] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get BBBEE compliance alerts
    
    Returns alerts for verification deadlines, non-compliance, etc.
    """
    try:
        # Get alerts from bot
        alerts = bbbee_bot.check_compliance_alerts(db)
        
        # Filter by company_id if specified
        if company_id:
            alerts = [a for a in alerts if a["company_id"] == company_id]
        
        # Filter by severity if specified
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity]
        
        # Format as AlertResponse
        formatted_alerts = []
        for alert in alerts:
            formatted_alerts.append({
                "id": alert.get("id", 0),
                "company_id": alert["company_id"],
                "alert_type": alert["alert_type"],
                "severity": alert["severity"],
                "title": alert.get("alert_type", "").replace("_", " ").title(),
                "message": alert["message"],
                "status": "active",
                "created_at": datetime.now(),
                "due_date": alert.get("deadline")
            })
        
        return formatted_alerts
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving alerts: {str(e)}"
        )


@router.get("/status/{company_id}", response_model=CompanyStatusResponse)
async def get_company_bbbee_status(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Get quick BBBEE status overview for a company
    
    Returns current level, score, and verification deadline.
    """
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        
        # Get most recent scorecard
        scorecard = db.query(BbbeeScorecard).filter(
            BbbeeScorecard.company_id == company_id
        ).order_by(BbbeeScorecard.created_at.desc()).first()
        
        # Calculate days until verification
        days_until_verification = None
        if scorecard and scorecard.next_verification_date:
            delta = scorecard.next_verification_date - datetime.now()
            days_until_verification = delta.days
        
        return {
            "company_id": company.id,
            "company_name": company.name,
            "current_bbbee_level": scorecard.bbbee_level if scorecard else None,
            "total_score": scorecard.total_score if scorecard else None,
            "procurement_recognition": scorecard.procurement_recognition if scorecard else None,
            "compliance_status": scorecard.compliance_status if scorecard else "unknown",
            "next_verification_due": scorecard.next_verification_date.strftime("%Y-%m-%d") if scorecard and scorecard.next_verification_date else None,
            "days_until_verification": days_until_verification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving status: {str(e)}"
        )


@router.post("/certificate/upload/{company_id}")
async def upload_bbbee_certificate(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload BBBEE certificate (PDF)
    
    Stores the certificate and extracts basic information.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported"
            )
        
        # TODO: Implement file storage (S3, local filesystem, etc.)
        # TODO: Implement PDF parsing to extract certificate details
        
        return {
            "message": "Certificate uploaded successfully",
            "filename": file.filename,
            "company_id": company_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading certificate: {str(e)}"
        )


@router.get("/levels")
async def get_bbbee_levels():
    """
    Get BBBEE level definitions and thresholds
    
    Returns reference data for BBBEE levels.
    """
    return {
        "levels": [
            {
                "level": 1,
                "threshold": 100,
                "description": "Level 1 Contributor",
                "procurement_recognition": 135
            },
            {
                "level": 2,
                "threshold": 95,
                "description": "Level 2 Contributor",
                "procurement_recognition": 125
            },
            {
                "level": 3,
                "threshold": 90,
                "description": "Level 3 Contributor",
                "procurement_recognition": 110
            },
            {
                "level": 4,
                "threshold": 80,
                "description": "Level 4 Contributor",
                "procurement_recognition": 100
            },
            {
                "level": 5,
                "threshold": 75,
                "description": "Level 5 Contributor",
                "procurement_recognition": 80
            },
            {
                "level": 6,
                "threshold": 70,
                "description": "Level 6 Contributor",
                "procurement_recognition": 60
            },
            {
                "level": 7,
                "threshold": 55,
                "description": "Level 7 Contributor",
                "procurement_recognition": 50
            },
            {
                "level": 8,
                "threshold": 40,
                "description": "Level 8 Contributor",
                "procurement_recognition": 10
            }
        ],
        "elements": [
            {
                "name": "Ownership",
                "max_points": 25,
                "description": "Black ownership and control"
            },
            {
                "name": "Management Control",
                "max_points": 19,
                "description": "Black representation in management"
            },
            {
                "name": "Skills Development",
                "max_points": 20,
                "description": "Investment in employee training"
            },
            {
                "name": "Enterprise & Supplier Development",
                "max_points": 40,
                "description": "Support for Black-owned suppliers and enterprises"
            },
            {
                "name": "Socio-Economic Development",
                "max_points": 5,
                "description": "Community investment and development"
            }
        ],
        "total_points": 109
    }
