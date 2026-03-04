"""
Accounts Payable API
Provides endpoints for vendor bills, payments, and credit notes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
import os
import logging
import asyncio

from core.database import get_db
from core.auth import get_current_user
from app.models.user import User
from app.models.ap import (
    VendorBill, VendorBillLine, VendorPayment, PaymentAllocation, VendorCreditNote, VendorCreditNoteLine,
    BillStatus, PaymentStatus, PaymentMethod
)
from services.gl_posting_service import GLPostingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ap", tags=["Accounts Payable"])

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/aria_erp')
gl_service = GLPostingService(DATABASE_URL)

# ===================== SCHEMAS =====================

class BillLineCreate(BaseModel):
    line_number: int
    product_id: Optional[int] = None
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("15")
    expense_account_code: Optional[str] = None

class BillLineResponse(BaseModel):
    id: int
    bill_id: int
    line_number: int
    product_id: Optional[int]
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal
    expense_account_code: Optional[str]

    class Config:
        from_attributes = True

class VendorBillCreate(BaseModel):
    vendor_id: int
    purchase_order_id: Optional[int] = None
    bill_date: date
    due_date: date
    vendor_invoice_number: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    lines: List[BillLineCreate]

class VendorBillResponse(BaseModel):
    id: int
    tenant_id: int
    bill_number: str
    vendor_id: int
    purchase_order_id: Optional[int]
    bill_date: date
    due_date: date
    vendor_invoice_number: Optional[str]
    reference: Optional[str]
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    amount_outstanding: Decimal
    status: str
    payment_status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentAllocationCreate(BaseModel):
    bill_id: int
    amount: Decimal

class VendorPaymentCreate(BaseModel):
    vendor_id: int
    payment_date: date
    payment_method: str
    bank_account_id: int
    amount: Decimal
    reference: Optional[str] = None
    cheque_number: Optional[str] = None
    notes: Optional[str] = None
    allocations: List[PaymentAllocationCreate]

class VendorPaymentResponse(BaseModel):
    id: int
    tenant_id: int
    payment_number: str
    vendor_id: int
    payment_date: date
    payment_method: str
    bank_account_id: int
    amount: Decimal
    reference: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreditNoteLineCreate(BaseModel):
    line_number: int
    product_id: Optional[int] = None
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal("15")
    expense_account_code: Optional[str] = None

class VendorCreditNoteCreate(BaseModel):
    vendor_id: int
    bill_id: Optional[int] = None
    credit_note_date: date
    vendor_credit_number: Optional[str] = None
    reference: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    lines: List[CreditNoteLineCreate]

class VendorCreditNoteResponse(BaseModel):
    id: int
    tenant_id: int
    credit_note_number: str
    vendor_id: int
    bill_id: Optional[int]
    credit_note_date: date
    vendor_credit_number: Optional[str]
    reference: Optional[str]
    reason: Optional[str]
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_applied: Decimal
    amount_remaining: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/bills", response_model=VendorBillResponse, status_code=status.HTTP_201_CREATED)
def create_vendor_bill(
    bill: VendorBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor bill"""
    last_bill = db.query(VendorBill).filter(
        VendorBill.tenant_id == current_user.tenant_id
    ).order_by(VendorBill.id.desc()).first()
    
    next_number = 1 if not last_bill else int(last_bill.bill_number.split('-')[-1]) + 1
    bill_number = f"BILL-{next_number:05d}"
    
    # Calculate totals
    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    
    for line in bill.lines:
        line_subtotal = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
        line_tax = line_subtotal * line.tax_rate / 100
        subtotal += line_subtotal
        tax_amount += line_tax
    
    total_amount = subtotal + tax_amount
    
    db_bill = VendorBill(
        tenant_id=current_user.tenant_id,
        bill_number=bill_number,
        vendor_id=bill.vendor_id,
        purchase_order_id=bill.purchase_order_id,
        bill_date=bill.bill_date,
        due_date=bill.due_date,
        vendor_invoice_number=bill.vendor_invoice_number,
        reference=bill.reference,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        amount_paid=Decimal("0"),
        amount_outstanding=total_amount,
        status=BillStatus.DRAFT,
        payment_status=PaymentStatus.UNPAID,
        notes=bill.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_bill)
    db.flush()
    
    for line in bill.lines:
        line_subtotal = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
        line_tax = line_subtotal * line.tax_rate / 100
        line_total = line_subtotal + line_tax
        
        db_line = VendorBillLine(
            bill_id=db_bill.id,
            line_number=line.line_number,
            product_id=line.product_id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            discount_percent=line.discount_percent,
            tax_rate=line.tax_rate,
            tax_amount=line_tax,
            line_total=line_total,
            expense_account_code=line.expense_account_code
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_bill)
    
    return db_bill

