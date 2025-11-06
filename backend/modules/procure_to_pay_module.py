"""
ARIA ERP - Procure-to-Pay Module
Complete procurement workflow: PO → Receipt → Supplier Invoice → Payment
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date

router = APIRouter(prefix="/api/erp/procure-to-pay", tags=["Procure-to-Pay"])


def get_db():
    """Get database session"""
    from backend.database import get_db as _get_db
    return next(_get_db())

def get_company_id() -> UUID:
    """Get company ID from context - placeholder for now"""
    return UUID("00000000-0000-0000-0000-000000000001")

def get_user_id(db: Session) -> UUID:
    """Get user ID"""
    result = db.execute(text("SELECT id FROM users LIMIT 1"))
    row = result.fetchone()
    return row[0] if row else UUID("00000000-0000-0000-0000-000000000001")


class PurchaseOrderLineCreate(BaseModel):
    line_number: int
    product_id: Optional[UUID] = None
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.15")
    discount_percentage: Decimal = Decimal("0")

class PurchaseOrderLineResponse(BaseModel):
    id: UUID
    purchase_order_id: UUID
    line_number: int
    product_id: Optional[UUID]
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    discount_percentage: Decimal
    line_total: Decimal
    received_quantity: Decimal
    
    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    po_date: date
    expected_delivery_date: Optional[date] = None
    payment_terms: Optional[str] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    lines: List[PurchaseOrderLineCreate]

class PurchaseOrderResponse(BaseModel):
    id: UUID
    company_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None
    po_number: str
    po_date: date
    expected_delivery_date: Optional[date]
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime
    lines: List[PurchaseOrderLineResponse] = []
    
    class Config:
        from_attributes = True


class GoodsReceiptLineCreate(BaseModel):
    purchase_order_line_id: Optional[UUID] = None
    product_id: UUID
    description: str
    quantity_received: Decimal
    storage_location_id: Optional[UUID] = None

class GoodsReceiptLineResponse(BaseModel):
    id: UUID
    goods_receipt_id: UUID
    purchase_order_line_id: Optional[UUID]
    product_id: UUID
    description: str
    quantity_received: Decimal
    storage_location_id: Optional[UUID]
    
    class Config:
        from_attributes = True

class GoodsReceiptCreate(BaseModel):
    purchase_order_id: Optional[UUID] = None
    supplier_id: UUID
    receipt_date: date
    warehouse_id: Optional[UUID] = None
    notes: Optional[str] = None
    lines: List[GoodsReceiptLineCreate]

class GoodsReceiptResponse(BaseModel):
    id: UUID
    company_id: UUID
    purchase_order_id: Optional[UUID]
    supplier_id: UUID
    supplier_name: Optional[str] = None
    receipt_number: str
    receipt_date: date
    warehouse_id: Optional[UUID]
    status: str
    received_by: Optional[UUID]
    created_at: datetime
    lines: List[GoodsReceiptLineResponse] = []
    
    class Config:
        from_attributes = True


class SupplierInvoiceLineCreate(BaseModel):
    line_number: int
    product_id: Optional[UUID] = None
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.15")
    discount_percentage: Decimal = Decimal("0")

class SupplierInvoiceLineResponse(BaseModel):
    id: UUID
    supplier_invoice_id: UUID
    line_number: int
    product_id: Optional[UUID]
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    
    class Config:
        from_attributes = True

class SupplierInvoiceCreate(BaseModel):
    supplier_id: UUID
    supplier_invoice_number: str
    invoice_date: date
    due_date: date
    purchase_order_id: Optional[UUID] = None
    receipt_id: Optional[UUID] = None
    lines: List[SupplierInvoiceLineCreate]

class SupplierInvoiceResponse(BaseModel):
    id: UUID
    company_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None
    invoice_number: str
    supplier_invoice_number: str
    invoice_date: date
    due_date: date
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    balance_due: Decimal
    status: str
    purchase_order_id: Optional[UUID]
    receipt_id: Optional[UUID]
    po_matched: Optional[bool]
    receipt_matched: Optional[bool]
    three_way_matched: Optional[bool]
    created_at: datetime
    lines: List[SupplierInvoiceLineResponse] = []
    
    class Config:
        from_attributes = True


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "procure_to_pay",
        "endpoints": ["purchase-orders", "goods-receipts", "supplier-invoices"]
    }

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all purchase orders"""
    query = """
        SELECT po.id, po.company_id, po.supplier_id, s.name as supplier_name,
               po.po_number, po.po_date, po.expected_delivery_date, po.status,
               po.subtotal, po.tax_amount, po.total_amount,
               po.approved_by, po.approved_at, po.created_at
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.company_id = :company_id
        ORDER BY po.created_at DESC
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    pos = []
    for row in result:
        pos.append(PurchaseOrderResponse(
            id=row[0], company_id=row[1], supplier_id=row[2], supplier_name=row[3],
            po_number=row[4], po_date=row[5], expected_delivery_date=row[6], status=row[7],
            subtotal=row[8], tax_amount=row[9], total_amount=row[10],
            approved_by=row[11], approved_at=row[12], created_at=row[13]
        ))
    return pos

@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    po: PurchaseOrderCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a purchase order"""
    try:
        po_id = uuid4()
        user_id = get_user_id(db)
        
        # Generate PO number
        count_result = db.execute(
            text("SELECT COUNT(*) FROM purchase_orders WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        po_number = f"PO-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        # Calculate totals
        subtotal = Decimal("0")
        tax_amount = Decimal("0")
        
        for line in po.lines:
            line_subtotal = line.quantity * line.unit_price
            discount_amt = line_subtotal * (line.discount_percentage / Decimal("100"))
            line_subtotal_after_discount = line_subtotal - discount_amt
            line_tax = line_subtotal_after_discount * line.tax_rate
            
            subtotal += line_subtotal_after_discount
            tax_amount += line_tax
        
        total_amount = subtotal + tax_amount
        
        db.execute(text("""
            INSERT INTO purchase_orders (id, company_id, supplier_id, po_number,
                                        po_date, expected_delivery_date, status,
                                        subtotal, tax_amount, total_amount,
                                        payment_terms, delivery_address, notes,
                                        created_by, created_at, updated_at)
            VALUES (:id, :company_id, :supplier_id, :po_number,
                    :po_date, :expected_delivery_date, 'draft',
                    :subtotal, :tax_amount, :total_amount,
                    :payment_terms, :delivery_address, :notes,
                    :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(po_id),
            "company_id": str(company_id),
            "supplier_id": str(po.supplier_id),
            "po_number": po_number,
            "po_date": po.po_date,
            "expected_delivery_date": po.expected_delivery_date,
            "subtotal": float(subtotal),
            "tax_amount": float(tax_amount),
            "total_amount": float(total_amount),
            "payment_terms": po.payment_terms,
            "delivery_address": po.delivery_address,
            "notes": po.notes,
            "created_by": str(user_id)
        })
        
        for line in po.lines:
            line_id = uuid4()
            line_subtotal = line.quantity * line.unit_price
            discount_amt = line_subtotal * (line.discount_percentage / Decimal("100"))
            line_subtotal_after_discount = line_subtotal - discount_amt
            line_tax = line_subtotal_after_discount * line.tax_rate
            line_total = line_subtotal_after_discount + line_tax
            
            db.execute(text("""
                INSERT INTO purchase_order_lines (id, purchase_order_id, line_number,
                                                  product_id, description, quantity,
                                                  unit_price, tax_rate, discount_percentage,
                                                  line_total, received_quantity,
                                                  created_at, updated_at)
                VALUES (:id, :po_id, :line_number,
                        :product_id, :description, :quantity,
                        :unit_price, :tax_rate, :discount_percentage,
                        :line_total, 0,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "id": str(line_id),
                "po_id": str(po_id),
                "line_number": line.line_number,
                "product_id": str(line.product_id) if line.product_id else None,
                "description": line.description,
                "quantity": float(line.quantity),
                "unit_price": float(line.unit_price),
                "tax_rate": float(line.tax_rate),
                "discount_percentage": float(line.discount_percentage),
                "line_total": float(line_total)
            })
        
        db.commit()
        
        query = """
            SELECT po.id, po.company_id, po.supplier_id, s.name as supplier_name,
                   po.po_number, po.po_date, po.expected_delivery_date, po.status,
                   po.subtotal, po.tax_amount, po.total_amount,
                   po.approved_by, po.approved_at, po.created_at
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = :po_id
        """
        result = db.execute(text(query), {"po_id": str(po_id)})
        row = result.fetchone()
        
        return PurchaseOrderResponse(
            id=row[0], company_id=row[1], supplier_id=row[2], supplier_name=row[3],
            po_number=row[4], po_date=row[5], expected_delivery_date=row[6], status=row[7],
            subtotal=row[8], tax_amount=row[9], total_amount=row[10],
            approved_by=row[11], approved_at=row[12], created_at=row[13]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating purchase order: {str(e)}")

@router.post("/purchase-orders/{po_id}/approve")
async def approve_purchase_order(
    po_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Approve purchase order"""
    try:
        user_id = get_user_id(db)
        
        db.execute(text("""
            UPDATE purchase_orders
            SET status = 'approved', approved_by = :user_id, approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :po_id AND company_id = :company_id
        """), {
            "po_id": str(po_id),
            "company_id": str(company_id),
            "user_id": str(user_id)
        })
        
        db.commit()
        return {"message": "Purchase order approved successfully", "po_id": str(po_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error approving purchase order: {str(e)}")


@router.get("/goods-receipts", response_model=List[GoodsReceiptResponse])
async def list_goods_receipts(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all goods receipts"""
    query = """
        SELECT gr.id, gr.company_id, gr.purchase_order_id, gr.supplier_id,
               s.name as supplier_name, gr.receipt_number, gr.receipt_date,
               gr.warehouse_id, gr.status, gr.received_by, gr.created_at
        FROM goods_receipts gr
        JOIN suppliers s ON gr.supplier_id = s.id
        WHERE gr.company_id = :company_id
        ORDER BY gr.created_at DESC
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    receipts = []
    for row in result:
        receipts.append(GoodsReceiptResponse(
            id=row[0], company_id=row[1], purchase_order_id=row[2], supplier_id=row[3],
            supplier_name=row[4], receipt_number=row[5], receipt_date=row[6],
            warehouse_id=row[7], status=row[8], received_by=row[9], created_at=row[10]
        ))
    return receipts

@router.post("/goods-receipts", response_model=GoodsReceiptResponse)
async def create_goods_receipt(
    receipt: GoodsReceiptCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a goods receipt"""
    try:
        receipt_id = uuid4()
        user_id = get_user_id(db)
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM goods_receipts WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        receipt_number = f"GR-{str(count + 1).zfill(6)}"
        
        db.execute(text("""
            INSERT INTO goods_receipts (id, company_id, purchase_order_id, supplier_id,
                                       receipt_number, receipt_date, warehouse_id,
                                       status, notes, received_by, created_at, updated_at)
            VALUES (:id, :company_id, :po_id, :supplier_id,
                    :receipt_number, :receipt_date, :warehouse_id,
                    'draft', :notes, :received_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(receipt_id),
            "company_id": str(company_id),
            "po_id": str(receipt.purchase_order_id) if receipt.purchase_order_id else None,
            "supplier_id": str(receipt.supplier_id),
            "receipt_number": receipt_number,
            "receipt_date": receipt.receipt_date,
            "warehouse_id": str(receipt.warehouse_id) if receipt.warehouse_id else None,
            "notes": receipt.notes,
            "received_by": str(user_id)
        })
        
        for line in receipt.lines:
            line_id = uuid4()
            
            db.execute(text("""
                INSERT INTO goods_receipt_lines (id, goods_receipt_id, purchase_order_line_id,
                                                 product_id, description, quantity_received,
                                                 storage_location_id, created_at, updated_at)
                VALUES (:id, :receipt_id, :po_line_id,
                        :product_id, :description, :quantity,
                        :storage_location_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "id": str(line_id),
                "receipt_id": str(receipt_id),
                "po_line_id": str(line.purchase_order_line_id) if line.purchase_order_line_id else None,
                "product_id": str(line.product_id),
                "description": line.description,
                "quantity": float(line.quantity_received),
                "storage_location_id": str(line.storage_location_id) if line.storage_location_id else None
            })
            
            movement_id = uuid4()
            db.execute(text("""
                INSERT INTO stock_movements (id, company_id, product_id, movement_type,
                                            quantity, reference_type, reference_id,
                                            warehouse_id, storage_location_id,
                                            movement_date, created_at, updated_at)
                VALUES (:id, :company_id, :product_id, 'receipt',
                        :quantity, 'goods_receipt', :receipt_id,
                        :warehouse_id, :storage_location_id,
                        :receipt_date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "id": str(movement_id),
                "company_id": str(company_id),
                "product_id": str(line.product_id),
                "quantity": float(line.quantity_received),
                "receipt_id": str(receipt_id),
                "warehouse_id": str(receipt.warehouse_id) if receipt.warehouse_id else None,
                "storage_location_id": str(line.storage_location_id) if line.storage_location_id else None,
                "receipt_date": receipt.receipt_date
            })
            
            db.execute(text("""
                INSERT INTO stock_on_hand (id, company_id, product_id, warehouse_id,
                                          storage_location_id, quantity, created_at, updated_at)
                VALUES (gen_random_uuid(), :company_id, :product_id, :warehouse_id,
                        :storage_location_id, :quantity, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (company_id, product_id, warehouse_id, storage_location_id)
                DO UPDATE SET quantity = stock_on_hand.quantity + :quantity,
                             updated_at = CURRENT_TIMESTAMP
            """), {
                "company_id": str(company_id),
                "product_id": str(line.product_id),
                "warehouse_id": str(receipt.warehouse_id) if receipt.warehouse_id else None,
                "storage_location_id": str(line.storage_location_id) if line.storage_location_id else None,
                "quantity": float(line.quantity_received)
            })
            
            if line.purchase_order_line_id:
                db.execute(text("""
                    UPDATE purchase_order_lines
                    SET received_quantity = received_quantity + :quantity,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :po_line_id
                """), {
                    "quantity": float(line.quantity_received),
                    "po_line_id": str(line.purchase_order_line_id)
                })
        
        db.commit()
        
        query = """
            SELECT gr.id, gr.company_id, gr.purchase_order_id, gr.supplier_id,
                   s.name as supplier_name, gr.receipt_number, gr.receipt_date,
                   gr.warehouse_id, gr.status, gr.received_by, gr.created_at
            FROM goods_receipts gr
            JOIN suppliers s ON gr.supplier_id = s.id
            WHERE gr.id = :receipt_id
        """
        result = db.execute(text(query), {"receipt_id": str(receipt_id)})
        row = result.fetchone()
        
        return GoodsReceiptResponse(
            id=row[0], company_id=row[1], purchase_order_id=row[2], supplier_id=row[3],
            supplier_name=row[4], receipt_number=row[5], receipt_date=row[6],
            warehouse_id=row[7], status=row[8], received_by=row[9], created_at=row[10]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating goods receipt: {str(e)}")

@router.post("/goods-receipts/{receipt_id}/post")
async def post_goods_receipt(
    receipt_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Post goods receipt (change status to posted)"""
    try:
        db.execute(text("""
            UPDATE goods_receipts
            SET status = 'posted', updated_at = CURRENT_TIMESTAMP
            WHERE id = :receipt_id AND company_id = :company_id
        """), {
            "receipt_id": str(receipt_id),
            "company_id": str(company_id)
        })
        db.commit()
        return {"message": "Goods receipt posted successfully", "receipt_id": str(receipt_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error posting goods receipt: {str(e)}")


@router.get("/supplier-invoices", response_model=List[SupplierInvoiceResponse])
async def list_supplier_invoices(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all supplier invoices"""
    query = """
        SELECT si.id, si.company_id, si.supplier_id, s.name as supplier_name,
               si.invoice_number, si.supplier_invoice_number, si.invoice_date, si.due_date,
               si.subtotal, si.tax_amount, si.total_amount, si.balance_due, si.status,
               si.purchase_order_id, si.receipt_id, si.po_matched, si.receipt_matched,
               si.three_way_matched, si.created_at
        FROM supplier_invoices si
        JOIN suppliers s ON si.supplier_id = s.id
        WHERE si.company_id = :company_id
        ORDER BY si.created_at DESC
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    invoices = []
    for row in result:
        invoices.append(SupplierInvoiceResponse(
            id=row[0], company_id=row[1], supplier_id=row[2], supplier_name=row[3],
            invoice_number=row[4], supplier_invoice_number=row[5], invoice_date=row[6],
            due_date=row[7], subtotal=row[8], tax_amount=row[9], total_amount=row[10],
            balance_due=row[11], status=row[12], purchase_order_id=row[13], receipt_id=row[14],
            po_matched=row[15], receipt_matched=row[16], three_way_matched=row[17], created_at=row[18]
        ))
    return invoices

@router.post("/supplier-invoices", response_model=SupplierInvoiceResponse)
async def create_supplier_invoice(
    invoice: SupplierInvoiceCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a supplier invoice"""
    try:
        invoice_id = uuid4()
        user_id = get_user_id(db)
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM supplier_invoices WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        invoice_number = f"SI-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        # Calculate totals
        subtotal = Decimal("0")
        tax_amount = Decimal("0")
        
        for line in invoice.lines:
            line_subtotal = line.quantity * line.unit_price
            discount_amt = line_subtotal * (line.discount_percentage / Decimal("100"))
            line_subtotal_after_discount = line_subtotal - discount_amt
            line_tax = line_subtotal_after_discount * line.tax_rate
            
            subtotal += line_subtotal_after_discount
            tax_amount += line_tax
        
        total_amount = subtotal + tax_amount
        
        db.execute(text("""
            INSERT INTO supplier_invoices (id, company_id, supplier_id, invoice_number,
                                          supplier_invoice_number, invoice_date, due_date,
                                          purchase_order_id, receipt_id, subtotal, tax_amount,
                                          total_amount, paid_amount, balance_due, status,
                                          created_by, created_at, updated_at)
            VALUES (:id, :company_id, :supplier_id, :invoice_number,
                    :supplier_invoice_number, :invoice_date, :due_date,
                    :po_id, :receipt_id, :subtotal, :tax_amount,
                    :total_amount, 0, :balance_due, 'draft',
                    :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(invoice_id),
            "company_id": str(company_id),
            "supplier_id": str(invoice.supplier_id),
            "invoice_number": invoice_number,
            "supplier_invoice_number": invoice.supplier_invoice_number,
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,
            "po_id": str(invoice.purchase_order_id) if invoice.purchase_order_id else None,
            "receipt_id": str(invoice.receipt_id) if invoice.receipt_id else None,
            "subtotal": float(subtotal),
            "tax_amount": float(tax_amount),
            "total_amount": float(total_amount),
            "balance_due": float(total_amount),
            "created_by": str(user_id)
        })
        
        for line in invoice.lines:
            line_id = uuid4()
            line_subtotal = line.quantity * line.unit_price
            discount_amt = line_subtotal * (line.discount_percentage / Decimal("100"))
            line_subtotal_after_discount = line_subtotal - discount_amt
            line_tax = line_subtotal_after_discount * line.tax_rate
            line_total = line_subtotal_after_discount + line_tax
            
            db.execute(text("""
                INSERT INTO supplier_invoice_line_items (id, supplier_invoice_id, line_number,
                                                        product_id, description, quantity,
                                                        unit_price, line_total, tax_rate, tax_amount,
                                                        discount_percentage, discount_amount,
                                                        created_at, updated_at)
                VALUES (:id, :invoice_id, :line_number,
                        :product_id, :description, :quantity,
                        :unit_price, :line_total, :tax_rate, :tax_amount,
                        :discount_percentage, :discount_amount,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "id": str(line_id),
                "invoice_id": str(invoice_id),
                "line_number": line.line_number,
                "product_id": str(line.product_id) if line.product_id else None,
                "description": line.description,
                "quantity": float(line.quantity),
                "unit_price": float(line.unit_price),
                "line_total": float(line_total),
                "tax_rate": float(line.tax_rate),
                "tax_amount": float(line_tax),
                "discount_percentage": float(line.discount_percentage),
                "discount_amount": float(discount_amt)
            })
        
        db.commit()
        
        query = """
            SELECT si.id, si.company_id, si.supplier_id, s.name as supplier_name,
                   si.invoice_number, si.supplier_invoice_number, si.invoice_date, si.due_date,
                   si.subtotal, si.tax_amount, si.total_amount, si.balance_due, si.status,
                   si.purchase_order_id, si.receipt_id, si.po_matched, si.receipt_matched,
                   si.three_way_matched, si.created_at
            FROM supplier_invoices si
            JOIN suppliers s ON si.supplier_id = s.id
            WHERE si.id = :invoice_id
        """
        result = db.execute(text(query), {"invoice_id": str(invoice_id)})
        row = result.fetchone()
        
        return SupplierInvoiceResponse(
            id=row[0], company_id=row[1], supplier_id=row[2], supplier_name=row[3],
            invoice_number=row[4], supplier_invoice_number=row[5], invoice_date=row[6],
            due_date=row[7], subtotal=row[8], tax_amount=row[9], total_amount=row[10],
            balance_due=row[11], status=row[12], purchase_order_id=row[13], receipt_id=row[14],
            po_matched=row[15], receipt_matched=row[16], three_way_matched=row[17], created_at=row[18]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating supplier invoice: {str(e)}")

@router.post("/supplier-invoices/{invoice_id}/post")
async def post_supplier_invoice(
    invoice_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Post supplier invoice (change status to posted)"""
    try:
        db.execute(text("""
            UPDATE supplier_invoices
            SET status = 'posted', updated_at = CURRENT_TIMESTAMP
            WHERE id = :invoice_id AND company_id = :company_id
        """), {
            "invoice_id": str(invoice_id),
            "company_id": str(company_id)
        })
        db.commit()
        return {"message": "Supplier invoice posted successfully", "invoice_id": str(invoice_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error posting supplier invoice: {str(e)}")
