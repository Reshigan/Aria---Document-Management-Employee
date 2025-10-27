"""
Bot API Routes - Query all 25 Aria bots

Provides REST API endpoints for interacting with Aria's intelligent bots.
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from backend.auth.jwt_auth import get_current_user, get_current_tenant_id
from backend.database.multi_tenant import get_current_tenant_db

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for requests/responses
class BotQueryRequest(BaseModel):
    """Request to query a bot."""
    query: str = Field(..., description="Natural language query", min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    attachments: Optional[List[str]] = Field(default=None, description="File paths/URLs")


class BotQueryResponse(BaseModel):
    """Response from bot query."""
    bot_id: str
    bot_name: str
    query: str
    response: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    suggestions: Optional[List[str]] = None
    actions_taken: Optional[List[str]] = None
    timestamp: datetime
    request_id: str


class BotInfo(BaseModel):
    """Bot information."""
    bot_id: str
    name: str
    description: str
    category: str
    capabilities: List[str]
    is_enabled: bool
    requires_bbbee: bool = False
    requires_sars: bool = False


class BotListResponse(BaseModel):
    """List of available bots."""
    bots: List[BotInfo]
    total: int


class BotStatusResponse(BaseModel):
    """Bot status."""
    bot_id: str
    name: str
    is_online: bool
    last_query_at: Optional[datetime]
    total_queries: int
    avg_response_time_ms: float
    success_rate: float


# All 25 Aria bots
ARIA_BOTS = {
    # Financial Operations (8 bots)
    "sap_document_scanner": {
        "name": "SAP Document Scanner",
        "description": "OCR and extract data from SAP documents",
        "category": "Financial",
        "capabilities": ["ocr", "sap_integration", "data_extraction"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "invoice_reconciliation": {
        "name": "Invoice Reconciliation Bot",
        "description": "Match and reconcile invoices with POs",
        "category": "Financial",
        "capabilities": ["invoice_matching", "3_way_match", "discrepancy_detection"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "expense_approval": {
        "name": "Expense Approval Bot",
        "description": "Automate expense report approval workflow",
        "category": "Financial",
        "capabilities": ["expense_validation", "policy_checking", "auto_approval"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "ar_collections": {
        "name": "AR Collections Bot",
        "description": "Automate accounts receivable collections",
        "category": "Financial",
        "capabilities": ["payment_reminders", "aging_analysis", "collection_strategy"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "general_ledger": {
        "name": "General Ledger Bot",
        "description": "Automate GL postings and journal entries",
        "category": "Financial",
        "capabilities": ["journal_entries", "account_reconciliation", "trial_balance"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "accounts_payable": {
        "name": "Accounts Payable Bot",
        "description": "Automate AP processing and payments",
        "category": "Financial",
        "capabilities": ["invoice_processing", "payment_scheduling", "vendor_management"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "bank_reconciliation": {
        "name": "Bank Reconciliation Bot",
        "description": "Automatically reconcile bank statements",
        "category": "Financial",
        "capabilities": ["bank_statement_import", "transaction_matching", "discrepancy_resolution"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "financial_close": {
        "name": "Financial Close Bot",
        "description": "Automate month-end/year-end closing",
        "category": "Financial",
        "capabilities": ["close_checklist", "accruals", "financial_reports"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    
    # Sales & Revenue (4 bots)
    "sales_order": {
        "name": "Sales Order Bot",
        "description": "Process sales orders from email/WhatsApp",
        "category": "Sales",
        "capabilities": ["order_entry", "inventory_check", "order_confirmation"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "lead_qualification": {
        "name": "Lead Qualification Bot",
        "description": "Qualify and score leads automatically",
        "category": "Sales",
        "capabilities": ["lead_scoring", "data_enrichment", "lead_routing"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "quote_generation": {
        "name": "Quote Generation Bot",
        "description": "Generate quotes from natural language",
        "category": "Sales",
        "capabilities": ["quote_creation", "pricing_rules", "pdf_generation"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "contract_renewal": {
        "name": "Contract Renewal Bot",
        "description": "Track and automate contract renewals",
        "category": "Sales",
        "capabilities": ["renewal_reminders", "contract_analysis", "upsell_suggestions"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    
    # Operations (4 bots)
    "inventory_reorder": {
        "name": "Inventory Reorder Bot",
        "description": "Automatically reorder inventory",
        "category": "Operations",
        "capabilities": ["stock_monitoring", "reorder_point", "po_generation"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "manufacturing": {
        "name": "Manufacturing Bot",
        "description": "Manage manufacturing orders and BOM",
        "category": "Operations",
        "capabilities": ["work_orders", "bom_management", "production_scheduling"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "purchasing": {
        "name": "Purchasing Bot",
        "description": "Automate procurement process",
        "category": "Operations",
        "capabilities": ["rfq_management", "vendor_selection", "po_creation"],
        "requires_bbbee": True,  # 🇿🇦 BBBEE supplier verification!
        "requires_sars": False
    },
    "warehouse_management": {
        "name": "Warehouse Management Bot",
        "description": "Manage warehouse operations",
        "category": "Operations",
        "capabilities": ["picking", "packing", "shipping", "inventory_tracking"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    
    # HR (4 bots)
    "it_helpdesk": {
        "name": "IT Helpdesk Bot",
        "description": "Resolve common IT support tickets",
        "category": "HR",
        "capabilities": ["ticket_triage", "password_reset", "software_requests"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "leave_management": {
        "name": "Leave Management Bot",
        "description": "Process leave requests automatically",
        "category": "HR",
        "capabilities": ["leave_requests", "balance_checking", "approval_workflow"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "employee_onboarding": {
        "name": "Employee Onboarding Bot",
        "description": "Automate new hire onboarding",
        "category": "HR",
        "capabilities": ["onboarding_checklist", "document_collection", "system_provisioning"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "payroll": {
        "name": "Payroll Bot (SA)",
        "description": "SARS-compliant payroll processing",
        "category": "HR",
        "capabilities": ["payroll_calculation", "sars_filing", "irp5_generation", "uif_sdl"],
        "requires_bbbee": False,
        "requires_sars": True  # 🇿🇦 SARS compliance required!
    },
    
    # Projects (1 bot)
    "project_management": {
        "name": "Project Management Bot",
        "description": "Track projects and tasks",
        "category": "Projects",
        "capabilities": ["task_management", "time_tracking", "milestone_tracking"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    
    # Platform (3 bots)
    "whatsapp_helpdesk": {
        "name": "WhatsApp Helpdesk Bot",
        "description": "Customer support via WhatsApp",
        "category": "Platform",
        "capabilities": ["whatsapp_integration", "automated_responses", "ticket_creation"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "meta_bot_orchestrator": {
        "name": "Meta-Bot Orchestrator",
        "description": "Route queries to appropriate bots",
        "category": "Platform",
        "capabilities": ["intent_detection", "bot_routing", "multi_bot_queries"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "analytics": {
        "name": "Analytics Bot",
        "description": "Generate insights and reports",
        "category": "Platform",
        "capabilities": ["report_generation", "data_visualization", "predictive_analytics"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    
    # Compliance (2 bots)
    "compliance_audit": {
        "name": "Compliance & Audit Bot",
        "description": "Monitor compliance and audit trails",
        "category": "Compliance",
        "capabilities": ["audit_logging", "compliance_checking", "report_generation"],
        "requires_bbbee": False,
        "requires_sars": False
    },
    "bbbee_compliance": {
        "name": "BBBEE Compliance Bot",
        "description": "Automated BBBEE scorecard calculation",
        "category": "Compliance",
        "capabilities": ["scorecard_calculation", "supplier_verification", "annual_updates"],
        "requires_bbbee": True,  # 🇿🇦 BBBEE feature!
        "requires_sars": False
    }
}


@router.get("/", response_model=BotListResponse)
async def list_bots(
    category: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    List all available bots for the tenant.
    
    Filters based on tenant's subscription tier and enabled features.
    """
    from backend.models.tenant import Tenant
    
    # Get tenant
    tenant = db.query(Tenant).filter(
        Tenant.tenant_id == current_user["tenant_id"]
    ).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Filter bots based on tenant's subscription
    bots = []
    for bot_id, bot_info in ARIA_BOTS.items():
        # Check if bot requires BBBEE
        if bot_info["requires_bbbee"] and not tenant.bbbee_enabled:
            continue
        
        # Check if bot requires SARS
        if bot_info["requires_sars"] and not tenant.sars_payroll_enabled:
            continue
        
        # Check if bot is in tenant's enabled list (if list exists)
        if tenant.enabled_bots and len(tenant.enabled_bots) > 0:
            if bot_id not in tenant.enabled_bots:
                continue
        
        # Filter by category if provided
        if category and bot_info["category"] != category:
            continue
        
        bots.append(BotInfo(
            bot_id=bot_id,
            name=bot_info["name"],
            description=bot_info["description"],
            category=bot_info["category"],
            capabilities=bot_info["capabilities"],
            is_enabled=True,
            requires_bbbee=bot_info["requires_bbbee"],
            requires_sars=bot_info["requires_sars"]
        ))
    
    logger.info(f"Listed {len(bots)} bots for tenant {tenant.tenant_id}")
    
    return BotListResponse(bots=bots, total=len(bots))