@router.get("/bills", response_model=List[VendorBillResponse])
def list_vendor_bills(
    vendor_id: Optional[int] = None,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List vendor bills with optional filters"""
    query = db.query(VendorBill).filter(VendorBill.tenant_id == current_user.tenant_id)
    
    if vendor_id:
        query = query.filter(VendorBill.vendor_id == vendor_id)
    if status:
        query = query.filter(VendorBill.status == status)
    if payment_status:
        query = query.filter(VendorBill.payment_status == payment_status)
    
    bills = query.order_by(desc(VendorBill.bill_date)).offset(skip).limit(limit).all()
    return bills

@router.get("/bills/{bill_id}", response_model=VendorBillResponse)
def get_vendor_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific vendor bill"""
    bill = db.query(VendorBill).filter(
        and_(
            VendorBill.id == bill_id,
            VendorBill.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return bill

@router.post("/bills/{bill_id}/approve")
def approve_vendor_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a vendor bill"""
    bill = db.query(VendorBill).filter(
        and_(
            VendorBill.id == bill_id,
            VendorBill.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill.status != BillStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft bills can be approved")
    
    bill.status = BillStatus.APPROVED
    bill.approved_by_id = current_user.id
    bill.approved_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "message": "Bill approved successfully"}

@router.post("/bills/{bill_id}/post")
async def post_vendor_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Post a vendor bill to GL"""
    bill = db.query(VendorBill).filter(
        and_(
            VendorBill.id == bill_id,
            VendorBill.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill.status != BillStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved bills can be posted")
    
    bill_lines = db.query(VendorBillLine).filter(
        VendorBillLine.bill_id == bill_id
    ).all()
    
    lines_data = []
    for line in bill_lines:
        lines_data.append({
            "description": line.description,
            "line_total": float(line.line_total),
            "tax_amount": float(line.tax_amount),
            "expense_account_code": line.expense_account_code or "5300"
        })
    
    # Post to GL
    try:
        journal_entry_id = await gl_service.post_supplier_bill(
            company_id=str(current_user.tenant_id),
            bill_id=str(bill_id),
            bill_number=bill.bill_number,
            bill_date=bill.bill_date,
            lines=lines_data,
            subtotal=bill.subtotal,
            tax_amount=bill.tax_amount,
            total_amount=bill.total_amount,
            user_id=str(current_user.id)
        )
        
        if journal_entry_id:
            logger.info(f"Bill {bill.bill_number} posted to GL: {journal_entry_id}")
        else:
            logger.warning(f"Bill {bill.bill_number} GL posting failed, but continuing")
    except Exception as e:
        logger.error(f"GL posting error for bill {bill.bill_number}: {e}")
    
    bill.status = BillStatus.POSTED
    bill.posted_by_id = current_user.id
    bill.posted_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True, 
        "message": "Bill posted to GL successfully",
        "journal_entry_id": journal_entry_id if 'journal_entry_id' in locals() else None
    }


@router.post("/payments", response_model=VendorPaymentResponse, status_code=status.HTTP_201_CREATED)
def create_vendor_payment(
    payment: VendorPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor payment"""
    # Generate payment number
    last_payment = db.query(VendorPayment).filter(
        VendorPayment.tenant_id == current_user.tenant_id
    ).order_by(VendorPayment.id.desc()).first()
    
    next_number = 1 if not last_payment else int(last_payment.payment_number.split('-')[-1]) + 1
    payment_number = f"PAY-{next_number:05d}"
    
    # Create payment
    db_payment = VendorPayment(
        tenant_id=current_user.tenant_id,
        payment_number=payment_number,
        vendor_id=payment.vendor_id,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        bank_account_id=payment.bank_account_id,
        amount=payment.amount,
        reference=payment.reference,
        cheque_number=payment.cheque_number,
        status="DRAFT",
        notes=payment.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_payment)
    db.flush()
    
    for allocation in payment.allocations:
        db_allocation = PaymentAllocation(
            payment_id=db_payment.id,
            bill_id=allocation.bill_id,
            amount=allocation.amount
        )
        db.add(db_allocation)
        
        bill = db.query(VendorBill).filter(VendorBill.id == allocation.bill_id).first()
        if bill:
            bill.amount_paid += allocation.amount
            bill.amount_outstanding -= allocation.amount
            
            if bill.amount_outstanding <= 0:
                bill.payment_status = PaymentStatus.PAID
            elif bill.amount_paid > 0:
                bill.payment_status = PaymentStatus.PARTIAL
    
    db.commit()
    db.refresh(db_payment)
    
    return db_payment

@router.get("/payments", response_model=List[VendorPaymentResponse])
def list_vendor_payments(
    vendor_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List vendor payments"""
    query = db.query(VendorPayment).filter(VendorPayment.tenant_id == current_user.tenant_id)
    
    if vendor_id:
        query = query.filter(VendorPayment.vendor_id == vendor_id)
    
    payments = query.order_by(desc(VendorPayment.payment_date)).offset(skip).limit(limit).all()
    return payments


@router.post("/credit-notes", response_model=VendorCreditNoteResponse, status_code=status.HTTP_201_CREATED)
def create_vendor_credit_note(
    credit_note: VendorCreditNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor credit note"""
    last_cn = db.query(VendorCreditNote).filter(
        VendorCreditNote.tenant_id == current_user.tenant_id
    ).order_by(VendorCreditNote.id.desc()).first()
    
    next_number = 1 if not last_cn else int(last_cn.credit_note_number.split('-')[-1]) + 1
    credit_note_number = f"VCN-{next_number:05d}"
    
    # Calculate totals
    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    
    for line in credit_note.lines:
        line_subtotal = line.quantity * line.unit_price
        line_tax = line_subtotal * line.tax_rate / 100
        subtotal += line_subtotal
        tax_amount += line_tax
    
    total_amount = subtotal + tax_amount
    
    db_credit_note = VendorCreditNote(
        tenant_id=current_user.tenant_id,
        credit_note_number=credit_note_number,
        vendor_id=credit_note.vendor_id,
        bill_id=credit_note.bill_id,
        credit_note_date=credit_note.credit_note_date,
        vendor_credit_number=credit_note.vendor_credit_number,
        reference=credit_note.reference,
        reason=credit_note.reason,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        amount_applied=Decimal("0"),
        amount_remaining=total_amount,
        status="DRAFT",
        notes=credit_note.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_credit_note)
    db.flush()
    
    for line in credit_note.lines:
        line_subtotal = line.quantity * line.unit_price
        line_tax = line_subtotal * line.tax_rate / 100
        line_total = line_subtotal + line_tax
        
        db_line = VendorCreditNoteLine(
            credit_note_id=db_credit_note.id,
            line_number=line.line_number,
            product_id=line.product_id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            tax_rate=line.tax_rate,
            tax_amount=line_tax,
            line_total=line_total,
            expense_account_code=line.expense_account_code
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_credit_note)
    
    return db_credit_note

@router.get("/credit-notes", response_model=List[VendorCreditNoteResponse])
def list_vendor_credit_notes(
    vendor_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List vendor credit notes"""
    query = db.query(VendorCreditNote).filter(VendorCreditNote.tenant_id == current_user.tenant_id)
    
    if vendor_id:
        query = query.filter(VendorCreditNote.vendor_id == vendor_id)
    
    credit_notes = query.order_by(desc(VendorCreditNote.credit_note_date)).offset(skip).limit(limit).all()
    return credit_notes

# ===================== REPORTS =====================

@router.get("/reports/aged-payables")
def get_aged_payables_report(
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aged payables report"""
    if not as_of_date:
        as_of_date = date.today()
    
    bills = db.query(VendorBill).filter(
        and_(
            VendorBill.tenant_id == current_user.tenant_id,
            VendorBill.payment_status.in_([PaymentStatus.UNPAID, PaymentStatus.PARTIAL])
        )
    ).all()
    
    aged_data = []
    for bill in bills:
        days_overdue = (as_of_date - bill.due_date).days
        
        if days_overdue < 0:
            bucket = "Current"
        elif days_overdue <= 30:
            bucket = "1-30 days"
        elif days_overdue <= 60:
            bucket = "31-60 days"
        elif days_overdue <= 90:
            bucket = "61-90 days"
        else:
            bucket = "90+ days"
        
        aged_data.append({
            "bill_number": bill.bill_number,
            "vendor_id": bill.vendor_id,
            "bill_date": bill.bill_date,
            "due_date": bill.due_date,
            "days_overdue": days_overdue,
            "bucket": bucket,
            "amount_outstanding": float(bill.amount_outstanding)
        })
    
    totals = {
        "Current": 0,
        "1-30 days": 0,
        "31-60 days": 0,
        "61-90 days": 0,
        "90+ days": 0
    }
    
    for item in aged_data:
        totals[item["bucket"]] += item["amount_outstanding"]
    
    return {
        "as_of_date": as_of_date,
        "bills": aged_data,
        "totals": totals,
        "grand_total": sum(totals.values())
    }
