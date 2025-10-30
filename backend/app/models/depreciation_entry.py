from sqlalchemy import Column, Integer, String, Date, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class DepreciationEntry(Base):
    __tablename__ = "depreciation_entries"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey('fixed_assets.id'), nullable=False, index=True)
    
    # Period
    period_start_date = Column(Date, nullable=False, index=True)
    period_end_date = Column(Date, nullable=False, index=True)
    depreciation_date = Column(Date, nullable=False)
    
    # Amounts
    opening_book_value = Column(Numeric(15, 2), nullable=False)
    depreciation_amount = Column(Numeric(15, 2), nullable=False)
    accumulated_depreciation = Column(Numeric(15, 2), nullable=False)
    closing_book_value = Column(Numeric(15, 2), nullable=False)
    
    # Units (for units of production method)
    units_produced = Column(Integer)
    
    # GL posting
    gl_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(Date, default=datetime.utcnow)
    created_by = Column(Integer)
    
    # Relationships
    asset = relationship("FixedAsset", back_populates="depreciation_entries")
    gl_entry = relationship("JournalEntry")
