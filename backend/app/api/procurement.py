"""
Procurement & Inventory Management API
Includes: Suppliers, Products, Purchase Orders, Stock Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from core.database import get_db
from core.auth import get_current_user
from models.transactions import Supplier
from models.inventory import (
    Product, PurchaseOrder, PurchaseOrderLine,
    StockMovement, Warehouse, InventoryAdjustment
)
from models.user import User
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/procurement", tags=["Procurement"])

# ===================== SCHEMAS =====================

class SupplierCreate(BaseModel):
    supplier_name: str
    supplier_code: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    vat_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    payment_terms_days: int = Field(default=30, ge=0)
    bbbee_level: Optional[int] = Field(None, ge=1, le=8)
    address: Optional[str] = None
    notes: Optional[str] = None

class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    vat_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    payment_terms_days: Optional[int] = None
    bbbee_level: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class SupplierResponse(BaseModel):
    id: int
    tenant_id: int
    supplier_code: str
    supplier_name: str
    contact_person: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    vat_number: Optional[str]
    payment_terms_days: int
    bbbee_level: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    product_code: str
    sku: str
    product_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: str = "UNIT"
    cost_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)
    vat_rate: Decimal = Field(default=Decimal("0.15"))
    reorder_level: int = Field(default=0, ge=0)
    reorder_quantity: int = Field(default=0, ge=0)
    preferred_supplier_id: Optional[int] = None
    is_service: bool = False

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    reorder_level: Optional[int] = None
    reorder_quantity: Optional[int] = None
    preferred_supplier_id: Optional[int] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: int
    tenant_id: int
    product_code: str
    sku: str
    product_name: str
    category: Optional[str]
    unit_of_measure: str
    cost_price: Decimal
    selling_price: Decimal
    reorder_level: int
    reorder_quantity: int
    is_active: bool
    is_service: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PurchaseOrderLineCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    description: Optional[str] = None

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    order_date: date
    expected_delivery_date: Optional[date] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    lines: List[PurchaseOrderLineCreate]

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    status: Optional[str] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderResponse(BaseModel):
    id: int
    tenant_id: int
    supplier_id: int
    po_number: str
    order_date: date
    expected_delivery_date: Optional[date]
    subtotal: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: str  # IN, OUT, ADJUSTMENT, TRANSFER
    quantity: Decimal = Field(gt=0)
    warehouse_id: Optional[int] = None
    reference_type: Optional[str] = None  # PURCHASE_ORDER, SALES_ORDER, ADJUSTMENT
    reference_id: Optional[int] = None
    notes: Optional[str] = None

# ===================== SUPPLIER ENDPOINTS =====================

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new supplier"""
    # Generate supplier code if not provided
    if not supplier.supplier_code:
        last_supplier = db.query(Supplier).filter(
            Supplier.tenant_id == current_user.tenant_id
        ).order_by(Supplier.id.desc()).first()
        
        next_number = 1 if not last_supplier else int(last_supplier.supplier_code.split('-')[-1]) + 1
        supplier_code = f"SUP-{next_number:05d}"
    else:
        supplier_code = supplier.supplier_code
    
    db_supplier = Supplier(
        tenant_id=current_user.tenant_id,
        supplier_code=supplier_code,
        supplier_name=supplier.supplier_name,
        contact_person=supplier.contact_person,
        email=supplier.email,
        phone=supplier.phone,
        vat_number=supplier.vat_number,
        bank_name=supplier.bank_name,
        account_number=supplier.account_number,
        branch_code=supplier.branch_code,
        payment_terms_days=supplier.payment_terms_days,
        bbbee_level=supplier.bbbee_level,
        address=supplier.address,
        is_active=True,
        notes=supplier.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    
    return db_supplier

@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List suppliers with optional filters"""
    query = db.query(Supplier).filter(Supplier.tenant_id == current_user.tenant_id)
    
    if search:
        search_filter = or_(
            Supplier.supplier_name.ilike(f"%{search}%"),
            Supplier.supplier_code.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    suppliers = query.order_by(Supplier.supplier_name).offset(skip).limit(limit).all()
    return suppliers

@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific supplier"""
    supplier = db.query(Supplier).filter(
        and_(
            Supplier.id == supplier_id,
            Supplier.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return supplier

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a supplier"""
    supplier = db.query(Supplier).filter(
        and_(
            Supplier.id == supplier_id,
            Supplier.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    for field, value in supplier_update.dict(exclude_unset=True).items():
        setattr(supplier, field, value)
    
    supplier.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(supplier)
    
    return supplier

# ===================== PRODUCT ENDPOINTS =====================

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new product"""
    # Check if product code or SKU already exists
    existing = db.query(Product).filter(
        and_(
            Product.tenant_id == current_user.tenant_id,
            or_(
                Product.product_code == product.product_code,
                Product.sku == product.sku
            )
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Product code or SKU already exists")
    
    db_product = Product(
        tenant_id=current_user.tenant_id,
        product_code=product.product_code,
        sku=product.sku,
        product_name=product.product_name,
        description=product.description,
        category=product.category,
        unit_of_measure=product.unit_of_measure,
        cost_price=product.cost_price,
        selling_price=product.selling_price,
        vat_rate=product.vat_rate,
        reorder_level=product.reorder_level,
        reorder_quantity=product.reorder_quantity,
        preferred_supplier_id=product.preferred_supplier_id,
        is_service=product.is_service,
        is_active=True,
        quantity_on_hand=Decimal("0"),
        quantity_allocated=Decimal("0"),
        quantity_available=Decimal("0"),
        created_by_id=current_user.id
    )
    
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    return db_product

@router.get("/products", response_model=List[ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List products with optional filters"""
    query = db.query(Product).filter(Product.tenant_id == current_user.tenant_id)
    
    if search:
        search_filter = or_(
            Product.product_name.ilike(f"%{search}%"),
            Product.product_code.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if category:
        query = query.filter(Product.category == category)
    
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    if low_stock:
        query = query.filter(Product.quantity_available <= Product.reorder_level)
    
    products = query.order_by(Product.product_name).offset(skip).limit(limit).all()
    return products

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific product"""
    product = db.query(Product).filter(
        and_(
            Product.id == product_id,
            Product.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a product"""
    product = db.query(Product).filter(
        and_(
            Product.id == product_id,
            Product.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for field, value in product_update.dict(exclude_unset=True).items():
        setattr(product, field, value)
    
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    
    return product

# ===================== PURCHASE ORDER ENDPOINTS =====================

@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase order"""
    # Calculate totals
    subtotal = Decimal("0")
    vat_amount = Decimal("0")
    vat_rate = Decimal("0.15")  # SA VAT 15%
    
    for line in po.lines:
        line_total = line.quantity * line.unit_price
        subtotal += line_total
        vat_amount += line_total * vat_rate
    
    total_amount = subtotal + vat_amount
    
    # Generate PO number
    last_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.tenant_id == current_user.tenant_id
    ).order_by(PurchaseOrder.id.desc()).first()
    
    next_number = 1 if not last_po else int(last_po.po_number.split('-')[-1]) + 1
    po_number = f"PO-{datetime.now().year}-{next_number:05d}"
    
    # Create purchase order
    db_po = PurchaseOrder(
        tenant_id=current_user.tenant_id,
        supplier_id=po.supplier_id,
        po_number=po_number,
        order_date=po.order_date,
        expected_delivery_date=po.expected_delivery_date,
        subtotal=subtotal,
        vat_amount=vat_amount,
        total_amount=total_amount,
        status="draft",
        shipping_address=po.shipping_address,
        notes=po.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_po)
    db.flush()
    
    # Create PO lines
    for line in po.lines:
        line_total = line.quantity * line.unit_price
        line_vat = line_total * vat_rate
        
        db_line = PurchaseOrderLine(
            purchase_order_id=db_po.id,
            product_id=line.product_id,
            description=line.description,
            quantity_ordered=line.quantity,
            quantity_received=Decimal("0"),
            unit_price=line.unit_price,
            vat_amount=line_vat,
            line_total=line_total + line_vat
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_po)
    
    return db_po

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    supplier_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List purchase orders with optional filters"""
    query = db.query(PurchaseOrder).filter(PurchaseOrder.tenant_id == current_user.tenant_id)
    
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if from_date:
        query = query.filter(PurchaseOrder.order_date >= from_date)
    if to_date:
        query = query.filter(PurchaseOrder.order_date <= to_date)
    
    pos = query.order_by(PurchaseOrder.order_date.desc()).offset(skip).limit(limit).all()
    return pos

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific purchase order"""
    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return po

@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: int,
    po_update: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase order"""
    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    for field, value in po_update.dict(exclude_unset=True).items():
        setattr(po, field, value)
    
    po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(po)
    
    return po

@router.post("/purchase-orders/{po_id}/approve", response_model=PurchaseOrderResponse)
def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a purchase order"""
    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft purchase orders can be approved")
    
    po.status = "approved"
    po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(po)
    
    return po

@router.post("/purchase-orders/{po_id}/receive")
def receive_purchase_order(
    po_id: int,
    received_items: dict,  # {product_id: quantity}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Receive goods from a purchase order"""
    po = db.query(PurchaseOrder).filter(
        and_(
            PurchaseOrder.id == po_id,
            PurchaseOrder.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.status not in ["approved", "partial"]:
        raise HTTPException(status_code=400, detail="Can only receive from approved or partially received POs")
    
    # Update PO lines and create stock movements
    for product_id_str, quantity in received_items.items():
        product_id = int(product_id_str)
        quantity = Decimal(str(quantity))
        
        # Find PO line
        po_line = db.query(PurchaseOrderLine).filter(
            and_(
                PurchaseOrderLine.purchase_order_id == po_id,
                PurchaseOrderLine.product_id == product_id
            )
        ).first()
        
        if po_line:
            po_line.quantity_received += quantity
            
            # Create stock movement
            movement = StockMovement(
                tenant_id=current_user.tenant_id,
                product_id=product_id,
                movement_type="IN",
                quantity=quantity,
                movement_date=datetime.utcnow().date(),
                reference_type="PURCHASE_ORDER",
                reference_id=po_id,
                reference_number=po.po_number,
                created_by_id=current_user.id
            )
            db.add(movement)
            
            # Update product stock
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                product.quantity_on_hand += quantity
                product.quantity_available += quantity
    
    # Check if all items received
    po_lines = db.query(PurchaseOrderLine).filter(
        PurchaseOrderLine.purchase_order_id == po_id
    ).all()
    
    all_received = all(line.quantity_received >= line.quantity_ordered for line in po_lines)
    any_received = any(line.quantity_received > 0 for line in po_lines)
    
    if all_received:
        po.status = "received"
    elif any_received:
        po.status = "partial"
    
    po.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Goods received successfully", "status": po.status}

# ===================== STOCK MOVEMENT ENDPOINTS =====================

@router.post("/stock-movements", status_code=status.HTTP_201_CREATED)
def create_stock_movement(
    movement: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a stock movement (manual adjustment)"""
    db_movement = StockMovement(
        tenant_id=current_user.tenant_id,
        product_id=movement.product_id,
        movement_type=movement.movement_type,
        quantity=movement.quantity,
        movement_date=datetime.utcnow().date(),
        warehouse_id=movement.warehouse_id,
        reference_type=movement.reference_type,
        reference_id=movement.reference_id,
        notes=movement.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_movement)
    
    # Update product stock
    product = db.query(Product).filter(
        and_(
            Product.id == movement.product_id,
            Product.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if movement.movement_type in ["IN", "ADJUSTMENT"]:
        product.quantity_on_hand += movement.quantity
        product.quantity_available += movement.quantity
    elif movement.movement_type == "OUT":
        if product.quantity_available < movement.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        product.quantity_on_hand -= movement.quantity
        product.quantity_available -= movement.quantity
    
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_movement)
    
    return db_movement

@router.get("/stock-movements")
def list_stock_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List stock movements with optional filters"""
    query = db.query(StockMovement).filter(StockMovement.tenant_id == current_user.tenant_id)
    
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    if from_date:
        query = query.filter(StockMovement.movement_date >= from_date)
    if to_date:
        query = query.filter(StockMovement.movement_date <= to_date)
    
    movements = query.order_by(StockMovement.movement_date.desc()).offset(skip).limit(limit).all()
    return movements

# ===================== REPORTS =====================

@router.get("/reports/stock-valuation")
def stock_valuation_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate stock valuation report"""
    products = db.query(Product).filter(
        and_(
            Product.tenant_id == current_user.tenant_id,
            Product.is_active == True,
            Product.quantity_on_hand > 0
        )
    ).all()
    
    total_value = Decimal("0")
    items = []
    
    for product in products:
        item_value = product.quantity_on_hand * product.cost_price
        total_value += item_value
        
        items.append({
            "product_code": product.product_code,
            "product_name": product.product_name,
            "quantity_on_hand": float(product.quantity_on_hand),
            "cost_price": float(product.cost_price),
            "value": float(item_value)
        })
    
    return {
        "total_value": float(total_value),
        "item_count": len(items),
        "items": items
    }

@router.get("/reports/reorder-needed")
def reorder_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate reorder report (products below reorder level)"""
    products = db.query(Product).filter(
        and_(
            Product.tenant_id == current_user.tenant_id,
            Product.is_active == True,
            Product.quantity_available <= Product.reorder_level,
            Product.reorder_level > 0
        )
    ).all()
    
    items = []
    for product in products:
        items.append({
            "product_code": product.product_code,
            "product_name": product.product_name,
            "quantity_available": float(product.quantity_available),
            "reorder_level": product.reorder_level,
            "reorder_quantity": product.reorder_quantity,
            "preferred_supplier_id": product.preferred_supplier_id
        })
    
    return {
        "item_count": len(items),
        "items": items
    }
