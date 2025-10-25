"""
Customer Growth & Cross-Sell Service
Embed Aria deeply across business functions and grow within accounts
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

class CustomerGrowthService:
    """Manage customer expansion and deep business integration"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========================================================================
    # USAGE PATTERN ANALYSIS
    # ========================================================================
    
    async def analyze_usage_patterns(self, org_id: int) -> Dict:
        """Analyze how customer is using Aria"""
        
        from backend.models.tenant_models import UsageRecord
        from backend.models.aria_identity import BotInteraction, Process
        
        # Get usage over last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Bot usage by department/type
        bot_usage = self.db.query(
            UsageRecord.resource_id,
            func.count(UsageRecord.id).label("count"),
            func.sum(UsageRecord.quantity).label("total")
        ).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.timestamp >= thirty_days_ago,
            UsageRecord.resource_type == "bot_call"
        ).group_by(UsageRecord.resource_id).all()
        
        # User adoption
        unique_users = self.db.query(
            func.count(func.distinct(UsageRecord.user_id))
        ).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.timestamp >= thirty_days_ago
        ).scalar()
        
        # Growth trend
        weekly_usage = self.db.query(
            func.date_trunc('week', UsageRecord.timestamp).label('week'),
            func.count(UsageRecord.id).label('count')
        ).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.timestamp >= thirty_days_ago
        ).group_by('week').all()
        
        return {
            "bot_usage": [{"bot": b.resource_id, "calls": b.count} for b in bot_usage],
            "unique_users": unique_users,
            "weekly_trend": [{"week": str(w.week), "count": w.count} for w in weekly_usage],
            "analysis_period": "30_days"
        }
    
    # ========================================================================
    # CROSS-SELL OPPORTUNITIES
    # ========================================================================
    
    async def identify_cross_sell_opportunities(self, org_id: int) -> List[Dict]:
        """Identify opportunities to expand within customer"""
        
        usage_patterns = await self.analyze_usage_patterns(org_id)
        active_bots = await self._get_active_bots(org_id)
        org_size = await self._get_organization_size(org_id)
        
        opportunities = []
        
        # Opportunity 1: Department Expansion
        departments_using = set(b.get("department") for b in active_bots if b.get("department"))
        all_departments = {"sales", "marketing", "hr", "finance", "legal", "operations", "support"}
        untapped_departments = all_departments - departments_using
        
        for dept in untapped_departments:
            opportunities.append({
                "type": "department_expansion",
                "department": dept,
                "priority": "high",
                "description": f"Expand Aria into {dept} department",
                "estimated_value": self._calculate_department_value(dept, org_size),
                "recommended_bots": self._get_department_bots(dept),
                "effort": "medium"
            })
        
        # Opportunity 2: Power User Growth
        if usage_patterns["unique_users"] < org_size["total_employees"] * 0.5:
            opportunities.append({
                "type": "user_adoption",
                "priority": "high",
                "description": f"Increase user adoption from {usage_patterns['unique_users']} to {org_size['total_employees']}",
                "estimated_value": (org_size['total_employees'] - usage_patterns['unique_users']) * Decimal("5.00"),
                "recommended_actions": [
                    "Run training sessions",
                    "Create department champions",
                    "Gamify usage",
                    "Weekly tips emails"
                ],
                "effort": "low"
            })
        
        # Opportunity 3: Advanced Features
        advanced_features_used = await self._check_advanced_features_usage(org_id)
        if not advanced_features_used["workflows"]:
            opportunities.append({
                "type": "feature_upsell",
                "feature": "workflows",
                "priority": "medium",
                "description": "Enable workflow automation for repetitive processes",
                "estimated_value": Decimal("200.00"),  # Monthly savings
                "recommended_actions": [
                    "Identify repetitive tasks",
                    "Build 3 starter workflows",
                    "Show ROI with time savings"
                ],
                "effort": "medium"
            })
        
        # Opportunity 4: Integration Expansion
        current_integrations = await self._get_active_integrations(org_id)
        suggested_integrations = self._suggest_integrations(active_bots, current_integrations)
        
        for integration in suggested_integrations:
            opportunities.append({
                "type": "integration",
                "integration": integration["name"],
                "priority": "medium",
                "description": f"Connect Aria to {integration['name']}",
                "estimated_value": integration["estimated_value"],
                "recommended_actions": integration["setup_steps"],
                "effort": "low"
            })
        
        # Opportunity 5: Custom Bot Creation
        high_volume_tasks = self._identify_high_volume_tasks(usage_patterns)
        for task in high_volume_tasks:
            opportunities.append({
                "type": "custom_bot",
                "task": task["task_type"],
                "priority": "high",
                "description": f"Create specialized bot for {task['task_type']}",
                "estimated_value": task["volume"] * Decimal("0.50"),
                "current_volume": task["volume"],
                "recommended_actions": [
                    "Define bot requirements",
                    "Build custom prompts",
                    "Train with examples",
                    "Deploy to team"
                ],
                "effort": "high"
            })
        
        # Sort by estimated value
        opportunities.sort(key=lambda x: x.get("estimated_value", 0), reverse=True)
        
        return opportunities
    
    # ========================================================================
    # EXPANSION TRACKING
    # ========================================================================
    
    async def track_expansion_metrics(self, org_id: int) -> Dict:
        """Track how deeply embedded Aria is in the organization"""
        
        from backend.models.tenant_models import Organization, TemplateLicense
        from backend.models.aria_identity import ManagedBot, Process
        
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        
        # Calculate depth metrics
        active_templates = self.db.query(TemplateLicense).filter(
            TemplateLicense.organization_id == org_id,
            TemplateLicense.is_active == True
        ).count()
        
        managed_bots = self.db.query(ManagedBot).filter(
            ManagedBot.organization_id == org_id,
            ManagedBot.is_active == True
        ).count()
        
        active_processes = self.db.query(Process).filter(
            Process.organization_id == org_id,
            Process.status.in_(["pending", "running"])
        ).count()
        
        # Departments covered
        departments = self.db.query(func.distinct(ManagedBot.department)).filter(
            ManagedBot.organization_id == org_id,
            ManagedBot.is_active == True,
            ManagedBot.department.isnot(None)
        ).all()
        
        # Usage frequency
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        from backend.models.tenant_models import UsageRecord
        
        daily_active_users = self.db.query(
            func.date(UsageRecord.timestamp).label('date'),
            func.count(func.distinct(UsageRecord.user_id)).label('users')
        ).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.timestamp >= thirty_days_ago
        ).group_by('date').all()
        
        avg_dau = sum(d.users for d in daily_active_users) / len(daily_active_users) if daily_active_users else 0
        
        # Calculate embedding score (0-100)
        embedding_score = self._calculate_embedding_score({
            "active_templates": active_templates,
            "managed_bots": managed_bots,
            "departments_covered": len(departments),
            "daily_active_users": avg_dau,
            "active_processes": active_processes
        })
        
        return {
            "embedding_score": embedding_score,
            "active_templates": active_templates,
            "custom_bots": managed_bots,
            "departments_covered": len(departments),
            "department_list": [d[0] for d in departments],
            "avg_daily_active_users": int(avg_dau),
            "active_processes": active_processes,
            "status": self._get_embedding_status(embedding_score)
        }
    
    def _calculate_embedding_score(self, metrics: Dict) -> int:
        """Calculate how deeply embedded Aria is (0-100)"""
        
        score = 0
        
        # Template usage (max 20 points)
        score += min(metrics["active_templates"] * 2, 20)
        
        # Custom bots (max 20 points)
        score += min(metrics["managed_bots"] * 4, 20)
        
        # Department coverage (max 30 points)
        score += min(metrics["departments_covered"] * 5, 30)
        
        # User adoption (max 20 points)
        score += min(metrics["daily_active_users"] * 2, 20)
        
        # Process automation (max 10 points)
        score += min(metrics["active_processes"] * 2, 10)
        
        return min(score, 100)
    
    def _get_embedding_status(self, score: int) -> str:
        """Get status description from score"""
        if score >= 80:
            return "deeply_embedded"
        elif score >= 60:
            return "well_integrated"
        elif score >= 40:
            return "growing"
        elif score >= 20:
            return "early_adoption"
        else:
            return "trial"
    
    # ========================================================================
    # PROACTIVE GROWTH ACTIONS
    # ========================================================================
    
    async def suggest_growth_actions(self, org_id: int) -> List[Dict]:
        """Suggest specific actions to grow within customer"""
        
        opportunities = await self.identify_cross_sell_opportunities(org_id)
        expansion_metrics = await self.track_expansion_metrics(org_id)
        
        actions = []
        
        # Priority 1: Low-hanging fruit (high value, low effort)
        for opp in opportunities:
            if opp.get("effort") == "low" and opp.get("priority") == "high":
                actions.append({
                    "action_type": "quick_win",
                    "priority": 1,
                    "title": f"Quick Win: {opp['description']}",
                    "opportunity": opp,
                    "timeline": "1-2 weeks",
                    "owner": "customer_success"
                })
        
        # Priority 2: Department expansion
        if expansion_metrics["departments_covered"] < 3:
            actions.append({
                "action_type": "department_expansion",
                "priority": 2,
                "title": "Expand to additional departments",
                "departments_covered": expansion_metrics["departments_covered"],
                "target_departments": 5,
                "timeline": "1-2 months",
                "owner": "account_executive"
            })
        
        # Priority 3: Power user program
        if expansion_metrics["avg_daily_active_users"] < 10:
            actions.append({
                "action_type": "power_user_program",
                "priority": 2,
                "title": "Launch power user program",
                "current_dau": expansion_metrics["avg_daily_active_users"],
                "target_dau": 20,
                "timeline": "2-3 months",
                "owner": "customer_success"
            })
        
        # Priority 4: Custom bot development
        high_value_custom_bots = [o for o in opportunities if o["type"] == "custom_bot" and o["estimated_value"] > 100]
        if high_value_custom_bots:
            actions.append({
                "action_type": "custom_bot_development",
                "priority": 3,
                "title": "Develop custom bots for high-value use cases",
                "opportunities": high_value_custom_bots[:3],  # Top 3
                "timeline": "1-3 months",
                "owner": "solutions_architect"
            })
        
        # Priority 5: Enterprise upsell
        if expansion_metrics["embedding_score"] >= 60:
            actions.append({
                "action_type": "enterprise_upsell",
                "priority": 4,
                "title": "Propose enterprise plan upgrade",
                "current_score": expansion_metrics["embedding_score"],
                "justification": "High engagement and department coverage",
                "timeline": "Next renewal",
                "owner": "account_executive"
            })
        
        return actions
    
    # ========================================================================
    # HEALTH SCORE & CHURN RISK
    # ========================================================================
    
    async def calculate_customer_health(self, org_id: int) -> Dict:
        """Calculate customer health score and churn risk"""
        
        usage_patterns = await self.analyze_usage_patterns(org_id)
        expansion_metrics = await self.track_expansion_metrics(org_id)
        
        health_score = 0
        risk_factors = []
        positive_indicators = []
        
        # Factor 1: Usage trend (30 points)
        weekly_trend = usage_patterns["weekly_trend"]
        if len(weekly_trend) >= 2:
            recent = sum(w["count"] for w in weekly_trend[-2:])
            older = sum(w["count"] for w in weekly_trend[:2])
            if recent > older * 1.2:
                health_score += 30
                positive_indicators.append("Usage growing week-over-week")
            elif recent < older * 0.8:
                health_score += 10
                risk_factors.append("Usage declining")
            else:
                health_score += 20
        
        # Factor 2: User adoption (25 points)
        if usage_patterns["unique_users"] >= 10:
            health_score += 25
            positive_indicators.append("Strong user adoption")
        elif usage_patterns["unique_users"] >= 5:
            health_score += 15
        else:
            risk_factors.append("Low user adoption")
            health_score += 5
        
        # Factor 3: Embedding score (25 points)
        embedding_score = expansion_metrics["embedding_score"]
        health_score += int(embedding_score * 0.25)
        
        if embedding_score >= 60:
            positive_indicators.append("Deeply embedded in organization")
        elif embedding_score < 30:
            risk_factors.append("Shallow integration")
        
        # Factor 4: Department diversity (10 points)
        if expansion_metrics["departments_covered"] >= 3:
            health_score += 10
            positive_indicators.append("Multi-department usage")
        elif expansion_metrics["departments_covered"] <= 1:
            risk_factors.append("Single department usage")
            health_score += 3
        else:
            health_score += 6
        
        # Factor 5: Recent activity (10 points)
        # Check last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        from backend.models.tenant_models import UsageRecord
        
        recent_activity = self.db.query(func.count(UsageRecord.id)).filter(
            UsageRecord.organization_id == org_id,
            UsageRecord.timestamp >= seven_days_ago
        ).scalar()
        
        if recent_activity >= 50:
            health_score += 10
            positive_indicators.append("High recent activity")
        elif recent_activity == 0:
            risk_factors.append("No activity in last 7 days")
            health_score += 0
        else:
            health_score += 5
        
        # Determine churn risk
        if health_score >= 80:
            churn_risk = "low"
        elif health_score >= 60:
            churn_risk = "medium"
        else:
            churn_risk = "high"
        
        return {
            "health_score": health_score,
            "churn_risk": churn_risk,
            "risk_factors": risk_factors,
            "positive_indicators": positive_indicators,
            "recommended_actions": self._get_health_actions(health_score, risk_factors)
        }
    
    def _get_health_actions(self, health_score: int, risk_factors: List[str]) -> List[str]:
        """Get recommended actions based on health"""
        
        if health_score >= 80:
            return [
                "Schedule executive business review",
                "Explore enterprise features",
                "Request case study/testimonial"
            ]
        elif health_score >= 60:
            return [
                "Identify additional use cases",
                "Introduce advanced features",
                "Schedule quarterly review"
            ]
        else:
            actions = ["Schedule urgent check-in call"]
            if "Low user adoption" in risk_factors:
                actions.append("Run training sessions")
            if "Usage declining" in risk_factors:
                actions.append("Identify blockers and pain points")
            if "No activity in last 7 days" in risk_factors:
                actions.append("Immediate outreach required")
            return actions
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    async def _get_active_bots(self, org_id: int) -> List[Dict]:
        """Get active bots for organization"""
        from backend.models.aria_identity import ManagedBot
        
        bots = self.db.query(ManagedBot).filter(
            ManagedBot.organization_id == org_id,
            ManagedBot.is_active == True
        ).all()
        
        return [{"id": b.id, "name": b.bot_name, "department": b.department} for b in bots]
    
    async def _get_organization_size(self, org_id: int) -> Dict:
        """Get organization size metrics"""
        from backend.models.tenant_models import Organization, OrganizationUser
        
        org = self.db.query(Organization).filter(Organization.id == org_id).first()
        user_count = self.db.query(OrganizationUser).filter(
            OrganizationUser.organization_id == org_id
        ).count()
        
        return {
            "total_employees": user_count or 10,  # Estimate if not tracked
            "max_users": org.max_users if org else 5
        }
    
    async def _check_advanced_features_usage(self, org_id: int) -> Dict:
        """Check if advanced features are being used"""
        from backend.models.aria_identity import Process
        from backend.models.workflow_models import WorkflowExecution
        
        workflows_used = self.db.query(func.count(Process.id)).filter(
            Process.organization_id == org_id
        ).scalar() > 0
        
        return {
            "workflows": workflows_used,
            "voice": False,  # Can track from voice_interactions table
            "api": False  # Can track from API key usage
        }
    
    async def _get_active_integrations(self, org_id: int) -> List[str]:
        """Get active integrations"""
        # Would query integration_models
        return []
    
    def _suggest_integrations(self, active_bots: List[Dict], current_integrations: List[str]) -> List[Dict]:
        """Suggest integrations based on bot usage"""
        
        suggestions = []
        
        # If using sales bots, suggest CRM
        if any(b.get("department") == "sales" for b in active_bots):
            if "salesforce" not in current_integrations:
                suggestions.append({
                    "name": "Salesforce",
                    "estimated_value": Decimal("150.00"),
                    "setup_steps": ["Connect Salesforce account", "Map fields", "Test sync"]
                })
        
        # If using HR bots, suggest HRIS
        if any(b.get("department") == "hr" for b in active_bots):
            if "workday" not in current_integrations:
                suggestions.append({
                    "name": "Workday",
                    "estimated_value": Decimal("100.00"),
                    "setup_steps": ["Connect Workday API", "Configure permissions"]
                })
        
        return suggestions
    
    def _identify_high_volume_tasks(self, usage_patterns: Dict) -> List[Dict]:
        """Identify high-volume repetitive tasks"""
        
        high_volume = []
        
        for bot_usage in usage_patterns["bot_usage"]:
            if bot_usage["calls"] > 100:  # High volume threshold
                high_volume.append({
                    "task_type": bot_usage["bot"],
                    "volume": bot_usage["calls"]
                })
        
        return high_volume
    
    def _calculate_department_value(self, department: str, org_size: Dict) -> Decimal:
        """Estimate value of expanding to a department"""
        
        # Base value per department
        base_values = {
            "sales": Decimal("300.00"),
            "marketing": Decimal("250.00"),
            "finance": Decimal("200.00"),
            "hr": Decimal("150.00"),
            "legal": Decimal("200.00"),
            "operations": Decimal("180.00"),
            "support": Decimal("220.00")
        }
        
        base = base_values.get(department, Decimal("150.00"))
        
        # Scale by organization size
        size_multiplier = min(org_size["total_employees"] / 10, 5.0)
        
        return base * Decimal(str(size_multiplier))
    
    def _get_department_bots(self, department: str) -> List[str]:
        """Get recommended bots for a department"""
        
        department_bots = {
            "sales": ["sales_assistant", "proposal_generator", "crm_sync_bot"],
            "marketing": ["content_writer", "campaign_analyzer", "social_media_bot"],
            "hr": ["resume_screener", "onboarding_bot", "hr_policy_bot"],
            "finance": ["invoice_extractor", "expense_validator", "financial_report_bot"],
            "legal": ["contract_analyzer", "compliance_checker", "legal_research_bot"],
            "operations": ["process_optimizer", "inventory_bot", "logistics_bot"],
            "support": ["ticket_router", "customer_support_bot", "kb_bot"]
        }
        
        return department_bots.get(department, ["doc_qa", "doc_summarizer"])
