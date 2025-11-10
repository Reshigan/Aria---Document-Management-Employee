"""
Document Generation Module
Generates PDF documents with templates, QR codes, and company branding
Supports invoices, delivery notes, purchase orders, quotes, etc.
"""

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg
import os
import json
import base64
import qrcode
from io import BytesIO

router = APIRouter(prefix="/api/erp/documents", tags=["documents"])

async def get_db_connection():
    return await asyncpg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "aria_erp")
    )

# Pydantic Models
class DocumentTemplate(BaseModel):
    template_name: str
    document_type: str
    template_html: str
    header_config: Optional[Dict[str, Any]] = None
    footer_config: Optional[Dict[str, Any]] = None
    is_default: bool = False
    is_active: bool = True

class DocumentGeneration(BaseModel):
    document_type: str
    entity_id: str
    template_id: Optional[str] = None
    output_format: str = "pdf"
    include_qr_code: bool = True
    auto_print: bool = False

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

def generate_html_document(template_html: str, data: Dict[str, Any], company: Dict[str, Any], qr_code_base64: Optional[str] = None) -> str:
    """Generate HTML document from template and data"""
    
    html = template_html
    
    html = html.replace("{{company_name}}", company.get("company_name", ""))
    html = html.replace("{{company_address}}", company.get("address", ""))
    html = html.replace("{{company_vat_number}}", company.get("vat_number", ""))
    html = html.replace("{{company_phone}}", company.get("phone", ""))
    html = html.replace("{{company_email}}", company.get("email", ""))
    
    html = html.replace("{{bank_name}}", company.get("bank_name", ""))
    html = html.replace("{{bank_account_number}}", company.get("bank_account_number", ""))
    html = html.replace("{{bank_branch_code}}", company.get("bank_branch_code", ""))
    
    if company.get("logo_url"):
        html = html.replace("{{company_logo}}", f'<img src="{company["logo_url"]}" alt="Company Logo" style="max-height: 80px;" />')
    else:
        html = html.replace("{{company_logo}}", "")
    
    for key, value in data.items():
        placeholder = f"{{{{{key}}}}}"
        html = html.replace(placeholder, str(value))
    
    if qr_code_base64:
        html = html.replace("{{qr_code}}", f'<img src="data:image/png;base64,{qr_code_base64}" alt="QR Code" style="width: 150px; height: 150px;" />')
    else:
        html = html.replace("{{qr_code}}", "")
    
    return html

@router.get("/templates")
async def list_templates(
    company_id: str = Query(...),
    document_type: Optional[str] = None
):
    """List all document templates"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, template_name, document_type,
                   header_config, footer_config, is_default, is_active,
                   created_at, updated_at
            FROM document_templates
            WHERE company_id = $1
        """
        params = [company_id]
        
        if document_type:
            query += " AND document_type = $2"
            params.append(document_type)
        
        query += " ORDER BY document_type, is_default DESC, template_name"
        
        rows = await conn.fetch(query, *params)
        templates = [dict(row) for row in rows]
        
        return {"templates": templates}
    finally:
        await conn.close()

