"""
ARIA ERP - Payments API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.financial import Payment
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record new payment"""
    db_payment = Payment(
        **payment.model_dump(),
        company_id=current_user.company_id,
        created_by=current_user.id
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.get("/", response_model=List[PaymentResponse])
def list_payments(
    skip: int = 0,
    limit: int = 100,
    payment_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all payments"""
    query = db.query(Payment).filter(
        Payment.company_id == current_user.company_id
    )
    
    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)
    
    payments = query.offset(skip).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific payment by ID"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.company_id == current_user.company_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: UUID,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update payment"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.company_id == current_user.company_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    for key, value in payment_update.model_dump(exclude_unset=True).items():
        setattr(payment, key, value)
    
    db.commit()
    db.refresh(payment)
    return payment
