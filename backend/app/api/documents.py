"""
ARIA ERP - Document Processing API
Handles document upload, OCR, classification, and posting to ERP
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
import os
import hashlib
import shutil
from pathlib import Path

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User

from bots.document_classification_bot import DocumentClassificationBot
from bots.ocr_invoice_bot import OCRInvoiceBot
from bots.bot_api_client import BotAPIClient

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path("/var/www/aria/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}


def get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


@router.post("/process")
async def process_document(
    file: UploadFile = File(...),
    company_id: int = Form(...),
    vendor_id: Optional[int] = Form(None),
    doc_type_hint: Optional[str] = Form(None),
    instruction: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process uploaded document: classify, run OCR, extract structured data
    
    Returns:
        - doc_type: Detected document type (invoice, receipt, statement, etc.)
        - header: Extracted header fields (vendor, dates, totals, VAT)
        - lines: Extracted line items
        - confidence: Confidence scores per field
        - file_id: Unique file identifier for later posting
        - warnings: Any issues detected (missing vendor, duplicate, etc.)
    """
    try:
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        file_hash = hashlib.sha256(contents).hexdigest()
        
        company_dir = UPLOAD_DIR / str(company_id)
        company_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file_hash[:8]}{file_ext}"
        file_path = company_dir / safe_filename
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        classification_bot = DocumentClassificationBot()
        doc_classification = classification_bot.classify_document(str(file_path))
        
        doc_type = doc_type_hint or doc_classification.get('category', 'unknown')
        confidence = doc_classification.get('confidence', 0.0)
        sap_posting = doc_classification.get('sap_posting', {})
        
        ocr_data = {}
        line_items = []
        header_fields = {}
        field_confidence = {}
        
        if doc_type == 'invoice':
            ocr_bot = OCRInvoiceBot()
            ocr_data = ocr_bot.extract_invoice_data(str(file_path))
            
            header_fields = {
                'supplier_name': ocr_data.get('supplier_name', ''),
                'invoice_number': ocr_data.get('invoice_number', ''),
                'invoice_date': ocr_data.get('invoice_date', ''),
                'due_date': ocr_data.get('due_date', ''),
                'total_amount': float(ocr_data.get('total_amount', 0)),
                'vat_amount': float(ocr_data.get('vat_amount', 0)),
                'net_amount': float(ocr_data.get('total_amount', 0)) - float(ocr_data.get('vat_amount', 0))
            }
            
            line_items = ocr_data.get('line_items', [])
            
            overall_confidence = ocr_data.get('confidence_score', 0.95)
            field_confidence = {
                'supplier_name': overall_confidence,
                'invoice_number': overall_confidence,
                'invoice_date': overall_confidence,
                'due_date': overall_confidence,
                'total_amount': overall_confidence,
                'vat_amount': overall_confidence
            }
        
        warnings = []
        
        if not vendor_id and doc_type == 'invoice':
            warnings.append({
                'type': 'missing_vendor',
                'message': 'Vendor not specified. Please select a vendor before posting.',
                'severity': 'error'
            })
        
        if doc_type == 'invoice' and vendor_id and header_fields.get('invoice_number'):
            from app.models.ap import VendorBill
            existing_bill = db.query(VendorBill).filter(
                VendorBill.company_id == company_id,
                VendorBill.vendor_id == vendor_id,
                VendorBill.vendor_invoice_number == header_fields['invoice_number']
            ).first()
            
            if existing_bill:
                warnings.append({
                    'type': 'possible_duplicate',
                    'message': f'Possible duplicate: Bill #{existing_bill.bill_number} with same invoice number exists',
                    'severity': 'warning',
                    'existing_bill_id': existing_bill.id
                })
        
        sum_lines = sum(float(line.get('total', 0)) for line in line_items)
        if line_items and abs(sum_lines - header_fields.get('net_amount', 0)) > 0.01:
            warnings.append({
                'type': 'total_mismatch',
                'message': f'Line items total ({sum_lines:.2f}) does not match net amount ({header_fields.get("net_amount", 0):.2f})',
                'severity': 'warning'
            })
        
        return {
            'success': True,
            'file_id': file_hash[:16],
            'file_path': str(file_path),
            'doc_type': doc_type,
            'classification_confidence': confidence,
            'sap_posting': sap_posting,
            'header': header_fields,
            'lines': line_items,
            'field_confidence': field_confidence,
            'warnings': warnings,
            'instruction': instruction,
            'suggested_actions': ['post_to_ap', 'send_to_controller', 'save_draft']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/post")
async def post_document(
    file_id: str = Form(...),
    file_path: str = Form(...),
    company_id: int = Form(...),
    vendor_id: int = Form(...),
    doc_type: str = Form(...),
    invoice_number: str = Form(...),
    invoice_date: str = Form(...),
    due_date: str = Form(...),
    total_amount: float = Form(...),
    vat_amount: float = Form(...),
    lines: str = Form(...),  # JSON string
    override_duplicate: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Post processed document to ERP (create AP bill with attachment)
    
    Args:
        file_id: Unique file identifier from process endpoint
        file_path: Path to uploaded file
        company_id: Company ID
        vendor_id: Vendor ID
        doc_type: Document type (invoice, receipt, etc.)
        invoice_number: Vendor invoice number
        invoice_date: Invoice date
        due_date: Due date
        total_amount: Total amount including VAT
        vat_amount: VAT amount
        lines: JSON string of line items
        override_duplicate: Override duplicate check
    
    Returns:
        - bill_id: Created bill ID
        - bill_number: Generated bill number
        - status: Posting status
    """
    try:
        import json
        from app.models.ap import VendorBill, VendorBillLine
        
        if not override_duplicate:
            existing_bill = db.query(VendorBill).filter(
                VendorBill.company_id == company_id,
                VendorBill.vendor_id == vendor_id,
                VendorBill.vendor_invoice_number == invoice_number
            ).first()
            
            if existing_bill:
                raise HTTPException(
                    status_code=409,
                    detail=f"Duplicate bill detected: Bill #{existing_bill.bill_number} already exists with this invoice number"
                )
        
        line_items = json.loads(lines) if isinstance(lines, str) else lines
        
        last_bill = db.query(VendorBill).filter(
            VendorBill.company_id == company_id
        ).order_by(VendorBill.id.desc()).first()
        
        next_number = 1
        if last_bill and last_bill.bill_number:
            try:
                next_number = int(last_bill.bill_number.split('-')[-1]) + 1
            except:
                next_number = 1
        
        bill_number = f"BILL-{next_number:05d}"
        
        net_amount = total_amount - vat_amount
        
        new_bill = VendorBill(
            company_id=company_id,
            vendor_id=vendor_id,
            bill_number=bill_number,
            vendor_invoice_number=invoice_number,
            bill_date=datetime.strptime(invoice_date, '%Y-%m-%d').date(),
            due_date=datetime.strptime(due_date, '%Y-%m-%d').date(),
            subtotal=Decimal(str(net_amount)),
            tax_amount=Decimal(str(vat_amount)),
            total_amount=Decimal(str(total_amount)),
            status='draft',
            created_by=current_user.id,
            created_at=datetime.now()
        )
        
        db.add(new_bill)
        db.flush()
        
        for idx, line in enumerate(line_items, 1):
            bill_line = VendorBillLine(
                bill_id=new_bill.id,
                line_number=idx,
                description=line.get('description', ''),
                quantity=Decimal(str(line.get('quantity', 1))),
                unit_price=Decimal(str(line.get('unit_price', 0))),
                discount_percent=Decimal(str(line.get('discount_percent', 0))),
                tax_rate=Decimal(str(line.get('tax_rate', 15))),
                line_total=Decimal(str(line.get('total', 0)))
            )
            db.add(bill_line)
        
        db.commit()
        db.refresh(new_bill)
        
        return {
            'success': True,
            'bill_id': new_bill.id,
            'bill_number': new_bill.bill_number,
            'status': new_bill.status,
            'message': f'Bill {new_bill.bill_number} created successfully',
            'file_id': file_id,
            'file_path': file_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-to-controller")
async def send_to_controller(
    file_id: str = Form(...),
    file_path: str = Form(...),
    instruction: str = Form(...),
    company_id: int = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Send document to Aria Controller for NL-driven workflow
    
    This allows the controller to handle ambiguous cases or complex workflows
    that require multi-bot orchestration or user clarification.
    """
    return {
        'success': True,
        'message': 'Document sent to Aria Controller',
        'file_id': file_id,
        'instruction': instruction,
        'status': 'queued',
        'note': 'Controller integration coming soon - will process via email/workflow engine'
    }
