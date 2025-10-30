from sqlalchemy import Column, Integer, String, Date, Numeric, Boolean
from datetime import datetime
from .base import Base


class Currency(Base):
    __tablename__ = "currencies"

    id = Column(Integer, primary_key=True, index=True)
    currency_code = Column(String(3), unique=True, nullable=False, index=True)
    currency_name = Column(String(100), nullable=False)
    symbol = Column(String(10))
    is_base_currency = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(Date, default=datetime.utcnow)


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(String(3), nullable=False, index=True)
    to_currency = Column(String(3), nullable=False, index=True)
    rate_date = Column(Date, nullable=False, index=True)
    exchange_rate = Column(Numeric(12, 6), nullable=False)
    created_at = Column(Date, default=datetime.utcnow)
