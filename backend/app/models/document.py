from sqlalchemy import Column, Integer, String, Date, Text, Boolean, LargeBinary, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    document_number = Column(String(50), unique=True, nullable=False, index=True)
    document_name = Column(String(200), nullable=False)
    document_type = Column(String(50), index=True)
    category = Column(String(100))
    file_path = Column(String(500))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    status = Column(String(20), default="ACTIVE", index=True)
    retention_date = Column(Date)
    created_at = Column(Date, default=datetime.utcnow)
    created_by = Column(Integer)
    versions = relationship("DocumentVersion", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500))
    created_at = Column(Date, default=datetime.utcnow)
    created_by = Column(Integer)
    document = relationship("Document", back_populates="versions")
