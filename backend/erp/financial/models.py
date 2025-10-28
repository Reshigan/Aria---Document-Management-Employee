"""
Financial (GAAP) ERP Module - Database Models
Full chart of accounts, general ledger, financial statements
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class ChartOfAccounts(Base):
    """Chart of Accounts - IFRS/GAAP compliant"""
    __tablename__ = "chart_of_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    account_code = Column(String(20), unique=True, nullable=False, index=True)
    account_name = Column(String(200), nullable=False)
    account_type = Column(String(20), nullable=False)  # asset, liability, equity, revenue, expense
    account_category = Column(String(50), nullable=False)
    parent_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=True)
    
    is_control_account = Column(Boolean, default=False)
    is_bank_account = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    vat_applicable = Column(Boolean, default=False)
    vat_rate = Column(Float, default=0.0)
    
    currency = Column(String(3), default="ZAR")
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class FiscalPeriod(Base):
    """Fiscal periods"""
    __tablename__ = "fiscal_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    period_number = Column(Integer, nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_closed = Column(Boolean, default=False)
    closed_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class JournalEntry(Base):
    """Journal entries"""
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    journal_number = Column(String(50), unique=True, nullable=False, index=True)
    journal_type = Column(String(20), nullable=False)
    transaction_date = Column(DateTime, nullable=False)
    posting_date = Column(DateTime, nullable=False)
    reference = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    fiscal_period_id = Column(Integer, ForeignKey("fiscal_periods.id"))
    status = Column(String(20), default="draft")
    total_debit = Column(Float, default=0.0)
    total_credit = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class JournalEntryLine(Base):
    """Journal entry lines"""
    __tablename__ = "journal_entry_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"))
    line_number = Column(Integer, nullable=False)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"))
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    cost_center = Column(String(50), nullable=True)
    project = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
