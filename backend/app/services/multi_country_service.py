"""
Multi-Country Service
Handles country-specific tax calculations, statutory compliance, and document formatting
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..data.country_data import (
    COUNTRY_CONFIGS, TAX_RULES, STATUTORY_RULES, DOCUMENT_FORMATS,
    get_country_config, get_tax_rules, get_statutory_rules, get_document_formats,
    get_all_countries, get_countries_by_region
)

logger = logging.getLogger(__name__)


class MultiCountryService:
    """Service for managing multi-country tax, compliance, and document requirements"""
    
    def __init__(self, db: Session = None):
        self.db = db
    
    # Country Configuration
    def get_supported_countries(self) -> List[Dict[str, Any]]:
        """Get list of all supported countries for registration"""
        countries = []
        for config in COUNTRY_CONFIGS:
            countries.append({
                "country_code": config["country_code"],
                "country_name": config["country_name"],
                "currency_code": config["currency_code"],
                "currency_symbol": config["currency_symbol"],
                "region": config.get("region"),
                "tax_system": config.get("tax_system"),
                "date_format": config.get("date_format"),
                "language_code": config.get("language_code")
            })
        return sorted(countries, key=lambda x: x["country_name"])
    
    def get_country_details(self, country_code: str) -> Optional[Dict[str, Any]]:
        """Get full details for a specific country"""
        config = get_country_config(country_code)
        if not config:
            return None
        
        return {
            **config,
            "tax_rules": get_tax_rules(country_code),
            "statutory_rules": get_statutory_rules(country_code),
            "document_formats": get_document_formats(country_code)
        }
    
    def get_countries_by_region(self, region: str) -> List[Dict[str, Any]]:
        """Get countries filtered by region"""
        return get_countries_by_region(region)
    
    # Tax Calculations
    def calculate_tax(
        self,
        country_code: str,
        amount: Decimal,
        tax_code: str = None,
        is_inclusive: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate tax for a given amount based on country rules
        
        Args:
            country_code: ISO country code
            amount: Transaction amount
            tax_code: Specific tax code (e.g., "VAT_STD", "GST")
            is_inclusive: Whether amount includes tax
            
        Returns:
            Tax calculation result with breakdown
        """
        tax_rules = get_tax_rules(country_code)
        if not tax_rules:
            return {
                "status": "error",
                "error": f"No tax rules found for country: {country_code}"
            }
        
        # Find the applicable tax rule
        applicable_rule = None
        if tax_code:
            for rule in tax_rules:
                if rule["tax_code"] == tax_code:
                    applicable_rule = rule
                    break
        else:
            # Use standard rate by default
            for rule in tax_rules:
                if rule.get("tax_category") == "STANDARD":
                    applicable_rule = rule
                    break
            if not applicable_rule:
                applicable_rule = tax_rules[0]
        
        if not applicable_rule:
            return {
                "status": "error",
                "error": f"Tax code '{tax_code}' not found for country: {country_code}"
            }
        
        rate = Decimal(str(applicable_rule["rate"]))
        
        if is_inclusive:
            # Extract tax from inclusive amount
            net_amount = amount / (1 + rate / 100)
            tax_amount = amount - net_amount
            gross_amount = amount
        else:
            # Add tax to net amount
            net_amount = amount
            tax_amount = amount * rate / 100
            gross_amount = amount + tax_amount
        
        return {
            "status": "success",
            "country_code": country_code,
            "tax_code": applicable_rule["tax_code"],
            "tax_name": applicable_rule["tax_name"],
            "tax_type": applicable_rule["tax_type"],
            "rate": float(rate),
            "net_amount": round(float(net_amount), 2),
            "tax_amount": round(float(tax_amount), 2),
            "gross_amount": round(float(gross_amount), 2),
            "is_inclusive": is_inclusive,
            "tax_authority": applicable_rule.get("tax_authority_name"),
            "filing_frequency": applicable_rule.get("filing_frequency")
        }
    
    def get_tax_rates(self, country_code: str) -> List[Dict[str, Any]]:
        """Get all tax rates for a country"""
        tax_rules = get_tax_rules(country_code)
        rates = []
        for rule in tax_rules:
            rates.append({
                "tax_code": rule["tax_code"],
                "tax_name": rule["tax_name"],
                "tax_type": rule["tax_type"],
                "tax_category": rule.get("tax_category"),
                "rate": float(rule["rate"]),
                "rate_reduced": float(rule["rate_reduced"]) if rule.get("rate_reduced") else None,
                "rate_super_reduced": float(rule["rate_super_reduced"]) if rule.get("rate_super_reduced") else None,
                "is_active": rule.get("is_active", True)
            })
        return rates
    
    def get_registration_threshold(self, country_code: str, tax_type: str = "VAT") -> Optional[Dict[str, Any]]:
        """Get tax registration threshold for a country"""
        tax_rules = get_tax_rules(country_code)
        for rule in tax_rules:
            if rule.get("tax_category") == "STANDARD" or rule["tax_type"] == tax_type:
                if rule.get("registration_threshold"):
                    return {
                        "threshold": float(rule["registration_threshold"]),
                        "currency": rule.get("registration_threshold_currency"),
                        "tax_type": rule["tax_type"],
                        "tax_authority": rule.get("tax_authority_name")
                    }
        return None
    
    def get_filing_requirements(self, country_code: str) -> List[Dict[str, Any]]:
        """Get tax filing requirements for a country"""
        tax_rules = get_tax_rules(country_code)
        requirements = []
        seen = set()
        
        for rule in tax_rules:
            key = f"{rule['tax_type']}_{rule.get('filing_frequency')}"
            if key not in seen:
                seen.add(key)
                requirements.append({
                    "tax_type": rule["tax_type"],
                    "tax_name": rule["tax_name"],
                    "filing_frequency": rule.get("filing_frequency"),
                    "filing_deadline_days": rule.get("filing_deadline_days"),
                    "payment_deadline_days": rule.get("payment_deadline_days"),
                    "tax_authority": rule.get("tax_authority_name"),
                    "tax_authority_website": rule.get("tax_authority_website")
                })
        return requirements
    
    # Statutory Compliance
    def get_statutory_requirements(self, country_code: str, category: str = None) -> List[Dict[str, Any]]:
        """Get statutory requirements for a country"""
        rules = get_statutory_rules(country_code)
        if category:
            rules = [r for r in rules if r.get("rule_category") == category]
        return rules
    
    def get_labor_requirements(self, country_code: str) -> Dict[str, Any]:
        """Get labor law requirements for a country"""
        rules = get_statutory_rules(country_code)
        labor_rules = [r for r in rules if r.get("rule_category") == "LABOR"]
        
        result = {
            "country_code": country_code,
            "rules": labor_rules,
            "summary": {}
        }
        
        # Extract key labor metrics
        for rule in labor_rules:
            requirements = rule.get("requirements", {})
            thresholds = rule.get("thresholds", {})
            
            if "max_ordinary_hours_week" in requirements:
                result["summary"]["max_weekly_hours"] = requirements["max_ordinary_hours_week"]
            if "annual_leave_days" in requirements:
                result["summary"]["annual_leave_days"] = requirements["annual_leave_days"]
            if "annual_leave_weeks" in requirements:
                result["summary"]["annual_leave_weeks"] = requirements["annual_leave_weeks"]
            if "overtime_rate_multiplier" in requirements:
                result["summary"]["overtime_multiplier"] = requirements["overtime_rate_multiplier"]
            if "maternity_leave_months" in requirements:
                result["summary"]["maternity_leave_months"] = requirements["maternity_leave_months"]
            if "maternity_leave_weeks" in requirements:
                result["summary"]["maternity_leave_weeks"] = requirements["maternity_leave_weeks"]
            
            # Thresholds
            for key, value in thresholds.items():
                result["summary"][key] = value
        
        return result
    
    def get_data_protection_requirements(self, country_code: str) -> Dict[str, Any]:
        """Get data protection/privacy requirements for a country"""
        rules = get_statutory_rules(country_code)
        dp_rules = [r for r in rules if r.get("rule_category") == "DATA_PROTECTION"]
        
        result = {
            "country_code": country_code,
            "rules": dp_rules,
            "frameworks": [],
            "requirements": {}
        }
        
        for rule in dp_rules:
            if rule.get("compliance_frameworks"):
                result["frameworks"].extend(rule["compliance_frameworks"])
            if rule.get("requirements"):
                result["requirements"].update(rule["requirements"])
            if rule.get("regulatory_authority"):
                result["regulatory_authority"] = rule["regulatory_authority"]
            if rule.get("authority_website"):
                result["authority_website"] = rule["authority_website"]
        
        result["frameworks"] = list(set(result["frameworks"]))
        return result
    
    def check_compliance_requirements(self, country_code: str, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check which compliance requirements apply to a company"""
        rules = get_statutory_rules(country_code)
        applicable_rules = []
        
        for rule in rules:
            is_applicable = True
            thresholds = rule.get("thresholds", {})
            requirements = rule.get("requirements", {})
            
            # Check revenue thresholds
            if "applies_to_revenue_threshold" in requirements:
                company_revenue = company_data.get("annual_revenue", 0)
                if company_revenue < requirements["applies_to_revenue_threshold"]:
                    is_applicable = False
            
            # Check employee thresholds
            if "pf_threshold_employees" in requirements:
                employee_count = company_data.get("employee_count", 0)
                if employee_count < requirements["pf_threshold_employees"]:
                    is_applicable = False
            
            if is_applicable:
                applicable_rules.append({
                    "rule_code": rule["rule_code"],
                    "rule_name": rule["rule_name"],
                    "rule_category": rule["rule_category"],
                    "is_mandatory": rule.get("is_mandatory", True),
                    "description": rule.get("description"),
                    "regulatory_authority": rule.get("regulatory_authority")
                })
        
        return {
            "country_code": country_code,
            "applicable_rules": applicable_rules,
            "total_rules": len(applicable_rules)
        }
    
    # Document Formatting
    def get_document_requirements(self, country_code: str, document_type: str = None) -> List[Dict[str, Any]]:
        """Get document format requirements for a country"""
        formats = get_document_formats(country_code)
        if document_type:
            formats = [f for f in formats if f.get("document_type") == document_type]
        return formats
    
    def get_invoice_requirements(self, country_code: str) -> Dict[str, Any]:
        """Get invoice requirements for a country"""
        formats = get_document_formats(country_code)
        invoice_formats = [f for f in formats if "INVOICE" in f.get("document_type", "")]
        
        if not invoice_formats:
            return {
                "country_code": country_code,
                "status": "no_specific_requirements",
                "message": "No specific invoice requirements defined for this country"
            }
        
        # Use the first invoice format (usually the main one)
        fmt = invoice_formats[0]
        
        return {
            "country_code": country_code,
            "document_type": fmt["document_type"],
            "document_name": fmt["document_name"],
            "mandatory_fields": fmt.get("mandatory_fields", []),
            "numbering_format": fmt.get("numbering_format"),
            "numbering_rules": fmt.get("numbering_rules"),
            "tax_display_requirements": fmt.get("tax_display_requirements"),
            "language_requirements": fmt.get("language_requirements"),
            "e_invoicing_mandatory": fmt.get("e_invoicing_mandatory", False),
            "e_invoicing_platform": fmt.get("e_invoicing_platform"),
            "digital_signature_required": fmt.get("digital_signature_required", False),
            "retention_years": fmt.get("retention_years"),
            "legal_text_requirements": fmt.get("legal_text_requirements")
        }
    
    def validate_invoice(self, country_code: str, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate an invoice against country requirements"""
        requirements = self.get_invoice_requirements(country_code)
        
        if requirements.get("status") == "no_specific_requirements":
            return {"valid": True, "warnings": [], "errors": []}
        
        errors = []
        warnings = []
        
        # Check mandatory fields
        mandatory_fields = requirements.get("mandatory_fields", [])
        for field in mandatory_fields:
            if field not in invoice_data or not invoice_data[field]:
                errors.append(f"Missing mandatory field: {field}")
        
        # Check tax display requirements
        tax_reqs = requirements.get("tax_display_requirements", {})
        if tax_reqs.get("show_vat_number") and not invoice_data.get("supplier_vat_number"):
            errors.append("VAT/Tax registration number is required")
        if tax_reqs.get("show_gst_registration_number") and not invoice_data.get("supplier_gst_number"):
            errors.append("GST registration number is required")
        if tax_reqs.get("qr_code_required") and not invoice_data.get("qr_code"):
            errors.append("QR code is required for this country")
        
        # Check e-invoicing requirements
        if requirements.get("e_invoicing_mandatory"):
            warnings.append(f"E-invoicing is mandatory. Platform: {requirements.get('e_invoicing_platform')}")
        
        # Check digital signature
        if requirements.get("digital_signature_required") and not invoice_data.get("digital_signature"):
            errors.append("Digital signature is required for this country")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "requirements": requirements
        }
    
    def format_amount(self, country_code: str, amount: float) -> str:
        """Format amount according to country conventions"""
        config = get_country_config(country_code)
        if not config:
            return f"{amount:,.2f}"
        
        number_format = config.get("number_format", "1,234.56")
        currency_symbol = config.get("currency_symbol", "")
        
        # Format based on number format convention
        if number_format == "1.234,56":
            # European format
            formatted = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        elif number_format == "1 234,56":
            # French/Russian format
            formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",")
        elif number_format == "1'234.56":
            # Swiss format
            formatted = f"{amount:,.2f}".replace(",", "'")
        else:
            # US/UK format (default)
            formatted = f"{amount:,.2f}"
        
        return f"{currency_symbol}{formatted}"
    
    def format_date(self, country_code: str, dt: date) -> str:
        """Format date according to country conventions"""
        config = get_country_config(country_code)
        if not config:
            return dt.strftime("%Y-%m-%d")
        
        date_format = config.get("date_format", "DD/MM/YYYY")
        
        if date_format == "MM/DD/YYYY":
            return dt.strftime("%m/%d/%Y")
        elif date_format == "YYYY-MM-DD":
            return dt.strftime("%Y-%m-%d")
        else:
            # DD/MM/YYYY (default)
            return dt.strftime("%d/%m/%Y")
    
    # Company Setup
    def setup_company_for_country(self, country_code: str, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Set up a company with country-specific configurations
        Called during registration when user selects their country
        """
        config = get_country_config(country_code)
        if not config:
            return {
                "status": "error",
                "error": f"Country not supported: {country_code}"
            }
        
        # Get all relevant rules
        tax_rules = get_tax_rules(country_code)
        statutory_rules = get_statutory_rules(country_code)
        document_formats = get_document_formats(country_code)
        
        # Determine applicable tax codes
        applicable_tax_codes = []
        for rule in tax_rules:
            if rule.get("is_active", True):
                applicable_tax_codes.append({
                    "tax_code": rule["tax_code"],
                    "tax_name": rule["tax_name"],
                    "rate": float(rule["rate"]),
                    "tax_type": rule["tax_type"]
                })
        
        # Determine compliance requirements
        compliance_requirements = []
        for rule in statutory_rules:
            if rule.get("is_mandatory", True):
                compliance_requirements.append({
                    "rule_code": rule["rule_code"],
                    "rule_name": rule["rule_name"],
                    "category": rule["rule_category"],
                    "description": rule.get("description")
                })
        
        # Get invoice format
        invoice_format = self.get_invoice_requirements(country_code)
        
        return {
            "status": "success",
            "country_code": country_code,
            "country_name": config["country_name"],
            "company_settings": {
                "currency_code": config["currency_code"],
                "currency_symbol": config["currency_symbol"],
                "date_format": config.get("date_format"),
                "number_format": config.get("number_format"),
                "language_code": config.get("language_code"),
                "timezone": config.get("timezone"),
                "fiscal_year_start": config.get("fiscal_year_start"),
                "tax_system": config.get("tax_system")
            },
            "tax_configuration": {
                "tax_codes": applicable_tax_codes,
                "default_tax_code": applicable_tax_codes[0]["tax_code"] if applicable_tax_codes else None,
                "registration_threshold": self.get_registration_threshold(country_code),
                "filing_requirements": self.get_filing_requirements(country_code)
            },
            "compliance_requirements": compliance_requirements,
            "document_settings": {
                "invoice_format": invoice_format,
                "e_invoicing_required": invoice_format.get("e_invoicing_mandatory", False),
                "retention_years": invoice_format.get("retention_years", 7)
            },
            "labor_requirements": self.get_labor_requirements(country_code).get("summary", {}),
            "data_protection": self.get_data_protection_requirements(country_code)
        }
    
    def get_country_summary(self, country_code: str) -> Dict[str, Any]:
        """Get a summary of all country-specific settings"""
        config = get_country_config(country_code)
        if not config:
            return None
        
        tax_rules = get_tax_rules(country_code)
        standard_rate = None
        for rule in tax_rules:
            if rule.get("tax_category") == "STANDARD":
                standard_rate = rule["rate"]
                break
        
        return {
            "country_code": country_code,
            "country_name": config["country_name"],
            "currency": f"{config['currency_symbol']} ({config['currency_code']})",
            "tax_system": config.get("tax_system"),
            "standard_tax_rate": f"{standard_rate}%" if standard_rate else "N/A",
            "fiscal_year_start": config.get("fiscal_year_start"),
            "date_format": config.get("date_format"),
            "region": config.get("region"),
            "economic_bloc": config.get("economic_bloc")
        }


# Singleton instance
_multi_country_service = None


def get_multi_country_service(db: Session = None) -> MultiCountryService:
    """Get singleton MultiCountryService instance"""
    global _multi_country_service
    if _multi_country_service is None:
        _multi_country_service = MultiCountryService(db)
    return _multi_country_service
