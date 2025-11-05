"""
Order-to-Cash Module for ARIA ERP
Handles Sales Orders, Deliveries, Invoices, and WMS
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from decimal import Decimal

router = APIRouter(prefix="/api/erp/order-to-cash", tags=["Order-to-Cash"])


@router.get("/health")
async def health_check():
    """Health check endpoint for Order-to-Cash module"""
    return {
        "status": "healthy",
        "module": "order_to_cash",
        "version": "1.0.0",
        "features": [
            "quote_to_cash_workflow",
            "wms_with_storage_locations",
            "multi_company_support",
            "email_driven_quotes"
        ]
    }


class ProductCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    product_type: str = "finished_good"
    category: Optional[str] = None
    unit_of_measure: str = "EA"
    standard_cost: Decimal = Decimal("0.00")
    selling_price: Decimal = Decimal("0.00")
    reorder_level: Decimal = Decimal("0.000")
    reorder_quantity: Decimal = Decimal("0.000")

class ProductResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    description: Optional[str]
    product_type: str
    category: Optional[str]
    unit_of_measure: str
    standard_cost: Decimal
    selling_price: Decimal
    reorder_level: Decimal
    reorder_quantity: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class WarehouseCreate(BaseModel):
    code: str
    name: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "South Africa"

class WarehouseResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    address_line1: Optional[str]
    city: Optional[str]
    country: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StorageLocationCreate(BaseModel):
    warehouse_id: UUID
    code: str
    name: str

class StorageLocationResponse(BaseModel):
    id: UUID
    company_id: UUID
    warehouse_id: UUID
    code: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StockOnHandResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_code: Optional[str]
    product_name: Optional[str]
    warehouse_id: UUID
    warehouse_name: Optional[str]
    storage_location_id: Optional[UUID]
    location_name: Optional[str]
    quantity_on_hand: Decimal
    quantity_reserved: Decimal
    quantity_available: Decimal
    last_movement_date: Optional[datetime]

    class Config:
        from_attributes = True

class StockMovementCreate(BaseModel):
    product_id: UUID
    warehouse_id: UUID
    storage_location_id: Optional[UUID] = None
    movement_type: str  # receipt, issue, transfer, adjustment
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: UUID
    company_id: UUID
    product_id: UUID
    warehouse_id: UUID
    storage_location_id: Optional[UUID]
    movement_type: str
    quantity: Decimal
    unit_cost: Optional[Decimal]
    reference_type: Optional[str]
    reference_id: Optional[UUID]
    transaction_date: datetime
    notes: Optional[str]
    created_by: Optional[UUID]

    class Config:
        from_attributes = True

class QuoteLineCreate(BaseModel):
    line_number: int
    product_id: UUID
    description: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("15.00")  # SA VAT

class QuoteLineResponse(BaseModel):
    id: UUID
    quote_id: UUID
    line_number: int
    product_id: UUID
    description: Optional[str]
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    tax_rate: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class QuoteCreate(BaseModel):
    customer_id: Optional[UUID] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    quote_date: date
    valid_until: Optional[date] = None
    warehouse_id: Optional[UUID] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    lines: List[QuoteLineCreate]

class QuoteResponse(BaseModel):
    id: UUID
    company_id: UUID
    quote_number: str
    customer_id: Optional[UUID]
    customer_email: Optional[str]
    customer_name: Optional[str]
    quote_date: date
    valid_until: Optional[date]
    status: str
    warehouse_id: Optional[UUID]
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    notes: Optional[str]
    terms_and_conditions: Optional[str]
    email_subject: Optional[str]
    email_body: Optional[str]
    email_message_id: Optional[str]
    created_by: Optional[UUID]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    sent_at: Optional[datetime]
    accepted_at: Optional[datetime]
    sales_order_id: Optional[UUID]
    created_at: datetime
    lines: List[QuoteLineResponse] = []

    class Config:
        from_attributes = True

class SalesOrderLineCreate(BaseModel):
    line_number: int
    product_id: UUID
    description: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("15.00")  # SA VAT

class SalesOrderLineResponse(BaseModel):
    id: UUID
    sales_order_id: UUID
    line_number: int
    product_id: UUID
    description: Optional[str]
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    tax_rate: Decimal
    line_total: Decimal
    quantity_delivered: Decimal
    quantity_invoiced: Decimal

    class Config:
        from_attributes = True

class SalesOrderCreate(BaseModel):
    customer_id: UUID
    order_date: date
    required_date: Optional[date] = None
    warehouse_id: Optional[UUID] = None
    notes: Optional[str] = None
    lines: List[SalesOrderLineCreate]

class SalesOrderResponse(BaseModel):
    id: UUID
    company_id: UUID
    order_number: str
    customer_id: UUID
    customer_name: Optional[str]
    order_date: date
    required_date: Optional[date]
    status: str
    warehouse_id: Optional[UUID]
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    notes: Optional[str]
    created_by: Optional[UUID]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime
    lines: List[SalesOrderLineResponse] = []

    class Config:
        from_attributes = True

class DeliveryLineCreate(BaseModel):
    line_number: int
    sales_order_line_id: Optional[UUID] = None
    product_id: UUID
    description: Optional[str] = None
    quantity: Decimal
    storage_location_id: Optional[UUID] = None

class DeliveryLineResponse(BaseModel):
    id: UUID
    delivery_id: UUID
    sales_order_line_id: Optional[UUID]
    line_number: int
    product_id: UUID
    description: Optional[str]
    quantity: Decimal
    storage_location_id: Optional[UUID]

    class Config:
        from_attributes = True

class DeliveryCreate(BaseModel):
    sales_order_id: Optional[UUID] = None
    customer_id: UUID
    warehouse_id: UUID
    delivery_date: date
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    notes: Optional[str] = None
    lines: List[DeliveryLineCreate]

class DeliveryResponse(BaseModel):
    id: UUID
    company_id: UUID
    delivery_number: str
    sales_order_id: Optional[UUID]
    customer_id: UUID
    customer_name: Optional[str]
    warehouse_id: UUID
    warehouse_name: Optional[str]
    delivery_date: date
    status: str
    tracking_number: Optional[str]
    carrier: Optional[str]
    notes: Optional[str]
    signed_document_url: Optional[str]
    signed_at: Optional[datetime]
    created_by: Optional[UUID]
    created_at: datetime
    lines: List[DeliveryLineResponse] = []

    class Config:
        from_attributes = True

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
    result = db.execute("SELECT id FROM users LIMIT 1")
    row = result.fetchone()
    return row[0] if row else None

# ============================================================================
# ============================================================================

@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: bool = True,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all products for the company"""
    query = """
        SELECT id, company_id, code, name, description, product_type, category,
               unit_of_measure, standard_cost, selling_price, reorder_level,
               reorder_quantity, is_active, created_at, updated_at
        FROM products
        WHERE company_id = :company_id AND is_active = :is_active
    """
    params = {"company_id": str(company_id), "is_active": is_active}
    
    if search:
        query += " AND (code ILIKE :search OR name ILIKE :search)"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY code LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(query, params)
    products = []
    for row in result:
        products.append(ProductResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            description=row[4], product_type=row[5], category=row[6],
            unit_of_measure=row[7], standard_cost=row[8], selling_price=row[9],
            reorder_level=row[10], reorder_quantity=row[11], is_active=row[12],
            created_at=row[13]
        ))
    return products