@router.post("/{bot_id}/query", response_model=BotQueryResponse)
async def query_bot(
    bot_id: str,
    request: BotQueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Query a specific bot with natural language.
    
    This is the main endpoint for interacting with Aria's bots.
    """
    # Check if bot exists
    if bot_id not in ARIA_BOTS:
        raise HTTPException(
            status_code=404,
            detail=f"Bot '{bot_id}' not found"
        )
    
    bot_info = ARIA_BOTS[bot_id]
    
    # Check if tenant has access to this bot
    from backend.models.tenant import Tenant
    tenant = db.query(Tenant).filter(
        Tenant.tenant_id == current_user["tenant_id"]
    ).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Check BBBEE requirement
    if bot_info["requires_bbbee"] and not tenant.bbbee_enabled:
        raise HTTPException(
            status_code=403,
            detail=f"Bot '{bot_id}' requires BBBEE feature (Growth or Professional tier)"
        )
    
    # Check SARS requirement
    if bot_info["requires_sars"] and not tenant.sars_payroll_enabled:
        raise HTTPException(
            status_code=403,
            detail=f"Bot '{bot_id}' requires SARS Payroll feature (Growth or Professional tier)"
        )
    
    # ✅ REAL BOT EXECUTION (No longer mock!)
    logger.info(
        f"Bot query: {bot_id} by user {current_user['user_id']} "
        f"in tenant {current_user['tenant_id']}: '{request.query}'"
    )
    
    # Generate request ID
    import uuid
    request_id = str(uuid.uuid4())
    
    # Initialize Bot Intelligence Service
    from services.bot_intelligence_service import BotIntelligenceService
    bot_service = BotIntelligenceService(db, current_user["tenant_id"])
    
    # Prepare user context
    user_context = {
        "user_id": current_user["user_id"],
        "tenant_id": current_user["tenant_id"],
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Route to appropriate bot handler
    bot_handlers = {
        "invoice_reconciliation": bot_service.invoice_reconciliation_query,
        "bbbee_compliance": bot_service.bbbee_compliance_query,
        "expense_management": bot_service.expense_management_query,
        "payroll": bot_service.payroll_sa_query,
        "ar_collections": bot_service.ar_collections_query,
        "leave_management": bot_service.leave_management_query,
        "inventory_reorder": bot_service.inventory_reorder_query,
        "lead_qualification": bot_service.lead_qualification_query,
    }
    
    # Execute bot or fall back to general query
    bot_handler = bot_handlers.get(bot_id, bot_service.general_query)
    
    try:
        # Execute bot with real AI and data
        bot_result = await bot_handler(request.query, user_context)
        
        response_text = bot_result.get("response", "Bot processing complete")
        confidence = bot_result.get("confidence", 0.85)
        suggestions = bot_result.get("suggestions", [])
        actions_taken = bot_result.get("actions_taken", [])
        
    except Exception as e:
        logger.error(f"Bot execution error: {str(e)}")
        response_text = f"I encountered an issue processing your request: {str(e)}. Please try rephrasing your question."
        confidence = 0.3
        suggestions = ["Try a simpler query", "Check if data exists in the system"]
        actions_taken = ["Error occurred during processing"]
    
    # Update tenant usage
    tenant.bot_requests_count += 1
    db.commit()
    
    return BotQueryResponse(
        bot_id=bot_id,
        bot_name=bot_info["name"],
        query=request.query,
        response=response_text,
        confidence=confidence,
        suggestions=suggestions,
        actions_taken=actions_taken,
        timestamp=datetime.utcnow(),
        request_id=request_id
    )


@router.get("/{bot_id}/status", response_model=BotStatusResponse)
async def get_bot_status(
    bot_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get bot status and performance metrics."""
    if bot_id not in ARIA_BOTS:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' not found")
    
    bot_info = ARIA_BOTS[bot_id]
    
    # TODO: Get real metrics from database
    return BotStatusResponse(
        bot_id=bot_id,
        name=bot_info["name"],
        is_online=True,
        last_query_at=datetime.utcnow(),
        total_queries=1250,
        avg_response_time_ms=450.5,
        success_rate=0.98
    )


@router.get("/{bot_id}/history")
async def get_bot_history(
    bot_id: str,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """Get query history for a bot."""
    if bot_id not in ARIA_BOTS:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' not found")
    
    # TODO: Query bot_requests table
    return {
        "bot_id": bot_id,
        "history": [],
        "total": 0
    }


@router.get("/categories")
async def list_bot_categories(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all bot categories."""
    categories = set()
    for bot_info in ARIA_BOTS.values():
        categories.add(bot_info["category"])
    
    return {
        "categories": sorted(list(categories)),
        "total": len(categories)
    }
