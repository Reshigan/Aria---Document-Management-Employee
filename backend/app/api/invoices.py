"""
ARIA ERP - Invoices API
"""
from typing import List
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_company_id
from app.models.financial import CustomerInvoice, InvoiceLineItem, Customer
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceLineItemResponse


router = APIRouter(prefix="/invoices", tags=["Invoices"])


def calculate_line_totals(line_item: dict) -> dict:
    """Calculate line item totals"""
    quantity = Decimal(str(line_item["quantity"]))
    unit_price = Decimal(str(line_item["unit_price"]))
    discount_pct = Decimal(str(line_item.get("discount_percentage", 0)))
    tax_rate = Decimal(str(line_item.get("tax_rate", 0)))
    
    subtotal = quantity * unit_price
    discount_amount = subtotal * (discount_pct / 100)
    subtotal_after_discount = subtotal - discount_amount
    tax_amount = subtotal_after_discount * (tax_rate / 100)
    line_total = subtotal_after_discount + tax_amount
    
    return {
        "line_total": line_total,
        "tax_amount": tax_amount,
        "discount_amount": discount_amount
    }


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new invoice"""
    
    # Verify customer exists
    customer = db.query(Customer).filter(
        Customer.id == invoice_data.customer_id,
        Customer.company_id == company_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Generate invoice number
    last_invoice = db.query(CustomerInvoice).filter(
        CustomerInvoice.company_id == company_id
    ).order_by(CustomerInvoice.created_at.desc()).first()
    
    invoice_num = 1 if not last_invoice else int(last_invoice.invoice_number.split('-')[1]) + 1
    invoice_number = f"INV-{invoice_num:06d}"
    
    # Calculate totals
    subtotal = Decimal(0)
    total_tax = Decimal(0)
    total_discount = Decimal(0)
    
    # Create invoice
    invoice = CustomerInvoice(
        company_id=company_id,
        invoice_number=invoice_number,
        customer_id=invoice_data.customer_id,
        invoice_date=invoice_data.invoice_date,
        due_date=invoice_data.due_date,
        customer_po_number=invoice_data.customer_po_number,
        currency=invoice_data.currency,
        notes=invoice_data.notes,
        terms_conditions=invoice_data.terms_conditions,
        status="draft"
    )
    
    db.add(invoice)
    db.flush()
    
    # Create line items
    for idx, line_data in enumerate(invoice_data.line_items, start=1):
        line_dict = line_data.model_dump()
        totals = calculate_line_totals(line_dict)
        
        line_item = InvoiceLineItem(
            invoice_id=invoice.id,
            line_number=idx,
            **line_dict,
            **totals
        )
        
        db.add(line_item)
        
        subtotal += totals["line_total"] - totals["tax_amount"]
        total_tax += totals["tax_amount"]
        total_discount += totals["discount_amount"]
    
    # Update invoice totals
    invoice.subtotal = subtotal
    invoice.tax_amount = total_tax
    invoice.discount_amount = total_discount
    invoice.total_amount = subtotal + total_tax
    invoice.balance_due = invoice.total_amount
    
    db.commit()
    db.refresh(invoice)
    
    # Load line items
    line_items = db.query(InvoiceLineItem).filter(
        InvoiceLineItem.invoice_id == invoice.id
    ).order_by(InvoiceLineItem.line_number).all()
    
    response = InvoiceResponse.model_validate(invoice)
    response.line_items = [InvoiceLineItemResponse.model_validate(li) for li in line_items]
    
    return response


@router.get("/", response_model=List[InvoiceResponse])
async def list_invoices(
    company_id: UUID = Depends(get_current_company_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: str = Query(None),
    customer_id: UUID = Query(None),
    db: Session = Depends(get_db)
):
    """List all invoices"""
    query = db.query(CustomerInvoice).filter(CustomerInvoice.company_id == company_id)
    
    if status:
        query = query.filter(CustomerInvoice.status == status)
    
    if customer_id:
        query = query.filter(CustomerInvoice.customer_id == customer_id)
    
    invoices = query.order_by(CustomerInvoice.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for invoice in invoices:
        line_items = db.query(InvoiceLineItem).filter(
            InvoiceLineItem.invoice_id == invoice.id
        ).order_by(InvoiceLineItem.line_number).all()
        
        response = InvoiceResponse.model_validate(invoice)
        response.line_items = [InvoiceLineItemResponse.model_validate(li) for li in line_items]
        result.append(response)
    
    return result


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific invoice"""
    invoice = db.query(CustomerInvoice).filter(
        CustomerInvoice.id == invoice_id,
        CustomerInvoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    line_items = db.query(InvoiceLineItem).filter(
        InvoiceLineItem.invoice_id == invoice.id
    ).order_by(InvoiceLineItem.line_number).all()
    
    response = InvoiceResponse.model_validate(invoice)
    response.line_items = [InvoiceLineItemResponse.model_validate(li) for li in line_items]
    
    return response


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update an invoice"""
    invoice = db.query(CustomerInvoice).filter(
        CustomerInvoice.id == invoice_id,
        CustomerInvoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    update_data = invoice_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    db.commit()
    db.refresh(invoice)
    
    line_items = db.query(InvoiceLineItem).filter(
        InvoiceLineItem.invoice_id == invoice.id
    ).order_by(InvoiceLineItem.line_number).all()
    
    response = InvoiceResponse.model_validate(invoice)
    response.line_items = [InvoiceLineItemResponse.model_validate(li) for li in line_items]
    
    return response


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Send invoice to customer"""
    invoice = db.query(CustomerInvoice).filter(
        CustomerInvoice.id == invoice_id,
        CustomerInvoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if invoice.status == "draft":
        invoice.status = "sent"
        db.commit()
        db.refresh(invoice)
    
    line_items = db.query(InvoiceLineItem).filter(
        InvoiceLineItem.invoice_id == invoice.id
    ).order_by(InvoiceLineItem.line_number).all()
    
    response = InvoiceResponse.model_validate(invoice)
    response.line_items = [InvoiceLineItemResponse.model_validate(li) for li in line_items]
    
    return response