@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    product_id = uuid4()
    query = """
        INSERT INTO products (id, company_id, code, name, description, product_type,
                            category, unit_of_measure, standard_cost, selling_price,
                            reorder_level, reorder_quantity, is_active, created_at, updated_at)
        VALUES (:id, :company_id, :code, :name, :description, :product_type,
                :category, :unit_of_measure, :standard_cost, :selling_price,
                :reorder_level, :reorder_quantity, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, company_id, code, name, description, product_type, category,
                  unit_of_measure, standard_cost, selling_price, reorder_level,
                  reorder_quantity, is_active, created_at
    """
    try:
        result = db.execute(query, {
            "id": str(product_id),
            "company_id": str(company_id),
            "code": product.code,
            "name": product.name,
            "description": product.description,
            "product_type": product.product_type,
            "category": product.category,
            "unit_of_measure": product.unit_of_measure,
            "standard_cost": float(product.standard_cost),
            "selling_price": float(product.selling_price),
            "reorder_level": float(product.reorder_level),
            "reorder_quantity": float(product.reorder_quantity)
        })
        db.commit()
        row = result.fetchone()
        return ProductResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            description=row[4], product_type=row[5], category=row[6],
            unit_of_measure=row[7], standard_cost=row[8], selling_price=row[9],
            reorder_level=row[10], reorder_quantity=row[11], is_active=row[12],
            created_at=row[13]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating product: {str(e)}")

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific product"""
    query = """
        SELECT id, company_id, code, name, description, product_type, category,
               unit_of_measure, standard_cost, selling_price, reorder_level,
               reorder_quantity, is_active, created_at
        FROM products
        WHERE id = :product_id AND company_id = :company_id
    """
    result = db.execute(query, {"product_id": str(product_id), "company_id": str(company_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductResponse(
        id=row[0], company_id=row[1], code=row[2], name=row[3],
        description=row[4], product_type=row[5], category=row[6],
        unit_of_measure=row[7], standard_cost=row[8], selling_price=row[9],
        reorder_level=row[10], reorder_quantity=row[11], is_active=row[12],
        created_at=row[13]
    )

# ============================================================================
# ============================================================================

@router.get("/warehouses", response_model=List[WarehouseResponse])
async def list_warehouses(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all warehouses for the company"""
    query = """
        SELECT id, company_id, code, name, address_line1, city, country, is_active, created_at
        FROM warehouses
        WHERE company_id = :company_id AND is_active = true
        ORDER BY code
    """
    result = db.execute(query, {"company_id": str(company_id)})
    warehouses = []
    for row in result:
        warehouses.append(WarehouseResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            address_line1=row[4], city=row[5], country=row[6],
            is_active=row[7], created_at=row[8]
        ))
    return warehouses

