"""
Financial Management API - Complete CRUD for Financial Module
Includes: Invoices, Payments, General Ledger, VAT, Bank Reconciliation
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from core.database import get_db
from core.auth import get_current_user
from models.transactions import (
    Invoice, InvoiceLine, Payment, PaymentAllocation
)
from models.accounting import (
    GeneralLedger
)
from models.user import User
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/financial", tags=["Financial"])

# Schemas
class InvoiceLineCreate(BaseModel):
    product_id: Optional[int] = None
    description: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    vat_rate: Decimal = Field(default=Decimal("0.15"))  # SA VAT 15%
    discount_percentage: Decimal = Field(default=Decimal("0"), ge=0, le=100)

class InvoiceCreate(BaseModel):
    customer_id: int
    invoice_date: date
    due_date: date
    reference: Optional[str] = None
    notes: Optional[str] = None
    lines: List[InvoiceLineCreate]

class InvoiceUpdate(BaseModel):
    customer_id: Optional[int] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    tenant_id: int
    customer_id: int
    invoice_number: str
    invoice_date: date
    due_date: date
    subtotal: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    balance: Decimal
    status: str
    reference: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    customer_id: int
    payment_date: date
    amount: Decimal = Field(gt=0)
    payment_method: str = Field(default="EFT")  # EFT, Cash, Cheque, Card
    reference: Optional[str] = None
    bank_account_id: Optional[int] = None
    invoice_allocations: Optional[List[dict]] = None  # {invoice_id, amount}

class PaymentResponse(BaseModel):
    id: int
    tenant_id: int
    customer_id: int
    payment_number: str
    payment_date: date
    amount: Decimal
    payment_method: str
    reference: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class GeneralLedgerEntryCreate(BaseModel):
    account_code: str
    account_name: str
    transaction_date: date
    debit: Decimal = Field(default=Decimal("0"), ge=0)
    credit: Decimal = Field(default=Decimal("0"), ge=0)
    description: str
    reference: Optional[str] = None

class BankReconciliationCreate(BaseModel):
    bank_account_id: int
    statement_date: date
    statement_balance: Decimal
    book_balance: Decimal
    transaction_ids: List[int]

# ===================== INVOICE ENDPOINTS =====================

@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice with line items"""
    # Calculate totals
    subtotal = Decimal("0")
    vat_amount = Decimal("0")
    
    for line in invoice.lines:
        line_total = line.quantity * line.unit_price
        if line.discount_percentage > 0:
            line_total = line_total * (1 - line.discount_percentage / 100)
        subtotal += line_total
        vat_amount += line_total * line.vat_rate
    
    total_amount = subtotal + vat_amount
    
    # Generate invoice number
    last_invoice = db.query(Invoice).filter(
        Invoice.tenant_id == current_user.tenant_id
    ).order_by(Invoice.id.desc()).first()
    
    next_number = 1 if not last_invoice else int(last_invoice.invoice_number.split('-')[-1]) + 1
    invoice_number = f"INV-{datetime.now().year}-{next_number:05d}"
    
    # Create invoice
    db_invoice = Invoice(
        tenant_id=current_user.tenant_id,
        customer_id=invoice.customer_id,
        invoice_number=invoice_number,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        subtotal=subtotal,
        vat_amount=vat_amount,
        total_amount=total_amount,
        amount_paid=Decimal("0"),
        balance=total_amount,
        status="draft",
        reference=invoice.reference,
        notes=invoice.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_invoice)
    db.flush()
    
    # Create invoice lines
    for line in invoice.lines:
        line_total = line.quantity * line.unit_price
        if line.discount_percentage > 0:
            discount_amount = line_total * (line.discount_percentage / 100)
            line_total -= discount_amount
        else:
            discount_amount = Decimal("0")
        
        line_vat = line_total * line.vat_rate
        
        db_line = InvoiceLine(
            invoice_id=db_invoice.id,
            product_id=line.product_id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            discount_percentage=line.discount_percentage,
            discount_amount=discount_amount,
            vat_rate=line.vat_rate,
            vat_amount=line_vat,
            line_total=line_total + line_vat
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_invoice)
    
    return db_invoice

