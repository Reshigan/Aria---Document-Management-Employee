from sqlalchemy import Column, Integer, String, Date, Numeric, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class StatementStatus(str, enum.Enum):
    IMPORTED = "IMPORTED"
    IN_PROGRESS = "IN_PROGRESS"
    RECONCILED = "RECONCILED"


class BankStatement(Base):
    __tablename__ = "bank_statements"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey('bank_accounts.id'), nullable=False, index=True)
    
    # Statement details
    statement_number = Column(String(50), unique=True, nullable=False, index=True)
    statement_date = Column(Date, nullable=False, index=True)
    period_start_date = Column(Date, nullable=False)
    period_end_date = Column(Date, nullable=False)
    
    # Balances
    opening_balance = Column(Numeric(15, 2), nullable=False)
    closing_balance = Column(Numeric(15, 2), nullable=False)
    
    # Reconciliation
    status = Column(SQLEnum(StatementStatus), default=StatementStatus.IMPORTED, index=True)
    reconciled_at = Column(Date)
    reconciled_by = Column(Integer)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    created_by = Column(Integer)
    
    # Relationships
    bank_account = relationship("BankAccount", back_populates="statements")
    transactions = relationship("BankTransaction", back_populates="statement")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey('bank_accounts.id'), nullable=False, index=True)
    statement_id = Column(Integer, ForeignKey('bank_statements.id'), index=True)
    
    # Transaction details
    transaction_date = Column(Date, nullable=False, index=True)
    value_date = Column(Date)
    reference_number = Column(String(100))
    description = Column(Text, nullable=False)
    
    # Amounts
    debit_amount = Column(Numeric(15, 2), default=0)
    credit_amount = Column(Numeric(15, 2), default=0)
    balance = Column(Numeric(15, 2))
    
    # Reconciliation
    is_reconciled = Column(Boolean, default=False, index=True)
    gl_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    reconciled_at = Column(Date)
    reconciled_by = Column(Integer)
    
    # Categorization
    transaction_type = Column(String(50))
    category = Column(String(100))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    
    # Relationships
    bank_account = relationship("BankAccount", back_populates="transactions")
    statement = relationship("BankStatement", back_populates="transactions")
    gl_entry = relationship("JournalEntry")
