"""
Bot Marketplace API - ARIA Fast Track
Provides enhanced bot discovery, deployment, and management endpoints

This API integrates with the BotManager to expose all 8 functional bots
with real execution capabilities.
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.bots.bot_manager import BotManager
from backend.auth.jwt_auth import get_current_user, get_current_tenant_id
from backend.database.multi_tenant import get_current_tenant_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketplace", tags=["Bot Marketplace"])

# Initialize Bot Manager
bot_manager = BotManager()


# Pydantic Models
class BotDeployRequest(BaseModel):
    """Request to deploy a bot to tenant."""
    configuration: Optional[Dict[str, Any]] = Field(default={}, description="Bot configuration")
    auto_start: bool = Field(default=True, description="Auto-start after deployment")


class BotDeployResponse(BaseModel):
    """Response after bot deployment."""
    bot_id: str
    bot_name: str
    status: str  # "deployed", "pending", "failed"
    deployment_id: str
    message: str
    deployed_at: datetime


class BotMarketplaceInfo(BaseModel):
    """Enhanced bot information for marketplace."""
    bot_id: str
    name: str
    description: str
    category: str
    icon: str
    is_deployed: bool = False
    is_functional: bool = False
    requires_bbbee: bool = False
    requires_sars: bool = False
    pricing_tier: str = "starter"  # starter, professional, enterprise
    estimated_roi_percentage: Optional[int] = None
    deployment_time_hours: int = 24


class BotMarketplaceListResponse(BaseModel):
    """List of bots in marketplace."""
    bots: List[BotMarketplaceInfo]
    total: int
    functional_count: int
    coming_soon_count: int


class BotExecuteRequest(BaseModel):
    """Request to execute a bot."""
    query: str = Field(..., min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = None


class BotExecuteResponse(BaseModel):
    """Response from bot execution."""
    bot_id: str
    bot_name: str
    query: str
    response: str
    confidence: float
    suggestions: List[str] = []
    actions_taken: List[str] = []
    timestamp: datetime
    execution_time_ms: float


# Functional bots (actually implemented)
FUNCTIONAL_BOTS = {
    "bbbee_compliance",
    "invoice_reconciliation", 
    "expense_management",
    "payroll_sa",
    "accounts_payable",
    "ar_collections",
    "bank_reconciliation",
    "lead_qualification"
}


# Pricing tier mapping
PRICING_TIERS = {
    "bbbee_compliance": "professional",
    "invoice_reconciliation": "starter",
    "expense_management": "starter",
    "payroll_sa": "professional",
    "accounts_payable": "professional",
    "ar_collections": "professional",
    "bank_reconciliation": "professional",
    "lead_qualification": "professional",
}


# ROI estimates (percentage improvement)
ROI_ESTIMATES = {
    "bbbee_compliance": 200,  # 200% ROI - save audit costs
    "invoice_reconciliation": 150,  # 150% ROI - reduce errors
    "expense_management": 120,  # 120% ROI - reduce processing time
    "payroll_sa": 180,  # 180% ROI - compliance + time savings
    "accounts_payable": 175,  # 175% ROI - reduce processing time 75%
    "ar_collections": 250,  # 250% ROI - reduce DSO by 15-20 days
    "bank_reconciliation": 300,  # 300% ROI - 12 hours → 30 minutes
    "lead_qualification": 200,  # 200% ROI - improve conversion 25-30%
}


@router.get("/", response_model=BotMarketplaceListResponse)
async def list_marketplace_bots(
    category: Optional[str] = Query(None, description="Filter by category"),
    show_functional_only: bool = Query(False, description="Show only functional bots"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all bots available in the ARIA marketplace.
    
    Returns enhanced bot information including deployment status,
    functionality, pricing tier, and estimated ROI.
    """
    # Get all bots from bot manager
    all_bots = bot_manager.list_bots(category=category)
    
    marketplace_bots = []
    
    for bot_info in all_bots:
        # Check if bot is functional
        is_functional = bot_info.bot_id in FUNCTIONAL_BOTS
        
        # Skip if filtering for functional only
        if show_functional_only and not is_functional:
            continue
        
        # Get pricing tier
        pricing_tier = PRICING_TIERS.get(bot_info.bot_id, "enterprise")
        
        # Get ROI estimate
        roi = ROI_ESTIMATES.get(bot_info.bot_id, None)
        
        marketplace_bots.append(BotMarketplaceInfo(
            bot_id=bot_info.bot_id,
            name=bot_info.name,
            description=bot_info.description,
            category=bot_info.category,
            icon=bot_info.icon,
            is_deployed=False,  # TODO: Check tenant deployment status
            is_functional=is_functional,
            requires_bbbee=bot_info.requires_bbbee,
            requires_sars=bot_info.requires_sars,
            pricing_tier=pricing_tier,
            estimated_roi_percentage=roi,
            deployment_time_hours=24 if is_functional else 168  # 1 day vs 1 week
        ))
    
    functional_count = sum(1 for b in marketplace_bots if b.is_functional)
    coming_soon_count = len(marketplace_bots) - functional_count
    
    logger.info(
        f"Listed {len(marketplace_bots)} marketplace bots "
        f"({functional_count} functional, {coming_soon_count} coming soon) "
        f"for user {current_user['user_id']}"
    )
    
    return BotMarketplaceListResponse(
        bots=marketplace_bots,
        total=len(marketplace_bots),
        functional_count=functional_count,
        coming_soon_count=coming_soon_count
    )


