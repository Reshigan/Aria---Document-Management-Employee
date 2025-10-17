"""
Settings and configuration models.

This module defines models for system settings, SAP configuration,
and other configurable aspects of the Aria system.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from aria.core.database import Base


class SystemSettings(Base):
    """
    System-wide settings and configuration.
    
    Stores global system settings that can be modified through the admin interface.
    """
    
    __tablename__ = "system_settings"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # General Settings
    system_name: Mapped[str] = mapped_column(String(100), default="Aria Document Management", nullable=False)
    system_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    system_version: Mapped[str] = mapped_column(String(20), default="2.0.0", nullable=False)
    
    # File Upload Settings
    max_file_size: Mapped[int] = mapped_column(Integer, default=10485760, nullable=False)  # 10MB
    allowed_file_types: Mapped[str] = mapped_column(Text, nullable=False, default="pdf,jpg,jpeg,png,gif,doc,docx,xls,xlsx")
    upload_path: Mapped[str] = mapped_column(String(255), default="./uploads", nullable=False)
    
    # Processing Settings
    auto_process_documents: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ocr_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ai_extraction_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Security Settings
    session_timeout: Mapped[int] = mapped_column(Integer, default=1800, nullable=False)  # 30 minutes
    max_login_attempts: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    password_min_length: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    require_2fa: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Email Settings
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    smtp_username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_from: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Notification Settings
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    slack_notifications: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    slack_webhook_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Backup Settings
    auto_backup: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    backup_frequency: Mapped[str] = mapped_column(String(20), default="daily", nullable=False)
    backup_retention_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    
    # Maintenance Settings
    maintenance_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    maintenance_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    def __repr__(self) -> str:
        return f"<SystemSettings(name={self.system_name})>"


class SAPConfiguration(Base):
    """
    SAP system configuration and connection settings.
    
    Stores SAP connection details and integration settings.
    """
    
    __tablename__ = "sap_configurations"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Connection Settings
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, default=3300, nullable=False)
    client: Mapped[str] = mapped_column(String(3), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)  # Should be encrypted
    
    # System Information
    system_id: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    system_number: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    language: Mapped[str] = mapped_column(String(2), default="EN", nullable=False)
    
    # Integration Settings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_post_documents: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_company_code: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    default_document_type: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    
    # Connection Pool Settings
    pool_size: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    max_connections: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    connection_timeout: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    
    # Retry Settings
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    retry_delay: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    
    # Monitoring
    last_connection_test: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    connection_status: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)
    
    def __repr__(self) -> str:
        return f"<SAPConfiguration(name={self.name}, host={self.host})>"


class DocumentMapping(Base):
    """
    Document field mapping configuration.
    
    Defines how extracted document fields map to SAP fields or other systems.
    """
    
    __tablename__ = "document_mappings"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Mapping Information
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # Source and Target Fields
    source_field: Mapped[str] = mapped_column(String(100), nullable=False)
    target_field: Mapped[str] = mapped_column(String(100), nullable=False)
    target_system: Mapped[str] = mapped_column(String(50), default="SAP", nullable=False)
    
    # Transformation Rules
    transformation_rule: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON or script
    validation_rule: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Settings
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    def __repr__(self) -> str:
        return f"<DocumentMapping(name={self.name}, type={self.document_type})>"


class Threshold(Base):
    """
    Threshold configuration for various system metrics and alerts.
    
    Defines thresholds for monitoring, alerts, and automated actions.
    """
    
    __tablename__ = "thresholds"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Threshold Information
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    metric: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Threshold Values
    warning_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    critical_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Comparison Settings
    comparison_operator: Mapped[str] = mapped_column(String(10), default=">=", nullable=False)  # >=, <=, ==, !=
    evaluation_period: Mapped[int] = mapped_column(Integer, default=300, nullable=False)  # seconds
    
    # Actions
    warning_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON action definition
    critical_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON action definition
    
    # Settings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    send_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Monitoring
    last_triggered: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    trigger_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    def __repr__(self) -> str:
        return f"<Threshold(name={self.name}, category={self.category})>"