"""
Multi-Country API Endpoints
Provides country selection, tax rules, statutory compliance, and document format APIs
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal

from ..services.multi_country_service import get_multi_country_service

router = APIRouter(prefix="/api/countries", tags=["Multi-Country Support"])


# Pydantic Models for Request/Response
class TaxCalculationRequest(BaseModel):
    country_code: str
    amount: float
    tax_code: Optional[str] = None
    is_inclusive: bool = False


class TaxCalculationResponse(BaseModel):
    status: str
    country_code: str
    tax_code: str
    tax_name: str
    tax_type: str
    rate: float
    net_amount: float
    tax_amount: float
    gross_amount: float
    is_inclusive: bool
    tax_authority: Optional[str] = None
    filing_frequency: Optional[str] = None


class InvoiceValidationRequest(BaseModel):
    country_code: str
    invoice_data: dict


class CompanySetupRequest(BaseModel):
    country_code: str
    company_name: str
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None


class CountryResponse(BaseModel):
    country_code: str
    country_name: str
    currency_code: str
    currency_symbol: str
    region: Optional[str] = None
    tax_system: Optional[str] = None
    date_format: Optional[str] = None
    language_code: Optional[str] = None


# Country Endpoints
@router.get("/", response_model=List[CountryResponse])
async def get_supported_countries():
    """
    Get list of all supported countries for registration.
    Returns countries sorted alphabetically by name.
    """
    service = get_multi_country_service()
    return service.get_supported_countries()


@router.get("/regions")
async def get_countries_by_region(region: str = Query(..., description="Region name (Africa, Europe, Americas, Asia-Pacific, Middle East)")):
    """Get countries filtered by region"""
    service = get_multi_country_service()
    countries = service.get_countries_by_region(region)
    if not countries:
        raise HTTPException(status_code=404, detail=f"No countries found for region: {region}")
    return countries


@router.get("/{country_code}")
async def get_country_details(country_code: str):
    """
    Get full details for a specific country including tax rules,
    statutory requirements, and document formats.
    """
    service = get_multi_country_service()
    details = service.get_country_details(country_code.upper())
    if not details:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_code}")
    return details


@router.get("/{country_code}/summary")
async def get_country_summary(country_code: str):
    """Get a summary of country-specific settings"""
    service = get_multi_country_service()
    summary = service.get_country_summary(country_code.upper())
    if not summary:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_code}")
    return summary


# Tax Endpoints
@router.get("/{country_code}/tax-rates")
async def get_tax_rates(country_code: str):
    """Get all tax rates for a specific country"""
    service = get_multi_country_service()
    rates = service.get_tax_rates(country_code.upper())
    if not rates:
        raise HTTPException(status_code=404, detail=f"No tax rates found for country: {country_code}")
    return rates


@router.post("/tax/calculate", response_model=TaxCalculationResponse)
async def calculate_tax(request: TaxCalculationRequest):
    """
    Calculate tax for a given amount based on country rules.
    
    - **country_code**: ISO 3166-1 alpha-2 country code (e.g., ZA, GB, US)
    - **amount**: Transaction amount
    - **tax_code**: Specific tax code (optional, defaults to standard rate)
    - **is_inclusive**: Whether amount includes tax (default: false)
    """
    service = get_multi_country_service()
    result = service.calculate_tax(
        country_code=request.country_code.upper(),
        amount=Decimal(str(request.amount)),
        tax_code=request.tax_code,
        is_inclusive=request.is_inclusive
    )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/{country_code}/registration-threshold")
async def get_registration_threshold(country_code: str, tax_type: str = "VAT"):
    """Get tax registration threshold for a country"""
    service = get_multi_country_service()
    threshold = service.get_registration_threshold(country_code.upper(), tax_type)
    if not threshold:
        return {"message": f"No registration threshold defined for {tax_type} in {country_code}"}
    return threshold


@router.get("/{country_code}/filing-requirements")
async def get_filing_requirements(country_code: str):
    """Get tax filing requirements for a country"""
    service = get_multi_country_service()
    requirements = service.get_filing_requirements(country_code.upper())
    if not requirements:
        raise HTTPException(status_code=404, detail=f"No filing requirements found for country: {country_code}")
    return requirements


# Statutory Compliance Endpoints
@router.get("/{country_code}/statutory-rules")
async def get_statutory_rules(
    country_code: str,
    category: Optional[str] = Query(None, description="Filter by category: LABOR, PAYROLL, DATA_PROTECTION, REPORTING, CORPORATE, COMPLIANCE")
):
    """Get statutory requirements for a country"""
    service = get_multi_country_service()
    rules = service.get_statutory_requirements(country_code.upper(), category)
    if not rules:
        return {"message": f"No statutory rules found for country: {country_code}", "rules": []}
    return {"country_code": country_code.upper(), "rules": rules}


@router.get("/{country_code}/labor-requirements")
async def get_labor_requirements(country_code: str):
    """Get labor law requirements for a country (working hours, leave, etc.)"""
    service = get_multi_country_service()
    requirements = service.get_labor_requirements(country_code.upper())
    return requirements


@router.get("/{country_code}/data-protection")
async def get_data_protection_requirements(country_code: str):
    """Get data protection/privacy requirements for a country"""
    service = get_multi_country_service()
    requirements = service.get_data_protection_requirements(country_code.upper())
    return requirements


@router.post("/{country_code}/check-compliance")
async def check_compliance_requirements(country_code: str, company_data: dict):
    """Check which compliance requirements apply to a company based on its characteristics"""
    service = get_multi_country_service()
    result = service.check_compliance_requirements(country_code.upper(), company_data)
    return result


# Document Format Endpoints
@router.get("/{country_code}/document-formats")
async def get_document_formats(
    country_code: str,
    document_type: Optional[str] = Query(None, description="Filter by document type: INVOICE, TAX_INVOICE, PAYSLIP, etc.")
):
    """Get document format requirements for a country"""
    service = get_multi_country_service()
    formats = service.get_document_requirements(country_code.upper(), document_type)
    if not formats:
        return {"message": f"No document formats found for country: {country_code}", "formats": []}
    return {"country_code": country_code.upper(), "formats": formats}


@router.get("/{country_code}/invoice-requirements")
async def get_invoice_requirements(country_code: str):
    """Get invoice requirements for a country"""
    service = get_multi_country_service()
    requirements = service.get_invoice_requirements(country_code.upper())
    return requirements


@router.post("/invoice/validate")
async def validate_invoice(request: InvoiceValidationRequest):
    """
    Validate an invoice against country-specific requirements.
    Returns validation result with errors and warnings.
    """
    service = get_multi_country_service()
    result = service.validate_invoice(request.country_code.upper(), request.invoice_data)
    return result


# Company Setup Endpoint
@router.post("/setup-company")
async def setup_company_for_country(request: CompanySetupRequest):
    """
    Set up a company with country-specific configurations.
    Called during registration when user selects their country.
    
    Returns all applicable tax codes, compliance requirements,
    document formats, and other country-specific settings.
    """
    service = get_multi_country_service()
    company_data = {
        "company_name": request.company_name,
        "annual_revenue": request.annual_revenue,
        "employee_count": request.employee_count
    }
    
    result = service.setup_company_for_country(request.country_code.upper(), company_data)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


# Formatting Endpoints
@router.get("/{country_code}/format-amount")
async def format_amount(country_code: str, amount: float):
    """Format an amount according to country conventions"""
    service = get_multi_country_service()
    formatted = service.format_amount(country_code.upper(), amount)
    return {"country_code": country_code.upper(), "amount": amount, "formatted": formatted}


@router.get("/{country_code}/format-date")
async def format_date(country_code: str, date_str: str):
    """Format a date according to country conventions"""
    from datetime import datetime
    service = get_multi_country_service()
    try:
        dt = datetime.fromisoformat(date_str).date()
        formatted = service.format_date(country_code.upper(), dt)
        return {"country_code": country_code.upper(), "date": date_str, "formatted": formatted}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format: YYYY-MM-DD")
