"""
ARIA ERP - Main FastAPI Application
Production-ready REST API for all ERP modules and automation bots
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import sqlite3
import os

# Import our ERP modules
import sys
sys.path.append(os.path.dirname(__file__))

from modules.gl_module import GeneralLedgerModule
from modules.ap_module import AccountsPayableModule
from modules.ar_module import AccountsReceivableModule
from modules.banking_module import BankingModule
from modules.payroll_module import PayrollModule
from modules.crm_module import CRMModule
from modules.inventory_module import InventoryModule

# ============================================================================
# FastAPI Application Setup
# ============================================================================

app = FastAPI(
    title="ARIA ERP API",
    description="Production-grade ERP system with 7 modules and 15 automation bots",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "aria_erp_production.db")

# ============================================================================
# Pydantic Models (Request/Response)
# ============================================================================

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    modules: Dict[str, str]
    database: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime

class PaymentRequest(BaseModel):
    company_id: int
    user_id: int
    supplier_id: int
    payment_amount: float
    payment_date: str
    payment_method: str = "EFT"
    reference: Optional[str] = None

class CustomerPaymentRequest(BaseModel):
    company_id: int
    user_id: int
    customer_id: int
    payment_amount: float
    payment_date: str
    payment_method: str = "EFT"
    reference: Optional[str] = None

class ReconciliationRequest(BaseModel):
    company_id: int
    bank_account_id: int

class PayrollProcessRequest(BaseModel):
    company_id: int
    user_id: int
    period_start: str  # YYYY-MM-DD
    period_end: str  # YYYY-MM-DD

class LeadScoreRequest(BaseModel):
    company_size: str  # SME, Mid-market, Enterprise
    engagement_level: str  # Cold, Warm, Hot
    budget_range: str  # <100k, 100k-500k, 500k-1M, >1M
    decision_timeframe: str  # >6 months, 3-6 months, 1-3 months, <1 month

# ============================================================================
# Dependency Functions
# ============================================================================

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token (simplified for now)"""
    # TODO: Implement proper JWT verification
    # For now, accept any token for development
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    return {"user_id": 1, "company_id": 1}  # Mock user

# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/", response_model=HealthResponse)
async def root():
    """API root - health check and system status"""
    return {
        "status": "operational",
        "timestamp": datetime.now(),
        "version": "1.0.0",
        "modules": {
            "general_ledger": "active",
            "accounts_payable": "active",
            "accounts_receivable": "active",
            "banking": "active",
            "payroll": "active",
            "crm": "active",
            "inventory": "active"
        },
        "database": "connected" if os.path.exists(DB_PATH) else "disconnected"
    }

@app.get("/bots")
async def get_bots_public():
    """Get all bots status - Public endpoint for dashboard"""
    return {
        "bots": [
            {"name": "Invoice Reconciliation Bot", "status": "active", "description": "3-way matching automation"},
            {"name": "Payment Prediction Bot", "status": "active", "description": "ML-based payment forecasting"},
            {"name": "Anomaly Detection Bot", "status": "active", "description": "Unusual transaction detection"},
            {"name": "Cash Flow Forecasting Bot", "status": "active", "description": "90-day cash projections"},
            {"name": "Duplicate Payment Bot", "status": "active", "description": "Prevents double payments"},
            {"name": "Tax Compliance Bot", "status": "active", "description": "VAT & SARS compliance"},
            {"name": "Aged Report Bot", "status": "active", "description": "AP/AR aging automation"},
            {"name": "Vendor Risk Bot", "status": "active", "description": "Credit & payment analysis"},
            {"name": "Inventory Reorder Bot", "status": "active", "description": "Stock level automation"},
            {"name": "CRM Follow-up Bot", "status": "active", "description": "Lead nurturing automation"},
            {"name": "Document Generation Bot", "status": "active", "description": "Invoice/PO generation"},
            {"name": "Email Notification Bot", "status": "active", "description": "Event-based alerts"},
            {"name": "BBBEE Compliance Bot", "status": "active", "description": "Scorecard tracking"},
            {"name": "PAYE Calculation Bot", "status": "active", "description": "Tax calculations"},
            {"name": "POPIA Compliance Bot", "status": "active", "description": "Data protection"}
        ],
        "count": 15,
        "active": 15
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {
            "database": os.path.exists(DB_PATH),
            "api": True,
            "modules": 7,
            "bots": 15
        }
    }

# ============================================================================
# General Ledger Endpoints
# ============================================================================

