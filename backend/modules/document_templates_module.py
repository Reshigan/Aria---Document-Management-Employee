"""
Document Templates Module

Provides API endpoints for generating PDF documents with QR codes:
- Invoices
- Delivery Notes
- Purchase Orders
- Quotes
- Payslips

All documents include QR codes for verification and tracking.
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.qr_code_generator import QRCodeGenerator
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import os

router = APIRouter(prefix="/api/documents", tags=["Document Templates"])


class DocumentItem(BaseModel):
    description: str
    quantity: float
    unit_price: float
    total: float


class CustomerInfo(BaseModel):
    name: str
    address: str
    vat_number: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class SupplierInfo(BaseModel):
    name: str
    address: str
    vat_number: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CompanyInfo(BaseModel):
    name: str
    address: str
    phone: str
    email: str
    vat_number: str
    registration_number: str
    logo_url: Optional[str] = None
    bank_name: str
    bank_account: str
    bank_branch: str


class InvoiceRequest(BaseModel):
    number: str
    date: str
    due_date: str
    customer: CustomerInfo
    items: List[DocumentItem]
    subtotal: float
    vat_amount: float
    total: float
    company: CompanyInfo


class DeliveryNoteRequest(BaseModel):
    number: str
    date: str
    sales_order_number: Optional[str] = None
    customer: CustomerInfo
    items: List[Dict[str, Any]]  # quantity_ordered, quantity_delivered
    company: CompanyInfo


class PurchaseOrderRequest(BaseModel):
    number: str
    date: str
    required_date: str
    supplier: SupplierInfo
    items: List[DocumentItem]
    subtotal: float
    vat_amount: float
    total: float
    delivery_notes: Optional[str] = None
    company: CompanyInfo


class QuoteRequest(BaseModel):
    number: str
    date: str
    valid_until: str
    customer: CustomerInfo
    items: List[DocumentItem]
    subtotal: float
    vat_amount: float
    total: float
    company: CompanyInfo


class PayslipRequest(BaseModel):
    period: str
    pay_date: str
    employee: Dict[str, Any]
    earnings: List[Dict[str, Any]]
    deductions: List[Dict[str, Any]]
    total_earnings: float
    total_deductions: float
    net_pay: float
    ytd_earnings: float
    ytd_tax: float
    ytd_uif: float
    company: CompanyInfo


def render_pdf(template_name: str, context: Dict[str, Any]) -> bytes:
    """Render Jinja2 template and generate PDF"""
    backend_dir = Path(__file__).parent.parent
    templates_dir = str(backend_dir / "templates")
    
    env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)
    
    def currency_filter(value: float, currency: str = "R") -> str:
        return f"{currency} {value:,.2f}"
    
    def date_filter(value, format: str = "%Y-%m-%d") -> str:
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                return value
        return value.strftime(format) if hasattr(value, 'strftime') else value
    
    def datetime_filter(value, format: str = "%Y-%m-%d %H:%M:%S") -> str:
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                return value
        return value.strftime(format) if hasattr(value, 'strftime') else value
    
    env.filters['currency'] = currency_filter
    env.filters['date'] = date_filter
    env.filters['datetime'] = datetime_filter
    
    template = env.get_template(template_name)
    html_string = template.render(**context)
    
    html = HTML(string=html_string, base_url=templates_dir)
    pdf_bytes = html.write_pdf()
    
    return pdf_bytes


@router.post("/invoice/generate")
async def generate_invoice(request: InvoiceRequest):
    """Generate invoice PDF with QR code"""
    try:
        qr_code_base64 = QRCodeGenerator.generate_document_qr_code(
            base_url="https://aria.vantax.co.za",
            document_type="invoice",
            document_id=request.number,
            as_base64=True
        )
        
        # Prepare context
        context = {
            "invoice": request.dict(),
            "company": request.company.dict(),
            "qr_code": qr_code_base64,
            "generated_at": datetime.now()
        }
        
        pdf_bytes = render_pdf("invoice.html", context)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=invoice_{request.number}.pdf"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating invoice: {str(e)}")


@router.post("/delivery-note/generate")
async def generate_delivery_note(request: DeliveryNoteRequest):
    """Generate delivery note PDF with QR code"""
    try:
        qr_code_base64 = QRCodeGenerator.generate_document_qr_code(
            base_url="https://aria.vantax.co.za",
            document_type="delivery_note",
            document_id=request.number,
            as_base64=True
        )
        
        # Prepare context
        context = {
            "delivery": request.dict(),
            "company": request.company.dict(),
            "qr_code": qr_code_base64,
            "generated_at": datetime.now()
        }
        
        pdf_bytes = render_pdf("delivery_note.html", context)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=delivery_note_{request.number}.pdf"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating delivery note: {str(e)}")


@router.post("/purchase-order/generate")
async def generate_purchase_order(request: PurchaseOrderRequest):
    """Generate purchase order PDF with QR code"""
    try:
        qr_code_base64 = QRCodeGenerator.generate_document_qr_code(
            base_url="https://aria.vantax.co.za",
            document_type="purchase_order",
            document_id=request.number,
            as_base64=True
        )
        
        # Prepare context
        context = {
            "purchase_order": request.dict(),
            "company": request.company.dict(),
            "qr_code": qr_code_base64,
            "generated_at": datetime.now()
        }
        
        pdf_bytes = render_pdf("purchase_order.html", context)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=purchase_order_{request.number}.pdf"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating purchase order: {str(e)}")


@router.post("/quote/generate")
async def generate_quote(request: QuoteRequest):
    """Generate quote PDF with QR code"""
    try:
        qr_code_base64 = QRCodeGenerator.generate_document_qr_code(
            base_url="https://aria.vantax.co.za",
            document_type="quote",
            document_id=request.number,
            as_base64=True
        )
        
        # Prepare context
        context = {
            "quote": request.dict(),
            "company": request.company.dict(),
            "qr_code": qr_code_base64,
            "generated_at": datetime.now()
        }
        
        pdf_bytes = render_pdf("quote.html", context)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=quote_{request.number}.pdf"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quote: {str(e)}")


@router.post("/payslip/generate")
async def generate_payslip(request: PayslipRequest):
    """Generate payslip PDF with QR code"""
    try:
        qr_code_base64 = QRCodeGenerator.generate_document_qr_code(
            base_url="https://aria.vantax.co.za",
            document_type="payslip",
            document_id=f"{request.employee.get('number', 'EMP')}_{request.period}",
            as_base64=True
        )
        
        # Prepare context
        context = {
            "payslip": request.dict(),
            "company": request.company.dict(),
            "qr_code": qr_code_base64,
            "generated_at": datetime.now()
        }
        
        pdf_bytes = render_pdf("payslip.html", context)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=payslip_{request.employee.get('number', 'EMP')}_{request.period}.pdf"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating payslip: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "Document Templates",
        "templates_available": ["invoice", "delivery_note", "purchase_order", "quote", "payslip"]
    }
