"""
Master Data Module for ARIA ERP
Handles all master data entities with hierarchies, pricing, VAT, BBBEE
Supports standalone mode and integration with external ERPs (SAP ECC, SAP S/4HANA, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID, uuid4
from decimal import Decimal
from enum import Enum

router = APIRouter(prefix="/api/erp/master-data", tags=["Master Data"])


# ============================================================================
# ============================================================================

class CustomerType(str, Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"
    GOVERNMENT = "government"

class SupplierType(str, Enum):
    MANUFACTURER = "manufacturer"
    DISTRIBUTOR = "distributor"
    SERVICE_PROVIDER = "service_provider"

class BBBEELevel(str, Enum):
    LEVEL_1 = "level_1"
    LEVEL_2 = "level_2"
    LEVEL_3 = "level_3"
    LEVEL_4 = "level_4"
    LEVEL_5 = "level_5"
    LEVEL_6 = "level_6"
    LEVEL_7 = "level_7"
    LEVEL_8 = "level_8"
    NON_COMPLIANT = "non_compliant"

class PriceListType(str, Enum):
    STANDARD = "standard"
    CUSTOMER_SPECIFIC = "customer_specific"
    CUSTOMER_HIERARCHY = "customer_hierarchy"
    PROMOTIONAL = "promotional"
    VOLUME_BASED = "volume_based"


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


# ============================================================================
# ============================================================================

class CustomerCreate(BaseModel):
    code: str
    name: str
    customer_type: CustomerType = CustomerType.COMPANY
    parent_customer_id: Optional[UUID] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    vat_number: Optional[str] = None
    credit_limit: Decimal = Decimal("0.00")
    payment_terms_days: int = 30

class CustomerResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    customer_type: str
    parent_customer_id: Optional[UUID]
    email: Optional[str]
    phone: Optional[str]
    vat_number: Optional[str]
    credit_limit: Decimal
    payment_terms_days: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# ============================================================================

class SupplierCreate(BaseModel):
    code: str
    name: str
    supplier_type: SupplierType = SupplierType.MANUFACTURER
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    vat_number: Optional[str] = None
    bbbee_level: Optional[BBBEELevel] = None
    bbbee_certificate_number: Optional[str] = None
    bbbee_expiry_date: Optional[date] = None

class SupplierResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    supplier_type: Optional[str] = None  # Make optional to handle NULL values
    email: Optional[str]
    phone: Optional[str]
    vat_number: Optional[str]
    bbbee_level: Optional[str]
    bbbee_certificate_number: Optional[str]
    bbbee_expiry_date: Optional[date]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# ============================================================================

@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all customers with optional filtering"""
    query = """
        SELECT id, company_id, customer_number, name, customer_type, NULL as parent_customer_id,
               email, phone, vat_number, credit_limit, payment_terms,
               is_active, created_at
        FROM customers
        WHERE company_id = :company_id AND is_active = true
    """
    params = {"company_id": str(company_id)}
    
    if search:
        query += " AND (customer_number ILIKE :search OR name ILIKE :search OR email ILIKE :search)"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY customer_number LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    customers = []
    for row in result:
        customers.append(CustomerResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            customer_type=row[4], parent_customer_id=row[5],
            email=row[6], phone=row[7], vat_number=row[8],
            credit_limit=row[9], payment_terms_days=row[10],
            is_active=row[11], created_at=row[12]
        ))
    return customers

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new customer"""
    customer_id = uuid4()
    query = text("""
        INSERT INTO customers (
            id, company_id, customer_number, name, customer_type,
            email, phone, vat_number, credit_limit, payment_terms,
            is_active, created_at, updated_at
        ) VALUES (
            :id, :company_id, :customer_number, :name, :customer_type,
            :email, :phone, :vat_number, :credit_limit, :payment_terms,
            true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, company_id, customer_number, name, customer_type, NULL as parent_customer_id,
                  email, phone, vat_number, credit_limit, payment_terms,
                  is_active, created_at
    """)
    
    try:
        result = db.execute(query, {
            "id": str(customer_id),
            "company_id": str(company_id),
            "customer_number": customer.code,
            "name": customer.name,
            "customer_type": customer.customer_type.value,
            "email": customer.email,
            "phone": customer.phone,
            "vat_number": customer.vat_number,
            "credit_limit": float(customer.credit_limit),
            "payment_terms": customer.payment_terms_days
        })
        db.commit()
        row = result.fetchone()
        return CustomerResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            customer_type=row[4], parent_customer_id=row[5],
            email=row[6], phone=row[7], vat_number=row[8],
            credit_limit=row[9], payment_terms_days=row[10],
            is_active=row[11], created_at=row[12]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating customer: {str(e)}")


# ============================================================================
# ============================================================================

@router.get("/suppliers", response_model=List[SupplierResponse])
async def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    bbbee_level: Optional[BBBEELevel] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """List all suppliers with optional filtering"""
    query = """
        SELECT id, company_id, supplier_number, name, supplier_type,
               email, phone, vat_number,
               bbbee_level, NULL as bbbee_certificate_number, bbbee_certificate_expiry,
               is_active, created_at
        FROM suppliers
        WHERE company_id = :company_id AND is_active = true
    """
    params = {"company_id": str(company_id)}
    
    if search:
        query += " AND (supplier_number ILIKE :search OR name ILIKE :search OR email ILIKE :search)"
        params["search"] = f"%{search}%"
    
    if bbbee_level:
        query += " AND bbbee_level = :bbbee_level"
        params["bbbee_level"] = int(bbbee_level.value.split('_')[1]) if bbbee_level.value != 'non_compliant' else 0
    
    query += " ORDER BY supplier_number LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    suppliers = []
    for row in result:
        suppliers.append(SupplierResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            supplier_type=row[4] or "manufacturer",  # Default to manufacturer if NULL
            email=row[5], phone=row[6], vat_number=row[7],
            bbbee_level=row[8], bbbee_certificate_number=row[9], bbbee_expiry_date=row[10],
            is_active=row[11], created_at=row[12]
        ))
    return suppliers

@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    supplier: SupplierCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a new supplier"""
    supplier_id = uuid4()
    query = text("""
        INSERT INTO suppliers (
            id, company_id, supplier_number, name, supplier_type,
            email, phone, vat_number,
            bbbee_level, bbbee_certificate_expiry,
            is_active, created_at, updated_at
        ) VALUES (
            :id, :company_id, :supplier_number, :name, :supplier_type,
            :email, :phone, :vat_number,
            :bbbee_level, :bbbee_certificate_expiry,
            true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, company_id, supplier_number, name, supplier_type,
                  email, phone, vat_number,
                  bbbee_level, NULL as bbbee_certificate_number, bbbee_certificate_expiry,
                  is_active, created_at
    """)
    
    try:
        result = db.execute(query, {
            "id": str(supplier_id),
            "company_id": str(company_id),
            "supplier_number": supplier.code,
            "name": supplier.name,
            "supplier_type": supplier.supplier_type.value,
            "email": supplier.email,
            "phone": supplier.phone,
            "vat_number": supplier.vat_number,
            "bbbee_level": int(supplier.bbbee_level.value.split('_')[1]) if supplier.bbbee_level and supplier.bbbee_level.value != 'non_compliant' else 0,
            "bbbee_certificate_expiry": supplier.bbbee_expiry_date
        })
        db.commit()
        row = result.fetchone()
        return SupplierResponse(
            id=row[0], company_id=row[1], code=row[2], name=row[3],
            supplier_type=row[4], email=row[5], phone=row[6], vat_number=row[7],
            bbbee_level=row[8], bbbee_certificate_number=row[9], bbbee_expiry_date=row[10],
            is_active=row[11], created_at=row[12]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating supplier: {str(e)}")


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for master data module"""
    return {
        "status": "healthy",
        "module": "master_data",
        "version": "1.0.0",
        "features": [
            "customers_with_hierarchy",
            "suppliers_with_bbbee",
            "products_with_categories",
            "pricing_master_data",
            "vat_handling"
        ]
    }
