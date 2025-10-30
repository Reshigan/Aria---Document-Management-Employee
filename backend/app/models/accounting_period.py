"""
Accounting Period Model
"""
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, UniqueConstraint, Boolean
from datetime import datetime
import enum

from ..database import Base


class PeriodStatus(str, enum.Enum):
    FUTURE = "FUTURE"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    LOCKED = "LOCKED"


class AccountingPeriod(Base):
    """
    Accounting Period
    Defines fiscal periods for posting control
    """
    __tablename__ = "accounting_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    period_number = Column(Integer, nullable=False, index=True)  # 1-12 or 1-13 (for adjustments)
    name = Column(String(50), nullable=False)  # e.g., "2025-01", "Q1 2025"
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(PeriodStatus), default=PeriodStatus.FUTURE, nullable=False)
    
    # Close tracking
    is_year_end = Column(Boolean, default=False)
    closed_by = Column(String(100), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('fiscal_year', 'period_number', name='uq_period'),
    )
    
    def __repr__(self):
        return f"<AccountingPeriod {self.name} ({self.status})>"
