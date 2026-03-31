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
from app.core.validation import get_business_logic_validator, ValidationError


router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    company_id: UUID = Depends(get_current_company_id),
    db: Session = Depends(get_db)
):
    """Create a new customer with business logic validation"""
    try:
        # Convert Pydantic model to dict for validation
        customer_dict = customer_data.model_dump()
        customer_dict['company_id'] = str(company_id)
        
        # Validate customer data using Zero-Slop principles
        validator = get_business_logic_validator(db, str(company_id))
        validated_data = validator.validate_customer(customer_dict)
        
        # Check for existing customer by email
        if validated_data.get('email'):
            existing_customer = db.query(Customer).filter(
                Customer.email == validated_data['email'],
                Customer.company_id == company_id
            ).first()
            if existing_customer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Customer with this email already exists"
                )
        
        # Generate customer number
        last_customer = db.query(Customer).filter(
            Customer.company_id == company_id
        ).order_by(Customer.created_at.desc()).first()
        
        customer_num = 1 if not last_customer else int(last_customer.customer_number.split('-')[1]) + 1
        customer_number = f"CUS-{customer_num:05d}"
        
        # Create customer with validated data
        customer = Customer(
            **validated_data,
            customer_number=customer_number
        )
        
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
        return CustomerResponse.model_validate(customer)
        
    except ValidationError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the customer"
        )


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
    """Update a customer with business logic validation"""
    try:
        customer = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.company_id == company_id
        ).first()
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Convert update data to dict and include existing values for validation
        update_dict = customer_data.model_dump(exclude_unset=True)
        
        # Merge with existing customer data for validation
        customer_dict = {
            "name": customer.name,
            "email": customer.email,
            "customer_number": customer.customer_number,
            "company_id": str(customer.company_id),
            **update_dict
        }
        
        # Validate customer data using Zero-Slop principles
        validator = get_business_logic_validator(db, str(company_id))
        validated_data = validator.validate_customer(customer_dict)
        
        # Apply only the updated fields
        for field, value in update_dict.items():
            setattr(customer, field, value)
        
        db.commit()
        db.refresh(customer)
        
        return CustomerResponse.model_validate(customer)
        
    except ValidationError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the customer"
        )


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
