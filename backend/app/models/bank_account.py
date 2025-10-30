from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class BankAccountType(str, enum.Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    LINE_OF_CREDIT = "LINE_OF_CREDIT"


class BankAccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    CLOSED = "CLOSED"


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_code = Column(String(20), unique=True, nullable=False, index=True)
    account_name = Column(String(200), nullable=False)
    
    # Bank details
    bank_name = Column(String(200), nullable=False)
    branch_name = Column(String(200))
    account_number = Column(String(50), nullable=False)
    routing_number = Column(String(50))
    swift_code = Column(String(20))
    iban = Column(String(50))
    
    # Account type
    account_type = Column(SQLEnum(BankAccountType), default=BankAccountType.CHECKING)
    currency_code = Column(String(3), default="ZAR")
    
    # GL mapping
    gl_account_number = Column(String(20), nullable=False)
    
    # Balances
    current_balance = Column(Numeric(15, 2), default=0)
    reconciled_balance = Column(Numeric(15, 2), default=0)
    last_reconciled_date = Column(Date)
    
    # Status
    status = Column(SQLEnum(BankAccountStatus), default=BankAccountStatus.ACTIVE)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    
    # Relationships
    statements = relationship("BankStatement", back_populates="bank_account")
    transactions = relationship("BankTransaction", back_populates="bank_account")