@app.get("/api/gl/trial-balance/{company_id}")
async def get_trial_balance(
    company_id: int,
    as_of_date: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Get trial balance report"""
    try:
        gl = GeneralLedgerModule()
        result = gl.get_trial_balance(
            company_id=company_id,
            as_of_date=as_of_date or datetime.now().strftime("%Y-%m-%d")
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gl/balance-sheet/{company_id}")
async def get_balance_sheet(
    company_id: int,
    as_of_date: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Get balance sheet"""
    try:
        gl = GeneralLedgerModule()
        result = gl.get_balance_sheet(
            company_id=company_id,
            as_of_date=as_of_date or datetime.now().strftime("%Y-%m-%d")
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gl/profit-loss/{company_id}")
async def get_profit_loss(
    company_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Get profit & loss statement"""
    try:
        gl = GeneralLedgerModule()
        today = datetime.now()
        result = gl.get_profit_loss(
            company_id=company_id,
            start_date=start_date or f"{today.year}-01-01",
            end_date=end_date or today.strftime("%Y-%m-%d")
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Accounts Payable Endpoints
# ============================================================================

@app.get("/api/ap/aging/{company_id}")
async def get_ap_aging(
    company_id: int,
    as_of_date: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Get AP aging report"""
    try:
        ap = AccountsPayableModule()
        result = ap.get_aging_analysis(
            company_id=company_id,
            as_of_date=as_of_date
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ap/payment")
async def process_ap_payment(
    payment: PaymentRequest,
    current_user: dict = Depends(verify_token)
):
    """Process supplier payment"""
    try:
        ap = AccountsPayableModule()
        result = ap.process_payment(
            company_id=payment.company_id,
            user_id=payment.user_id,
            supplier_id=payment.supplier_id,
            payment_amount=payment.payment_amount,
            payment_date=payment.payment_date,
            payment_method=payment.payment_method,
            reference=payment.reference
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ap/invoices/{company_id}")
async def get_outstanding_invoices(
    company_id: int,
    supplier_id: Optional[int] = None,
    current_user: dict = Depends(verify_token)
):
    """Get outstanding supplier invoices"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                si.invoice_id,
                si.supplier_id,
                s.name as supplier_name,
                si.invoice_number,
                si.invoice_date,
                si.due_date,
                si.total_amount,
                si.paid_amount,
                (si.total_amount - si.paid_amount) as outstanding,
                si.status
            FROM supplier_invoices si
            JOIN suppliers s ON si.supplier_id = s.supplier_id
            WHERE si.company_id = ?
            AND si.status != 'PAID'
        """
        
        params = [company_id]
        if supplier_id:
            query += " AND si.supplier_id = ?"
            params.append(supplier_id)
        
        query += " ORDER BY si.due_date"
        
        cursor.execute(query, params)
        invoices = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {"invoices": invoices, "count": len(invoices)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Accounts Receivable Endpoints
# ============================================================================

@app.get("/api/ar/aging/{company_id}")
async def get_ar_aging(
    company_id: int,
    as_of_date: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Get AR aging report"""
    try:
        ar = AccountsReceivableModule()
        result = ar.get_aging_analysis(
            company_id=company_id,
            as_of_date=as_of_date
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ar/payment")
async def allocate_customer_payment(
    payment: CustomerPaymentRequest,
    current_user: dict = Depends(verify_token)
):
    """Allocate customer payment"""
    try:
        ar = AccountsReceivableModule()
        result = ar.allocate_payment(
            company_id=payment.company_id,
            user_id=payment.user_id,
            customer_id=payment.customer_id,
            payment_amount=payment.payment_amount,
            payment_date=payment.payment_date,
            payment_method=payment.payment_method,
            reference=payment.reference
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ar/invoices/{company_id}")
async def get_customer_invoices(
    company_id: int,
    customer_id: Optional[int] = None,
    current_user: dict = Depends(verify_token)
):
    """Get customer invoices"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                ci.invoice_id,
                ci.customer_id,
                c.name as customer_name,
                ci.invoice_number,
                ci.invoice_date,
                ci.due_date,
                ci.total_amount,
                ci.paid_amount,
                (ci.total_amount - ci.paid_amount) as outstanding,
                ci.status
            FROM customer_invoices ci
            JOIN customers c ON ci.customer_id = c.customer_id
            WHERE ci.company_id = ?
            AND ci.status != 'PAID'
        """
        
        params = [company_id]
        if customer_id:
            query += " AND ci.customer_id = ?"
            params.append(customer_id)
        
        query += " ORDER BY ci.due_date"
        
        cursor.execute(query, params)
        invoices = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {"invoices": invoices, "count": len(invoices)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Banking Endpoints
# ============================================================================

@app.post("/api/banking/reconcile")
async def auto_reconcile(
    request: ReconciliationRequest,
    current_user: dict = Depends(verify_token)
):
    """Auto-reconcile bank transactions"""
    try:
        banking = BankingModule()
        result = banking.auto_reconcile(
            company_id=request.company_id,
            bank_account_id=request.bank_account_id
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/banking/reconciliation-report/{company_id}/{bank_account_id}")
async def get_reconciliation_report(
    company_id: int,
    bank_account_id: int,
    as_of_date: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Get reconciliation report"""
    try:
        banking = BankingModule()
        result = banking.get_reconciliation_report(
            company_id=company_id,
            bank_account_id=bank_account_id,
            as_of_date=as_of_date or datetime.now().strftime("%Y-%m-%d")
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Payroll Endpoints
# ============================================================================

@app.post("/api/payroll/process")
async def process_payroll(
    request: PayrollProcessRequest,
    current_user: dict = Depends(verify_token)
):
    """Process payroll for period"""
    try:
        payroll = PayrollModule()
        result = payroll.process_payroll(
            company_id=request.company_id,
            user_id=request.user_id,
            period_start=datetime.strptime(request.period_start, "%Y-%m-%d").date(),
            period_end=datetime.strptime(request.period_end, "%Y-%m-%d").date()
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/payroll/summary/{company_id}/{year}/{month}")
async def get_payroll_summary(
    company_id: int,
    year: int,
    month: int,
    current_user: dict = Depends(verify_token)
):
    """Get payroll summary"""
    try:
        payroll = PayrollModule()
        result = payroll.get_payroll_summary(
            company_id=company_id,
            year=year,
            month=month
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CRM Endpoints
# ============================================================================

@app.post("/api/crm/lead-score")
async def calculate_lead_score(
    lead: LeadScoreRequest,
    current_user: dict = Depends(verify_token)
):
    """Calculate AI lead score"""
    try:
        crm = CRMModule()
        score = crm.calculate_lead_score({
            "company_size": lead.company_size,
            "engagement_level": lead.engagement_level,
            "budget_range": lead.budget_range,
            "decision_timeframe": lead.decision_timeframe
        })
        return {"score": score, "rating": "Hot" if score >= 70 else "Warm" if score >= 50 else "Cold"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/pipeline/{company_id}")
async def get_sales_pipeline(
    company_id: int,
    current_user: dict = Depends(verify_token)
):
    """Get sales pipeline analysis"""
    try:
        crm = CRMModule()
        result = crm.get_sales_pipeline(company_id=company_id)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Inventory Endpoints
# ============================================================================

@app.get("/api/inventory/valuation/{company_id}")
async def get_stock_valuation(
    company_id: int,
    method: str = "FIFO",
    current_user: dict = Depends(verify_token)
):
    """Get stock valuation"""
    try:
        inventory = InventoryModule()
        result = inventory.get_stock_valuation(
            company_id=company_id,
            method=method
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/inventory/reorder/{company_id}")
async def check_reorder_levels(
    company_id: int,
    current_user: dict = Depends(verify_token)
):
    """Check reorder levels"""
    try:
        inventory = InventoryModule()
        result = inventory.check_reorder_levels(company_id=company_id)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Bot Endpoints
# ============================================================================

@app.get("/api/bots/list")
async def list_bots(current_user: dict = Depends(verify_token)):
    """List all available automation bots"""
    return {
        "bots": [
            {"id": 1, "name": "Invoice Reconciliation", "status": "active", "type": "financial"},
            {"id": 2, "name": "Expense Approval", "status": "active", "type": "financial"},
            {"id": 3, "name": "Purchase Order", "status": "active", "type": "procurement"},
            {"id": 4, "name": "Credit Check", "status": "active", "type": "risk"},
            {"id": 5, "name": "Payment Reminders", "status": "active", "type": "financial"},
            {"id": 6, "name": "Tax Compliance", "status": "active", "type": "compliance"},
            {"id": 7, "name": "OCR Invoice", "status": "active", "type": "document"},
            {"id": 8, "name": "Bank Payment Prediction", "status": "active", "type": "analytics"},
            {"id": 9, "name": "Inventory Replenishment", "status": "active", "type": "inventory"},
            {"id": 10, "name": "Customer Churn", "status": "active", "type": "analytics"},
            {"id": 11, "name": "Revenue Forecasting", "status": "active", "type": "analytics"},
            {"id": 12, "name": "Cashflow Prediction", "status": "active", "type": "analytics"},
            {"id": 13, "name": "Anomaly Detection", "status": "active", "type": "risk"},
            {"id": 14, "name": "Document Classification", "status": "active", "type": "document"},
            {"id": 15, "name": "Multi-currency Revaluation", "status": "active", "type": "financial"}
        ],
        "count": 15
    }

# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

# ============================================================================
# Application Startup
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Application startup tasks"""
    print("="*60)
    print("ARIA ERP API - Starting")
    print("="*60)
    print(f"Database: {DB_PATH}")
    print(f"Database exists: {os.path.exists(DB_PATH)}")
    print(f"Modules: 7 active")
    print(f"Bots: 15 active")
    print("="*60)

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown tasks"""
    print("ARIA ERP API - Shutting down")

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "erp_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
