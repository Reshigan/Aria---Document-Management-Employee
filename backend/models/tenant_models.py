"""
Multi-Tenant SaaS Models - Organizations, Subscriptions, Billing
"""
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base

class SubscriptionPlan(str, enum.Enum):
    """Subscription plan types"""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"

class BillingModel(str, enum.Enum):
    """Billing models"""
    FIXED_MONTHLY = "fixed_monthly"
    USAGE_BASED = "usage_based"
    HYBRID = "hybrid"  # Fixed + overage
    CUSTOM = "custom"

class OrganizationStatus(str, enum.Enum):
    """Organization status"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    CANCELLED = "cancelled"

# ============================================================================
# ORGANIZATIONS (TENANTS)
# ============================================================================

class Organization(Base):
    """Multi-tenant organizations (customers)"""
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)  # URL-safe identifier
    domain = Column(String(255), nullable=True)  # Custom domain
    
    # Status
    status = Column(SQLEnum(OrganizationStatus), default=OrganizationStatus.TRIAL)
    subscription_plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    billing_model = Column(SQLEnum(BillingModel), default=BillingModel.FIXED_MONTHLY)
    
    # Billing
    billing_email = Column(String(255), nullable=True)
    billing_address = Column(JSON, default=dict)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    
    # Limits
    max_users = Column(Integer, default=5)
    max_documents_per_month = Column(Integer, default=100)
    max_conversations_per_month = Column(Integer, default=1000)
    max_api_calls_per_month = Column(Integer, default=10000)
    
    # Metadata
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    trial_ends_at = Column(DateTime, nullable=True)
    
    # Relationships
    users = relationship("OrganizationUser", back_populates="organization")
    subscriptions = relationship("Subscription", back_populates="organization")
    template_licenses = relationship("TemplateLicense", back_populates="organization")
    usage_records = relationship("UsageRecord", back_populates="organization")
    api_keys = relationship("OrganizationAPIKey", back_populates="organization")

class OrganizationUser(Base):
    """Users within organizations"""
    __tablename__ = "organization_users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # owner, admin, member, viewer
    is_primary = Column(Boolean, default=False)  # Primary billing contact
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    user = relationship("User")

# ============================================================================
# TEMPLATE LICENSING (Bot Template Activation)
# ============================================================================

class TemplateLicense(Base):
    """Bot template licenses per organization"""
    __tablename__ = "template_licenses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    template_id = Column(String(100), nullable=False)  # e.g., "doc_qa", "invoice_extractor"
    
    # License details
    is_active = Column(Boolean, default=True)
    included_in_plan = Column(Boolean, default=False)  # Part of subscription or add-on
    monthly_price = Column(Numeric(10, 2), default=0.0)  # If add-on
    
    # Usage limits for this template
    max_calls_per_month = Column(Integer, nullable=True)  # None = unlimited
    price_per_call = Column(Numeric(10, 4), nullable=True)  # Usage-based pricing
    
    # Tracking
    activated_at = Column(DateTime, default=datetime.utcnow)
    deactivated_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="template_licenses")

# ============================================================================
# SUBSCRIPTIONS
# ============================================================================

class Subscription(Base):
    """Organization subscriptions"""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Plan details
    plan = Column(SQLEnum(SubscriptionPlan), nullable=False)
    billing_model = Column(SQLEnum(BillingModel), nullable=False)
    
    # Pricing
    monthly_price = Column(Numeric(10, 2), nullable=False)
    annual_price = Column(Numeric(10, 2), nullable=True)
    is_annual = Column(Boolean, default=False)
    
    # Status
    status = Column(String(50), default="active")  # active, cancelled, past_due, trialing
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Stripe integration
    stripe_subscription_id = Column(String(255), nullable=True)
    stripe_price_id = Column(String(255), nullable=True)
    
    # Metadata
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="subscriptions")
    invoices = relationship("Invoice", back_populates="subscription")

# ============================================================================
# USAGE TRACKING & METERING
# ============================================================================

class UsageRecord(Base):
    """Track usage for billing"""
    __tablename__ = "usage_records"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # What was used
    resource_type = Column(String(50), nullable=False)  # "api_call", "conversation", "document", "token"
    resource_id = Column(String(100), nullable=True)  # Specific bot template, etc.
    quantity = Column(Integer, default=1)
    
    # Cost calculation
    unit_price = Column(Numeric(10, 4), nullable=True)
    total_cost = Column(Numeric(10, 4), nullable=True)
    
    # Metadata
    metadata = Column(JSON, default=dict)  # Additional details (model used, tokens, etc.)
    timestamp = Column(DateTime, default=datetime.utcnow)
    billing_period = Column(String(20), nullable=False)  # "2025-01", "2025-02"
    
    # Relationships
    organization = relationship("Organization", back_populates="usage_records")

class UsageSummary(Base):
    """Aggregated usage per billing period"""
    __tablename__ = "usage_summaries"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    billing_period = Column(String(20), nullable=False)  # "2025-01"
    
    # Usage counts
    total_api_calls = Column(Integer, default=0)
    total_conversations = Column(Integer, default=0)
    total_documents = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # Costs
    fixed_cost = Column(Numeric(10, 2), default=0.0)
    usage_cost = Column(Numeric(10, 2), default=0.0)
    total_cost = Column(Numeric(10, 2), default=0.0)
    
    # Per-template breakdown
    template_usage = Column(JSON, default=dict)  # {"doc_qa": {"calls": 100, "cost": 5.00}}
    
    # Timestamps
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================================
# BILLING & INVOICES
# ============================================================================

class Invoice(Base):
    """Generated invoices"""
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    
    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False)
    status = Column(String(50), default="draft")  # draft, open, paid, void, uncollectible
    
    # Amounts
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax = Column(Numeric(10, 2), default=0.0)
    total = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0.0)
    amount_due = Column(Numeric(10, 2), nullable=False)
    
    # Dates
    invoice_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    
    # Line items (JSON array)
    line_items = Column(JSON, default=list)
    
    # Stripe
    stripe_invoice_id = Column(String(255), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    
    # Metadata
    notes = Column(Text, nullable=True)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")

# ============================================================================
# API KEYS (Organization-level)
# ============================================================================

class OrganizationAPIKey(Base):
    """Organization API keys for programmatic access"""
    __tablename__ = "organization_api_keys"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Key details
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    prefix = Column(String(20), nullable=False)  # First few chars for identification
    
    # Permissions
    scopes = Column(JSON, default=list)  # ["bot:read", "bot:write", "workflow:execute"]
    is_active = Column(Boolean, default=True)
    
    # Rate limiting
    rate_limit_per_minute = Column(Integer, default=60)
    rate_limit_per_hour = Column(Integer, default=1000)
    
    # Tracking
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="api_keys")

# ============================================================================
# PRICING PLANS (Configuration)
# ============================================================================

class PricingPlan(Base):
    """Available pricing plans configuration"""
    __tablename__ = "pricing_plans"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Plan details
    plan_id = Column(String(50), unique=True, nullable=False)  # "starter", "pro", "business"
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Pricing
    monthly_price = Column(Numeric(10, 2), nullable=False)
    annual_price = Column(Numeric(10, 2), nullable=True)
    billing_model = Column(SQLEnum(BillingModel), default=BillingModel.FIXED_MONTHLY)
    
    # Limits
    limits = Column(JSON, default=dict)  # {"users": 5, "documents": 100, "api_calls": 10000}
    
    # Included templates
    included_templates = Column(JSON, default=list)  # ["doc_qa", "doc_summarizer"]
    
    # Features
    features = Column(JSON, default=list)  # List of feature descriptions
    
    # Usage pricing (for usage-based or hybrid)
    price_per_api_call = Column(Numeric(10, 4), nullable=True)
    price_per_conversation = Column(Numeric(10, 4), nullable=True)
    price_per_document = Column(Numeric(10, 4), nullable=True)
    price_per_1k_tokens = Column(Numeric(10, 4), nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
