"""
Multi-Country Configuration Models
Supports tax rules, statutory requirements, and document formats for 50+ countries
"""

from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class TaxSystem(str, enum.Enum):
    VAT = "VAT"  # Value Added Tax (EU, UK, SA, etc.)
    GST = "GST"  # Goods and Services Tax (Australia, NZ, India, Singapore)
    SALES_TAX = "SALES_TAX"  # Sales Tax (USA)
    CONSUMPTION_TAX = "CONSUMPTION_TAX"  # Japan
    IVA = "IVA"  # Impuesto al Valor Agregado (Spain, Mexico, Argentina)
    TVA = "TVA"  # Taxe sur la Valeur Ajoutee (France, Belgium)
    MWST = "MWST"  # Mehrwertsteuer (Germany, Austria, Switzerland)
    BTW = "BTW"  # Belasting over de Toegevoegde Waarde (Netherlands)
    NONE = "NONE"  # No indirect tax


class FilingFrequency(str, enum.Enum):
    MONTHLY = "MONTHLY"
    BI_MONTHLY = "BI_MONTHLY"
    QUARTERLY = "QUARTERLY"
    SEMI_ANNUAL = "SEMI_ANNUAL"
    ANNUAL = "ANNUAL"


class DateFormat(str, enum.Enum):
    DMY = "DD/MM/YYYY"  # Most of world
    MDY = "MM/DD/YYYY"  # USA
    YMD = "YYYY-MM-DD"  # ISO, China, Japan, Korea


class NumberFormat(str, enum.Enum):
    COMMA_DOT = "1,234.56"  # US, UK, Australia
    DOT_COMMA = "1.234,56"  # EU, South America
    SPACE_COMMA = "1 234,56"  # France, Russia
    APOSTROPHE_DOT = "1'234.56"  # Switzerland


class CountryConfig(Base):
    """Master country configuration table"""
    __tablename__ = "country_configs"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), unique=True, nullable=False, index=True)  # ISO 3166-1 alpha-2
    country_name = Column(String(100), nullable=False)
    currency_code = Column(String(3), nullable=False)  # ISO 4217
    currency_symbol = Column(String(10), nullable=False)
    currency_name = Column(String(50), nullable=False)
    
    # Regional grouping
    region = Column(String(50))  # Africa, Europe, Americas, Asia-Pacific, Middle East
    economic_bloc = Column(String(50))  # EU, SADC, NAFTA, ASEAN, GCC, etc.
    
    # Tax system
    tax_system = Column(SQLEnum(TaxSystem), nullable=False)
    fiscal_year_start = Column(String(5))  # MM-DD format (e.g., "01-01", "04-01")
    
    # Formatting
    date_format = Column(SQLEnum(DateFormat), default=DateFormat.DMY)
    number_format = Column(SQLEnum(NumberFormat), default=NumberFormat.COMMA_DOT)
    language_code = Column(String(5), default="en")  # ISO 639-1
    
    # Timezone
    timezone = Column(String(50))  # IANA timezone
    
    # Status
    is_active = Column(Boolean, default=True)
    is_supported = Column(Boolean, default=True)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tax_rules = relationship("CountryTaxRule", back_populates="country")
    statutory_rules = relationship("StatutoryRule", back_populates="country")
    document_formats = relationship("DocumentFormat", back_populates="country")