@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List invoices with optional filters"""
    query = db.query(Invoice).filter(Invoice.tenant_id == current_user.tenant_id)
    
    if status:
        query = query.filter(Invoice.status == status)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if from_date:
        query = query.filter(Invoice.invoice_date >= from_date)
    if to_date:
        query = query.filter(Invoice.invoice_date <= to_date)
    
    invoices = query.order_by(Invoice.invoice_date.desc()).offset(skip).limit(limit).all()
    return invoices

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific invoice"""
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_update: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an invoice"""
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update fields
    for field, value in invoice_update.dict(exclude_unset=True).items():
        setattr(invoice, field, value)
    
    invoice.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(invoice)
    
    return invoice

@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice (soft delete - mark as cancelled)"""
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.amount_paid > 0:
        raise HTTPException(status_code=400, detail="Cannot delete invoice with payments")
    
    invoice.status = "cancelled"
    invoice.updated_at = datetime.utcnow()
    db.commit()

@router.post("/invoices/{invoice_id}/finalize", response_model=InvoiceResponse)
def finalize_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Finalize (approve) an invoice - changes status from draft to approved"""
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be finalized")
    
    invoice.status = "approved"
    invoice.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(invoice)
    
    return invoice

# ===================== PAYMENT ENDPOINTS =====================

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new payment and allocate to invoices"""
    # Generate payment number
    last_payment = db.query(Payment).filter(
        Payment.tenant_id == current_user.tenant_id
    ).order_by(Payment.id.desc()).first()
    
    next_number = 1 if not last_payment else int(last_payment.payment_number.split('-')[-1]) + 1
    payment_number = f"PMT-{datetime.now().year}-{next_number:05d}"
    
    # Create payment
    db_payment = Payment(
        tenant_id=current_user.tenant_id,
        customer_id=payment.customer_id,
        payment_number=payment_number,
        payment_date=payment.payment_date,
        amount=payment.amount,
        payment_method=payment.payment_method,
        reference=payment.reference,
        bank_account_id=payment.bank_account_id,
        status="completed",
        created_by_id=current_user.id
    )
    
    db.add(db_payment)
    db.flush()
    
    # Allocate to invoices if provided
    if payment.invoice_allocations:
        remaining_amount = payment.amount
        
        for allocation in payment.invoice_allocations:
            invoice = db.query(Invoice).filter(
                and_(
                    Invoice.id == allocation['invoice_id'],
                    Invoice.tenant_id == current_user.tenant_id
                )
            ).first()
            
            if invoice:
                allocation_amount = min(Decimal(str(allocation['amount'])), invoice.balance, remaining_amount)
                
                db_allocation = PaymentAllocation(
                    payment_id=db_payment.id,
                    invoice_id=invoice.id,
                    amount=allocation_amount
                )
                db.add(db_allocation)
                
                # Update invoice
                invoice.amount_paid += allocation_amount
                invoice.balance -= allocation_amount
                if invoice.balance == 0:
                    invoice.status = "paid"
                elif invoice.amount_paid > 0:
                    invoice.status = "partial"
                
                remaining_amount -= allocation_amount
    
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@router.get("/payments", response_model=List[PaymentResponse])
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    customer_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List payments with optional filters"""
    query = db.query(Payment).filter(Payment.tenant_id == current_user.tenant_id)
    
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)
    if from_date:
        query = query.filter(Payment.payment_date >= from_date)
    if to_date:
        query = query.filter(Payment.payment_date <= to_date)
    
    payments = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
    return payments

# ===================== GENERAL LEDGER ENDPOINTS =====================

@router.post("/general-ledger", status_code=status.HTTP_201_CREATED)
def create_gl_entry(
    entry: GeneralLedgerEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a general ledger entry"""
    if entry.debit == 0 and entry.credit == 0:
        raise HTTPException(status_code=400, detail="Either debit or credit must be non-zero")
    
    if entry.debit > 0 and entry.credit > 0:
        raise HTTPException(status_code=400, detail="Cannot have both debit and credit")
    
    db_entry = GeneralLedger(
        tenant_id=current_user.tenant_id,
        account_code=entry.account_code,
        account_name=entry.account_name,
        transaction_date=entry.transaction_date,
        debit=entry.debit,
        credit=entry.credit,
        balance=entry.debit - entry.credit,
        description=entry.description,
        reference=entry.reference,
        created_by_id=current_user.id
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.get("/general-ledger")
def list_gl_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    account_code: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List general ledger entries"""
    query = db.query(GeneralLedger).filter(GeneralLedger.tenant_id == current_user.tenant_id)
    
    if account_code:
        query = query.filter(GeneralLedger.account_code == account_code)
    if from_date:
        query = query.filter(GeneralLedger.transaction_date >= from_date)
    if to_date:
        query = query.filter(GeneralLedger.transaction_date <= to_date)
    
    entries = query.order_by(GeneralLedger.transaction_date.desc()).offset(skip).limit(limit).all()
    return entries

# ===================== REPORTS =====================

@router.get("/reports/aged-receivables")
def aged_receivables_report(
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate aged receivables report"""
    if not as_of_date:
        as_of_date = date.today()
    
    invoices = db.query(Invoice).filter(
        and_(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.balance > 0,
            Invoice.status.in_(["approved", "partial"])
        )
    ).all()
    
    report = {
        "as_of_date": as_of_date,
        "current": Decimal("0"),
        "30_days": Decimal("0"),
        "60_days": Decimal("0"),
        "90_days": Decimal("0"),
        "90_plus_days": Decimal("0"),
        "total": Decimal("0"),
        "details": []
    }
    
    for invoice in invoices:
        days_overdue = (as_of_date - invoice.due_date).days
        
        if days_overdue <= 0:
            report["current"] += invoice.balance
            bucket = "current"
        elif days_overdue <= 30:
            report["30_days"] += invoice.balance
            bucket = "30_days"
        elif days_overdue <= 60:
            report["60_days"] += invoice.balance
            bucket = "60_days"
        elif days_overdue <= 90:
            report["90_days"] += invoice.balance
            bucket = "90_days"
        else:
            report["90_plus_days"] += invoice.balance
            bucket = "90_plus_days"
        
        report["total"] += invoice.balance
        
        report["details"].append({
            "invoice_number": invoice.invoice_number,
            "customer_id": invoice.customer_id,
            "invoice_date": invoice.invoice_date.isoformat(),
            "due_date": invoice.due_date.isoformat(),
            "balance": float(invoice.balance),
            "days_overdue": days_overdue,
            "bucket": bucket
        })
    
    # Convert Decimals to floats for JSON serialization
    report["current"] = float(report["current"])
    report["30_days"] = float(report["30_days"])
    report["60_days"] = float(report["60_days"])
    report["90_days"] = float(report["90_days"])
    report["90_plus_days"] = float(report["90_plus_days"])
    report["total"] = float(report["total"])
    
    return report

@router.get("/reports/vat-summary")
def vat_summary_report(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate VAT summary report for SARS filing"""
    invoices = db.query(Invoice).filter(
        and_(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.invoice_date >= from_date,
            Invoice.invoice_date <= to_date,
            Invoice.status.in_(["approved", "partial", "paid"])
        )
    ).all()
    
    total_sales = sum(inv.subtotal for inv in invoices)
    total_vat = sum(inv.vat_amount for inv in invoices)
    
    report = {
        "period_start": from_date.isoformat(),
        "period_end": to_date.isoformat(),
        "total_sales": float(total_sales),
        "output_vat": float(total_vat),
        "input_vat": 0.0,  # TODO: Calculate from purchases
        "vat_payable": float(total_vat),
        "invoice_count": len(invoices)
    }
    
    return report
