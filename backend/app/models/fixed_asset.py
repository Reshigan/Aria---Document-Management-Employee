from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class AssetStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISPOSED = "DISPOSED"
    FULLY_DEPRECIATED = "FULLY_DEPRECIATED"
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION"
    RETIRED = "RETIRED"


class DepreciationMethod(str, enum.Enum):
    STRAIGHT_LINE = "STRAIGHT_LINE"
    DECLINING_BALANCE = "DECLINING_BALANCE"
    UNITS_OF_PRODUCTION = "UNITS_OF_PRODUCTION"
    SUM_OF_YEARS = "SUM_OF_YEARS"


class FixedAsset(Base):
    __tablename__ = "fixed_assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), unique=True, nullable=False, index=True)
    asset_name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    
    # Classification
    asset_category = Column(String(50), nullable=False, index=True)
    asset_type = Column(String(50))
    serial_number = Column(String(100))
    barcode = Column(String(100))
    
    # Location and ownership
    location = Column(String(200))
    department = Column(String(100))
    cost_center = Column(String(20))
    custodian = Column(String(100))  # Person responsible
    
    # Financial details
    acquisition_date = Column(Date, nullable=False, index=True)
    purchase_cost = Column(Numeric(15, 2), nullable=False)
    accumulated_depreciation = Column(Numeric(15, 2), default=0)
    net_book_value = Column(Numeric(15, 2))
    salvage_value = Column(Numeric(15, 2), default=0)
    
    # Depreciation
    depreciation_method = Column(SQLEnum(DepreciationMethod), default=DepreciationMethod.STRAIGHT_LINE)
    useful_life_years = Column(Integer)
    useful_life_units = Column(Integer)  # For units of production
    depreciation_start_date = Column(Date)
    last_depreciation_date = Column(Date)
    
    # GL accounts
    asset_account_number = Column(String(20), nullable=False)
    depreciation_expense_account = Column(String(20), nullable=False)
    accumulated_depreciation_account = Column(String(20), nullable=False)
    
    # Disposal details
    disposal_date = Column(Date)
    disposal_proceeds = Column(Numeric(15, 2))
    disposal_gain_loss = Column(Numeric(15, 2))
    disposal_gl_entry_id = Column(Integer)
    
    # Status
    status = Column(SQLEnum(AssetStatus), default=AssetStatus.ACTIVE, index=True)
    
    # Metadata
    vendor_id = Column(Integer)
    invoice_number = Column(String(50))
    warranty_expiry_date = Column(Date)
    insurance_policy = Column(String(100))
    notes = Column(Text)
    
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer)
    updated_by = Column(Integer)
    
    # Relationships
    depreciation_entries = relationship("DepreciationEntry", back_populates="asset")
