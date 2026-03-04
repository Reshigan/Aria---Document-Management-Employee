"""
CRM (Customer Relationship Management) API
Includes: Customers, Leads, Opportunities, Quotes, Activities
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from core.database import get_db
from core.auth import get_current_user
from app.models.crm import Lead, Opportunity, Quote, QuoteLine
from app.models.transactions import Customer
from app.models.user import User
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/crm", tags=["CRM"])

# ===================== SCHEMAS =====================

class CustomerCreate(BaseModel):
    customer_name: str
    customer_code: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    vat_number: Optional[str] = None
    registration_number: Optional[str] = None
    bbbee_level: Optional[int] = Field(None, ge=1, le=8)
    bbbee_certificate_number: Optional[str] = None
    credit_limit: Optional[Decimal] = Field(default=Decimal("0"))
    payment_terms_days: int = Field(default=30, ge=0)
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    vat_number: Optional[str] = None
    bbbee_level: Optional[int] = Field(None, ge=1, le=8)
    credit_limit: Optional[Decimal] = None
    payment_terms_days: Optional[int] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    tenant_id: int
    customer_code: str
    customer_name: str
    contact_person: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    vat_number: Optional[str]
    bbbee_level: Optional[int]
    credit_limit: Decimal
    payment_terms_days: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LeadCreate(BaseModel):
    company_name: str
    contact_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = "website"  # website, referral, cold_call, social_media
    status: str = "new"  # new, contacted, qualified, proposal, negotiation, won, lost
    estimated_value: Optional[Decimal] = None
    probability: int = Field(default=0, ge=0, le=100)
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: int
    tenant_id: int
    company_name: str
    contact_name: str
    email: Optional[str]
    phone: Optional[str]
    source: str
    status: str
    estimated_value: Optional[Decimal]
    probability: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OpportunityCreate(BaseModel):
    customer_id: int
    name: str
    description: Optional[str] = None
    stage: str = "prospecting"  # prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    probability: int = Field(default=0, ge=0, le=100)
    estimated_value: Decimal = Field(gt=0)
    expected_close_date: date
    assigned_to_id: Optional[int] = None

class OpportunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    stage: Optional[str] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    estimated_value: Optional[Decimal] = None
    expected_close_date: Optional[date] = None
    assigned_to_id: Optional[int] = None

class OpportunityResponse(BaseModel):
    id: int
    tenant_id: int
    customer_id: int
    name: str
    stage: str
    probability: int
    estimated_value: Decimal
    expected_close_date: date
    assigned_to_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class QuoteLineCreate(BaseModel):
    product_id: Optional[int] = None
    description: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    discount_percentage: Decimal = Field(default=Decimal("0"), ge=0, le=100)

class QuoteCreate(BaseModel):
    customer_id: int
    opportunity_id: Optional[int] = None
    quote_date: date
    valid_until_date: date
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    lines: List[QuoteLineCreate]

class QuoteResponse(BaseModel):
    id: int
    tenant_id: int
    customer_id: int
    quote_number: str
    quote_date: date
    valid_until_date: date
    subtotal: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ===================== CUSTOMER ENDPOINTS =====================

@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer"""
    # Generate customer code if not provided
    if not customer.customer_code:
        last_customer = db.query(Customer).filter(
            Customer.tenant_id == current_user.tenant_id
        ).order_by(Customer.id.desc()).first()
        
        next_number = 1 if not last_customer else int(last_customer.customer_code.split('-')[-1]) + 1
        customer_code = f"CUST-{next_number:05d}"
    else:
        customer_code = customer.customer_code
    
    # Create customer
    db_customer = Customer(
        tenant_id=current_user.tenant_id,
        customer_code=customer_code,
        customer_name=customer.customer_name,
        contact_person=customer.contact_person,
        email=customer.email,
        phone=customer.phone,
        mobile=customer.mobile,
        vat_number=customer.vat_number,
        registration_number=customer.registration_number,
        bbbee_level=customer.bbbee_level,
        bbbee_certificate_number=customer.bbbee_certificate_number,
        credit_limit=customer.credit_limit,
        payment_terms_days=customer.payment_terms_days,
        billing_address=customer.billing_address,
        shipping_address=customer.shipping_address,
        is_active=True,
        notes=customer.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    
    return db_customer

@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    bbbee_level: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List customers with optional filters"""
    query = db.query(Customer).filter(Customer.tenant_id == current_user.tenant_id)
    
    if search:
        search_filter = or_(
            Customer.customer_name.ilike(f"%{search}%"),
            Customer.customer_code.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    
    if bbbee_level:
        query = query.filter(Customer.bbbee_level == bbbee_level)
    
    customers = query.order_by(Customer.customer_name).offset(skip).limit(limit).all()
    return customers

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific customer"""
    customer = db.query(Customer).filter(
        and_(
            Customer.id == customer_id,
            Customer.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return customer

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a customer"""
    customer = db.query(Customer).filter(
        and_(
            Customer.id == customer_id,
            Customer.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update fields
    for field, value in customer_update.dict(exclude_unset=True).items():
        setattr(customer, field, value)
    
    customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)
    
    return customer

@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a customer (soft delete)"""
    customer = db.query(Customer).filter(
        and_(
            Customer.id == customer_id,
            Customer.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer.is_active = False
    customer.updated_at = datetime.utcnow()
    db.commit()

# ===================== LEAD ENDPOINTS =====================

@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new lead"""
    db_lead = Lead(
        tenant_id=current_user.tenant_id,
        company_name=lead.company_name,
        contact_name=lead.contact_name,
        email=lead.email,
        phone=lead.phone,
        source=lead.source,
        status=lead.status,
        estimated_value=lead.estimated_value,
        probability=lead.probability,
        notes=lead.notes,
        assigned_to_id=current_user.id,
        created_by_id=current_user.id
    )
    
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    
    return db_lead

@router.get("/leads", response_model=List[LeadResponse])
def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List leads with optional filters"""
    query = db.query(Lead).filter(Lead.tenant_id == current_user.tenant_id)
    
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source == source)
    
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    return leads

@router.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific lead"""
    lead = db.query(Lead).filter(
        and_(
            Lead.id == lead_id,
            Lead.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead

@router.put("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    lead_update: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a lead"""
    lead = db.query(Lead).filter(
        and_(
            Lead.id == lead_id,
            Lead.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    for field, value in lead_update.dict(exclude_unset=True).items():
        setattr(lead, field, value)
    
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    
    return lead

@router.post("/leads/{lead_id}/convert", response_model=CustomerResponse)
def convert_lead_to_customer(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert a lead to a customer"""
    lead = db.query(Lead).filter(
        and_(
            Lead.id == lead_id,
            Lead.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.status != "qualified":
        raise HTTPException(status_code=400, detail="Only qualified leads can be converted")
    
    # Create customer from lead
    customer_create = CustomerCreate(
        customer_name=lead.company_name,
        contact_person=lead.contact_name,
        email=lead.email,
        phone=lead.phone,
        notes=lead.notes
    )
    
    customer = create_customer(customer_create, db, current_user)
    
    # Update lead status
    lead.status = "converted"
    lead.converted_to_customer_id = customer.id
    lead.updated_at = datetime.utcnow()
    db.commit()
    
    return customer

# ===================== OPPORTUNITY ENDPOINTS =====================

@router.post("/opportunities", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    opportunity: OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new opportunity"""
    db_opportunity = Opportunity(
        tenant_id=current_user.tenant_id,
        customer_id=opportunity.customer_id,
        name=opportunity.name,
        description=opportunity.description,
        stage=opportunity.stage,
        probability=opportunity.probability,
        estimated_value=opportunity.estimated_value,
        expected_close_date=opportunity.expected_close_date,
        assigned_to_id=opportunity.assigned_to_id or current_user.id,
        created_by_id=current_user.id
    )
    
    db.add(db_opportunity)
    db.commit()
    db.refresh(db_opportunity)
    
    return db_opportunity

@router.get("/opportunities", response_model=List[OpportunityResponse])
def list_opportunities(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    stage: Optional[str] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List opportunities with optional filters"""
    query = db.query(Opportunity).filter(Opportunity.tenant_id == current_user.tenant_id)
    
    if stage:
        query = query.filter(Opportunity.stage == stage)
    if customer_id:
        query = query.filter(Opportunity.customer_id == customer_id)
    
    opportunities = query.order_by(Opportunity.expected_close_date).offset(skip).limit(limit).all()
    return opportunities

@router.get("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific opportunity"""
    opportunity = db.query(Opportunity).filter(
        and_(
            Opportunity.id == opportunity_id,
            Opportunity.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    return opportunity

@router.put("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
def update_opportunity(
    opportunity_id: int,
    opportunity_update: OpportunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an opportunity"""
    opportunity = db.query(Opportunity).filter(
        and_(
            Opportunity.id == opportunity_id,
            Opportunity.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    for field, value in opportunity_update.dict(exclude_unset=True).items():
        setattr(opportunity, field, value)
    
    opportunity.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(opportunity)
    
    return opportunity

# ===================== QUOTE ENDPOINTS =====================

@router.post("/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    quote: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new quote"""
    # Calculate totals
    subtotal = Decimal("0")
    vat_amount = Decimal("0")
    vat_rate = Decimal("0.15")  # SA VAT 15%
    
    for line in quote.lines:
        line_total = line.quantity * line.unit_price
        if line.discount_percentage > 0:
            line_total = line_total * (1 - line.discount_percentage / 100)
        subtotal += line_total
        vat_amount += line_total * vat_rate
    
    total_amount = subtotal + vat_amount
    
    # Generate quote number
    last_quote = db.query(Quote).filter(
        Quote.tenant_id == current_user.tenant_id
    ).order_by(Quote.id.desc()).first()
    
    next_number = 1 if not last_quote else int(last_quote.quote_number.split('-')[-1]) + 1
    quote_number = f"QUO-{datetime.now().year}-{next_number:05d}"
    
    # Create quote
    db_quote = Quote(
        tenant_id=current_user.tenant_id,
        customer_id=quote.customer_id,
        opportunity_id=quote.opportunity_id,
        quote_number=quote_number,
        quote_date=quote.quote_date,
        valid_until_date=quote.valid_until_date,
        subtotal=subtotal,
        vat_amount=vat_amount,
        total_amount=total_amount,
        status="draft",
        terms_and_conditions=quote.terms_and_conditions,
        notes=quote.notes,
        created_by_id=current_user.id
    )
    
    db.add(db_quote)
    db.flush()
    
    # Create quote lines
    for line in quote.lines:
        line_total = line.quantity * line.unit_price
        if line.discount_percentage > 0:
            discount_amount = line_total * (line.discount_percentage / 100)
            line_total -= discount_amount
        else:
            discount_amount = Decimal("0")
        
        line_vat = line_total * vat_rate
        
        db_line = QuoteLine(
            quote_id=db_quote.id,
            product_id=line.product_id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            discount_percentage=line.discount_percentage,
            discount_amount=discount_amount,
            vat_amount=line_vat,
            line_total=line_total + line_vat
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_quote)
    
    return db_quote

@router.get("/quotes", response_model=List[QuoteResponse])
def list_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List quotes with optional filters"""
    query = db.query(Quote).filter(Quote.tenant_id == current_user.tenant_id)
    
    if status:
        query = query.filter(Quote.status == status)
    if customer_id:
        query = query.filter(Quote.customer_id == customer_id)
    
    quotes = query.order_by(Quote.quote_date.desc()).offset(skip).limit(limit).all()
    return quotes

@router.post("/quotes/{quote_id}/approve", response_model=QuoteResponse)
def approve_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a quote"""
    quote = db.query(Quote).filter(
        and_(
            Quote.id == quote_id,
            Quote.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft quotes can be approved")
    
    quote.status = "approved"
    quote.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quote)
    
    return quote

# ===================== REPORTS =====================

@router.get("/reports/sales-pipeline")
def sales_pipeline_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate sales pipeline report"""
    opportunities = db.query(Opportunity).filter(
        and_(
            Opportunity.tenant_id == current_user.tenant_id,
            Opportunity.stage.notin_(["closed_won", "closed_lost"])
        )
    ).all()
    
    pipeline = {
        "total_value": Decimal("0"),
        "weighted_value": Decimal("0"),
        "count": 0,
        "by_stage": {}
    }
    
    for opp in opportunities:
        pipeline["total_value"] += opp.estimated_value
        pipeline["weighted_value"] += opp.estimated_value * (opp.probability / 100)
        pipeline["count"] += 1
        
        if opp.stage not in pipeline["by_stage"]:
            pipeline["by_stage"][opp.stage] = {"count": 0, "value": Decimal("0")}
        
        pipeline["by_stage"][opp.stage]["count"] += 1
        pipeline["by_stage"][opp.stage]["value"] += opp.estimated_value
    
    # Convert to JSON-serializable format
    return {
        "total_value": float(pipeline["total_value"]),
        "weighted_value": float(pipeline["weighted_value"]),
        "count": pipeline["count"],
        "by_stage": {
            stage: {"count": data["count"], "value": float(data["value"])}
            for stage, data in pipeline["by_stage"].items()
        }
    }