@router.post("/templates")
async def create_template(
    company_id: str = Query(...),
    template: DocumentTemplate = None
):
    """Create a new document template"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO document_templates (
                company_id, template_name, document_type, template_html,
                header_config, footer_config, is_default, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            template.template_name,
            template.document_type,
            template.template_html,
            template.header_config,
            template.footer_config,
            template.is_default,
            template.is_active
        )
        
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "message": "Document template created successfully"
        }
    finally:
        await conn.close()

@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    company_id: str = Query(...)
):
    """Get a specific document template"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, template_name, document_type, template_html,
                   header_config, footer_config, is_default, is_active,
                   created_at, updated_at
            FROM document_templates
            WHERE id = $1 AND company_id = $2
        """
        
        row = await conn.fetchrow(query, template_id, company_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return dict(row)
    finally:
        await conn.close()

@router.post("/generate")
async def generate_document(
    company_id: str = Query(...),
    generation: DocumentGeneration = None
):
    """Generate a document from template and entity data"""
    conn = await get_db_connection()
    try:
        company_query = """
            SELECT company_name, address, vat_number, phone, email,
                   logo_url, bank_name, bank_account_number, bank_branch_code
            FROM companies
            WHERE id = $1
        """
        company = await conn.fetchrow(company_query, company_id)
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        if generation.template_id:
            template_query = """
                SELECT template_html, header_config, footer_config
                FROM document_templates
                WHERE id = $1 AND company_id = $2
            """
            template = await conn.fetchrow(template_query, generation.template_id, company_id)
        else:
            template_query = """
                SELECT template_html, header_config, footer_config
                FROM document_templates
                WHERE company_id = $1 AND document_type = $2 AND is_default = true
                LIMIT 1
            """
            template = await conn.fetchrow(template_query, company_id, generation.document_type)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        entity_data = {}
        qr_data = ""
        
        if generation.document_type == "invoice":
            invoice_query = """
                SELECT i.invoice_number, i.invoice_date, i.due_date,
                       i.subtotal, i.tax_amount, i.total_amount,
                       c.customer_name, c.email, c.phone, c.address
                FROM customer_invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = $1 AND i.company_id = $2
            """
            invoice = await conn.fetchrow(invoice_query, generation.entity_id, company_id)
            
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")
            
            entity_data = dict(invoice)
            qr_data = f"INV-{invoice['invoice_number']}"
            
        elif generation.document_type == "delivery_note":
            delivery_query = """
                SELECT d.delivery_number, d.delivery_date,
                       so.order_number, so.order_date,
                       c.customer_name, c.address, c.phone
                FROM deliveries d
                JOIN sales_orders so ON d.sales_order_id = so.id
                JOIN customers c ON so.customer_id = c.id
                WHERE d.id = $1 AND d.company_id = $2
            """
            delivery = await conn.fetchrow(delivery_query, generation.entity_id, company_id)
            
            if not delivery:
                raise HTTPException(status_code=404, detail="Delivery not found")
            
            entity_data = dict(delivery)
            qr_data = f"DEL-{delivery['delivery_number']}"
            
        elif generation.document_type == "quote":
            quote_query = """
                SELECT q.quote_number, q.quote_date, q.valid_until,
                       q.subtotal, q.tax_amount, q.total_amount,
                       c.customer_name, c.email, c.phone, c.address
                FROM quotes q
                JOIN customers c ON q.customer_id = c.id
                WHERE q.id = $1 AND q.company_id = $2
            """
            quote = await conn.fetchrow(quote_query, generation.entity_id, company_id)
            
            if not quote:
                raise HTTPException(status_code=404, detail="Quote not found")
            
            entity_data = dict(quote)
            qr_data = f"QUO-{quote['quote_number']}"
        
        qr_code_base64 = None
        if generation.include_qr_code:
            qr_code_base64 = generate_qr_code(qr_data)
        
        html_content = generate_html_document(
            template["template_html"],
            entity_data,
            dict(company),
            qr_code_base64
        )
        
        generation_query = """
            INSERT INTO document_generations (
                company_id, document_type, entity_id, template_id,
                output_format, file_path, generation_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        """
        
        generation_record = await conn.fetchrow(
            generation_query,
            company_id,
            generation.document_type,
            generation.entity_id,
            generation.template_id,
            generation.output_format,
            f"/documents/{generation.document_type}/{generation.entity_id}.{generation.output_format}",
            "completed"
        )
        
        
        return {
            "id": generation_record["id"],
            "html_content": html_content,
            "qr_code": qr_code_base64,
            "created_at": generation_record["created_at"],
            "message": "Document generated successfully"
        }
    finally:
        await conn.close()

@router.get("/generate/{document_type}/{entity_id}/preview")
async def preview_document(
    document_type: str,
    entity_id: str,
    company_id: str = Query(...),
    template_id: Optional[str] = None
):
    """Preview a document without saving"""
    generation = DocumentGeneration(
        document_type=document_type,
        entity_id=entity_id,
        template_id=template_id,
        output_format="html",
        include_qr_code=True,
        auto_print=False
    )
    
    result = await generate_document(company_id=company_id, generation=generation)
    
    return Response(content=result["html_content"], media_type="text/html")

@router.get("/generations")
async def list_generations(
    company_id: str = Query(...),
    document_type: Optional[str] = None,
    status: Optional[str] = None
):
    """List document generation history"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, document_type, entity_id, template_id,
                   output_format, file_path, generation_status,
                   created_at
            FROM document_generations
            WHERE company_id = $1
        """
        params = [company_id]
        
        if document_type:
            query += " AND document_type = $2"
            params.append(document_type)
        
        if status:
            query += f" AND generation_status = ${len(params) + 1}"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT 100"
        
        rows = await conn.fetch(query, *params)
        generations = [dict(row) for row in rows]
        
        return {"generations": generations}
    finally:
        await conn.close()

@router.post("/print-queue")
async def add_to_print_queue(
    company_id: str = Query(...),
    document_id: str = Query(...),
    printer_name: Optional[str] = None,
    copies: int = 1
):
    """Add a document to the print queue"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO print_queue (
                company_id, document_id, printer_name, copies,
                print_status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            document_id,
            printer_name or "default",
            copies,
            "pending"
        )
        
        return {
            "id": row["id"],
            "print_status": "pending",
            "created_at": row["created_at"],
            "message": "Document added to print queue"
        }
    finally:
        await conn.close()

@router.get("/print-queue")
async def list_print_queue(
    company_id: str = Query(...),
    status: Optional[str] = None
):
    """List print queue"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, document_id, printer_name, copies,
                   print_status, error_message, printed_at, created_at
            FROM print_queue
            WHERE company_id = $1
        """
        params = [company_id]
        
        if status:
            query += " AND print_status = $2"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT 50"
        
        rows = await conn.fetch(query, *params)
        queue = [dict(row) for row in rows]
        
        return {"print_queue": queue}
    finally:
        await conn.close()

@router.post("/print-queue/{queue_id}/process")
async def process_print_job(
    queue_id: str,
    company_id: str = Query(...)
):
    """Process a print job (mark as printed)"""
    conn = await get_db_connection()
    try:
        query = """
            UPDATE print_queue
            SET print_status = 'printed',
                printed_at = $1
            WHERE id = $2 AND company_id = $3
            RETURNING id
        """
        
        row = await conn.fetchrow(query, datetime.utcnow(), queue_id, company_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Print job not found")
        
        return {"message": "Print job processed successfully"}
    finally:
        await conn.close()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "document_generation",
        "timestamp": datetime.utcnow().isoformat()
    }