class CountryTaxRule(Base):
    """Tax rules per country - supports multiple tax types and rates"""
    __tablename__ = "country_tax_rules"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), ForeignKey('country_configs.country_code'), nullable=False, index=True)
    
    # Tax identification
    tax_code = Column(String(20), nullable=False)  # e.g., "VAT_STD", "GST", "SALES_CA"
    tax_name = Column(String(100), nullable=False)
    tax_name_local = Column(String(100))  # Name in local language
    
    # Tax type and category
    tax_type = Column(String(50), nullable=False)  # VAT, GST, SALES_TAX, WITHHOLDING, PAYROLL, etc.
    tax_category = Column(String(50))  # STANDARD, REDUCED, ZERO, EXEMPT, SUPER_REDUCED
    
    # Rates
    rate = Column(Numeric(6, 4), nullable=False)  # Percentage (e.g., 15.0000 for 15%)
    rate_reduced = Column(Numeric(6, 4))  # Reduced rate if applicable
    rate_super_reduced = Column(Numeric(6, 4))  # Super reduced rate (some EU countries)
    
    # Thresholds
    registration_threshold = Column(Numeric(15, 2))  # Annual turnover threshold for registration
    registration_threshold_currency = Column(String(3))
    
    # Filing requirements
    filing_frequency = Column(SQLEnum(FilingFrequency), default=FilingFrequency.MONTHLY)
    filing_deadline_days = Column(Integer, default=25)  # Days after period end
    payment_deadline_days = Column(Integer, default=25)
    
    # Special rules
    reverse_charge_applicable = Column(Boolean, default=False)
    reverse_charge_threshold = Column(Numeric(15, 2))
    place_of_supply_rules = Column(JSON)  # Complex rules for services
    
    # Validity
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    
    # Tax authority
    tax_authority_name = Column(String(200))
    tax_authority_code = Column(String(50))
    tax_authority_website = Column(String(500))
    
    # GL accounts (suggested)
    output_tax_account = Column(String(20))
    input_tax_account = Column(String(20))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    country = relationship("CountryConfig", back_populates="tax_rules")


class StatutoryRule(Base):
    """Statutory and compliance rules per country"""
    __tablename__ = "statutory_rules"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), ForeignKey('country_configs.country_code'), nullable=False, index=True)
    
    # Rule identification
    rule_code = Column(String(50), nullable=False)
    rule_name = Column(String(200), nullable=False)
    rule_category = Column(String(50), nullable=False)  # LABOR, PAYROLL, DATA_PROTECTION, REPORTING, CORPORATE
    
    # Description
    description = Column(Text)
    legal_reference = Column(String(200))  # Law/Act reference
    
    # Requirements
    requirements = Column(JSON)  # Detailed requirements as structured data
    
    # Thresholds and limits
    thresholds = Column(JSON)  # e.g., {"minimum_wage": 4500, "max_working_hours_week": 45}
    
    # Compliance deadlines
    filing_requirements = Column(JSON)  # What needs to be filed
    filing_frequency = Column(SQLEnum(FilingFrequency))
    filing_deadline = Column(String(100))  # Description of deadline
    
    # Penalties
    penalty_info = Column(JSON)  # Penalty structure for non-compliance
    
    # Related frameworks
    compliance_frameworks = Column(JSON)  # e.g., ["GDPR", "POPIA", "SOX"]
    
    # Authority
    regulatory_authority = Column(String(200))
    authority_website = Column(String(500))
    
    # Validity
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    
    # Status
    is_mandatory = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    country = relationship("CountryConfig", back_populates="statutory_rules")


class DocumentFormat(Base):
    """Document format requirements per country"""
    __tablename__ = "document_formats"

    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(2), ForeignKey('country_configs.country_code'), nullable=False, index=True)
    
    # Document type
    document_type = Column(String(50), nullable=False)  # INVOICE, CREDIT_NOTE, RECEIPT, PAYSLIP, etc.
    document_name = Column(String(100), nullable=False)
    document_name_local = Column(String(100))  # Name in local language
    
    # Mandatory fields
    mandatory_fields = Column(JSON)  # List of required fields
    
    # Numbering requirements
    numbering_format = Column(String(100))  # e.g., "INV-{YYYY}-{SEQ:6}"
    numbering_rules = Column(JSON)  # Sequential, per year, etc.
    
    # Content requirements
    header_requirements = Column(JSON)  # What must appear in header
    footer_requirements = Column(JSON)  # What must appear in footer
    tax_display_requirements = Column(JSON)  # How tax must be displayed
    
    # Language requirements
    language_requirements = Column(JSON)  # Required languages
    
    # Digital requirements
    digital_signature_required = Column(Boolean, default=False)
    electronic_format = Column(String(50))  # PDF, XML, UBL, etc.
    e_invoicing_mandatory = Column(Boolean, default=False)
    e_invoicing_platform = Column(String(100))  # Government platform if applicable
    
    # Retention
    retention_years = Column(Integer, default=7)
    
    # Legal text requirements
    legal_text_requirements = Column(JSON)  # Required legal disclaimers
    
    # Validity
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    country = relationship("CountryConfig", back_populates="document_formats")


# Add ForeignKey import
from sqlalchemy import ForeignKey
