"""
Minimal FastAPI App for Testing Bots and ERP
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

app = FastAPI(
    title="ARIA - Minimal API",
    description="Minimal API for testing bots and ERP functionality",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import bots
try:
    from bots.invoice_reconciliation_bot import InvoiceReconciliationBot
    from bots.expense_management_bot import ExpenseManagementBot
    from bots.accounts_payable_bot import AccountsPayableBot
    from bots.ar_collections_bot import ARCollectionsBot
    from bots.bank_reconciliation_bot import BankReconciliationBot
    from bots.lead_qualification_bot import LeadQualificationBot
    from bots.payroll_sa_bot import PayrollSABot
    from bots.bbbee_compliance_bot import BBBEEComplianceBot
    
    BOTS_LOADED = True
    BOTS = {
        'invoice_reconciliation': InvoiceReconciliationBot(),
        'expense_management': ExpenseManagementBot(),
        'accounts_payable': AccountsPayableBot(),
        'ar_collections': ARCollectionsBot(),
        'bank_reconciliation': BankReconciliationBot(),
        'lead_qualification': LeadQualificationBot(),
        'payroll_sa': PayrollSABot(),
        'bbbee_compliance': BBBEEComplianceBot(),
    }
except Exception as e:
    BOTS_LOADED = False
    BOTS = {}
    print(f"Error loading bots: {e}")

# Pydantic models
class BotExecuteRequest(BaseModel):
    bot_name: str
    data: Dict[str, Any]

class BotExecuteResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    bots_loaded: bool
    bots_count: int
    bots_available: List[str]

# Routes
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "bots_loaded": BOTS_LOADED,
        "bots_count": len(BOTS),
        "bots_available": list(BOTS.keys())
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ARIA Minimal API",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/api/bots",
            "/api/bots/execute",
            "/api/erp/financial",
            "/api/erp/hr",
            "/api/erp/crm"
        ]
    }

@app.get("/api/bots")
async def list_bots():
    """List all available bots"""
    if not BOTS_LOADED:
        raise HTTPException(status_code=503, detail="Bots not loaded")
    
    bot_info = []
    for name, bot in BOTS.items():
        bot_info.append({
            "name": name,
            "type": bot.__class__.__name__,
            "description": getattr(bot, 'description', 'No description available'),
            "capabilities": getattr(bot, 'capabilities', [])
        })
    
    return {
        "success": True,
        "count": len(bot_info),
        "bots": bot_info
    }

@app.post("/api/bots/execute", response_model=BotExecuteResponse)
async def execute_bot(request: BotExecuteRequest):
    """Execute a specific bot"""
    if not BOTS_LOADED:
        raise HTTPException(status_code=503, detail="Bots not loaded")
    
    if request.bot_name not in BOTS:
        raise HTTPException(
            status_code=404, 
            detail=f"Bot '{request.bot_name}' not found. Available: {list(BOTS.keys())}"
        )
    
    try:
        bot = BOTS[request.bot_name]
        result = bot.execute(request.data)
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/bots/{bot_name}")
async def get_bot_info(bot_name: str):
    """Get information about a specific bot"""
    if not BOTS_LOADED:
        raise HTTPException(status_code=503, detail="Bots not loaded")
    
    if bot_name not in BOTS:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_name}' not found")
    
    bot = BOTS[bot_name]
    return {
        "name": bot_name,
        "type": bot.__class__.__name__,
        "description": getattr(bot, 'description', 'No description available'),
        "capabilities": getattr(bot, 'capabilities', []),
        "status": "active"
    }

# ERP Endpoints
@app.get("/api/erp/financial")
async def erp_financial():
    """ERP Financial Module Status"""
    return {
        "module": "financial",
        "status": "active",
        "features": [
            "general_ledger",
            "accounts_payable",
            "accounts_receivable",
            "bank_reconciliation",
            "financial_reporting"
        ],
        "bots_integrated": [
            "invoice_reconciliation",
            "accounts_payable",
            "bank_reconciliation"
        ]
    }

@app.get("/api/erp/hr")
async def erp_hr():
    """ERP HR Module Status"""
    return {
        "module": "hr",
        "status": "active",
        "features": [
            "employee_management",
            "payroll",
            "leave_management",
            "performance_reviews",
            "compliance"
        ],
        "bots_integrated": [
            "payroll_sa",
            "bbbee_compliance"
        ]
    }

@app.get("/api/erp/crm")
async def erp_crm():
    """ERP CRM Module Status"""
    return {
        "module": "crm",
        "status": "active",
        "features": [
            "lead_management",
            "customer_management",
            "sales_pipeline",
            "marketing_automation"
        ],
        "bots_integrated": [
            "lead_qualification"
        ]
    }

@app.get("/api/erp/procurement")
async def erp_procurement():
    """ERP Procurement Module Status"""
    return {
        "module": "procurement",
        "status": "active",
        "features": [
            "purchase_orders",
            "vendor_management",
            "inventory_control",
            "expense_tracking"
        ],
        "bots_integrated": [
            "expense_management",
            "accounts_payable"
        ]
    }

@app.get("/api/erp/compliance")
async def erp_compliance():
    """ERP Compliance Module Status"""
    return {
        "module": "compliance",
        "status": "active",
        "features": [
            "bbbee_scoring",
            "regulatory_reporting",
            "audit_trails",
            "document_management"
        ],
        "bots_integrated": [
            "bbbee_compliance"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
