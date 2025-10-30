from sqlalchemy import Column, Integer, String, Date, Numeric, Text, Enum as SQLEnum, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class BudgetStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    REVISED = "REVISED"


class BudgetPeriodType(str, enum.Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUAL = "ANNUAL"


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    budget_code = Column(String(50), unique=True, nullable=False, index=True)
    budget_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Period
    fiscal_year = Column(Integer, nullable=False, index=True)
    period_type = Column(SQLEnum(BudgetPeriodType), default=BudgetPeriodType.ANNUAL)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Organization
    department = Column(String(100))
    cost_center = Column(String(20))
    business_unit = Column(String(50))
    
    # Amounts
    total_budget_amount = Column(Numeric(15, 2), default=0)
    total_actual_amount = Column(Numeric(15, 2), default=0)
    total_committed_amount = Column(Numeric(15, 2), default=0)
    total_available_amount = Column(Numeric(15, 2), default=0)
    
    # Status
    status = Column(SQLEnum(BudgetStatus), default=BudgetStatus.DRAFT, index=True)
    version = Column(Integer, default=1)
    parent_budget_id = Column(Integer, ForeignKey('budgets.id'))  # For revisions
    
    # Approval
    submitted_at = Column(Date)
    submitted_by = Column(Integer)
    approved_at = Column(Date)
    approved_by = Column(Integer)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    updated_by = Column(Integer)
    
    # Relationships
    lines = relationship("BudgetLine", back_populates="budget", cascade="all, delete-orphan")
    revisions = relationship("Budget")  # Child revisions


class BudgetLine(Base):
    __tablename__ = "budget_lines"

    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey('budgets.id'), nullable=False, index=True)
    
    # Account
    account_number = Column(String(20), nullable=False, index=True)
    line_description = Column(String(500))
    
    # Amounts
    budget_amount = Column(Numeric(15, 2), nullable=False, default=0)
    actual_amount = Column(Numeric(15, 2), default=0)
    committed_amount = Column(Numeric(15, 2), default=0)
    available_amount = Column(Numeric(15, 2), default=0)
    variance_amount = Column(Numeric(15, 2), default=0)
    variance_percent = Column(Numeric(5, 2), default=0)
    
    # Period breakdown (for monthly/quarterly budgets)
    period_1_amount = Column(Numeric(15, 2), default=0)
    period_2_amount = Column(Numeric(15, 2), default=0)
    period_3_amount = Column(Numeric(15, 2), default=0)
    period_4_amount = Column(Numeric(15, 2), default=0)
    period_5_amount = Column(Numeric(15, 2), default=0)
    period_6_amount = Column(Numeric(15, 2), default=0)
    period_7_amount = Column(Numeric(15, 2), default=0)
    period_8_amount = Column(Numeric(15, 2), default=0)
    period_9_amount = Column(Numeric(15, 2), default=0)
    period_10_amount = Column(Numeric(15, 2), default=0)
    period_11_amount = Column(Numeric(15, 2), default=0)
    period_12_amount = Column(Numeric(15, 2), default=0)
    
    # Organization
    cost_center = Column(String(20))
    project_code = Column(String(20))
    department = Column(String(100))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    
    # Relationships
    budget = relationship("Budget", back_populates="lines")
