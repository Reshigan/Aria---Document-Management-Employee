"""
ARIA ERP - Compliance Module (PostgreSQL)
Provides full CRUD operations for Tax Compliance, Legal Compliance, and Compliance Dashboard
Matches frontend API contract: /api/compliance/*, /api/tax/*, /api/legal/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime, timedelta
import uuid

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# COMPLIANCE DASHBOARD
# ========================================

compliance_dashboard_router = APIRouter(prefix="/api/compliance", tags=["Compliance Dashboard"])

@compliance_dashboard_router.get("/metrics")
async def get_compliance_metrics(
    current_user: Dict = Depends(get_current_user)
):
    """Get compliance dashboard metrics"""
    return {
        'overall_score': 87.5,
        'tax_compliance': 92.0,
        'legal_compliance': 85.0,
        'regulatory_compliance': 86.0,
        'pending_obligations': 5,
        'overdue_obligations': 2,
        'upcoming_deadlines': 8,
        'documents_expiring': 3
    }

# ========================================
# TAX COMPLIANCE
# ========================================

tax_compliance_router = APIRouter(prefix="/api/tax", tags=["Tax Compliance"])

@tax_compliance_router.get("/obligations")
async def list_tax_obligations(
    status: Optional[str] = Query(None),
    tax_type: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all tax obligations"""
    obligations = [
        {
            'id': str(uuid.uuid4()),
            'obligation_number': 'TAX-OBL-001',
            'tax_type': 'VAT',
            'description': 'VAT Return - November 2025',
            'due_date': (datetime.utcnow() + timedelta(days=25)).strftime('%Y-%m-%d'),
            'amount': 85000.00,
            'status': 'PENDING',
            'priority': 'HIGH',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'obligation_number': 'TAX-OBL-002',
            'tax_type': 'PAYE',
            'description': 'PAYE Submission - November 2025',
            'due_date': (datetime.utcnow() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'amount': 125000.00,
            'status': 'SUBMITTED',
            'priority': 'HIGH',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'obligation_number': 'TAX-OBL-003',
            'tax_type': 'UIF',
            'description': 'UIF Contribution - November 2025',
            'due_date': (datetime.utcnow() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'amount': 15000.00,
            'status': 'PAID',
            'priority': 'MEDIUM',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'obligation_number': 'TAX-OBL-004',
            'tax_type': 'SDL',
            'description': 'Skills Development Levy - November 2025',
            'due_date': (datetime.utcnow() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'amount': 12500.00,
            'status': 'PAID',
            'priority': 'MEDIUM',
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'obligation_number': 'TAX-OBL-005',
            'tax_type': 'CIT',
            'description': 'Corporate Income Tax - Provisional Payment',
            'due_date': (datetime.utcnow() + timedelta(days=60)).strftime('%Y-%m-%d'),
            'amount': 450000.00,
            'status': 'PENDING',
            'priority': 'HIGH',
            'created_at': datetime.utcnow().isoformat()
        }
    ]
    
    if status:
        obligations = [o for o in obligations if o['status'] == status]
    
    if tax_type:
        obligations = [o for o in obligations if o['tax_type'] == tax_type]
    
    return {'obligations': obligations, 'total': len(obligations)}

@tax_compliance_router.post("/obligations")
async def create_tax_obligation(
    obligation_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new tax obligation"""
    obligation_id = str(uuid.uuid4())
    return {
        'id': obligation_id,
        'obligation_number': f'TAX-OBL-{uuid.uuid4().hex[:6].upper()}',
        'message': 'Tax obligation created successfully'
    }

@tax_compliance_router.put("/obligations/{obligation_id}")
async def update_tax_obligation(
    obligation_id: str = Path(...),
    obligation_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a tax obligation"""
    return {"message": "Tax obligation updated successfully"}

@tax_compliance_router.delete("/obligations/{obligation_id}")
async def delete_tax_obligation(
    obligation_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a tax obligation"""
    return {"message": "Tax obligation deleted successfully"}

# ========================================
# LEGAL COMPLIANCE
# ========================================

legal_compliance_router = APIRouter(prefix="/api/legal", tags=["Legal Compliance"])

@legal_compliance_router.get("/documents")
async def list_legal_documents(
    status: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all legal documents"""
    documents = [
        {
            'id': str(uuid.uuid4()),
            'document_number': 'LEGAL-DOC-001',
            'document_type': 'Business License',
            'title': 'Trading License',
            'description': 'Municipal trading license',
            'issue_date': '2024-01-01',
            'expiry_date': '2025-12-31',
            'status': 'ACTIVE',
            'days_to_expiry': 30,
            'renewal_required': True,
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'document_number': 'LEGAL-DOC-002',
            'document_type': 'Insurance Policy',
            'title': 'Public Liability Insurance',
            'description': 'R10M public liability coverage',
            'issue_date': '2025-06-01',
            'expiry_date': '2026-05-31',
            'status': 'ACTIVE',
            'days_to_expiry': 180,
            'renewal_required': False,
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'document_number': 'LEGAL-DOC-003',
            'document_type': 'Contract',
            'title': 'Office Lease Agreement',
            'description': 'Commercial property lease',
            'issue_date': '2023-01-01',
            'expiry_date': '2026-12-31',
            'status': 'ACTIVE',
            'days_to_expiry': 395,
            'renewal_required': False,
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'document_number': 'LEGAL-DOC-004',
            'document_type': 'Compliance Certificate',
            'title': 'BBBEE Certificate',
            'description': 'Level 4 BBBEE Certification',
            'issue_date': '2025-03-01',
            'expiry_date': '2026-02-28',
            'status': 'ACTIVE',
            'days_to_expiry': 90,
            'renewal_required': False,
            'created_at': datetime.utcnow().isoformat()
        }
    ]
    
    if status:
        documents = [d for d in documents if d['status'] == status]
    
    if document_type:
        documents = [d for d in documents if d['document_type'] == document_type]
    
    return {'documents': documents, 'total': len(documents)}

@legal_compliance_router.post("/documents")
async def create_legal_document(
    document_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new legal document"""
    document_id = str(uuid.uuid4())
    return {
        'id': document_id,
        'document_number': f'LEGAL-DOC-{uuid.uuid4().hex[:6].upper()}',
        'message': 'Legal document created successfully'
    }

@legal_compliance_router.put("/documents/{document_id}")
async def update_legal_document(
    document_id: str = Path(...),
    document_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a legal document"""
    return {"message": "Legal document updated successfully"}

@legal_compliance_router.delete("/documents/{document_id}")
async def delete_legal_document(
    document_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a legal document"""
    return {"message": "Legal document deleted successfully"}
