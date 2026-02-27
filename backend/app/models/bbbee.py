"""
BBBEE Compliance Models

Database models for BBBEE (Broad-Based Black Economic Empowerment) compliance tracking.

Author: ARIA AI Platform
Date: October 2025
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Numeric
from sqlalchemy.orm import relationship
from core.database import Base


class BbbeeScorecard(Base):
    """BBBEE Scorecard for a company in a specific financial year"""
    
    __tablename__ = "bbbee_scorecards"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    financial_year = Column(Integer, nullable=False)
    
    # Overall scores
    total_score = Column(Float, nullable=False)  # Out of 109 points
    bbbee_level = Column(Integer, nullable=False)  # 1-8, or 9 for non-compliant
    procurement_recognition = Column(Float, nullable=False)  # Percentage (e.g., 135%)
    
    # Element scores
    ownership_score = Column(Float, default=0)  # Out of 25
    management_score = Column(Float, default=0)  # Out of 19
    skills_score = Column(Float, default=0)  # Out of 20
    esd_score = Column(Float, default=0)  # Enterprise & Supplier Development, out of 40
    sed_score = Column(Float, default=0)  # Socio-Economic Development, out of 5
    
    # Status
    compliance_status = Column(String(50))  # 'compliant', 'non-compliant'
    verification_status = Column(String(50), default="pending")  # 'pending', 'verified', 'expired'
    next_verification_date = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    calculated_by = Column(String(100))  # Bot or user who calculated
    
    # Relationships
    company = relationship("Company", back_populates="bbbee_scorecards")
    certificates = relationship("BbbeeCertificate", back_populates="scorecard")


class BbbeeCertificate(Base):
    """BBBEE Certificate from a verification agency"""
    
    __tablename__ = "bbbee_certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    scorecard_id = Column(Integer, ForeignKey("bbbee_scorecards.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Certificate details
    certificate_number = Column(String(100), unique=True)
    verification_agency = Column(String(200))  # SANAS-accredited agency
    issue_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Scores from certificate
    bbbee_level = Column(Integer)  # 1-8
    total_score = Column(Float)
    ownership_score = Column(Float)
    management_score = Column(Float)
    skills_score = Column(Float)
    esd_score = Column(Float)
    sed_score = Column(Float)
    
    # Document storage
    certificate_file_path = Column(String(500))  # Path to stored PDF
    certificate_file_url = Column(String(500))  # Public URL if applicable
    
    # Status
    status = Column(String(50), default="active")  # 'active', 'expired', 'revoked'
    verification_status = Column(String(50), default="unverified")  # 'unverified', 'verified', 'invalid'
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    company = relationship("Company", back_populates="bbbee_certificates")
    scorecard = relationship("BbbeeScorecard", back_populates="certificates")


class FinancialStatement(Base):
    """Financial Statement for BBBEE calculations"""
    
    __tablename__ = "financial_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    financial_year = Column(Integer, nullable=False)
    
    # Income Statement
    revenue = Column(Numeric(15, 2), default=0)
    cost_of_sales = Column(Numeric(15, 2), default=0)
    gross_profit = Column(Numeric(15, 2), default=0)
    operating_expenses = Column(Numeric(15, 2), default=0)
    net_profit_before_tax = Column(Numeric(15, 2), default=0)
    tax = Column(Numeric(15, 2), default=0)
    net_profit_after_tax = Column(Numeric(15, 2), default=0)
    
    # Balance Sheet
    total_assets = Column(Numeric(15, 2), default=0)
    total_liabilities = Column(Numeric(15, 2), default=0)
    total_equity = Column(Numeric(15, 2), default=0)
    
    # Payroll & HR
    total_payroll = Column(Numeric(15, 2), default=0)  # Total payroll expense
    number_of_employees = Column(Integer, default=0)
    
    # BBBEE-specific spend
    skills_development_spend = Column(Numeric(15, 2), default=0)  # Skills development investment
    supplier_development_spend = Column(Numeric(15, 2), default=0)  # Supplier development contribution
    enterprise_development_spend = Column(Numeric(15, 2), default=0)  # Enterprise development contribution
    socio_economic_development_spend = Column(Numeric(15, 2), default=0)  # SED contribution
    
    # Procurement (for supplier preferential procurement)
    total_procurement_spend = Column(Numeric(15, 2), default=0)
    black_owned_supplier_spend = Column(Numeric(15, 2), default=0)
    black_women_owned_supplier_spend = Column(Numeric(15, 2), default=0)
    qse_supplier_spend = Column(Numeric(15, 2), default=0)  # Qualifying Small Enterprise
    
    # Status
    audit_status = Column(String(50), default="unaudited")  # 'unaudited', 'reviewed', 'audited'
    auditor_name = Column(String(200))
    audit_date = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    prepared_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    company = relationship("Company", back_populates="financial_statements")


class Company(Base):
    """Company model extension for BBBEE"""
    
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    registration_number = Column(String(50), unique=True)  # CIPC registration number
    
    # Ownership
    black_ownership_percentage = Column(Float, default=0)  # % Black ownership
    black_women_ownership_percentage = Column(Float, default=0)  # % Black women ownership
    
    # Company size (for BBBEE category)
    annual_turnover = Column(Numeric(15, 2))  # Annual turnover in ZAR
    number_of_employees = Column(Integer, default=0)
    
    # BBBEE status
    current_bbbee_level = Column(Integer)  # 1-8, or null
    last_verification_date = Column(DateTime)
    next_verification_due = Column(DateTime)
    
    # Contact
    email = Column(String(100))
    phone = Column(String(20))
    address = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    bbbee_scorecards = relationship("BbbeeScorecard", back_populates="company")
    bbbee_certificates = relationship("BbbeeCertificate", back_populates="company")
    financial_statements = relationship("FinancialStatement", back_populates="company")


class BbbeeAlert(Base):
    """Compliance alerts for BBBEE verification deadlines and issues"""
    
    __tablename__ = "bbbee_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Alert details
    alert_type = Column(String(50))  # 'verification_due', 'non_compliant', 'certificate_expiring'
    severity = Column(String(20))  # 'low', 'medium', 'high', 'critical'
    title = Column(String(200))
    message = Column(Text)
    
    # Status
    status = Column(String(50), default="active")  # 'active', 'acknowledged', 'resolved'
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)  # When action is required
    
    # Relationships
    company = relationship("Company")
