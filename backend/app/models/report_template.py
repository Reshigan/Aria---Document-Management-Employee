from sqlalchemy import Column, Integer, String, Date, Text, Boolean, JSON
from datetime import datetime
from .base import Base


class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_code = Column(String(50), unique=True, nullable=False, index=True)
    template_name = Column(String(200), nullable=False)
    description = Column(Text)
    report_type = Column(String(50), nullable=False, index=True)  # FINANCIAL_STATEMENT, CUSTOM, etc
    sql_query = Column(Text)
    parameters = Column(JSON)  # Report parameters
    is_active = Column(Boolean, default=True)
    created_at = Column(Date, default=datetime.utcnow)
    created_by = Column(Integer)
