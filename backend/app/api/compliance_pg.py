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
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT COUNT(*) as pending_obligations
            FROM tax_obligations
            WHERE company_id = %s AND status = 'PENDING'
        """, [company_id])
        pending_obligations = cursor.fetchone()['pending_obligations']
        
        cursor.execute("""
            SELECT COUNT(*) as overdue_obligations
            FROM tax_obligations
            WHERE company_id = %s AND status = 'OVERDUE'
        """, [company_id])
        overdue_obligations = cursor.fetchone()['overdue_obligations']
        
        cursor.execute("""
            SELECT COUNT(*) as upcoming_deadlines
            FROM tax_obligations
            WHERE company_id = %s AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        """, [company_id])
        upcoming_deadlines = cursor.fetchone()['upcoming_deadlines']
        
        cursor.execute("""
            SELECT COUNT(*) as documents_expiring
            FROM legal_documents
            WHERE company_id = %s AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
        """, [company_id])
        documents_expiring = cursor.fetchone()['documents_expiring']
        
        total_obligations = pending_obligations + overdue_obligations
        tax_compliance = 100.0 if total_obligations == 0 else max(0, 100 - (overdue_obligations * 20))
        legal_compliance = 100.0 if documents_expiring == 0 else max(0, 100 - (documents_expiring * 5))
        overall_score = (tax_compliance + legal_compliance) / 2
        
        return {
            'overall_score': round(overall_score, 1),
            'tax_compliance': round(tax_compliance, 1),
            'legal_compliance': round(legal_compliance, 1),
            'regulatory_compliance': round((tax_compliance + legal_compliance) / 2, 1),
            'pending_obligations': pending_obligations,
            'overdue_obligations': overdue_obligations,
            'upcoming_deadlines': upcoming_deadlines,
            'documents_expiring': documents_expiring
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

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
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT id, obligation_number, tax_type, description, due_date, amount,
                   status, priority, completed_date, notes, created_at
            FROM tax_obligations
            WHERE company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        if tax_type:
            query += " AND tax_type = %s"
            params.append(tax_type)
        
        query += " ORDER BY due_date ASC, priority DESC"
        
        cursor.execute(query, params)
        obligations = cursor.fetchall()
        
        result = []
        for obligation in obligations:
            result.append({
                'id': str(obligation['id']),
                'obligation_number': obligation.get('obligation_number'),
                'tax_type': obligation.get('tax_type'),
                'description': obligation.get('description'),
                'due_date': obligation['due_date'].isoformat() if obligation.get('due_date') else None,
                'amount': float(obligation.get('amount', 0)) if obligation.get('amount') else None,
                'status': obligation.get('status'),
                'priority': obligation.get('priority'),
                'completed_date': obligation['completed_date'].isoformat() if obligation.get('completed_date') else None,
                'notes': obligation.get('notes'),
                'created_at': obligation['created_at'].isoformat() if obligation.get('created_at') else None
            })
        
        return {'obligations': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_compliance_router.post("/obligations")
async def create_tax_obligation(
    obligation_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new tax obligation"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_id = current_user.get('user_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        obligation_number = f'TAX-OBL-{uuid.uuid4().hex[:6].upper()}'
        
        query = """
            INSERT INTO tax_obligations (
                company_id, obligation_number, tax_type, description, due_date,
                amount, status, priority, notes, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, obligation_number
        """
        
        cursor.execute(query, [
            company_id,
            obligation_number,
            obligation_data.get('tax_type'),
            obligation_data.get('description'),
            obligation_data.get('due_date'),
            obligation_data.get('amount'),
            obligation_data.get('status', 'PENDING'),
            obligation_data.get('priority', 'MEDIUM'),
            obligation_data.get('notes'),
            user_id
        ])
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'obligation_number': result['obligation_number'],
            'message': 'Tax obligation created successfully'
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_compliance_router.put("/obligations/{obligation_id}")
async def update_tax_obligation(
    obligation_id: str = Path(...),
    obligation_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a tax obligation"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM tax_obligations WHERE id = %s AND company_id = %s", [obligation_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Tax obligation not found")
        
        update_fields = []
        params = []
        
        if 'tax_type' in obligation_data:
            update_fields.append("tax_type = %s")
            params.append(obligation_data['tax_type'])
        if 'description' in obligation_data:
            update_fields.append("description = %s")
            params.append(obligation_data['description'])
        if 'due_date' in obligation_data:
            update_fields.append("due_date = %s")
            params.append(obligation_data['due_date'])
        if 'amount' in obligation_data:
            update_fields.append("amount = %s")
            params.append(obligation_data['amount'])
        if 'status' in obligation_data:
            update_fields.append("status = %s")
            params.append(obligation_data['status'])
        if 'priority' in obligation_data:
            update_fields.append("priority = %s")
            params.append(obligation_data['priority'])
        if 'completed_date' in obligation_data:
            update_fields.append("completed_date = %s")
            params.append(obligation_data['completed_date'])
        if 'notes' in obligation_data:
            update_fields.append("notes = %s")
            params.append(obligation_data['notes'])
        
        if not update_fields:
            return {"message": "No fields to update"}
        
        update_fields.append("updated_at = NOW()")
        params.extend([obligation_id, company_id])
        
        query = f"UPDATE tax_obligations SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
        cursor.execute(query, params)
        conn.commit()
        
        return {"message": "Tax obligation updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@tax_compliance_router.delete("/obligations/{obligation_id}")
async def delete_tax_obligation(
    obligation_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a tax obligation"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM tax_obligations WHERE id = %s AND company_id = %s", [obligation_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Tax obligation not found")
        
        cursor.execute("DELETE FROM tax_obligations WHERE id = %s AND company_id = %s", [obligation_id, company_id])
        conn.commit()
        
        return {"message": "Tax obligation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

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
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT id, document_number, document_type, title, description,
                   issue_date, expiry_date, status, renewal_required,
                   document_url, created_at,
                   CASE 
                       WHEN expiry_date IS NOT NULL THEN (expiry_date - CURRENT_DATE)
                       ELSE NULL
                   END as days_to_expiry
            FROM legal_documents
            WHERE company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        if document_type:
            query += " AND document_type = %s"
            params.append(document_type)
        
        query += " ORDER BY expiry_date ASC NULLS LAST, created_at DESC"
        
        cursor.execute(query, params)
        documents = cursor.fetchall()
        
        result = []
        for document in documents:
            result.append({
                'id': str(document['id']),
                'document_number': document.get('document_number'),
                'document_type': document.get('document_type'),
                'title': document.get('title'),
                'description': document.get('description'),
                'issue_date': document['issue_date'].isoformat() if document.get('issue_date') else None,
                'expiry_date': document['expiry_date'].isoformat() if document.get('expiry_date') else None,
                'status': document.get('status'),
                'days_to_expiry': document.get('days_to_expiry'),
                'renewal_required': document.get('renewal_required', False),
                'document_url': document.get('document_url'),
                'created_at': document['created_at'].isoformat() if document.get('created_at') else None
            })
        
        return {'documents': result, 'total': len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@legal_compliance_router.post("/documents")
async def create_legal_document(
    document_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new legal document"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        user_id = current_user.get('user_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        document_number = f'LEGAL-DOC-{uuid.uuid4().hex[:6].upper()}'
        
        query = """
            INSERT INTO legal_documents (
                company_id, document_number, document_type, title, description,
                issue_date, expiry_date, status, renewal_required, document_url, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, document_number
        """
        
        cursor.execute(query, [
            company_id,
            document_number,
            document_data.get('document_type'),
            document_data.get('title'),
            document_data.get('description'),
            document_data.get('issue_date'),
            document_data.get('expiry_date'),
            document_data.get('status', 'ACTIVE'),
            document_data.get('renewal_required', False),
            document_data.get('document_url'),
            user_id
        ])
        
        result = cursor.fetchone()
        conn.commit()
        
        return {
            'id': str(result['id']),
            'document_number': result['document_number'],
            'message': 'Legal document created successfully'
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@legal_compliance_router.put("/documents/{document_id}")
async def update_legal_document(
    document_id: str = Path(...),
    document_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a legal document"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM legal_documents WHERE id = %s AND company_id = %s", [document_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Legal document not found")
        
        update_fields = []
        params = []
        
        if 'document_type' in document_data:
            update_fields.append("document_type = %s")
            params.append(document_data['document_type'])
        if 'title' in document_data:
            update_fields.append("title = %s")
            params.append(document_data['title'])
        if 'description' in document_data:
            update_fields.append("description = %s")
            params.append(document_data['description'])
        if 'issue_date' in document_data:
            update_fields.append("issue_date = %s")
            params.append(document_data['issue_date'])
        if 'expiry_date' in document_data:
            update_fields.append("expiry_date = %s")
            params.append(document_data['expiry_date'])
        if 'status' in document_data:
            update_fields.append("status = %s")
            params.append(document_data['status'])
        if 'renewal_required' in document_data:
            update_fields.append("renewal_required = %s")
            params.append(document_data['renewal_required'])
        if 'document_url' in document_data:
            update_fields.append("document_url = %s")
            params.append(document_data['document_url'])
        
        if not update_fields:
            return {"message": "No fields to update"}
        
        update_fields.append("updated_at = NOW()")
        params.extend([document_id, company_id])
        
        query = f"UPDATE legal_documents SET {', '.join(update_fields)} WHERE id = %s AND company_id = %s"
        cursor.execute(query, params)
        conn.commit()
        
        return {"message": "Legal document updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@legal_compliance_router.delete("/documents/{document_id}")
async def delete_legal_document(
    document_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a legal document"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT id FROM legal_documents WHERE id = %s AND company_id = %s", [document_id, company_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Legal document not found")
        
        cursor.execute("DELETE FROM legal_documents WHERE id = %s AND company_id = %s", [document_id, company_id])
        conn.commit()
        
        return {"message": "Legal document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
