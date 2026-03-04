"""
Inventory Management Models
Product, Stock, Warehouses, Stock Movements
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from .base import Base


class ProductType(str, Enum):
    """Product Types"""
    GOODS = "goods"  # Physical products
    SERVICE = "service"  # Services
    DIGITAL = "digital"  # Digital products
    

class StockValuationMethod(str, Enum):
    """Stock Valuation Methods"""
    FIFO = "fifo"  # First In First Out
    WEIGHTED_AVERAGE = "weighted_average"
    STANDARD_COST = "standard_cost"


class StockMovementType(str, Enum):
    """Types of Stock Movements"""
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    RETURN = "return"
    WRITE_OFF = "write_off"
    MANUFACTURING = "manufacturing"


class Product(Base):
    """
    Product Master Data
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Product identification
    product_code = Column(String(50), nullable=False, unique=True, index=True)
    product_name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    
    # Classification
    product_type = Column(SQLEnum(ProductType), default=ProductType.GOODS)
    category = Column(String(100), index=True)
    subcategory = Column(String(100))
    
    # Product details
    sku = Column(String(100), unique=True)
    barcode = Column(String(100), unique=True)
    
    # Unit of measure
    unit_of_measure = Column(String(50), default="Each")
    
    # Pricing
    cost_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    markup_percentage = Column(Float, default=0.0)
    
    # VAT
    vat_rate = Column(Float, default=15.0)
    is_vat_exempt = Column(Boolean, default=False)
    
    # Inventory tracking
    track_inventory = Column(Boolean, default=True)
    reorder_level = Column(Float, default=0.0)
    reorder_quantity = Column(Float, default=0.0)
    min_stock_level = Column(Float, default=0.0)
    max_stock_level = Column(Float, default=0.0)
    
    # Current stock (cached for performance)
    total_qty_on_hand = Column(Float, default=0.0)
    total_qty_available = Column(Float, default=0.0)  # On hand - committed
    total_qty_committed = Column(Float, default=0.0)  # Reserved for orders
    
    # Costing
    valuation_method = Column(SQLEnum(StockValuationMethod), default=StockValuationMethod.WEIGHTED_AVERAGE)
    average_cost = Column(Float, default=0.0)
    
    # Accounting
    inventory_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    revenue_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    cogs_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # Supplier
    preferred_supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    
    # Physical properties
    weight = Column(Float)
    weight_unit = Column(String(20), default="kg")
    dimensions = Column(String(100))  # "100x50x30 cm"
    
    # Status
    is_active = Column(Boolean, default=True)
    is_sellable = Column(Boolean, default=True)
    is_purchasable = Column(Boolean, default=True)
    
    # Images
    image_url = Column(String(500))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    stock_levels = relationship("StockLevel", back_populates="product")
    stock_movements = relationship("StockMovement", back_populates="product")
    
    def __repr__(self):
        return f"<Product {self.product_code} - {self.product_name}>"


class Warehouse(Base):
    """
    Warehouse/Location Management
    """
    __tablename__ = "warehouses"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Warehouse identification
    warehouse_code = Column(String(50), nullable=False, unique=True, index=True)
    warehouse_name = Column(String(200), nullable=False)
    
    # Location
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    city = Column(String(100))
    province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Africa")
    
    # Contact
    contact_person = Column(String(200))
    phone = Column(String(50))
    email = Column(String(200))
    
    # Properties
    is_main = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stock_levels = relationship("StockLevel", back_populates="warehouse")
    stock_movements = relationship(
        "StockMovement",
        back_populates="warehouse",
        foreign_keys="StockMovement.warehouse_id"
    )
    
    def __repr__(self):
        return f"<Warehouse {self.warehouse_code} - {self.warehouse_name}>"


class StockLevel(Base):
    """
    Stock on Hand by Product and Warehouse
    """
    __tablename__ = "stock_levels"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Product and Location
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    
    # Quantities
    qty_on_hand = Column(Float, default=0.0)
    qty_available = Column(Float, default=0.0)
    qty_committed = Column(Float, default=0.0)
    qty_on_order = Column(Float, default=0.0)
    
    # Costing
    average_cost = Column(Float, default=0.0)
    total_value = Column(Float, default=0.0)
    
    # Last movement
    last_movement_date = Column(DateTime)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="stock_levels")
    warehouse = relationship("Warehouse", back_populates="stock_levels")
    
    def __repr__(self):
        return f"<StockLevel Product:{self.product_id} Warehouse:{self.warehouse_id} Qty:{self.qty_on_hand}>"


class StockMovement(Base):
    """
    Stock Movement Transactions
    """
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Movement identification
    movement_number = Column(String(50), nullable=False, unique=True, index=True)
    movement_type = Column(SQLEnum(StockMovementType), nullable=False, index=True)
    
    # Product and Location
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    
    # Transfer (if applicable)
    transfer_to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    
    # Date
    movement_date = Column(DateTime, nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True)
    
    # Quantity and Cost
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    
    # Reference
    reference = Column(String(200))
    notes = Column(Text)
    
    # Source document
    source_document_type = Column(String(50))  # invoice, bill, adjustment
    source_document_id = Column(Integer)
    
    # GL
    gl_journal_id = Column(Integer, ForeignKey("general_ledger.id"))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    product = relationship("Product", back_populates="stock_movements")
    warehouse = relationship(
        "Warehouse",
        back_populates="stock_movements",
        foreign_keys=[warehouse_id]
    )
    
    def __repr__(self):
        return f"<StockMovement {self.movement_number} - {self.movement_type} - Qty:{self.quantity}>"


class StockAdjustment(Base):
    """
    Stock Adjustments (write-offs, corrections)
    """
    __tablename__ = "stock_adjustments"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Adjustment identification
    adjustment_number = Column(String(50), nullable=False, unique=True, index=True)
    
    # Date
    adjustment_date = Column(DateTime, nullable=False, index=True)
    period = Column(String(7), nullable=False)
    
    # Reason
    reason = Column(String(200), nullable=False)
    notes = Column(Text)
    
    # Status
    is_posted = Column(Boolean, default=False)
    posted_at = Column(DateTime)
    posted_by = Column(String(100))
    
    # GL
    gl_journal_id = Column(Integer, ForeignKey("general_ledger.id"))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    lines = relationship("StockAdjustmentLine", back_populates="adjustment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<StockAdjustment {self.adjustment_number} - {self.reason}>"


class StockAdjustmentLine(Base):
    """
    Stock Adjustment Line Items
    """
    __tablename__ = "stock_adjustment_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Adjustment reference
    adjustment_id = Column(Integer, ForeignKey("stock_adjustments.id"), nullable=False)
    line_number = Column(Integer, default=1)
    
    # Product and Location
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    
    # Quantities
    qty_before = Column(Float, default=0.0)
    qty_adjustment = Column(Float, nullable=False)  # Can be negative
    qty_after = Column(Float, default=0.0)
    
    # Costing
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    adjustment = relationship("StockAdjustment", back_populates="lines")
    
    def __repr__(self):
        return f"<StockAdjustmentLine {self.line_number} - Product:{self.product_id} - Qty:{self.qty_adjustment}>"