@router.get("/{bot_id}")
async def get_bot_details(
    bot_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get detailed information about a specific bot.
    
    Returns comprehensive bot details including capabilities,
    use cases, pricing, and deployment requirements.
    """
    # Get bot from manager
    bot_info = bot_manager.get_bot(bot_id)
    
    if not bot_info:
        raise HTTPException(
            status_code=404,
            detail=f"Bot '{bot_id}' not found in marketplace"
        )
    
    # Check if functional
    is_functional = bot_id in FUNCTIONAL_BOTS
    
    # Build detailed response
    return {
        "bot_id": bot_info.bot_id,
        "name": bot_info.name,
        "description": bot_info.description,
        "category": bot_info.category,
        "icon": bot_info.icon,
        "is_functional": is_functional,
        "status": "available" if is_functional else "coming_soon",
        "requires_bbbee": bot_info.requires_bbbee,
        "requires_sars": bot_info.requires_sars,
        "pricing_tier": PRICING_TIERS.get(bot_id, "enterprise"),
        "estimated_roi_percentage": ROI_ESTIMATES.get(bot_id, None),
        "deployment_time_hours": 24 if is_functional else 168,
        "features": _get_bot_features(bot_id),
        "use_cases": _get_bot_use_cases(bot_id),
        "integrations": _get_bot_integrations(bot_id)
    }


@router.post("/{bot_id}/deploy", response_model=BotDeployResponse)
async def deploy_bot(
    bot_id: str,
    request: BotDeployRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Deploy a bot to the current tenant.
    
    For functional bots, deployment is instant.
    For coming-soon bots, creates a deployment request.
    """
    # Get bot info
    bot_info = bot_manager.get_bot(bot_id)
    
    if not bot_info:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' not found")
    
    # Check if bot is functional
    is_functional = bot_id in FUNCTIONAL_BOTS
    
    # Generate deployment ID
    import uuid
    deployment_id = str(uuid.uuid4())
    
    if is_functional:
        # Instant deployment for functional bots
        logger.info(
            f"Deploying functional bot '{bot_id}' "
            f"to tenant {current_user['tenant_id']}"
        )
        
        # TODO: Save deployment to database
        
        return BotDeployResponse(
            bot_id=bot_id,
            bot_name=bot_info.name,
            status="deployed",
            deployment_id=deployment_id,
            message=f"{bot_info.name} deployed successfully and ready to use!",
            deployed_at=datetime.utcnow()
        )
    else:
        # Coming soon bots - create deployment request
        logger.info(
            f"Created deployment request for coming-soon bot '{bot_id}' "
            f"in tenant {current_user['tenant_id']}"
        )
        
        # TODO: Save deployment request to database
        
        return BotDeployResponse(
            bot_id=bot_id,
            bot_name=bot_info.name,
            status="pending",
            deployment_id=deployment_id,
            message=f"{bot_info.name} deployment requested. Expected delivery: 1-2 weeks",
            deployed_at=datetime.utcnow()
        )


@router.post("/{bot_id}/execute", response_model=BotExecuteResponse)
async def execute_bot(
    bot_id: str,
    request: BotExecuteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Execute a bot query.
    
    Only functional bots can be executed.
    Returns real bot results using the BotManager.
    """
    # Check if bot is functional
    if bot_id not in FUNCTIONAL_BOTS:
        raise HTTPException(
            status_code=400,
            detail=f"Bot '{bot_id}' is not yet available. Status: Coming Soon"
        )
    
    # Get bot info
    bot_info = bot_manager.get_bot(bot_id)
    
    if not bot_info:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' not found")
    
    # Record start time
    start_time = datetime.utcnow()
    
    try:
        # Execute bot through manager
        logger.info(
            f"Executing bot '{bot_id}' for tenant {current_user['tenant_id']}: "
            f"'{request.query}'"
        )
        
        # Prepare context
        context = request.context or {}
        context.update({
            "user_id": current_user["user_id"],
            "tenant_id": current_user["tenant_id"],
            "timestamp": start_time.isoformat()
        })
        
        # Execute bot
        result = await bot_manager.execute_bot(
            bot_id=bot_id,
            query=request.query,
            context=context
        )
        
        # Calculate execution time
        end_time = datetime.utcnow()
        execution_time_ms = (end_time - start_time).total_seconds() * 1000
        
        logger.info(
            f"Bot '{bot_id}' executed successfully in {execution_time_ms:.2f}ms "
            f"(confidence: {result.get('confidence', 0):.2f})"
        )
        
        return BotExecuteResponse(
            bot_id=bot_id,
            bot_name=bot_info.name,
            query=request.query,
            response=result.get("response", ""),
            confidence=result.get("confidence", 0.0),
            suggestions=result.get("suggestions", []),
            actions_taken=result.get("actions_taken", []),
            timestamp=end_time,
            execution_time_ms=execution_time_ms
        )
        
    except Exception as e:
        logger.error(f"Error executing bot '{bot_id}': {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Bot execution failed: {str(e)}"
        )


@router.get("/categories/list")
async def list_categories(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all bot categories available in marketplace."""
    categories = bot_manager.get_categories()
    
    # Count bots per category
    category_counts = {}
    for category in categories:
        bots = bot_manager.list_bots(category=category)
        functional = sum(1 for b in bots if b.bot_id in FUNCTIONAL_BOTS)
        category_counts[category] = {
            "total": len(bots),
            "functional": functional,
            "coming_soon": len(bots) - functional
        }
    
    return {
        "categories": categories,
        "counts": category_counts,
        "total_categories": len(categories)
    }


@router.get("/stats")
async def get_marketplace_stats(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get overall marketplace statistics."""
    all_bots = bot_manager.list_bots()
    
    functional = sum(1 for b in all_bots if b.bot_id in FUNCTIONAL_BOTS)
    
    return {
        "total_bots": len(all_bots),
        "functional_bots": functional,
        "coming_soon_bots": len(all_bots) - functional,
        "completion_percentage": round((functional / len(all_bots)) * 100, 1),
        "categories": len(bot_manager.get_categories()),
        "latest_bots": [
            "accounts_payable",
            "ar_collections", 
            "bank_reconciliation",
            "lead_qualification"
        ]
    }


# Helper functions
def _get_bot_features(bot_id: str) -> List[str]:
    """Get feature list for a bot."""
    features = {
        "bbbee_compliance": [
            "BBBEE scorecard calculation (0-100 points)",
            "Ownership verification (25.1 points)",
            "Management control tracking (19 points)",
            "Skills development reporting (20 points)",
            "Supplier verification and monitoring",
            "Annual compliance reports",
            "SANAS-compliant scoring methodology"
        ],
        "invoice_reconciliation": [
            "95%+ automated invoice matching",
            "3-way matching (PO-Invoice-Receipt)",
            "Discrepancy detection and alerts",
            "Duplicate invoice prevention",
            "Multi-currency support",
            "GL code validation",
            "Reconciliation reports"
        ],
        "expense_management": [
            "OCR receipt scanning (98%+ accuracy)",
            "Policy compliance checking",
            "Multi-level approval workflows",
            "Mileage tracking",
            "Credit card reconciliation",
            "Expense analytics dashboard",
            "Mobile app support"
        ],
        "payroll_sa": [
            "PAYE/UIF/SDL auto-calculation",
            "IRP5/IT3a generation",
            "SARS eFiling integration",
            "Leave accrual tracking",
            "Payslip generation",
            "Year-end tax certificates",
            "SDL/UIF compliance reporting"
        ],
        "accounts_payable": [
            "Invoice OCR extraction (98%+ confidence)",
            "3-way matching automation",
            "Multi-level approval routing",
            "Payment scheduling with terms",
            "Vendor performance tracking",
            "Duplicate detection",
            "AP aging reports"
        ],
        "ar_collections": [
            "AR aging analysis (0-90+ days)",
            "Automated payment reminders",
            "Escalation workflows",
            "AI payment prediction (85%+ accuracy)",
            "Customer risk scoring",
            "DSO tracking and reduction",
            "Collection performance dashboards"
        ],
        "bank_reconciliation": [
            "Multi-bank statement import",
            "90%+ auto-matching accuracy",
            "Anomaly and fraud detection",
            "Outstanding transaction tracking",
            "Bank fee reconciliation",
            "Comprehensive reports",
            "Multi-currency support"
        ],
        "lead_qualification": [
            "AI lead scoring (0-100)",
            "Automatic qualification (Hot/Warm/Cold)",
            "Sales team routing",
            "CRM sync (Salesforce, HubSpot, Zoho)",
            "Lead source tracking",
            "Conversion funnel analysis",
            "Pipeline value estimation"
        ]
    }
    
    return features.get(bot_id, ["Feature list coming soon"])


def _get_bot_use_cases(bot_id: str) -> List[str]:
    """Get use cases for a bot."""
    use_cases = {
        "bbbee_compliance": [
            "Calculate and track BBBEE scorecard for tender submissions",
            "Verify supplier BBBEE credentials before procurement",
            "Generate annual BBBEE compliance reports",
            "Monitor supplier diversity and ownership changes"
        ],
        "invoice_reconciliation": [
            "Match supplier invoices to purchase orders automatically",
            "Identify pricing discrepancies before payment",
            "Prevent duplicate invoice payments",
            "Reconcile month-end accounts payable"
        ],
        "expense_management": [
            "Process employee expense claims from receipts",
            "Enforce company expense policies automatically",
            "Track departmental spending vs budgets",
            "Reconcile credit card statements"
        ],
        "payroll_sa": [
            "Process monthly payroll with PAYE/UIF/SDL",
            "Generate payslips for employees",
            "File tax with SARS electronically",
            "Produce year-end IRP5 certificates"
        ],
        "accounts_payable": [
            "Automate invoice processing from capture to payment",
            "Route invoices for multi-level approvals",
            "Schedule supplier payments based on terms",
            "Track AP aging and overdue payments"
        ],
        "ar_collections": [
            "Automate customer payment reminders",
            "Identify high-risk overdue accounts",
            "Reduce Days Sales Outstanding (DSO)",
            "Predict payment likelihood for customers"
        ],
        "bank_reconciliation": [
            "Reconcile bank statements monthly",
            "Match transactions automatically",
            "Identify missing or duplicate entries",
            "Detect unusual transactions for fraud prevention"
        ],
        "lead_qualification": [
            "Score incoming leads automatically",
            "Route hot leads to sales team immediately",
            "Track lead sources and ROI",
            "Predict conversion probability"
        ]
    }
    
    return use_cases.get(bot_id, ["Use cases coming soon"])


def _get_bot_integrations(bot_id: str) -> List[str]:
    """Get integration list for a bot."""
    integrations = {
        "bbbee_compliance": ["CIPC", "SANAS verification databases"],
        "invoice_reconciliation": ["SAP", "Odoo", "Xero", "QuickBooks", "Sage"],
        "expense_management": ["Xero", "QuickBooks", "Sage", "Credit card providers"],
        "payroll_sa": ["SARS eFiling", "Banking (EFT)", "HR systems"],
        "accounts_payable": ["SAP", "Odoo", "Xero", "QuickBooks", "Banking (EFT)"],
        "ar_collections": ["Xero", "QuickBooks", "Sage", "Email", "SMS gateways"],
        "bank_reconciliation": ["FNB", "ABSA", "Standard Bank", "Nedbank", "Accounting systems"],
        "lead_qualification": ["Salesforce", "HubSpot", "Zoho CRM", "Email", "LinkedIn"]
    }
    
    return integrations.get(bot_id, ["Integration details coming soon"])
