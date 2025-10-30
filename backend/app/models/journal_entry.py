"""
Journal Entry Models
"""
from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from ..database import Base


class JournalEntryStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    REVERSED = "REVERSED"
    CANCELLED = "CANCELLED"


class JournalEntry(Base):
    """Journal Entry Header"""
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, index=True, nullable=False)
    entry_date = Column(Date, nullable=False, index=True)
    posting_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, default="MANUAL")  # MANUAL, AP, AR, PAYROLL, etc.
    status = Column(Enum(JournalEntryStatus), default=JournalEntryStatus.DRAFT, nullable=False)
    
    total_debit = Column(Numeric(15, 2), nullable=False, default=0)
    total_credit = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Reversal tracking
    reversed_by = Column(Integer, ForeignKey('journal_entries.id'), nullable=True)
    reversal_date = Column(Date, nullable=True)
    reversal_reason = Column(Text, nullable=True)
    
    # Audit fields
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    posted_by = Column(String(100))
    posted_at = Column(DateTime, nullable=True)
    
    # Relationships
    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JournalEntry {self.reference}: {self.description}>"


class JournalLine(Base):
    """Journal Entry Line"""
    __tablename__ = "journal_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'), nullable=False, index=True)
    line_number = Column(Integer, nullable=False)
    
    account_number = Column(String(20), ForeignKey('accounts.account_number'), nullable=False, index=True)
    debit_amount = Column(Numeric(15, 2), nullable=False, default=0)
    credit_amount = Column(Numeric(15, 2), nullable=False, default=0)
    description = Column(Text)
    
    # Dimensions (optional)
    cost_center = Column(String(20), nullable=True)
    project_code = Column(String(20), nullable=True)
    department = Column(String(20), nullable=True)
    
    # Relationships
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account")
    
    def __repr__(self):
        return f"<JournalLine {self.line_number}: {self.account_number} Dr:{self.debit_amount} Cr:{self.credit_amount}>"
