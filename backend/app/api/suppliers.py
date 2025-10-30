"""
ARIA ERP - Suppliers API
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_company_id
from app.models.financial import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse


router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_data: SupplierCreate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new supplier"""
    
    # Generate supplier number
    last_supplier = db.query(Supplier).filter(
        Supplier.company_id == company_id
    ).order_by(Supplier.created_at.desc()).first()
    
    supplier_num = 1 if not last_supplier else int(last_supplier.supplier_number.split('-')[1]) + 1
    supplier_number = f"SUP-{supplier_num:05d}"
    
    supplier = Supplier(
        **supplier_data.model_dump(),
        company_id=company_id,
        supplier_number=supplier_number
    )
    
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    
    return SupplierResponse.model_validate(supplier)


@router.get("/", response_model=List[SupplierResponse])
async def list_suppliers(
    company_id: UUID = Depends(get_current_company_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    is_active: bool = Query(None),
    db: Session = Depends(get_db)
):
    """List all suppliers"""
    query = db.query(Supplier).filter(Supplier.company_id == company_id)
    
    if search:
        query = query.filter(
            (Supplier.name.ilike(f"%{search}%")) |
            (Supplier.email.ilike(f"%{search}%")) |
            (Supplier.supplier_number.ilike(f"%{search}%"))
        )
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    suppliers = query.order_by(Supplier.created_at.desc()).offset(skip).limit(limit).all()
    return [SupplierResponse.model_validate(s) for s in suppliers]


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific supplier"""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.company_id == company_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    return SupplierResponse.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    supplier_data: SupplierUpdate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update a supplier"""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.company_id == company_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    update_data = supplier_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    db.commit()
    db.refresh(supplier)
    
    return SupplierResponse.model_validate(supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: UUID,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a supplier"""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.company_id == company_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier.is_active = False
    db.commit()
