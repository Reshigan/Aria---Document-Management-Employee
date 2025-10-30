from sqlalchemy import Column, Integer, String, Date, Numeric, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class CostCenter(Base):
    __tablename__ = "cost_centers"

    id = Column(Integer, primary_key=True, index=True)
    cost_center_code = Column(String(20), unique=True, nullable=False, index=True)
    cost_center_name = Column(String(200), nullable=False)
    description = Column(Text)
    parent_cost_center_id = Column(Integer, ForeignKey('cost_centers.id'))
    manager_id = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(Date, default=datetime.utcnow)
    
    allocations = relationship("CostAllocation", back_populates="cost_center")


class CostAllocation(Base):
    __tablename__ = "cost_allocations"

    id = Column(Integer, primary_key=True, index=True)
    cost_center_id = Column(Integer, ForeignKey('cost_centers.id'), nullable=False, index=True)
    allocation_date = Column(Date, nullable=False, index=True)
    account_number = Column(String(20), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text)
    gl_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    created_at = Column(Date, default=datetime.utcnow)
    
    cost_center = relationship("CostCenter", back_populates="allocations")
    gl_entry = relationship("JournalEntry")
