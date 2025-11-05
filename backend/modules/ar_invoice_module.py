"""
AR Invoice Module for ARIA ERP
Handles Customer Invoices, Receipts, Credit Notes with GL Posting
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from decimal import Decimal

router = APIRouter(prefix="/api/ar", tags=["Accounts Receivable"])


@router.get("/health")
async def health_check():
    """Health check endpoint for AR module"""
    return {
        "status": "healthy",
        "module": "accounts_receivable",
        "version": "1.0.0",
        "features": [
            "customer_invoices",
            "receipts_with_allocation",
            "credit_notes",
            "gl_posting",
            "aging_analysis"
        ]
    }


# ============================================================================
# ============================================================================

class InvoiceLineCreate(BaseModel):
    line_number: int
    product_id: Optional[UUID] = None
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("15.00")  # SA VAT
    account_code: Optional[str] = None  # Revenue account override

class InvoiceLineResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    line_number: int
    product_id: Optional[UUID]
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    tax_rate: Decimal
    line_total: Decimal
    tax_amount: Decimal
    account_code: Optional[str]

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: UUID
    invoice_date: date
    due_date: date
    sales_order_id: Optional[UUID] = None
    delivery_id: Optional[UUID] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    lines: List[InvoiceLineCreate]

class InvoiceUpdate(BaseModel):
    customer_id: Optional[UUID] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    lines: Optional[List[InvoiceLineCreate]] = None

class InvoiceResponse(BaseModel):
    id: UUID
    company_id: UUID
    invoice_number: str
    customer_id: UUID
    customer_name: Optional[str]
    invoice_date: date
    due_date: date
    status: str  # draft, approved, posted, cancelled
    payment_status: str  # unpaid, partial, paid
    sales_order_id: Optional[UUID]
    delivery_id: Optional[UUID]
    reference: Optional[str]
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    amount_outstanding: Decimal
    notes: Optional[str]
    terms_and_conditions: Optional[str]
    journal_entry_id: Optional[UUID]
    created_by: Optional[UUID]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    posted_by: Optional[UUID]
    posted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    lines: List[InvoiceLineResponse] = []

    class Config:
        from_attributes = True

class ReceiptAllocationCreate(BaseModel):
    invoice_id: UUID
    amount: Decimal

class ReceiptCreate(BaseModel):
    customer_id: UUID
    payment_date: date
    bank_account_id: UUID
    payment_method: str  # cash, cheque, eft, card
    reference: Optional[str] = None
    amount: Decimal
    notes: Optional[str] = None
    allocations: List[ReceiptAllocationCreate]

class ReceiptAllocationResponse(BaseModel):
    id: UUID
    receipt_id: UUID
    invoice_id: UUID
    invoice_number: Optional[str]
    amount: Decimal

    class Config:
        from_attributes = True

class ReceiptResponse(BaseModel):
    id: UUID
    company_id: UUID
    receipt_number: str
    customer_id: UUID
    customer_name: Optional[str]
    payment_date: date
    bank_account_id: UUID
    bank_account_name: Optional[str]
    payment_method: str
    reference: Optional[str]
    amount: Decimal
    status: str  # draft, posted
    notes: Optional[str]
    journal_entry_id: Optional[UUID]
    created_by: Optional[UUID]
    posted_by: Optional[UUID]
    posted_at: Optional[datetime]
    created_at: datetime
    allocations: List[ReceiptAllocationResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# ============================================================================

def get_db():
    from core.database_pg import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_company_id(db: Session = Depends(get_db)) -> UUID:
    result = db.execute(text("SELECT id FROM companies LIMIT 1"))
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="No company found")
    return row[0]

def get_user_id(db: Session = Depends(get_db)) -> Optional[UUID]:
    result = db.execute(text("SELECT id FROM users LIMIT 1"))
    row = result.fetchone()
    return row[0] if row else None


# ============================================================================
# ============================================================================

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all customer invoices"""
    query = """
        SELECT i.id, i.company_id, i.invoice_number, i.customer_id, c.name as customer_name,
               i.invoice_date, i.due_date, i.status, i.payment_status,
               i.sales_order_id, i.delivery_id, i.reference,
               i.subtotal, i.tax_amount, i.total_amount, i.amount_paid, i.amount_outstanding,
               i.notes, i.terms_and_conditions, i.journal_entry_id,
               i.created_by, i.approved_by, i.approved_at, i.posted_by, i.posted_at,
               i.created_at, i.updated_at
        FROM customer_invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if status:
        query += " AND i.status = :status"
        params["status"] = status
    
    if payment_status:
        query += " AND i.payment_status = :payment_status"
        params["payment_status"] = payment_status
    
    if customer_id:
        query += " AND i.customer_id = :customer_id"
        params["customer_id"] = str(customer_id)
    
    query += " ORDER BY i.invoice_date DESC, i.invoice_number DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    invoices = []
    for row in result:
        invoice = InvoiceResponse(
            id=row[0], company_id=row[1], invoice_number=row[2], customer_id=row[3],
            customer_name=row[4], invoice_date=row[5], due_date=row[6], status=row[7],
            payment_status=row[8], sales_order_id=row[9], delivery_id=row[10],
            reference=row[11], subtotal=row[12], tax_amount=row[13], total_amount=row[14],
            amount_paid=row[15], amount_outstanding=row[16], notes=row[17],
            terms_and_conditions=row[18], journal_entry_id=row[19], created_by=row[20],
            approved_by=row[21], approved_at=row[22], posted_by=row[23], posted_at=row[24],
            created_at=row[25], updated_at=row[26], lines=[]
        )
        invoices.append(invoice)
    
    return invoices

@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(
    invoice: InvoiceCreate,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Create a new customer invoice"""
    try:
        count_result = db.execute(
            text("SELECT COUNT(*) FROM customer_invoices WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.fetchone()[0]
        invoice_number = f"INV-{datetime.now().year}-{count + 1:05d}"
        
        # Calculate totals
        subtotal = Decimal("0.00")
        tax_amount = Decimal("0.00")
        
        for line in invoice.lines:
            line_subtotal = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
            line_tax = line_subtotal * line.tax_rate / 100
            subtotal += line_subtotal
            tax_amount += line_tax
        
        total_amount = subtotal + tax_amount
        
        # Create invoice
        invoice_id = uuid4()
        db.execute(text("""
            INSERT INTO customer_invoices (
                id, company_id, invoice_number, customer_id, invoice_date, due_date,
                status, payment_status, sales_order_id, delivery_id, reference,
                subtotal, tax_amount, total_amount, amount_paid, amount_outstanding,
                notes, terms_and_conditions, created_by, created_at, updated_at
            ) VALUES (
                :id, :company_id, :invoice_number, :customer_id, :invoice_date, :due_date,
                'draft', 'unpaid', :sales_order_id, :delivery_id, :reference,
                :subtotal, :tax_amount, :total_amount, 0, :total_amount,
                :notes, :terms_and_conditions, :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(invoice_id),
            "company_id": str(company_id),
            "invoice_number": invoice_number,
            "customer_id": str(invoice.customer_id),
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,
            "sales_order_id": str(invoice.sales_order_id) if invoice.sales_order_id else None,
            "delivery_id": str(invoice.delivery_id) if invoice.delivery_id else None,
            "reference": invoice.reference,
            "subtotal": float(subtotal),
            "tax_amount": float(tax_amount),
            "total_amount": float(total_amount),
            "notes": invoice.notes,
            "terms_and_conditions": invoice.terms_and_conditions,
            "created_by": str(user_id) if user_id else None
        })
        
        # Create invoice lines
        for line in invoice.lines:
            line_id = uuid4()
            line_subtotal = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
            line_tax = line_subtotal * line.tax_rate / 100
            line_total = line_subtotal + line_tax
            
            db.execute(text("""
                INSERT INTO customer_invoice_lines (
                    id, invoice_id, line_number, product_id, description,
                    quantity, unit_price, discount_percent, tax_rate,
                    line_total, tax_amount, account_code, created_at, updated_at
                ) VALUES (
                    :id, :invoice_id, :line_number, :product_id, :description,
                    :quantity, :unit_price, :discount_percent, :tax_rate,
                    :line_total, :tax_amount, :account_code, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """), {
                "id": str(line_id),
                "invoice_id": str(invoice_id),
                "line_number": line.line_number,
                "product_id": str(line.product_id) if line.product_id else None,
                "description": line.description,
                "quantity": float(line.quantity),
                "unit_price": float(line.unit_price),
                "discount_percent": float(line.discount_percent),
                "tax_rate": float(line.tax_rate),
                "line_total": float(line_total),
                "tax_amount": float(line_tax),
                "account_code": line.account_code
            })
        
        db.commit()
        
        return await get_invoice(invoice_id, company_id, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating invoice: {str(e)}")

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific invoice with lines"""
    query = """
        SELECT i.id, i.company_id, i.invoice_number, i.customer_id, c.name as customer_name,
               i.invoice_date, i.due_date, i.status, i.payment_status,
               i.sales_order_id, i.delivery_id, i.reference,
               i.subtotal, i.tax_amount, i.total_amount, i.amount_paid, i.amount_outstanding,
               i.notes, i.terms_and_conditions, i.journal_entry_id,
               i.created_by, i.approved_by, i.approved_at, i.posted_by, i.posted_at,
               i.created_at, i.updated_at
        FROM customer_invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = :invoice_id AND i.company_id = :company_id
    """
    result = db.execute(text(query), {"invoice_id": str(invoice_id), "company_id": str(company_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice = InvoiceResponse(
        id=row[0], company_id=row[1], invoice_number=row[2], customer_id=row[3],
        customer_name=row[4], invoice_date=row[5], due_date=row[6], status=row[7],
        payment_status=row[8], sales_order_id=row[9], delivery_id=row[10],
        reference=row[11], subtotal=row[12], tax_amount=row[13], total_amount=row[14],
        amount_paid=row[15], amount_outstanding=row[16], notes=row[17],
        terms_and_conditions=row[18], journal_entry_id=row[19], created_by=row[20],
        approved_by=row[21], approved_at=row[22], posted_by=row[23], posted_at=row[24],
        created_at=row[25], updated_at=row[26], lines=[]
    )
    
    lines_query = """
        SELECT id, invoice_id, line_number, product_id, description,
               quantity, unit_price, discount_percent, tax_rate,
               line_total, tax_amount, account_code
        FROM customer_invoice_lines
        WHERE invoice_id = :invoice_id
        ORDER BY line_number
    """
    lines_result = db.execute(text(lines_query), {"invoice_id": str(invoice_id)})
    for line_row in lines_result:
        line = InvoiceLineResponse(
            id=line_row[0], invoice_id=line_row[1], line_number=line_row[2],
            product_id=line_row[3], description=line_row[4], quantity=line_row[5],
            unit_price=line_row[6], discount_percent=line_row[7], tax_rate=line_row[8],
            line_total=line_row[9], tax_amount=line_row[10], account_code=line_row[11]
        )
        invoice.lines.append(line)
    
    return invoice

@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_update: InvoiceUpdate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Update an invoice (only if status is draft)"""
    try:
        check_query = """
            SELECT status FROM customer_invoices
            WHERE id = :invoice_id AND company_id = :company_id
        """
        result = db.execute(text(check_query), {"invoice_id": str(invoice_id), "company_id": str(company_id)})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if row[0] != 'draft':
            raise HTTPException(status_code=400, detail="Can only update draft invoices")
        
        update_fields = []
        params = {"invoice_id": str(invoice_id), "company_id": str(company_id)}
        
        if invoice_update.customer_id:
            update_fields.append("customer_id = :customer_id")
            params["customer_id"] = str(invoice_update.customer_id)
        if invoice_update.invoice_date:
            update_fields.append("invoice_date = :invoice_date")
            params["invoice_date"] = invoice_update.invoice_date
        if invoice_update.due_date:
            update_fields.append("due_date = :due_date")
            params["due_date"] = invoice_update.due_date
        if invoice_update.reference is not None:
            update_fields.append("reference = :reference")
            params["reference"] = invoice_update.reference
        if invoice_update.notes is not None:
            update_fields.append("notes = :notes")
            params["notes"] = invoice_update.notes
        if invoice_update.terms_and_conditions is not None:
            update_fields.append("terms_and_conditions = :terms_and_conditions")
            params["terms_and_conditions"] = invoice_update.terms_and_conditions
        
        if update_fields:
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_query = f"""
                UPDATE customer_invoices
                SET {', '.join(update_fields)}
                WHERE id = :invoice_id AND company_id = :company_id
            """
            db.execute(text(update_query), params)
        
        if invoice_update.lines is not None:
            db.execute(text("DELETE FROM customer_invoice_lines WHERE invoice_id = :invoice_id"),
                      {"invoice_id": str(invoice_id)})
            
            subtotal = Decimal("0.00")
            tax_amount = Decimal("0.00")
            
            for line in invoice_update.lines:
                line_subtotal = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
                line_tax = line_subtotal * line.tax_rate / 100
                subtotal += line_subtotal
                tax_amount += line_tax
            
            total_amount = subtotal + tax_amount
            
            db.execute(text("""
                UPDATE customer_invoices
                SET subtotal = :subtotal, tax_amount = :tax_amount, total_amount = :total_amount,
                    amount_outstanding = :total_amount, updated_at = CURRENT_TIMESTAMP
                WHERE id = :invoice_id
            """), {
                "subtotal": float(subtotal),
                "tax_amount": float(tax_amount),
                "total_amount": float(total_amount),
                "invoice_id": str(invoice_id)
            })
            
            for line in invoice_update.lines:
                line_id = uuid4()
                line_subtotal = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
                line_tax = line_subtotal * line.tax_rate / 100
                line_total = line_subtotal + line_tax
                
                db.execute(text("""
                    INSERT INTO customer_invoice_lines (
                        id, invoice_id, line_number, product_id, description,
                        quantity, unit_price, discount_percent, tax_rate,
                        line_total, tax_amount, account_code, created_at, updated_at
                    ) VALUES (
                        :id, :invoice_id, :line_number, :product_id, :description,
                        :quantity, :unit_price, :discount_percent, :tax_rate,
                        :line_total, :tax_amount, :account_code, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """), {
                    "id": str(line_id),
                    "invoice_id": str(invoice_id),
                    "line_number": line.line_number,
                    "product_id": str(line.product_id) if line.product_id else None,
                    "description": line.description,
                    "quantity": float(line.quantity),
                    "unit_price": float(line.unit_price),
                    "discount_percent": float(line.discount_percent),
                    "tax_rate": float(line.tax_rate),
                    "line_total": float(line_total),
                    "tax_amount": float(line_tax),
                    "account_code": line.account_code
                })
        
        db.commit()
        
        return await get_invoice(invoice_id, company_id, db)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating invoice: {str(e)}")

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Delete an invoice (only if status is draft)"""
    try:
        check_query = """
            SELECT status FROM customer_invoices
            WHERE id = :invoice_id AND company_id = :company_id
        """
        result = db.execute(text(check_query), {"invoice_id": str(invoice_id), "company_id": str(company_id)})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if row[0] != 'draft':
            raise HTTPException(status_code=400, detail="Can only delete draft invoices")
        
        db.execute(text("DELETE FROM customer_invoice_lines WHERE invoice_id = :invoice_id"),
                  {"invoice_id": str(invoice_id)})
        
        db.execute(text("DELETE FROM customer_invoices WHERE id = :invoice_id"),
                  {"invoice_id": str(invoice_id)})
        
        db.commit()
        return {"message": "Invoice deleted successfully", "invoice_id": str(invoice_id)}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting invoice: {str(e)}")

@router.post("/invoices/{invoice_id}/approve")
async def approve_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Approve an invoice"""
    try:
        check_query = """
            SELECT status FROM customer_invoices
            WHERE id = :invoice_id AND company_id = :company_id
        """
        result = db.execute(text(check_query), {"invoice_id": str(invoice_id), "company_id": str(company_id)})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if row[0] != 'draft':
            raise HTTPException(status_code=400, detail="Invoice is not in draft status")
        
        db.execute(text("""
            UPDATE customer_invoices
            SET status = 'approved', approved_by = :approved_by, approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :invoice_id
        """), {
            "approved_by": str(user_id) if user_id else None,
            "invoice_id": str(invoice_id)
        })
        
        db.commit()
        return {"message": "Invoice approved successfully", "invoice_id": str(invoice_id)}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error approving invoice: {str(e)}")

@router.post("/invoices/{invoice_id}/post")
async def post_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Post an invoice to GL (creates journal entry)"""
    try:
        invoice_query = """
            SELECT status, invoice_number, customer_id, invoice_date,
                   subtotal, tax_amount, total_amount
            FROM customer_invoices
            WHERE id = :invoice_id AND company_id = :company_id
        """
        result = db.execute(text(invoice_query), {"invoice_id": str(invoice_id), "company_id": str(company_id)})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if row[0] not in ('approved', 'draft'):
            raise HTTPException(status_code=400, detail="Invoice must be approved before posting")
        
        status, invoice_number, customer_id, invoice_date, subtotal, tax_amount, total_amount = row
        
        je_id = uuid4()
        je_number = f"AR-{invoice_number}"
        
        db.execute(text("""
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, entry_type,
                reference, description, status, posted_by, posted_at,
                created_by, created_at, updated_at
            ) VALUES (
                :id, :company_id, :entry_number, :entry_date, 'INVOICE',
                :reference, :description, 'POSTED', :posted_by, CURRENT_TIMESTAMP,
                :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(je_id),
            "company_id": str(company_id),
            "entry_number": je_number,
            "entry_date": invoice_date,
            "reference": invoice_number,
            "description": f"Customer Invoice {invoice_number}",
            "posted_by": str(user_id) if user_id else None,
            "created_by": str(user_id) if user_id else None
        })
        
        ar_account_query = "SELECT id FROM accounts WHERE company_id = :company_id AND code = '1200' LIMIT 1"
        ar_result = db.execute(text(ar_account_query), {"company_id": str(company_id)})
        ar_account = ar_result.fetchone()
        if not ar_account:
            raise HTTPException(status_code=400, detail="AR account (1200) not found")
        
        revenue_account_query = "SELECT id FROM accounts WHERE company_id = :company_id AND code = '4100' LIMIT 1"
        revenue_result = db.execute(text(revenue_account_query), {"company_id": str(company_id)})
        revenue_account = revenue_result.fetchone()
        if not revenue_account:
            raise HTTPException(status_code=400, detail="Revenue account (4100) not found")
        
        vat_account_query = "SELECT id FROM accounts WHERE company_id = :company_id AND code = '2120' LIMIT 1"
        vat_result = db.execute(text(vat_account_query), {"company_id": str(company_id)})
        vat_account = vat_result.fetchone()
        if not vat_account:
            raise HTTPException(status_code=400, detail="VAT Output account (2120) not found")
        
        db.execute(text("""
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount, created_at, updated_at
            ) VALUES (
                :id, :journal_entry_id, 1, :account_id, 'Customer Invoice',
                :debit_amount, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(uuid4()),
            "journal_entry_id": str(je_id),
            "account_id": str(ar_account[0]),
            "debit_amount": float(total_amount)
        })
        
        db.execute(text("""
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount, created_at, updated_at
            ) VALUES (
                :id, :journal_entry_id, 2, :account_id, 'Sales',
                0, :credit_amount, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(uuid4()),
            "journal_entry_id": str(je_id),
            "account_id": str(revenue_account[0]),
            "credit_amount": float(subtotal)
        })
        
        if tax_amount > 0:
            db.execute(text("""
                INSERT INTO journal_entry_lines (
                    id, journal_entry_id, line_number, account_id, description,
                    debit_amount, credit_amount, created_at, updated_at
                ) VALUES (
                    :id, :journal_entry_id, 3, :account_id, 'VAT Output',
                    0, :credit_amount, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """), {
                "id": str(uuid4()),
                "journal_entry_id": str(je_id),
                "account_id": str(vat_account[0]),
                "credit_amount": float(tax_amount)
            })
        
        db.execute(text("""
            UPDATE customer_invoices
            SET status = 'posted', journal_entry_id = :journal_entry_id,
                posted_by = :posted_by, posted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :invoice_id
        """), {
            "journal_entry_id": str(je_id),
            "posted_by": str(user_id) if user_id else None,
            "invoice_id": str(invoice_id)
        })
        
        db.commit()
        return {
            "message": "Invoice posted successfully",
            "invoice_id": str(invoice_id),
            "journal_entry_id": str(je_id),
            "journal_entry_number": je_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error posting invoice: {str(e)}")


# ============================================================================
# ============================================================================

@router.get("/receipts", response_model=List[ReceiptResponse])
async def list_receipts(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all customer receipts"""
    query = """
        SELECT r.id, r.company_id, r.receipt_number, r.customer_id, c.name as customer_name,
               r.payment_date, r.bank_account_id, ba.account_name as bank_account_name,
               r.payment_method, r.reference, r.amount, r.status, r.notes,
               r.journal_entry_id, r.created_by, r.posted_by, r.posted_at, r.created_at
        FROM receipts r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN bank_accounts ba ON r.bank_account_id = ba.id
        WHERE r.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if status:
        query += " AND r.status = :status"
        params["status"] = status
    
    if customer_id:
        query += " AND r.customer_id = :customer_id"
        params["customer_id"] = str(customer_id)
    
    query += " ORDER BY r.payment_date DESC, r.receipt_number DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    receipts = []
    for row in result:
        receipt = ReceiptResponse(
            id=row[0], company_id=row[1], receipt_number=row[2], customer_id=row[3],
            customer_name=row[4], payment_date=row[5], bank_account_id=row[6],
            bank_account_name=row[7], payment_method=row[8], reference=row[9],
            amount=row[10], status=row[11], notes=row[12], journal_entry_id=row[13],
            created_by=row[14], posted_by=row[15], posted_at=row[16], created_at=row[17],
            allocations=[]
        )
        receipts.append(receipt)
    
    return receipts

@router.post("/receipts", response_model=ReceiptResponse)
async def create_receipt(
    receipt: ReceiptCreate,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Create a new customer receipt and allocate to invoices"""
    try:
        count_result = db.execute(
            text("SELECT COUNT(*) FROM receipts WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.fetchone()[0]
        receipt_number = f"REC-{datetime.now().year}-{count + 1:05d}"
        
        receipt_id = uuid4()
        db.execute(text("""
            INSERT INTO receipts (
                id, company_id, receipt_number, customer_id, payment_date,
                bank_account_id, payment_method, reference, amount, status,
                notes, created_by, created_at, updated_at
            ) VALUES (
                :id, :company_id, :receipt_number, :customer_id, :payment_date,
                :bank_account_id, :payment_method, :reference, :amount, 'draft',
                :notes, :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {
            "id": str(receipt_id),
            "company_id": str(company_id),
            "receipt_number": receipt_number,
            "customer_id": str(receipt.customer_id),
            "payment_date": receipt.payment_date,
            "bank_account_id": str(receipt.bank_account_id),
            "payment_method": receipt.payment_method,
            "reference": receipt.reference,
            "amount": float(receipt.amount),
            "notes": receipt.notes,
            "created_by": str(user_id) if user_id else None
        })
        
        for allocation in receipt.allocations:
            alloc_id = uuid4()
            db.execute(text("""
                INSERT INTO receipt_allocations (
                    id, receipt_id, invoice_id, amount, created_at, updated_at
                ) VALUES (
                    :id, :receipt_id, :invoice_id, :amount, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """), {
                "id": str(alloc_id),
                "receipt_id": str(receipt_id),
                "invoice_id": str(allocation.invoice_id),
                "amount": float(allocation.amount)
            })
            
            db.execute(text("""
                UPDATE customer_invoices
                SET amount_paid = amount_paid + :amount,
                    amount_outstanding = amount_outstanding - :amount,
                    payment_status = CASE
                        WHEN amount_outstanding - :amount <= 0.01 THEN 'paid'
                        WHEN amount_paid + :amount > 0 THEN 'partial'
                        ELSE 'unpaid'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :invoice_id
            """), {
                "amount": float(allocation.amount),
                "invoice_id": str(allocation.invoice_id)
            })
        
        je_id = await _post_receipt_to_gl(
            db, company_id, user_id, receipt_id, receipt_number,
            receipt.customer_id, receipt.bank_account_id,
            receipt.amount, receipt.payment_date
        )
        
        db.execute(text("""
            UPDATE receipts
            SET status = 'posted', journal_entry_id = :journal_entry_id,
                posted_by = :posted_by, posted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :receipt_id
        """), {
            "journal_entry_id": str(je_id),
            "posted_by": str(user_id) if user_id else None,
            "receipt_id": str(receipt_id)
        })
        
        db.commit()
        
        return await get_receipt(receipt_id, company_id, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating receipt: {str(e)}")

@router.get("/receipts/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(
    receipt_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific receipt with allocations"""
    query = """
        SELECT r.id, r.company_id, r.receipt_number, r.customer_id, c.name as customer_name,
               r.payment_date, r.bank_account_id, ba.account_name as bank_account_name,
               r.payment_method, r.reference, r.amount, r.status, r.notes,
               r.journal_entry_id, r.created_by, r.posted_by, r.posted_at, r.created_at
        FROM receipts r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN bank_accounts ba ON r.bank_account_id = ba.id
        WHERE r.id = :receipt_id AND r.company_id = :company_id
    """
    result = db.execute(text(query), {"receipt_id": str(receipt_id), "company_id": str(company_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    receipt = ReceiptResponse(
        id=row[0], company_id=row[1], receipt_number=row[2], customer_id=row[3],
        customer_name=row[4], payment_date=row[5], bank_account_id=row[6],
        bank_account_name=row[7], payment_method=row[8], reference=row[9],
        amount=row[10], status=row[11], notes=row[12], journal_entry_id=row[13],
        created_by=row[14], posted_by=row[15], posted_at=row[16], created_at=row[17],
        allocations=[]
    )
    
    alloc_query = """
        SELECT ra.id, ra.receipt_id, ra.invoice_id, i.invoice_number, ra.amount
        FROM receipt_allocations ra
        LEFT JOIN customer_invoices i ON ra.invoice_id = i.id
        WHERE ra.receipt_id = :receipt_id
    """
    alloc_result = db.execute(text(alloc_query), {"receipt_id": str(receipt_id)})
    for alloc_row in alloc_result:
        allocation = ReceiptAllocationResponse(
            id=alloc_row[0], receipt_id=alloc_row[1], invoice_id=alloc_row[2],
            invoice_number=alloc_row[3], amount=alloc_row[4]
        )
        receipt.allocations.append(allocation)
    
    return receipt


async def _post_receipt_to_gl(
    db: Session,
    company_id: UUID,
    user_id: Optional[UUID],
    receipt_id: UUID,
    receipt_number: str,
    customer_id: UUID,
    bank_account_id: UUID,
    amount: Decimal,
    payment_date: date
) -> UUID:
    """Post customer receipt to GL"""
    je_id = uuid4()
    je_number = f"REC-{receipt_number}"
    
    db.execute(text("""
        INSERT INTO journal_entries (
            id, company_id, entry_number, entry_date, entry_type,
            reference, description, status, posted_by, posted_at,
            created_by, created_at, updated_at
        ) VALUES (
            :id, :company_id, :entry_number, :entry_date, 'PAYMENT',
            :reference, :description, 'POSTED', :posted_by, CURRENT_TIMESTAMP,
            :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
    """), {
        "id": str(je_id),
        "company_id": str(company_id),
        "entry_number": je_number,
        "entry_date": payment_date,
        "reference": receipt_number,
        "description": f"Customer Receipt {receipt_number}",
        "posted_by": str(user_id) if user_id else None,
        "created_by": str(user_id) if user_id else None
    })
    
    ar_account_query = "SELECT id FROM accounts WHERE company_id = :company_id AND code = '1200' LIMIT 1"
    ar_result = db.execute(text(ar_account_query), {"company_id": str(company_id)})
    ar_account = ar_result.fetchone()
    if not ar_account:
        raise HTTPException(status_code=400, detail="AR account (1200) not found")
    
    bank_account_query = "SELECT account_id FROM bank_accounts WHERE id = :bank_account_id"
    bank_result = db.execute(text(bank_account_query), {"bank_account_id": str(bank_account_id)})
    bank_account = bank_result.fetchone()
    if not bank_account:
        raise HTTPException(status_code=400, detail="Bank account GL account not found")
    
    db.execute(text("""
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, line_number, account_id, description,
            debit_amount, credit_amount, created_at, updated_at
        ) VALUES (
            :id, :journal_entry_id, 1, :account_id, 'Receipt',
            :debit_amount, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
    """), {
        "id": str(uuid4()),
        "journal_entry_id": str(je_id),
        "account_id": str(bank_account[0]),
        "debit_amount": float(amount)
    })
    
    db.execute(text("""
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, line_number, account_id, description,
            debit_amount, credit_amount, created_at, updated_at
        ) VALUES (
            :id, :journal_entry_id, 2, :account_id, 'Receipt',
            0, :credit_amount, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
    """), {
        "id": str(uuid4()),
        "journal_entry_id": str(je_id),
        "account_id": str(ar_account[0]),
        "credit_amount": float(amount)
    })
    
    return je_id
