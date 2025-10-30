"""
GL Balance Model
Stores account balances by period
"""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base


class GLBalance(Base):
    """
    General Ledger Balance
    One record per account per period
    """
    __tablename__ = "gl_balances"
    
    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(20), ForeignKey('accounts.account_number'), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    period_number = Column(Integer, nullable=False, index=True)  # 1-12 for months
    
    opening_balance = Column(Numeric(15, 2), nullable=False, default=0)
    debit_amount = Column(Numeric(15, 2), nullable=False, default=0)
    credit_amount = Column(Numeric(15, 2), nullable=False, default=0)
    closing_balance = Column(Numeric(15, 2), nullable=False, default=0)
    
    last_updated = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    account = relationship("Account")
    
    # Unique constraint: one balance record per account per period
    __table_args__ = (
        UniqueConstraint('account_number', 'fiscal_year', 'period_number', name='uq_account_period'),
    )
    
    def __repr__(self):
        return f"<GLBalance {self.account_number} {self.fiscal_year}-{self.period_number:02d}: {self.closing_balance}>"
