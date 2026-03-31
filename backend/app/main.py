import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
"""
ARIA ERP - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import Base, engine
from core.exceptions import add_exception_handlers
from core.middleware import DatabaseSessionMiddleware, RequestContextMiddleware

# API Routes
from app.api import auth, customers, suppliers, invoices, accounts, payments, dashboard, bots
from app.api import ap, crm, banking, search, reports, vat, user_management, backup_recovery
from app.api import master_data_pg, order_to_cash_pg, procure_to_pay_pg
from app.api import hr_payroll_pg
from app.api import documents as document_api

# Admin Config Routes
from app.api import workflow_admin_config, quality_admin_config, manufacturing_admin_config
from app.api import payroll_hr_admin_config, ar_ap_banking_admin_config

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Native ERP System with 67 AI Bots",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
from app.core.config import get_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(settings),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add centralized exception handlers
add_exception_handlers(app)

# Add middleware for database sessions and request context
app.add_middleware(DatabaseSessionMiddleware)
app.add_middleware(RequestContextMiddleware)

# Create database tables
@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    Base.metadata.create_all(bind=engine)
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} started!")
    print(f"📚 API Documentation: http://localhost:8000/docs")

# Include API routers

# Core ERP Modules
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(customers.router, prefix=settings.API_V1_PREFIX)
app.include_router(suppliers.router, prefix=settings.API_V1_PREFIX)
app.include_router(invoices.router, prefix=settings.API_V1_PREFIX)
app.include_router(accounts.router, prefix=settings.API_V1_PREFIX)
app.include_router(payments.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(bots.router, prefix=settings.API_V1_PREFIX)

# Accounts Payable & Receivable
app.include_router(ap.router, prefix=settings.API_V1_PREFIX)

# HR & Payroll (multiple routers)
app.include_router(hr_payroll_pg.payroll_runs_router, prefix="")
app.include_router(hr_payroll_pg.leave_requests_router, prefix="")

# CRM, Banking, and other modules
from app.api import crm_pg, banking_pg, inventory_pg, fixed_assets_pg, manufacturing_pg
app.include_router(crm_pg.router, prefix=settings.API_V1_PREFIX)
app.include_router(banking_pg.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory_pg.router, prefix=settings.API_V1_PREFIX)
app.include_router(fixed_assets_pg.router, prefix=settings.API_V1_PREFIX)
app.include_router(manufacturing_pg.router, prefix=settings.API_V1_PREFIX)

# Master Data and Business Processes
app.include_router(master_data_pg.router, prefix=settings.API_V1_PREFIX)
app.include_router(order_to_cash_pg.router, prefix=settings.API_V1_PREFIX)
app.include_router(procure_to_pay_pg.router, prefix=settings.API_V1_PREFIX)

# Document Management
app.include_router(document_api.router, prefix=settings.API_V1_PREFIX)

# Reports & Search
app.include_router(search.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)

# Compliance
app.include_router(vat.router, prefix=settings.API_V1_PREFIX)

# Administrative Functions
app.include_router(user_management.router, prefix=settings.API_V1_PREFIX)
app.include_router(backup_recovery.router, prefix=settings.API_V1_PREFIX)

# Admin Configuration
app.include_router(workflow_admin_config.router, prefix=settings.API_V1_PREFIX)
app.include_router(quality_admin_config.router, prefix=settings.API_V1_PREFIX)
app.include_router(manufacturing_admin_config.router, prefix=settings.API_V1_PREFIX)
app.include_router(payroll_hr_admin_config.router, prefix=settings.API_V1_PREFIX)
app.include_router(ar_ap_banking_admin_config.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "AI-Native ERP System",
        "docs": "/docs",
        "health": "/health",
        "api": settings.API_V1_PREFIX,
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
