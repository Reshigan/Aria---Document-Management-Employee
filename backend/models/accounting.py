"""
Accounting Models - Core Financial System
South African ERP with IFRS compliance
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from .base import Base


class AccountType(str, Enum):
    """Chart of Accounts Types"""
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class AccountSubType(str, Enum):
    """Detailed Account Sub-types"""
    # Assets
    CURRENT_ASSET = "current_asset"
    FIXED_ASSET = "fixed_asset"
    INVENTORY = "inventory"
    ACCOUNTS_RECEIVABLE = "accounts_receivable"
    BANK = "bank"
    CASH = "cash"
    PREPAYMENTS = "prepayments"
    
    # Liabilities
    CURRENT_LIABILITY = "current_liability"
    LONG_TERM_LIABILITY = "long_term_liability"
    ACCOUNTS_PAYABLE = "accounts_payable"
    VAT_PAYABLE = "vat_payable"
    PAYE_PAYABLE = "paye_payable"
    UIF_PAYABLE = "uif_payable"
    SDL_PAYABLE = "sdl_payable"
    
    # Equity
    CAPITAL = "capital"
    RETAINED_EARNINGS = "retained_earnings"
    DRAWINGS = "drawings"
    
    # Revenue
    SALES = "sales"
    SERVICE_REVENUE = "service_revenue"
    OTHER_INCOME = "other_income"
    
    # Expenses
    COST_OF_SALES = "cost_of_sales"
    OPERATING_EXPENSE = "operating_expense"
    SALARY_EXPENSE = "salary_expense"
    DEPRECIATION = "depreciation"
    INTEREST_EXPENSE = "interest_expense"


class JournalEntryType(str, Enum):
    """Types of Journal Entries"""
    MANUAL = "manual"
    SYSTEM = "system"
    INVOICE = "invoice"
    PAYMENT = "payment"
    RECEIPT = "receipt"
    PAYROLL = "payroll"
    DEPRECIATION = "depreciation"
    ADJUSTMENT = "adjustment"
    OPENING_BALANCE = "opening_balance"
    CLOSING = "closing"


class JournalStatus(str, Enum):
    """Journal Entry Status"""
    DRAFT = "draft"
    POSTED = "posted"
    REVERSED = "reversed"
    VOID = "void"


class ChartOfAccounts(Base):
    """
    Chart of Accounts - SA Compliant
    Follows IFRS structure with SA tax accounts (VAT, PAYE, UIF, SDL)
    """
    __tablename__ = "chart_of_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Account identification
    account_code = Column(String(20), nullable=False, index=True)  # e.g., "1000", "4100"
    account_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Account classification
    account_type = Column(SQLEnum(AccountType), nullable=False, index=True)
    account_subtype = Column(SQLEnum(AccountSubType), nullable=False)
    
    # Hierarchy
    parent_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=True)
    level = Column(Integer, default=1)  # 1 = main, 2 = sub, 3 = detail
    
    # Financial properties
    is_control_account = Column(Boolean, default=False)  # AR, AP, Bank control
    is_system_account = Column(Boolean, default=False)  # Cannot be deleted
    accepts_posting = Column(Boolean, default=True)  # Header accounts don't accept postings
    
    # Tax handling
    is_tax_account = Column(Boolean, default=False)  # VAT, PAYE, UIF, SDL
    vat_rate = Column(Float, default=0.0)  # 15% standard, 0% zero-rated
    
    # Balances (cached for performance)
    debit_balance = Column(Float, default=0.0)
    credit_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    
    # SA specific
    sars_reporting_code = Column(String(20), nullable=True)  # For VAT/PAYE returns
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    children = relationship("ChartOfAccounts", backref="parent", remote_side=[id])
    journal_lines = relationship("GeneralLedgerLine", back_populates="account")
    
    def __repr__(self):
        return f"<Account {self.account_code} - {self.account_name}>"


class GeneralLedger(Base):
    """
    General Ledger - Journal Entry Header
    """
    __tablename__ = "general_ledger"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Entry identification
    journal_number = Column(String(50), nullable=False, unique=True, index=True)  # JE-2025-0001
    entry_type = Column(SQLEnum(JournalEntryType), nullable=False, index=True)
    reference = Column(String(100))  # Invoice number, payment ref, etc.
    
    # Dates
    entry_date = Column(DateTime, nullable=False, index=True)
    posting_date = Column(DateTime)  # When posted to GL
    period = Column(String(7), nullable=False, index=True)  # "2025-10" for Oct 2025
    financial_year = Column(Integer, nullable=False, index=True)  # 2025
    
    # Details
    description = Column(Text, nullable=False)
    notes = Column(Text)
    
    # Status
    status = Column(SQLEnum(JournalStatus), default=JournalStatus.DRAFT, index=True)
    
    # Totals (must balance)
    total_debit = Column(Float, default=0.0)
    total_credit = Column(Float, default=0.0)
    
    # Reversal tracking
    reversed_by_id = Column(Integer, ForeignKey("general_ledger.id"), nullable=True)
    reverses_id = Column(Integer, ForeignKey("general_ledger.id"), nullable=True)
    
    # Source tracking
    source_document_type = Column(String(50))  # "invoice", "payment", "bill"
    source_document_id = Column(Integer)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    posted_by = Column(String(100))
    
    # Approval
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    
    # Relationships
    lines = relationship("GeneralLedgerLine", back_populates="journal", cascade="all, delete-orphan")
    reversed_by = relationship("GeneralLedger", foreign_keys=[reversed_by_id], remote_side=[id])
    reverses = relationship("GeneralLedger", foreign_keys=[reverses_id], remote_side=[id])
    
    def __repr__(self):
        return f"<JournalEntry {self.journal_number} - {self.description}>"
    
    def is_balanced(self):
        """Check if debits = credits"""
        return abs(self.total_debit - self.total_credit) < 0.01  # Allow 1 cent rounding


class GeneralLedgerLine(Base):
    """
    General Ledger Line - Individual account posting
    """
    __tablename__ = "general_ledger_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Journal reference
    journal_id = Column(Integer, ForeignKey("general_ledger.id"), nullable=False)
    line_number = Column(Integer, default=1)
    
    # Account
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False)
    
    # Amounts
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    # Description
    description = Column(String(500))
    
    # Dimensions (for reporting)
    department = Column(String(100), nullable=True)
    project = Column(String(100), nullable=True)
    cost_center = Column(String(100), nullable=True)
    
    # Tax tracking
    is_vat_line = Column(Boolean, default=False)
    vat_rate = Column(Float, default=0.0)
    vat_amount = Column(Float, default=0.0)
    
    # Reconciliation
    is_reconciled = Column(Boolean, default=False)
    reconciled_date = Column(DateTime)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    journal = relationship("GeneralLedger", back_populates="lines")
    account = relationship("ChartOfAccounts", back_populates="journal_lines")
    
    def __repr__(self):
        return f"<GLLine {self.line_number} - Account {self.account_id} - Dr:{self.debit} Cr:{self.credit}>"


class TaxRate(Base):
    """
    SA Tax Rates (VAT, PAYE, UIF, SDL)
    """
    __tablename__ = "tax_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Tax identification
    tax_type = Column(String(50), nullable=False)  # VAT, PAYE, UIF, SDL
    tax_name = Column(String(100), nullable=False)
    tax_code = Column(String(20), nullable=False)
    
    # Rate
    rate_percentage = Column(Float, nullable=False)
    
    # Effective dates
    effective_from = Column(DateTime, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    
    # SA specific
    sars_code = Column(String(20))
    
    # Accounts
    tax_payable_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    tax_expense_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<TaxRate {self.tax_code} - {self.rate_percentage}%>"


class FiscalPeriod(Base):
    """
    Financial Period Management
    """
    __tablename__ = "fiscal_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Period identification
    period_code = Column(String(7), nullable=False, index=True)  # "2025-10"
    period_name = Column(String(50))  # "October 2025"
    
    # Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Financial year
    financial_year = Column(Integer, nullable=False, index=True)
    period_number = Column(Integer, nullable=False)  # 1-12
    
    # Status
    is_closed = Column(Boolean, default=False)
    closed_at = Column(DateTime)
    closed_by = Column(String(100))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FiscalPeriod {self.period_code} - {'CLOSED' if self.is_closed else 'OPEN'}>"
