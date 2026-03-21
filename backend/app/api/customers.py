"""
ARIA ERP - Customers API
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_company_id       
from app.models.financial import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse


router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new customer"""
    
    # Generate customer number
    last_customer = db.query(Customer).filter(
        Customer.company_id == company_id
    ).order_by(Customer.created_at.desc()).first()
    
    customer_num = 1 if not last_customer else int(last_customer.customer_number.split('-')[1]) + 1
    customer_number = f"CUS-{customer_num:05d}"
    
    customer = Customer(
        **customer_data.model_dump(),
        company_id=company_id,
        customer_number=customer_number
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    return CustomerResponse.model_validate(customer)


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    company_id: UUID = Depends(get_current_company_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None),
    is_active: bool = Query(None),
    db: Session = Depends(get_db)
):
    """List all customers"""
    query = db.query(Customer).filter(Customer.company_id == company_id)
    
    if search:
        query = query.filter(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%")) |
            (Customer.customer_number.ilike(f"%{search}%"))
        )
    
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    
    customers = query.order_by(Customer.created_at.desc()).offset(skip).limit(limit).all()
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Get a specific customer"""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return CustomerResponse.model_validate(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Update a customer"""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    
    return CustomerResponse.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a customer"""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    customer.is_active = False
    db.commit()
