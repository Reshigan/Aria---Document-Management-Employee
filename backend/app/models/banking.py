"""
Banking Models
Includes: Bank Accounts, Bank Transactions, Bank Reconciliation, Bank Rules
"""
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class BankAccountType(str, enum.Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    MONEY_MARKET = "MONEY_MARKET"
    LINE_OF_CREDIT = "LINE_OF_CREDIT"


class TransactionType(str, enum.Enum):
    SPEND = "SPEND"
    RECEIVE = "RECEIVE"
    TRANSFER = "TRANSFER"


class ReconciliationStatus(str, enum.Enum):
    UNRECONCILED = "UNRECONCILED"
    RECONCILED = "RECONCILED"
    SUGGESTED = "SUGGESTED"


class RuleConditionType(str, enum.Enum):
    CONTAINS = "CONTAINS"
    STARTS_WITH = "STARTS_WITH"
    ENDS_WITH = "ENDS_WITH"
    EQUALS = "EQUALS"
    AMOUNT_EQUALS = "AMOUNT_EQUALS"
    AMOUNT_GREATER_THAN = "AMOUNT_GREATER_THAN"
    AMOUNT_LESS_THAN = "AMOUNT_LESS_THAN"


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    account_name = Column(String(200), nullable=False)
    account_number = Column(String(50), nullable=False)
    account_type = Column(SQLEnum(BankAccountType), nullable=False)
    bank_name = Column(String(200))
    branch_code = Column(String(20))
    swift_code = Column(String(20))
    iban = Column(String(50))
    
    gl_account_code = Column(String(20), nullable=False)
    
    opening_balance = Column(Numeric(15, 2), default=0)
    current_balance = Column(Numeric(15, 2), default=0)
    reconciled_balance = Column(Numeric(15, 2), default=0)
    
    currency_code = Column(String(3), default="ZAR")
    is_active = Column(Boolean, default=True)
    enable_bank_feeds = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
    
    # Relationships
    transactions = relationship("BankTransaction", back_populates="bank_account")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False, index=True)
    
    transaction_date = Column(Date, nullable=False, index=True)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    reference = Column(String(100))
    description = Column(Text, nullable=False)
    payee = Column(String(200))
    
    debit_amount = Column(Numeric(15, 2), default=0)
    credit_amount = Column(Numeric(15, 2), default=0)
    balance = Column(Numeric(15, 2))
    
    reconciliation_status = Column(SQLEnum(ReconciliationStatus), default=ReconciliationStatus.UNRECONCILED, index=True)
    reconciled_date = Column(Date)
    reconciled_by_id = Column(Integer)
    
    gl_account_code = Column(String(20))
    gl_entry_id = Column(Integer)
    is_posted = Column(Boolean, default=False)
    
    matched_invoice_id = Column(Integer)
    matched_bill_id = Column(Integer)
    matched_payment_id = Column(Integer)
    
    import_batch_id = Column(String(50))
    bank_statement_line_id = Column(String(100))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
    
    # Relationships
    bank_account = relationship("BankAccount", back_populates="transactions")


class BankReconciliation(Base):
    __tablename__ = "bank_reconciliations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False, index=True)
    
    reconciliation_date = Column(Date, nullable=False)
    statement_date = Column(Date, nullable=False)
    
    opening_balance = Column(Numeric(15, 2), nullable=False)
    closing_balance = Column(Numeric(15, 2), nullable=False)
    statement_balance = Column(Numeric(15, 2), nullable=False)
    
    total_deposits = Column(Numeric(15, 2), default=0)
    total_withdrawals = Column(Numeric(15, 2), default=0)
    unreconciled_items_count = Column(Integer, default=0)
    
    # Status
    is_complete = Column(Boolean, default=False)
    completed_date = Column(DateTime)
    completed_by_id = Column(Integer)
    
    notes = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)


class BankRule(Base):
    __tablename__ = "bank_rules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    
    rule_name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    
    condition_type = Column(SQLEnum(RuleConditionType), nullable=False)
    condition_field = Column(String(50), nullable=False)
    condition_value = Column(String(200), nullable=False)
    
    gl_account_code = Column(String(20), nullable=False)
    tax_code = Column(String(20))
    tracking_category_1 = Column(String(50))
    tracking_category_2 = Column(String(50))
    
    auto_post = Column(Boolean, default=False)
    
    # Statistics
    times_applied = Column(Integer, default=0)
    last_applied_date = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer)
