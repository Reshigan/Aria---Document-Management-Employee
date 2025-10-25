"""
Multi-Tenant Service - Organization & Customer Management
"""
import logging
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.tenant_models import (
    Organization, OrganizationUser, TemplateLicense,
    Subscription, UsageRecord, UsageSummary, Invoice,
    OrganizationAPIKey, PricingPlan,
    SubscriptionPlan, BillingModel, OrganizationStatus
)

logger = logging.getLogger(__name__)

class TenantService:
    """Manage multi-tenant organizations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========================================================================
    # ORGANIZATION MANAGEMENT
    # ========================================================================
    
    async def create_organization(
        self,
        name: str,
        slug: str,
        owner_user_id: int,
        plan: SubscriptionPlan = SubscriptionPlan.FREE,
        trial_days: int = 14
    ) -> Organization:
        """Create a new organization (customer)"""
        
        # Create organization
        org = Organization(
            name=name,
            slug=slug,
            subscription_plan=plan,
            status=OrganizationStatus.TRIAL,
            trial_ends_at=datetime.utcnow() + timedelta(days=trial_days)
        )
        
        self.db.add(org)
        self.db.flush()
        
        # Add owner as primary user
        org_user = OrganizationUser(
            organization_id=org.id,
            user_id=owner_user_id,
            role="owner",
            is_primary=True
        )
        self.db.add(org_user)
        
        # Activate default templates based on plan
        await self._activate_plan_templates(org.id, plan)
        
        self.db.commit()
        logger.info(f"Created organization: {name} (ID: {org.id})")
        
        return org
    
    async def get_organization(self, org_id: int) -> Optional[Organization]:
        """Get organization by ID"""
        return self.db.query(Organization).filter(Organization.id == org_id).first()
    
    async def get_organization_by_slug(self, slug: str) -> Optional[Organization]:
        """Get organization by slug"""
        return self.db.query(Organization).filter(Organization.slug == slug).first()
    
    async def update_organization(self, org_id: int, **updates) -> Organization:
        """Update organization details"""
        org = await self.get_organization(org_id)
        if not org:
            raise ValueError(f"Organization {org_id} not found")
        
        for key, value in updates.items():
            if hasattr(org, key):
                setattr(org, key, value)
        
        org.updated_at = datetime.utcnow()
        self.db.commit()
        
        return org
    
    # ========================================================================
    # TEMPLATE LICENSING (Bot Template Activation)
    # ========================================================================
    
    async def activate_template(
        self,
        org_id: int,
        template_id: str,
        included_in_plan: bool = False,
        monthly_price: Decimal = Decimal("0.00"),
        max_calls: Optional[int] = None,
        price_per_call: Optional[Decimal] = None
    ) -> TemplateLicense:
        """Activate a bot template for an organization"""
        
        # Check if already exists
        existing = self.db.query(TemplateLicense).filter(
            TemplateLicense.organization_id == org_id,
            TemplateLicense.template_id == template_id,
            TemplateLicense.is_active == True
        ).first()
        
        if existing:
            logger.info(f"Template {template_id} already active for org {org_id}")
            return existing
        
        license = TemplateLicense(
            organization_id=org_id,
            template_id=template_id,
            is_active=True,
            included_in_plan=included_in_plan,
            monthly_price=monthly_price,
            max_calls_per_month=max_calls,
            price_per_call=price_per_call
        )
        
        self.db.add(license)
        self.db.commit()
        
        logger.info(f"Activated template {template_id} for org {org_id}")
        return license
    
    async def deactivate_template(self, org_id: int, template_id: str):
        """Deactivate a bot template"""
        license = self.db.query(TemplateLicense).filter(
            TemplateLicense.organization_id == org_id,
            TemplateLicense.template_id == template_id
        ).first()
        
        if license:
            license.is_active = False
            license.deactivated_at = datetime.utcnow()
            self.db.commit()
            logger.info(f"Deactivated template {template_id} for org {org_id}")
    
    async def get_active_templates(self, org_id: int) -> List[TemplateLicense]:
        """Get all active templates for an organization"""
        return self.db.query(TemplateLicense).filter(
            TemplateLicense.organization_id == org_id,
            TemplateLicense.is_active == True
        ).all()
    
    async def can_use_template(self, org_id: int, template_id: str) -> bool:
        """Check if organization can use a specific template"""
        license = self.db.query(TemplateLicense).filter(
            TemplateLicense.organization_id == org_id,
            TemplateLicense.template_id == template_id,
            TemplateLicense.is_active == True
        ).first()
        
        if not license:
            return False
        
        # Check usage limits if applicable
        if license.max_calls_per_month:
            current_period = datetime.utcnow().strftime("%Y-%m")
            usage = await self.get_template_usage(org_id, template_id, current_period)
            if usage >= license.max_calls_per_month:
                logger.warning(f"Org {org_id} exceeded template {template_id} limit")
                return False
        
        return True
    
    async def _activate_plan_templates(self, org_id: int, plan: SubscriptionPlan):
        """Activate default templates for a subscription plan"""
        
        # Define templates included in each plan
        plan_templates = {
            SubscriptionPlan.FREE: ["doc_qa"],
            SubscriptionPlan.STARTER: ["doc_qa", "doc_summarizer", "email_assistant"],
            SubscriptionPlan.PROFESSIONAL: [
                "doc_qa", "doc_summarizer", "email_assistant",
                "invoice_extractor", "contract_analyzer"
            ],
            SubscriptionPlan.BUSINESS: [
                "doc_qa", "doc_summarizer", "email_assistant",
                "invoice_extractor", "contract_analyzer",
                "compliance_checker", "meeting_notes", "resume_screener"
            ],
            SubscriptionPlan.ENTERPRISE: "all"  # All templates
        }
        
        templates = plan_templates.get(plan, [])
        
        # If enterprise, activate all templates
        if templates == "all":
            from backend.services.ai.bot_templates import get_all_templates
            templates = [t.id for t in get_all_templates()]
        
        for template_id in templates:
            await self.activate_template(
                org_id=org_id,
                template_id=template_id,
                included_in_plan=True
            )
    
    # ========================================================================
    # USAGE TRACKING & METERING
    # ========================================================================
    
    async def track_usage(
        self,
        org_id: int,
        resource_type: str,
        resource_id: Optional[str] = None,
        quantity: int = 1,
        user_id: Optional[int] = None,
        metadata: Optional[Dict] = None
    ):
        """Track usage for billing"""
        
        billing_period = datetime.utcnow().strftime("%Y-%m")
        
        # Calculate cost based on organization's pricing
        unit_price, total_cost = await self._calculate_usage_cost(
            org_id, resource_type, resource_id, quantity
        )
        
        record = UsageRecord(
            organization_id=org_id,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            quantity=quantity,
            unit_price=unit_price,
            total_cost=total_cost,
            billing_period=billing_period,
            metadata=metadata or {}
        )
        
        self.db.add(record)
        self.db.commit()
        
        # Update usage summary
        await self._update_usage_summary(org_id, billing_period)
    
    async def get_template_usage(
        self,
        org_id: int,
        template_id: str,
        billing_period: str
    ) -> int:
        """Get usage count for a template in a billing period"""
        count = self.db.query(func.sum(UsageRecord.quantity)).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.resource_type == "bot_call",
            UsageRecord.resource_id == template_id,
            UsageRecord.billing_period == billing_period
        ).scalar()
        
        return int(count or 0)
    
    async def get_usage_summary(
        self,
        org_id: int,
        billing_period: Optional[str] = None
    ) -> UsageSummary:
        """Get usage summary for billing period"""
        if not billing_period:
            billing_period = datetime.utcnow().strftime("%Y-%m")
        
        summary = self.db.query(UsageSummary).filter(
            UsageSummary.organization_id == org_id,
            UsageSummary.billing_period == billing_period
        ).first()
        
        if not summary:
            # Create new summary
            summary = await self._create_usage_summary(org_id, billing_period)
        
        return summary
    
    async def _calculate_usage_cost(
        self,
        org_id: int,
        resource_type: str,
        resource_id: Optional[str],
        quantity: int
    ) -> tuple[Decimal, Decimal]:
        """Calculate cost for usage"""
        
        org = await self.get_organization(org_id)
        
        # Fixed monthly - no per-usage cost
        if org.billing_model == BillingModel.FIXED_MONTHLY:
            return Decimal("0.00"), Decimal("0.00")
        
        # Get pricing from license or plan
        if resource_type == "bot_call" and resource_id:
            license = self.db.query(TemplateLicense).filter(
                TemplateLicense.organization_id == org_id,
                TemplateLicense.template_id == resource_id,
                TemplateLicense.is_active == True
            ).first()
            
            if license and license.price_per_call:
                unit_price = license.price_per_call
                total_cost = unit_price * Decimal(quantity)
                return unit_price, total_cost
        
        # Default pricing (can be configured per resource type)
        default_prices = {
            "bot_call": Decimal("0.01"),  # $0.01 per call
            "conversation": Decimal("0.05"),  # $0.05 per conversation
            "document": Decimal("0.10"),  # $0.10 per document
            "api_call": Decimal("0.001")  # $0.001 per API call
        }
        
        unit_price = default_prices.get(resource_type, Decimal("0.00"))
        total_cost = unit_price * Decimal(quantity)
        
        return unit_price, total_cost
    
    async def _update_usage_summary(self, org_id: int, billing_period: str):
        """Update aggregated usage summary"""
        
        # Get or create summary
        summary = self.db.query(UsageSummary).filter(
            UsageSummary.organization_id == org_id,
            UsageSummary.billing_period == billing_period
        ).first()
        
        if not summary:
            summary = await self._create_usage_summary(org_id, billing_period)
        
        # Aggregate usage
        usage_stats = self.db.query(
            UsageRecord.resource_type,
            UsageRecord.resource_id,
            func.sum(UsageRecord.quantity).label("total_quantity"),
            func.sum(UsageRecord.total_cost).label("total_cost")
        ).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.billing_period == billing_period
        ).group_by(UsageRecord.resource_type, UsageRecord.resource_id).all()
        
        # Update counts
        summary.total_api_calls = 0
        summary.total_conversations = 0
        summary.total_documents = 0
        summary.usage_cost = Decimal("0.00")
        template_usage = {}
        
        for stat in usage_stats:
            if stat.resource_type == "api_call":
                summary.total_api_calls += int(stat.total_quantity)
            elif stat.resource_type == "conversation":
                summary.total_conversations += int(stat.total_quantity)
            elif stat.resource_type == "document":
                summary.total_documents += int(stat.total_quantity)
            elif stat.resource_type == "bot_call" and stat.resource_id:
                template_usage[stat.resource_id] = {
                    "calls": int(stat.total_quantity),
                    "cost": float(stat.total_cost or 0)
                }
            
            summary.usage_cost += Decimal(stat.total_cost or 0)
        
        summary.template_usage = template_usage
        summary.total_cost = summary.fixed_cost + summary.usage_cost
        summary.updated_at = datetime.utcnow()
        
        self.db.commit()
    
    async def _create_usage_summary(self, org_id: int, billing_period: str) -> UsageSummary:
        """Create new usage summary for period"""
        
        year, month = billing_period.split("-")
        period_start = datetime(int(year), int(month), 1)
        
        # Calculate period end
        if int(month) == 12:
            period_end = datetime(int(year) + 1, 1, 1) - timedelta(seconds=1)
        else:
            period_end = datetime(int(year), int(month) + 1, 1) - timedelta(seconds=1)
        
        # Get organization's fixed cost
        org = await self.get_organization(org_id)
        plan_pricing = await self._get_plan_pricing(org.subscription_plan)
        
        summary = UsageSummary(
            organization_id=org_id,
            billing_period=billing_period,
            period_start=period_start,
            period_end=period_end,
            fixed_cost=plan_pricing
        )
        
        self.db.add(summary)
        self.db.commit()
        
        return summary
    
    async def _get_plan_pricing(self, plan: SubscriptionPlan) -> Decimal:
        """Get monthly price for a plan"""
        pricing = {
            SubscriptionPlan.FREE: Decimal("0.00"),
            SubscriptionPlan.STARTER: Decimal("29.00"),
            SubscriptionPlan.PROFESSIONAL: Decimal("99.00"),
            SubscriptionPlan.BUSINESS: Decimal("299.00"),
            SubscriptionPlan.ENTERPRISE: Decimal("999.00")
        }
        return pricing.get(plan, Decimal("0.00"))
    
    # ========================================================================
    # SUBSCRIPTION MANAGEMENT
    # ========================================================================
    
    async def upgrade_plan(
        self,
        org_id: int,
        new_plan: SubscriptionPlan,
        is_annual: bool = False
    ) -> Subscription:
        """Upgrade/downgrade organization plan"""
        
        org = await self.get_organization(org_id)
        if not org:
            raise ValueError(f"Organization {org_id} not found")
        
        # Update organization
        org.subscription_plan = new_plan
        org.status = OrganizationStatus.ACTIVE
        
        # Activate plan templates
        await self._activate_plan_templates(org_id, new_plan)
        
        # Create/update subscription record
        # (Integration with Stripe would go here)
        
        self.db.commit()
        logger.info(f"Upgraded org {org_id} to {new_plan}")
        
        return org
    
    # ========================================================================
    # API KEY MANAGEMENT
    # ========================================================================
    
    async def create_api_key(
        self,
        org_id: int,
        name: str,
        scopes: List[str],
        rate_limit_per_minute: int = 60
    ) -> tuple[OrganizationAPIKey, str]:
        """Create API key for organization"""
        import secrets
        import hashlib
        
        # Generate key
        key = f"aria_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        prefix = key[:12]
        
        api_key = OrganizationAPIKey(
            organization_id=org_id,
            name=name,
            key_hash=key_hash,
            prefix=prefix,
            scopes=scopes,
            rate_limit_per_minute=rate_limit_per_minute
        )
        
        self.db.add(api_key)
        self.db.commit()
        
        logger.info(f"Created API key for org {org_id}: {name}")
        
        return api_key, key  # Return plaintext key only once
    
    async def verify_api_key(self, key: str) -> Optional[Organization]:
        """Verify API key and return organization"""
        import hashlib
        
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        api_key = self.db.query(OrganizationAPIKey).filter(
            OrganizationAPIKey.key_hash == key_hash,
            OrganizationAPIKey.is_active == True
        ).first()
        
        if not api_key:
            return None
        
        # Update last used
        api_key.last_used_at = datetime.utcnow()
        self.db.commit()
        
        return await self.get_organization(api_key.organization_id)
