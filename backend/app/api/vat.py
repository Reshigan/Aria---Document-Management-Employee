"""
VAT/Tax API
Provides endpoints for VAT returns, adjustments, and tax codes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from pydantic import BaseModel, Field

from core.database import get_db
from core.auth import get_current_user
from models.user import User
from app.models.vat import (
    VATReturn, VATAdjustment, TaxCode, VATTransaction,
    VATReturnStatus, VATReturnPeriod, TaxType
)

router = APIRouter(prefix="/api/vat", tags=["VAT/Tax"])

# ===================== SCHEMAS =====================

class TaxCodeCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    tax_type: str
    tax_rate: Decimal
    tax_collected_account: Optional[str] = None
    tax_paid_account: Optional[str] = None
    is_zero_rated: bool = False
    is_exempt: bool = False

class TaxCodeResponse(BaseModel):
    id: int
    tenant_id: int
    code: str
    name: str
    tax_type: str
    tax_rate: Decimal
    is_active: bool
    is_zero_rated: bool
    is_exempt: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VATReturnCreate(BaseModel):
    period_start: date
    period_end: date
    period_type: str = "BIMONTHLY"

class VATReturnResponse(BaseModel):
    id: int
    tenant_id: int
    return_number: str
    period_start: date
    period_end: date
    period_type: str
    output_tax: Decimal
    input_tax: Decimal
    net_vat: Decimal
    total_vat_payable: Decimal
    status: str
    submitted_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class VATAdjustmentCreate(BaseModel):
    vat_return_id: Optional[int] = None
    adjustment_date: date
    adjustment_type: str
    description: str
    adjustment_amount: Decimal
    reference: Optional[str] = None
    notes: Optional[str] = None

class VATAdjustmentResponse(BaseModel):
    id: int
    tenant_id: int
    vat_return_id: Optional[int]
    adjustment_date: date
    adjustment_type: str
    description: str
    adjustment_amount: Decimal
    reference: Optional[str]
    is_posted: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/tax-codes", response_model=TaxCodeResponse, status_code=status.HTTP_201_CREATED)
def create_tax_code(
    tax_code: TaxCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tax code"""
    existing = db.query(TaxCode).filter(
        and_(
            TaxCode.tenant_id == current_user.tenant_id,
            TaxCode.code == tax_code.code
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Tax code {tax_code.code} already exists")
    
    db_tax_code = TaxCode(
        tenant_id=current_user.tenant_id,
        code=tax_code.code,
        name=tax_code.name,
        description=tax_code.description,
        tax_type=tax_code.tax_type,
        tax_rate=tax_code.tax_rate,
        tax_collected_account=tax_code.tax_collected_account,
        tax_paid_account=tax_code.tax_paid_account,
        is_zero_rated=tax_code.is_zero_rated,
        is_exempt=tax_code.is_exempt,
        is_active=True,
        created_by_id=current_user.id
    )
    
    db.add(db_tax_code)
    db.commit()
    db.refresh(db_tax_code)
    
    return db_tax_code

@router.get("/tax-codes", response_model=List[TaxCodeResponse])
def list_tax_codes(
    is_active: Optional[bool] = None,
    tax_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tax codes"""
    query = db.query(TaxCode).filter(TaxCode.tenant_id == current_user.tenant_id)
    
    if is_active is not None:
        query = query.filter(TaxCode.is_active == is_active)
    if tax_type:
        query = query.filter(TaxCode.tax_type == tax_type)
    
    tax_codes = query.order_by(TaxCode.code).all()
    return tax_codes

@router.get("/tax-codes/{tax_code_id}", response_model=TaxCodeResponse)
def get_tax_code(
    tax_code_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific tax code"""
    tax_code = db.query(TaxCode).filter(
        and_(
            TaxCode.id == tax_code_id,
            TaxCode.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not tax_code:
        raise HTTPException(status_code=404, detail="Tax code not found")
    
    return tax_code


@router.post("/returns", response_model=VATReturnResponse, status_code=status.HTTP_201_CREATED)
def create_vat_return(
    vat_return: VATReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new VAT return and calculate amounts from transactions"""
    last_return = db.query(VATReturn).filter(
        VATReturn.tenant_id == current_user.tenant_id
    ).order_by(VATReturn.id.desc()).first()
    
    next_number = 1 if not last_return else int(last_return.return_number.split('-')[-1]) + 1
    return_number = f"VAT-{next_number:05d}"
    
    transactions = db.query(VATTransaction).filter(
        and_(
            VATTransaction.tenant_id == current_user.tenant_id,
            VATTransaction.transaction_date >= vat_return.period_start,
            VATTransaction.transaction_date <= vat_return.period_end,
            VATTransaction.is_included_in_return == False
        )
    ).all()
    
    output_tax = Decimal("0")  # VAT on sales
    input_tax = Decimal("0")  # VAT on purchases
    zero_rated_supplies = Decimal("0")
    exempt_supplies = Decimal("0")
    total_supplies = Decimal("0")
    total_purchases = Decimal("0")
    
    for txn in transactions:
        if txn.transaction_type == "SALE":
            output_tax += txn.vat_amount
            total_supplies += txn.gross_amount
            
            if txn.tax_rate == 0:
                tax_code = db.query(TaxCode).filter(TaxCode.id == txn.tax_code_id).first()
                if tax_code:
                    if tax_code.is_zero_rated:
                        zero_rated_supplies += txn.net_amount
                    elif tax_code.is_exempt:
                        exempt_supplies += txn.net_amount
        
        elif txn.transaction_type == "PURCHASE":
            input_tax += txn.vat_amount
            total_purchases += txn.gross_amount
    
    net_vat = output_tax - input_tax
    total_vat_payable = net_vat
    
    db_return = VATReturn(
        tenant_id=current_user.tenant_id,
        return_number=return_number,
        period_start=vat_return.period_start,
        period_end=vat_return.period_end,
        period_type=vat_return.period_type,
        output_tax=output_tax,
        input_tax=input_tax,
        net_vat=net_vat,
        bad_debts=Decimal("0"),
        adjustments=Decimal("0"),
        total_vat_payable=total_vat_payable,
        zero_rated_supplies=zero_rated_supplies,
        exempt_supplies=exempt_supplies,
        total_supplies=total_supplies,
        total_purchases=total_purchases,
        status=VATReturnStatus.DRAFT,
        created_by_id=current_user.id
    )
    
    db.add(db_return)
    db.flush()
    
    for txn in transactions:
        txn.vat_return_id = db_return.id
        txn.is_included_in_return = True
    
    db.commit()
    db.refresh(db_return)
    
    return db_return

@router.get("/returns", response_model=List[VATReturnResponse])
def list_vat_returns(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List VAT returns"""
    query = db.query(VATReturn).filter(VATReturn.tenant_id == current_user.tenant_id)
    
    if status:
        query = query.filter(VATReturn.status == status)
    
    returns = query.order_by(desc(VATReturn.period_end)).offset(skip).limit(limit).all()
    return returns

@router.get("/returns/{return_id}", response_model=VATReturnResponse)
def get_vat_return(
    return_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific VAT return"""
    vat_return = db.query(VATReturn).filter(
        and_(
            VATReturn.id == return_id,
            VATReturn.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not vat_return:
        raise HTTPException(status_code=404, detail="VAT return not found")
    
    return vat_return

@router.post("/returns/{return_id}/submit")
def submit_vat_return(
    return_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a VAT return to SARS"""
    vat_return = db.query(VATReturn).filter(
        and_(
            VATReturn.id == return_id,
            VATReturn.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not vat_return:
        raise HTTPException(status_code=404, detail="VAT return not found")
    
    if vat_return.status != VATReturnStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft returns can be submitted")
    
    
    vat_return.status = VATReturnStatus.SUBMITTED
    vat_return.submitted_date = datetime.utcnow()
    vat_return.submitted_by_id = current_user.id
    vat_return.submission_reference = f"SUB-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    db.commit()
    
    return {
        "success": True,
        "message": "VAT return submitted successfully",
        "submission_reference": vat_return.submission_reference
    }

@router.get("/returns/{return_id}/vat201")
def get_vat201_report(
    return_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get VAT201 report format for a return"""
    vat_return = db.query(VATReturn).filter(
        and_(
            VATReturn.id == return_id,
            VATReturn.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not vat_return:
        raise HTTPException(status_code=404, detail="VAT return not found")
    
    return {
        "return_number": vat_return.return_number,
        "period_start": vat_return.period_start,
        "period_end": vat_return.period_end,
        "vat201": {
            "box_1_output_tax": float(vat_return.output_tax),
            "box_2_input_tax": float(vat_return.input_tax),
            "box_3_net_vat": float(vat_return.net_vat),
            "box_4_bad_debts": float(vat_return.bad_debts),
            "box_5_adjustments": float(vat_return.adjustments),
            "box_6_total_vat_payable": float(vat_return.total_vat_payable),
            "box_7_zero_rated_supplies": float(vat_return.zero_rated_supplies),
            "box_8_exempt_supplies": float(vat_return.exempt_supplies),
            "box_9_total_supplies": float(vat_return.total_supplies),
            "box_10_total_purchases": float(vat_return.total_purchases)
        },
        "status": vat_return.status,
        "submitted_date": vat_return.submitted_date,
        "submission_reference": vat_return.submission_reference
    }


@router.post("/adjustments", response_model=VATAdjustmentResponse, status_code=status.HTTP_201_CREATED)
def create_vat_adjustment(
    adjustment: VATAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new VAT adjustment"""
    db_adjustment = VATAdjustment(
        tenant_id=current_user.tenant_id,
        vat_return_id=adjustment.vat_return_id,
        adjustment_date=adjustment.adjustment_date,
        adjustment_type=adjustment.adjustment_type,
        description=adjustment.description,
        adjustment_amount=adjustment.adjustment_amount,
        reference=adjustment.reference,
        notes=adjustment.notes,
        is_posted=False,
        created_by_id=current_user.id
    )
    
    db.add(db_adjustment)
    
    if adjustment.vat_return_id:
        vat_return = db.query(VATReturn).filter(VATReturn.id == adjustment.vat_return_id).first()
        if vat_return:
            vat_return.adjustments += adjustment.adjustment_amount
            vat_return.total_vat_payable = vat_return.net_vat + vat_return.bad_debts + vat_return.adjustments
    
    db.commit()
    db.refresh(db_adjustment)
    
    return db_adjustment

@router.get("/adjustments", response_model=List[VATAdjustmentResponse])
def list_vat_adjustments(
    vat_return_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List VAT adjustments"""
    query = db.query(VATAdjustment).filter(VATAdjustment.tenant_id == current_user.tenant_id)
    
    if vat_return_id:
        query = query.filter(VATAdjustment.vat_return_id == vat_return_id)
    
    adjustments = query.order_by(desc(VATAdjustment.adjustment_date)).offset(skip).limit(limit).all()
    return adjustments

# ===================== REPORTS =====================

@router.get("/reports/summary")
def get_vat_summary(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get VAT summary for a period"""
    transactions = db.query(VATTransaction).filter(
        and_(
            VATTransaction.tenant_id == current_user.tenant_id,
            VATTransaction.transaction_date >= from_date,
            VATTransaction.transaction_date <= to_date
        )
    ).all()
    
    output_tax = sum(t.vat_amount for t in transactions if t.transaction_type == "SALE")
    input_tax = sum(t.vat_amount for t in transactions if t.transaction_type == "PURCHASE")
    net_vat = output_tax - input_tax
    
    return {
        "period_start": from_date,
        "period_end": to_date,
        "output_tax": float(output_tax),
        "input_tax": float(input_tax),
        "net_vat": float(net_vat),
        "transaction_count": len(transactions)
    }