@router.post("/warehouses", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse: WarehouseCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new warehouse"""
    warehouse_id = uuid4()
    query = """
        INSERT INTO warehouses (id, company_id, code, name, address_line1, address_line2,
                               city, state_province, postal_code, country, is_active,
                               created_at, updated_at)
        VALUES (:id, :company_id, :code, :name, :address_line1, :address_line2,
                :city, :state_province, :postal_code, :country, true,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, company_id, code, name, address_line1, city, country, is_active, created_at
    """
    try:
        result = db.execute(query, {
            "id": str(warehouse_id),
            "company_id": str(company_id),
            "code": warehouse.code,
            "name": warehouse.name,
            "address_line1": warehouse.address_line1,
            "address_line2": warehouse.address_line2,
            "city": warehouse.city,
            "state_province": warehouse.state_province,
            "postal_code": warehouse.postal_code,
            "country": warehouse.country
        })
        db.commit()
        row = result.fetchone()
        return WarehouseResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            address_line1=row[4], city=row[5], country=row[6],
            is_active=row[7], created_at=row[8]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating warehouse: {str(e)}")

# ============================================================================
# ============================================================================

@router.get("/storage-locations", response_model=List[StorageLocationResponse])
async def list_storage_locations(
    warehouse_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all storage locations"""
    query = """
        SELECT id, company_id, warehouse_id, code, name, is_active, created_at
        FROM storage_locations
        WHERE company_id = :company_id AND is_active = true
    """
    params = {"company_id": str(company_id)}
    
    if warehouse_id:
        query += " AND warehouse_id = :warehouse_id"
        params["warehouse_id"] = str(warehouse_id)
    
    query += " ORDER BY code"
    
    result = db.execute(query, params)
    locations = []
    for row in result:
        locations.append(StorageLocationResponse(
            id=row[0], company_id=row[1], warehouse_id=row[2], code=row[3],
            name=row[4], is_active=row[5], created_at=row[6]
        ))
    return locations

@router.post("/storage-locations", response_model=StorageLocationResponse)
async def create_storage_location(
    location: StorageLocationCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new storage location"""
    location_id = uuid4()
    query = """
        INSERT INTO storage_locations (id, company_id, warehouse_id, code, name, is_active,
                                      created_at, updated_at)
        VALUES (:id, :company_id, :warehouse_id, :code, :name, true,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, company_id, warehouse_id, code, name, is_active, created_at
    """
    try:
        result = db.execute(query, {
            "id": str(location_id),
            "company_id": str(company_id),
            "warehouse_id": str(location.warehouse_id),
            "code": location.code,
            "name": location.name
        })
        db.commit()
        row = result.fetchone()
        return StorageLocationResponse(
            id=row[0], company_id=row[1], warehouse_id=row[2], code=row[3],
            name=row[4], is_active=row[5], created_at=row[6]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating storage location: {str(e)}")

# ============================================================================
# ============================================================================

@router.get("/stock-on-hand", response_model=List[StockOnHandResponse])
async def list_stock_on_hand(
    warehouse_id: Optional[UUID] = None,
    product_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List stock on hand with product and warehouse details"""
    query = """
        SELECT s.id, s.product_id, p.code as product_code, p.name as product_name,
               s.warehouse_id, w.name as warehouse_name,
               s.storage_location_id, l.name as location_name,
               s.quantity_on_hand, s.quantity_reserved, s.quantity_available,
               s.last_movement_date
        FROM stock_on_hand s
        JOIN products p ON s.product_id = p.id
        JOIN warehouses w ON s.warehouse_id = w.id
        LEFT JOIN storage_locations l ON s.storage_location_id = l.id
        WHERE s.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if warehouse_id:
        query += " AND s.warehouse_id = :warehouse_id"
        params["warehouse_id"] = str(warehouse_id)
    
    if product_id:
        query += " AND s.product_id = :product_id"
        params["product_id"] = str(product_id)
    
    query += " ORDER BY p.code, w.code"
    
    result = db.execute(query, params)
    stock_list = []
    for row in result:
        stock_list.append(StockOnHandResponse(
            id=row[0], product_id=row[1], product_code=row[2], product_name=row[3],
            warehouse_id=row[4], warehouse_name=row[5],
            storage_location_id=row[6], location_name=row[7],
            quantity_on_hand=row[8], quantity_reserved=row[9], quantity_available=row[10],
            last_movement_date=row[11]
        ))
    return stock_list

# ============================================================================
# ============================================================================

@router.post("/stock-movements", response_model=StockMovementResponse)
async def create_stock_movement(
    movement: StockMovementCreate,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Create a stock movement and update stock on hand"""
    movement_id = uuid4()
    
    try:
        query = """
            INSERT INTO stock_movements (id, company_id, product_id, warehouse_id, storage_location_id,
                                        movement_type, quantity, unit_cost, reference_type, reference_id,
                                        transaction_date, notes, created_by, created_at)
            VALUES (:id, :company_id, :product_id, :warehouse_id, :storage_location_id,
                    :movement_type, :quantity, :unit_cost, :reference_type, :reference_id,
                    CURRENT_TIMESTAMP, :notes, :created_by, CURRENT_TIMESTAMP)
            RETURNING id, company_id, product_id, warehouse_id, storage_location_id,
                      movement_type, quantity, unit_cost, reference_type, reference_id,
                      transaction_date, notes, created_by
        """
        result = db.execute(query, {
            "id": str(movement_id),
            "company_id": str(company_id),
            "product_id": str(movement.product_id),
            "warehouse_id": str(movement.warehouse_id),
            "storage_location_id": str(movement.storage_location_id) if movement.storage_location_id else None,
            "movement_type": movement.movement_type,
            "quantity": float(movement.quantity),
            "unit_cost": float(movement.unit_cost) if movement.unit_cost else None,
            "reference_type": movement.reference_type,
            "reference_id": str(movement.reference_id) if movement.reference_id else None,
            "notes": movement.notes,
            "created_by": str(user_id) if user_id else None
        })
        row = result.fetchone()
        
        quantity_change = movement.quantity if movement.movement_type in ['receipt', 'adjustment'] else -movement.quantity
        
        update_query = """
            INSERT INTO stock_on_hand (id, company_id, product_id, warehouse_id, storage_location_id,
                                      quantity_on_hand, quantity_reserved, last_movement_date,
                                      created_at, updated_at)
            VALUES (gen_random_uuid(), :company_id, :product_id, :warehouse_id, :storage_location_id,
                    :quantity, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (product_id, warehouse_id, storage_location_id)
            DO UPDATE SET
                quantity_on_hand = stock_on_hand.quantity_on_hand + :quantity,
                last_movement_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        """
        db.execute(update_query, {
            "company_id": str(company_id),
            "product_id": str(movement.product_id),
            "warehouse_id": str(movement.warehouse_id),
            "storage_location_id": str(movement.storage_location_id) if movement.storage_location_id else None,
            "quantity": float(quantity_change)
        })
        
        db.commit()
        
        return StockMovementResponse(
            id=row[0], company_id=row[1], product_id=row[2], warehouse_id=row[3],
            storage_location_id=row[4], movement_type=row[5], quantity=row[6],
            unit_cost=row[7], reference_type=row[8], reference_id=row[9],
            transaction_date=row[10], notes=row[11], created_by=row[12]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating stock movement: {str(e)}")

@router.get("/stock-movements", response_model=List[StockMovementResponse])
async def list_stock_movements(
    product_id: Optional[UUID] = None,
    warehouse_id: Optional[UUID] = None,
    movement_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List stock movements"""
    query = """
        SELECT id, company_id, product_id, warehouse_id, storage_location_id,
               movement_type, quantity, unit_cost, reference_type, reference_id,
               transaction_date, notes, created_by
        FROM stock_movements
        WHERE company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if product_id:
        query += " AND product_id = :product_id"
        params["product_id"] = str(product_id)
    
    if warehouse_id:
        query += " AND warehouse_id = :warehouse_id"
        params["warehouse_id"] = str(warehouse_id)
    
    if movement_type:
        query += " AND movement_type = :movement_type"
        params["movement_type"] = movement_type
    
    query += " ORDER BY transaction_date DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(query, params)
    movements = []
    for row in result:
        movements.append(StockMovementResponse(
            id=row[0], company_id=row[1], product_id=row[2], warehouse_id=row[3],
            storage_location_id=row[4], movement_type=row[5], quantity=row[6],
            unit_cost=row[7], reference_type=row[8], reference_id=row[9],
            transaction_date=row[10], notes=row[11], created_by=row[12]
        ))
    return movements

# ============================================================================
# ============================================================================

@router.get("/sales-orders", response_model=List[SalesOrderResponse])
async def list_sales_orders(
    status: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List sales orders"""
    query = """
        SELECT so.id, so.company_id, so.order_number, so.customer_id, c.name as customer_name,
               so.order_date, so.required_date, so.status, so.warehouse_id,
               so.subtotal, so.tax_amount, so.total_amount, so.notes,
               so.created_by, so.approved_by, so.approved_at, so.created_at
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE so.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if status:
        query += " AND so.status = :status"
        params["status"] = status
    
    if customer_id:
        query += " AND so.customer_id = :customer_id"
        params["customer_id"] = str(customer_id)
    
    query += " ORDER BY so.order_date DESC, so.order_number DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(query, params)
    orders = []
    for row in result:
        orders.append(SalesOrderResponse(
            id=row[0], company_id=row[1], order_number=row[2], customer_id=row[3],
            customer_name=row[4], order_date=row[5], required_date=row[6],
            status=row[7], warehouse_id=row[8], subtotal=row[9], tax_amount=row[10],
            total_amount=row[11], notes=row[12], created_by=row[13],
            approved_by=row[14], approved_at=row[15], created_at=row[16]
        ))
    return orders

@router.post("/sales-orders", response_model=SalesOrderResponse)
async def create_sales_order(
    order: SalesOrderCreate,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Create a new sales order"""
    order_id = uuid4()
    
    try:
        result = db.execute(
            "SELECT COUNT(*) FROM sales_orders WHERE company_id = :company_id",
            {"company_id": str(company_id)}
        )
        count = result.fetchone()[0]
        order_number = f"SO-{count + 1:06d}"
        
        # Calculate totals
        subtotal = sum(line.quantity * line.unit_price * (1 - line.discount_percent / 100) for line in order.lines)
        tax_amount = sum(line.quantity * line.unit_price * (1 - line.discount_percent / 100) * (line.tax_rate / 100) for line in order.lines)
        total_amount = subtotal + tax_amount
        
        query = """
            INSERT INTO sales_orders (id, company_id, order_number, customer_id, order_date,
                                     required_date, status, warehouse_id, subtotal, tax_amount,
                                     total_amount, notes, created_by, created_at, updated_at)
            VALUES (:id, :company_id, :order_number, :customer_id, :order_date,
                    :required_date, 'draft', :warehouse_id, :subtotal, :tax_amount,
                    :total_amount, :notes, :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, company_id, order_number, customer_id, order_date, required_date,
                      status, warehouse_id, subtotal, tax_amount, total_amount, notes,
                      created_by, approved_by, approved_at, created_at
        """
        result = db.execute(query, {
            "id": str(order_id),
            "company_id": str(company_id),
            "order_number": order_number,
            "customer_id": str(order.customer_id),
            "order_date": order.order_date,
            "required_date": order.required_date,
            "warehouse_id": str(order.warehouse_id) if order.warehouse_id else None,
            "subtotal": float(subtotal),
            "tax_amount": float(tax_amount),
            "total_amount": float(total_amount),
            "notes": order.notes,
            "created_by": str(user_id) if user_id else None
        })
        row = result.fetchone()
        
        for line in order.lines:
            line_id = uuid4()
            db.execute("""
                INSERT INTO sales_order_lines (id, sales_order_id, line_number, product_id,
                                              description, quantity, unit_price, discount_percent,
                                              tax_rate, quantity_delivered, quantity_invoiced,
                                              created_at, updated_at)
                VALUES (:id, :sales_order_id, :line_number, :product_id,
                        :description, :quantity, :unit_price, :discount_percent,
                        :tax_rate, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, {
                "id": str(line_id),
                "sales_order_id": str(order_id),
                "line_number": line.line_number,
                "product_id": str(line.product_id),
                "description": line.description,
                "quantity": float(line.quantity),
                "unit_price": float(line.unit_price),
                "discount_percent": float(line.discount_percent),
                "tax_rate": float(line.tax_rate)
            })
        
        db.commit()
        
        customer_result = db.execute(
            "SELECT name FROM customers WHERE id = :customer_id",
            {"customer_id": str(order.customer_id)}
        )
        customer_row = customer_result.fetchone()
        customer_name = customer_row[0] if customer_row else None
        
        return SalesOrderResponse(
            id=row[0], company_id=row[1], order_number=row[2], customer_id=row[3],
            customer_name=customer_name, order_date=row[4], required_date=row[5],
            status=row[6], warehouse_id=row[7], subtotal=row[8], tax_amount=row[9],
            total_amount=row[10], notes=row[11], created_by=row[12],
            approved_by=row[13], approved_at=row[14], created_at=row[15]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating sales order: {str(e)}")

@router.get("/sales-orders/{order_id}", response_model=SalesOrderResponse)
async def get_sales_order(
    order_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific sales order with lines"""
    query = """
        SELECT so.id, so.company_id, so.order_number, so.customer_id, c.name as customer_name,
               so.order_date, so.required_date, so.status, so.warehouse_id,
               so.subtotal, so.tax_amount, so.total_amount, so.notes,
               so.created_by, so.approved_by, so.approved_at, so.created_at
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE so.id = :order_id AND so.company_id = :company_id
    """
    result = db.execute(query, {"order_id": str(order_id), "company_id": str(company_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    lines_query = """
        SELECT id, sales_order_id, line_number, product_id, description,
               quantity, unit_price, discount_percent, tax_rate, line_total,
               quantity_delivered, quantity_invoiced
        FROM sales_order_lines
        WHERE sales_order_id = :order_id
        ORDER BY line_number
    """
    lines_result = db.execute(lines_query, {"order_id": str(order_id)})
    lines = []
    for line_row in lines_result:
        lines.append(SalesOrderLineResponse(
            id=line_row[0], sales_order_id=line_row[1], line_number=line_row[2],
            product_id=line_row[3], description=line_row[4], quantity=line_row[5],
            unit_price=line_row[6], discount_percent=line_row[7], tax_rate=line_row[8],
            line_total=line_row[9], quantity_delivered=line_row[10], quantity_invoiced=line_row[11]
        ))
    
    return SalesOrderResponse(
        id=row[0], company_id=row[1], order_number=row[2], customer_id=row[3],
        customer_name=row[4], order_date=row[5], required_date=row[6],
        status=row[7], warehouse_id=row[8], subtotal=row[9], tax_amount=row[10],
        total_amount=row[11], notes=row[12], created_by=row[13],
        approved_by=row[14], approved_at=row[15], created_at=row[16],
        lines=lines
    )

@router.post("/sales-orders/{order_id}/approve")
async def approve_sales_order(
    order_id: UUID,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Approve a sales order"""
    try:
        query = """
            UPDATE sales_orders
            SET status = 'approved', approved_by = :user_id, approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :order_id AND company_id = :company_id AND status = 'draft'
            RETURNING id
        """
        result = db.execute(query, {
            "order_id": str(order_id),
            "company_id": str(company_id),
            "user_id": str(user_id) if user_id else None
        })
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Sales order not found or already approved")
        
        db.commit()
        return {"message": "Sales order approved successfully", "order_id": str(order_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error approving sales order: {str(e)}")

# ============================================================================
# ============================================================================

@router.get("/deliveries", response_model=List[DeliveryResponse])
async def list_deliveries(
    status: Optional[str] = None,
    sales_order_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List deliveries"""
    query = """
        SELECT d.id, d.company_id, d.delivery_number, d.sales_order_id, d.customer_id,
               c.name as customer_name, d.warehouse_id, w.name as warehouse_name,
               d.delivery_date, d.status, d.tracking_number, d.carrier, d.notes,
               d.signed_document_url, d.signed_at, d.created_by, d.created_at
        FROM deliveries d
        JOIN customers c ON d.customer_id = c.id
        JOIN warehouses w ON d.warehouse_id = w.id
        WHERE d.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if status:
        query += " AND d.status = :status"
        params["status"] = status
    
    if sales_order_id:
        query += " AND d.sales_order_id = :sales_order_id"
        params["sales_order_id"] = str(sales_order_id)
    
    query += " ORDER BY d.delivery_date DESC, d.delivery_number DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(query, params)
    deliveries = []
    for row in result:
        deliveries.append(DeliveryResponse(
            id=row[0], company_id=row[1], delivery_number=row[2], sales_order_id=row[3],
            customer_id=row[4], customer_name=row[5], warehouse_id=row[6],
            warehouse_name=row[7], delivery_date=row[8], status=row[9],
            tracking_number=row[10], carrier=row[11], notes=row[12],
            signed_document_url=row[13], signed_at=row[14], created_by=row[15],
            created_at=row[16]
        ))
    return deliveries

@router.post("/deliveries", response_model=DeliveryResponse)
async def create_delivery(
    delivery: DeliveryCreate,
    company_id: UUID = Depends(get_company_id),
    user_id: Optional[UUID] = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """Create a new delivery"""
    delivery_id = uuid4()
    
    try:
        result = db.execute(
            "SELECT COUNT(*) FROM deliveries WHERE company_id = :company_id",
            {"company_id": str(company_id)}
        )
        count = result.fetchone()[0]
        delivery_number = f"DN-{count + 1:06d}"
        
        query = """
            INSERT INTO deliveries (id, company_id, delivery_number, sales_order_id, customer_id,
                                   warehouse_id, delivery_date, status, tracking_number, carrier,
                                   notes, created_by, created_at, updated_at)
            VALUES (:id, :company_id, :delivery_number, :sales_order_id, :customer_id,
                    :warehouse_id, :delivery_date, 'draft', :tracking_number, :carrier,
                    :notes, :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, company_id, delivery_number, sales_order_id, customer_id,
                      warehouse_id, delivery_date, status, tracking_number, carrier,
                      notes, signed_document_url, signed_at, created_by, created_at
        """
        result = db.execute(query, {
            "id": str(delivery_id),
            "company_id": str(company_id),
            "delivery_number": delivery_number,
            "sales_order_id": str(delivery.sales_order_id) if delivery.sales_order_id else None,
            "customer_id": str(delivery.customer_id),
            "warehouse_id": str(delivery.warehouse_id),
            "delivery_date": delivery.delivery_date,
            "tracking_number": delivery.tracking_number,
            "carrier": delivery.carrier,
            "notes": delivery.notes,
            "created_by": str(user_id) if user_id else None
        })
        row = result.fetchone()
        
        for line in delivery.lines:
            line_id = uuid4()
            db.execute("""
                INSERT INTO delivery_lines (id, delivery_id, sales_order_line_id, line_number,
                                           product_id, description, quantity, storage_location_id,
                                           created_at, updated_at)
                VALUES (:id, :delivery_id, :sales_order_line_id, :line_number,
                        :product_id, :description, :quantity, :storage_location_id,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, {
                "id": str(line_id),
                "delivery_id": str(delivery_id),
                "sales_order_line_id": str(line.sales_order_line_id) if line.sales_order_line_id else None,
                "line_number": line.line_number,
                "product_id": str(line.product_id),
                "description": line.description,
                "quantity": float(line.quantity),
                "storage_location_id": str(line.storage_location_id) if line.storage_location_id else None
            })
        
        db.commit()
        
        customer_result = db.execute(
            "SELECT name FROM customers WHERE id = :customer_id",
            {"customer_id": str(delivery.customer_id)}
        )
        customer_row = customer_result.fetchone()
        customer_name = customer_row[0] if customer_row else None
        
        warehouse_result = db.execute(
            "SELECT name FROM warehouses WHERE id = :warehouse_id",
            {"warehouse_id": str(delivery.warehouse_id)}
        )
        warehouse_row = warehouse_result.fetchone()
        warehouse_name = warehouse_row[0] if warehouse_row else None
        
        return DeliveryResponse(
            id=row[0], company_id=row[1], delivery_number=row[2], sales_order_id=row[3],
            customer_id=row[4], customer_name=customer_name, warehouse_id=row[5],
            warehouse_name=warehouse_name, delivery_date=row[6], status=row[7],
            tracking_number=row[8], carrier=row[9], notes=row[10],
            signed_document_url=row[11], signed_at=row[12], created_by=row[13],
            created_at=row[14]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating delivery: {str(e)}")

@router.get("/deliveries/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(
    delivery_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific delivery with lines"""
    query = """
        SELECT d.id, d.company_id, d.delivery_number, d.sales_order_id, d.customer_id,
               c.name as customer_name, d.warehouse_id, w.name as warehouse_name,
               d.delivery_date, d.status, d.tracking_number, d.carrier, d.notes,
               d.signed_document_url, d.signed_at, d.created_by, d.created_at
        FROM deliveries d
        JOIN customers c ON d.customer_id = c.id
        JOIN warehouses w ON d.warehouse_id = w.id
        WHERE d.id = :delivery_id AND d.company_id = :company_id
    """
    result = db.execute(query, {"delivery_id": str(delivery_id), "company_id": str(company_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    lines_query = """
        SELECT id, delivery_id, sales_order_line_id, line_number, product_id,
               description, quantity, storage_location_id
        FROM delivery_lines
        WHERE delivery_id = :delivery_id
        ORDER BY line_number
    """
    lines_result = db.execute(lines_query, {"delivery_id": str(delivery_id)})
    lines = []
    for line_row in lines_result:
        lines.append(DeliveryLineResponse(
            id=line_row[0], delivery_id=line_row[1], sales_order_line_id=line_row[2],
            line_number=line_row[3], product_id=line_row[4], description=line_row[5],
            quantity=line_row[6], storage_location_id=line_row[7]
        ))
    
    return DeliveryResponse(
        id=row[0], company_id=row[1], delivery_number=row[2], sales_order_id=row[3],
        customer_id=row[4], customer_name=row[5], warehouse_id=row[6],
        warehouse_name=row[7], delivery_date=row[8], status=row[9],
        tracking_number=row[10], carrier=row[11], notes=row[12],
        signed_document_url=row[13], signed_at=row[14], created_by=row[15],
        created_at=row[16], lines=lines
    )

@router.post("/deliveries/{delivery_id}/ship")
async def ship_delivery(
    delivery_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Ship a delivery and post stock issue"""
    try:
        lines_query = """
            SELECT product_id, quantity, storage_location_id
            FROM delivery_lines
            WHERE delivery_id = :delivery_id
        """
        lines_result = db.execute(lines_query, {"delivery_id": str(delivery_id)})
        
        warehouse_query = """
            SELECT warehouse_id FROM deliveries
            WHERE id = :delivery_id AND company_id = :company_id
        """
        warehouse_result = db.execute(warehouse_query, {
            "delivery_id": str(delivery_id),
            "company_id": str(company_id)
        })
        warehouse_row = warehouse_result.fetchone()
        if not warehouse_row:
            raise HTTPException(status_code=404, detail="Delivery not found")
        warehouse_id = warehouse_row[0]
        
        for line_row in lines_result:
            product_id, quantity, storage_location_id = line_row
            movement_id = uuid4()
            
            db.execute("""
                INSERT INTO stock_movements (id, company_id, product_id, warehouse_id, storage_location_id,
                                            movement_type, quantity, reference_type, reference_id,
                                            transaction_date, created_at)
                VALUES (:id, :company_id, :product_id, :warehouse_id, :storage_location_id,
                        'issue', :quantity, 'delivery', :delivery_id,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, {
                "id": str(movement_id),
                "company_id": str(company_id),
                "product_id": str(product_id),
                "warehouse_id": str(warehouse_id),
                "storage_location_id": str(storage_location_id) if storage_location_id else None,
                "quantity": float(quantity),
                "delivery_id": str(delivery_id)
            })
            
            db.execute("""
                UPDATE stock_on_hand
                SET quantity_on_hand = quantity_on_hand - :quantity,
                    last_movement_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = :product_id
                  AND warehouse_id = :warehouse_id
                  AND (storage_location_id = :storage_location_id OR (storage_location_id IS NULL AND :storage_location_id IS NULL))
            """, {
                "quantity": float(quantity),
                "product_id": str(product_id),
                "warehouse_id": str(warehouse_id),
                "storage_location_id": str(storage_location_id) if storage_location_id else None
            })
        
        db.execute("""
            UPDATE deliveries
            SET status = 'shipped', updated_at = CURRENT_TIMESTAMP
            WHERE id = :delivery_id AND company_id = :company_id
        """, {
            "delivery_id": str(delivery_id),
            "company_id": str(company_id)
        })
        
        db.commit()
        return {"message": "Delivery shipped successfully", "delivery_id": str(delivery_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error shipping delivery: {str(e)}")
