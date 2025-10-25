"""
Tenant Model - Multi-tenant architecture for Aria

Each customer gets their own tenant with isolated data.
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Tenant(Base):
    """
    Tenant model for multi-tenant architecture.
    
    Each tenant represents a customer company using Aria.
    Data is isolated per tenant using schema-per-tenant approach.
    """
    __tablename__ = "tenants"
    
    # Primary key
    tenant_id = Column(String(50), primary_key=True, index=True)
    
    # Company information
    company_name = Column(String(255), nullable=False)
    company_registration = Column(String(100))  # SA company registration number
    industry = Column(String(100))
    size = Column(String(50))  # small, medium, large
    
    # Location (South Africa specific)
    country = Column(String(50), default="South Africa")
    city = Column(String(100))
    province = Column(String(100))  # Gauteng, Western Cape, etc.
    
    # Subscription
    subscription_tier = Column(String(50), default="starter")  # starter, growth, professional
    subscription_status = Column(String(50), default="trial")  # trial, active, suspended, cancelled
    trial_ends_at = Column(DateTime)
    
    # Features enabled
    enabled_bots = Column(JSON, default=list)  # List of bot IDs enabled for this tenant
    bbbee_enabled = Column(Boolean, default=False)
    sars_payroll_enabled = Column(Boolean, default=False)
    
    # Usage tracking
    user_count = Column(Integer, default=0)
    bot_requests_count = Column(Integer, default=0)
    storage_used_mb = Column(Integer, default=0)
    
    # Billing
    monthly_price_zar = Column(Integer, default=15000)  # Price in South African Rand
    currency = Column(String(10), default="ZAR")
    payment_method = Column(String(50))  # stripe, direct_debit, etc.
    
    # Admin contact
    admin_email = Column(String(255), nullable=False)
    admin_name = Column(String(255))
    admin_phone = Column(String(50))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_beta = Column(Boolean, default=False)  # Beta program (50% discount)
    
    # Metadata
    database_schema = Column(String(100))  # PostgreSQL schema name for this tenant
    settings = Column(JSON, default=dict)  # Additional tenant-specific settings
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Tenant(tenant_id='{self.tenant_id}', company='{self.company_name}', tier='{self.subscription_tier}')>"
    
    def to_dict(self):
        """Convert tenant to dictionary."""
        return {
            "tenant_id": self.tenant_id,
            "company_name": self.company_name,
            "company_registration": self.company_registration,
            "industry": self.industry,
            "size": self.size,
            "country": self.country,
            "city": self.city,
            "province": self.province,
            "subscription_tier": self.subscription_tier,
            "subscription_status": self.subscription_status,
            "trial_ends_at": self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            "enabled_bots": self.enabled_bots,
            "bbbee_enabled": self.bbbee_enabled,
            "sars_payroll_enabled": self.sars_payroll_enabled,
            "user_count": self.user_count,
            "bot_requests_count": self.bot_requests_count,
            "storage_used_mb": self.storage_used_mb,
            "monthly_price_zar": self.monthly_price_zar,
            "currency": self.currency,
            "admin_email": self.admin_email,
            "admin_name": self.admin_name,
            "admin_phone": self.admin_phone,
            "is_active": self.is_active,
            "is_beta": self.is_beta,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Subscription tiers configuration
SUBSCRIPTION_TIERS = {
    "starter": {
        "name": "Starter",
        "price_zar": 15000,
        "max_users": 10,
        "max_bots": 3,
        "bbbee_enabled": False,
        "sars_payroll_enabled": False,
        "features": ["email_integration", "whatsapp_integration", "basic_reporting"]
    },
    "growth": {
        "name": "Growth",
        "price_zar": 45000,
        "max_users": 50,
        "max_bots": 10,
        "bbbee_enabled": True,  # 🇿🇦 SA Compliance!
        "sars_payroll_enabled": True,  # 🇿🇦 SA Payroll!
        "features": ["email_integration", "whatsapp_integration", "slack_integration", 
                     "advanced_analytics", "bbbee_compliance", "sars_payroll", "priority_support"]
    },
    "professional": {
        "name": "Professional",
        "price_zar": 135000,
        "max_users": -1,  # Unlimited
        "max_bots": 25,  # All bots
        "bbbee_enabled": True,
        "sars_payroll_enabled": True,
        "features": ["all_integrations", "custom_bots", "advanced_security", 
                     "white_glove_support", "dedicated_success_manager", "sla_guarantee"]
    }
}


def get_tier_config(tier: str) -> dict:
    """Get configuration for a subscription tier."""
    return SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["starter"])


def calculate_monthly_price(tier: str, is_beta: bool = False) -> int:
    """Calculate monthly price in ZAR."""
    config = get_tier_config(tier)
    price = config["price_zar"]
    
    # Beta discount: 50% off
    if is_beta:
        price = price // 2
    
    return price
