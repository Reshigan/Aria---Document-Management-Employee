"""
CRM Models - Sales Pipeline, Leads, Opportunities
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from .base import Base


class LeadStatus(str, Enum):
    """Lead Status"""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"
    CONVERTED = "converted"
    LOST = "lost"


class LeadSource(str, Enum):
    """Lead Source"""
    WEBSITE = "website"
    REFERRAL = "referral"
    COLD_CALL = "cold_call"
    EMAIL = "email"
    SOCIAL_MEDIA = "social_media"
    TRADE_SHOW = "trade_show"
    PARTNER = "partner"
    OTHER = "other"


class OpportunityStage(str, Enum):
    """Sales Opportunity Stage"""
    PROSPECTING = "prospecting"
    QUALIFICATION = "qualification"
    NEEDS_ANALYSIS = "needs_analysis"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class QuoteStatus(str, Enum):
    """Quote Status"""
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class Lead(Base):
    """
    Sales Lead
    """
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Lead identification
    lead_number = Column(String(50), nullable=False, unique=True, index=True)
    
    # Contact information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    company_name = Column(String(200))
    job_title = Column(String(100))
    
    # Contact details
    email = Column(String(200), index=True)
    phone = Column(String(50))
    mobile = Column(String(50))
    
    # Address
    address_line1 = Column(String(200))
    city = Column(String(100))
    province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Africa")
    
    # Lead details
    lead_source = Column(SQLEnum(LeadSource), nullable=False)
    status = Column(SQLEnum(LeadStatus), default=LeadStatus.NEW, index=True)
    
    # Qualification
    estimated_value = Column(Float, default=0.0)
    estimated_close_date = Column(DateTime)
    
    # Assignment
    assigned_to = Column(String(100), index=True)
    
    # Conversion
    is_converted = Column(Boolean, default=False)
    converted_to_customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    converted_to_opportunity_id = Column(Integer, nullable=True)
    converted_at = Column(DateTime)
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    activities = relationship("CRMActivity", back_populates="lead", foreign_keys="CRMActivity.lead_id")
    
    def __repr__(self):
        return f"<Lead {self.lead_number} - {self.first_name} {self.last_name}>"


class Opportunity(Base):
    """
    Sales Opportunity
    """
    __tablename__ = "opportunities"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Opportunity identification
    opportunity_number = Column(String(50), nullable=False, unique=True, index=True)
    opportunity_name = Column(String(200), nullable=False)
    
    # Customer
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    contact_person = Column(String(200))
    
    # Opportunity details
    stage = Column(SQLEnum(OpportunityStage), default=OpportunityStage.PROSPECTING, index=True)
    probability = Column(Float, default=0.0)  # 0-100%
    
    # Financial
    estimated_value = Column(Float, nullable=False)
    estimated_close_date = Column(DateTime, index=True)
    actual_close_date = Column(DateTime)
    
    # Assignment
    assigned_to = Column(String(100), index=True)
    
    # Source
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    lead_source = Column(SQLEnum(LeadSource))
    
    # Closure
    is_closed = Column(Boolean, default=False)
    is_won = Column(Boolean, default=False)
    close_reason = Column(Text)
    
    # Products/Services
    description = Column(Text)
    
    # Conversion
    converted_to_sale_id = Column(Integer, nullable=True)  # Sales order
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    activities = relationship("CRMActivity", back_populates="opportunity", foreign_keys="CRMActivity.opportunity_id")
    quotes = relationship("Quote", back_populates="opportunity")
    
    def __repr__(self):
        return f"<Opportunity {self.opportunity_number} - {self.opportunity_name} - R{self.estimated_value:.2f}>"


class Quote(Base):
    """
    Sales Quotation
    """
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Quote identification
    quote_number = Column(String(50), nullable=False, unique=True, index=True)
    quote_name = Column(String(200))
    
    # Customer
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    
    # Dates
    quote_date = Column(DateTime, nullable=False, index=True)
    valid_until = Column(DateTime, nullable=False, index=True)
    
    # Amounts
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    vat_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Status
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.DRAFT, index=True)
    
    # Terms
    payment_terms = Column(Text)
    delivery_terms = Column(Text)
    notes = Column(Text)
    
    # Conversion
    converted_to_invoice_id = Column(Integer, nullable=True)
    converted_at = Column(DateTime)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    opportunity = relationship("Opportunity", back_populates="quotes")
    lines = relationship("QuoteLine", back_populates="quote", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Quote {self.quote_number} - R{self.total_amount:.2f}>"


class QuoteLine(Base):
    """
    Quote Line Items
    """
    __tablename__ = "quote_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Quote reference
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    line_number = Column(Integer, default=1)
    
    # Product
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(500), nullable=False)
    
    # Quantities
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    
    # Amounts
    line_total = Column(Float, nullable=False)
    discount_percentage = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    
    # VAT
    vat_rate = Column(Float, default=15.0)
    vat_amount = Column(Float, default=0.0)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    quote = relationship("Quote", back_populates="lines")
    
    def __repr__(self):
        return f"<QuoteLine {self.line_number} - {self.description} - R{self.line_total:.2f}>"


class CRMActivityType(str, Enum):
    """CRM Activity Types"""
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    TASK = "task"
    NOTE = "note"
    WHATSAPP = "whatsapp"


class CRMActivity(Base):
    """
    CRM Activity Log (calls, emails, meetings, notes)
    """
    __tablename__ = "crm_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Activity details
    activity_type = Column(SQLEnum(CRMActivityType), nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Related to
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    
    # Scheduling
    scheduled_at = Column(DateTime, index=True)
    completed_at = Column(DateTime)
    is_completed = Column(Boolean, default=False)
    
    # Assignment
    assigned_to = Column(String(100), index=True)
    
    # Outcome
    outcome = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    lead = relationship("Lead", back_populates="activities", foreign_keys=[lead_id])
    opportunity = relationship("Opportunity", back_populates="activities", foreign_keys=[opportunity_id])
    
    def __repr__(self):
        return f"<CRMActivity {self.activity_type} - {self.subject}>"


class Pipeline(Base):
    """
    Sales Pipeline Configuration
    """
    __tablename__ = "pipelines"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Pipeline details
    pipeline_name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Status
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Pipeline {self.pipeline_name}>"
