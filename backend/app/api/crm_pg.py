"""
ARIA ERP - CRM Module (PostgreSQL)
Provides full CRUD operations for Leads, Opportunities
Matches frontend API contract: /api/crm/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import uuid

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# ========================================

leads_router = APIRouter(prefix="/api/crm/leads", tags=["CRM Leads"])

@leads_router.get("")
async def list_leads(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all leads"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT * FROM leads
            WHERE company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND status = %s"
            params.append(status)
        if source:
            query += " AND source = %s"
            params.append(source)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        leads = cursor.fetchall()
        
        result = []
        for lead in leads:
            result.append({
                'id': str(lead['id']),
                'lead_number': lead.get('lead_number'),
                'company_name': lead.get('company_name'),
                'contact_name': lead.get('contact_name'),
                'email': lead.get('email'),
                'phone': lead.get('phone'),
                'source': lead.get('source'),
                'status': lead.get('status'),
                'estimated_value': float(lead.get('estimated_value', 0)),
                'assigned_to': lead.get('assigned_to'),
                'created_at': lead['created_at'].isoformat() if lead.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@leads_router.get("/{lead_id}")
async def get_lead(
    lead_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single lead"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM leads
            WHERE id = %s AND company_id = %s
        """, (lead_id, company_id))
        
        lead = cursor.fetchone()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return {
            'id': str(lead['id']),
            'lead_number': lead.get('lead_number'),
            'company_name': lead.get('company_name'),
            'contact_name': lead.get('contact_name'),
            'email': lead.get('email'),
            'phone': lead.get('phone'),
            'source': lead.get('source'),
            'status': lead.get('status'),
            'estimated_value': float(lead.get('estimated_value', 0)),
            'assigned_to': lead.get('assigned_to'),
            'notes': lead.get('notes'),
            'created_at': lead['created_at'].isoformat() if lead.get('created_at') else None,
            'updated_at': lead['updated_at'].isoformat() if lead.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@leads_router.post("")
async def create_lead(
    lead_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new lead"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 'LEAD-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM leads WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        lead_number = f"LEAD-{next_num:05d}"
        
        lead_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO leads (id, company_id, lead_number, company_name, contact_name, email, phone,
                             source, status, estimated_value, assigned_to, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, lead_number
        """, (lead_id, company_id, lead_number, lead_data.get('company_name'),
              lead_data.get('contact_name'), lead_data.get('email'), lead_data.get('phone'),
              lead_data.get('source'), lead_data.get('status', 'new'),
              lead_data.get('estimated_value', 0), lead_data.get('assigned_to'),
              lead_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'lead_number': result['lead_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@leads_router.put("/{lead_id}")
async def update_lead(
    lead_id: str = Path(...),
    lead_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a lead"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE leads
            SET company_name = %s, contact_name = %s, email = %s, phone = %s,
                source = %s, status = %s, estimated_value = %s, assigned_to = %s,
                notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (lead_data.get('company_name'), lead_data.get('contact_name'),
              lead_data.get('email'), lead_data.get('phone'), lead_data.get('source'),
              lead_data.get('status'), lead_data.get('estimated_value'),
              lead_data.get('assigned_to'), lead_data.get('notes'), lead_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        conn.commit()
        return {"message": "Lead updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@leads_router.post("/{lead_id}/convert")
async def convert_lead(
    lead_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Convert a lead to an opportunity"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE leads 
            SET status = 'converted', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (lead_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        conn.commit()
        return {"message": "Lead converted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@leads_router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a lead"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM leads WHERE id = %s AND company_id = %s", (lead_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        conn.commit()
        return {"message": "Lead deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# ========================================

opportunities_router = APIRouter(prefix="/api/crm/opportunities", tags=["CRM Opportunities"])

@opportunities_router.get("")
async def list_opportunities(
    status: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all opportunities"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT o.*, c.customer_name
            FROM opportunities o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND o.status = %s"
            params.append(status)
        if stage:
            query += " AND o.stage = %s"
            params.append(stage)
        
        query += " ORDER BY o.created_at DESC"
        
        cursor.execute(query, params)
        opportunities = cursor.fetchall()
        
        result = []
        for opp in opportunities:
            result.append({
                'id': str(opp['id']),
                'opportunity_number': opp.get('opportunity_number'),
                'opportunity_name': opp.get('opportunity_name'),
                'customer_id': str(opp['customer_id']) if opp.get('customer_id') else None,
                'customer_name': opp.get('customer_name'),
                'stage': opp.get('stage'),
                'status': opp.get('status'),
                'estimated_value': float(opp.get('estimated_value', 0)),
                'probability': float(opp.get('probability', 0)),
                'expected_close_date': opp['expected_close_date'].isoformat() if opp.get('expected_close_date') else None,
                'assigned_to': opp.get('assigned_to'),
                'created_at': opp['created_at'].isoformat() if opp.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@opportunities_router.get("/{opportunity_id}")
async def get_opportunity(
    opportunity_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single opportunity"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT o.*, c.customer_name
            FROM opportunities o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = %s AND o.company_id = %s
        """, (opportunity_id, company_id))
        
        opp = cursor.fetchone()
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return {
            'id': str(opp['id']),
            'opportunity_number': opp.get('opportunity_number'),
            'opportunity_name': opp.get('opportunity_name'),
            'customer_id': str(opp['customer_id']) if opp.get('customer_id') else None,
            'customer_name': opp.get('customer_name'),
            'stage': opp.get('stage'),
            'status': opp.get('status'),
            'estimated_value': float(opp.get('estimated_value', 0)),
            'probability': float(opp.get('probability', 0)),
            'expected_close_date': opp['expected_close_date'].isoformat() if opp.get('expected_close_date') else None,
            'assigned_to': opp.get('assigned_to'),
            'notes': opp.get('notes'),
            'created_at': opp['created_at'].isoformat() if opp.get('created_at') else None,
            'updated_at': opp['updated_at'].isoformat() if opp.get('updated_at') else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@opportunities_router.post("")
async def create_opportunity(
    opportunity_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new opportunity"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("SELECT COALESCE(MAX(CAST(SUBSTRING(opportunity_number FROM 'OPP-([0-9]+)') AS INTEGER)), 0) + 1 as next_num FROM opportunities WHERE company_id = %s", (company_id,))
        next_num = cursor.fetchone()['next_num']
        opportunity_number = f"OPP-{next_num:05d}"
        
        opportunity_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO opportunities (id, company_id, opportunity_number, opportunity_name, customer_id,
                                      stage, status, estimated_value, probability, expected_close_date,
                                      assigned_to, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, opportunity_number
        """, (opportunity_id, company_id, opportunity_number, opportunity_data.get('opportunity_name'),
              opportunity_data.get('customer_id'), opportunity_data.get('stage', 'qualification'),
              opportunity_data.get('status', 'open'), opportunity_data.get('estimated_value', 0),
              opportunity_data.get('probability', 0), opportunity_data.get('expected_close_date'),
              opportunity_data.get('assigned_to'), opportunity_data.get('notes')))
        
        result = cursor.fetchone()
        conn.commit()
        return {'id': str(result['id']), 'opportunity_number': result['opportunity_number']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@opportunities_router.put("/{opportunity_id}")
async def update_opportunity(
    opportunity_id: str = Path(...),
    opportunity_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update an opportunity"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE opportunities
            SET opportunity_name = %s, customer_id = %s, stage = %s, status = %s,
                estimated_value = %s, probability = %s, expected_close_date = %s,
                assigned_to = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (opportunity_data.get('opportunity_name'), opportunity_data.get('customer_id'),
              opportunity_data.get('stage'), opportunity_data.get('status'),
              opportunity_data.get('estimated_value'), opportunity_data.get('probability'),
              opportunity_data.get('expected_close_date'), opportunity_data.get('assigned_to'),
              opportunity_data.get('notes'), opportunity_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        conn.commit()
        return {"message": "Opportunity updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@opportunities_router.delete("/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete an opportunity"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM opportunities WHERE id = %s AND company_id = %s", (opportunity_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        conn.commit()
        return {"message": "Opportunity deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
