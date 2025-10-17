"""
Settings-related Pydantic schemas for request/response validation.

This module defines schemas for system settings, SAP configuration,
and other configurable aspects of the system.
"""

from typing import List, Optional

from pydantic import Field, validator

from aria.schemas.base import BaseSchema, IDMixin, TimestampMixin


class SystemSettingsBase(BaseSchema):
    """Base system settings schema."""
    
    system_name: str = Field(..., min_length=1, max_length=100, description="System name")
    system_description: Optional[str] = Field(None, max_length=1000, description="System description")
    system_version: str = Field(..., max_length=20, description="System version")


class SystemSettingsUpdate(BaseSchema):
    """Schema for updating system settings."""
    
    # General Settings
    system_name: Optional[str] = Field(None, min_length=1, max_length=100, description="System name")
    system_description: Optional[str] = Field(None, max_length=1000, description="System description")
    
    # File Upload Settings
    max_file_size: Optional[int] = Field(None, ge=1024, le=1073741824, description="Max file size in bytes")  # 1KB to 1GB
    allowed_file_types: Optional[str] = Field(None, description="Comma-separated list of allowed file types")
    upload_path: Optional[str] = Field(None, max_length=255, description="Upload directory path")
    
    # Processing Settings
    auto_process_documents: Optional[bool] = Field(None, description="Auto-process uploaded documents")
    ocr_enabled: Optional[bool] = Field(None, description="Enable OCR processing")
    ai_extraction_enabled: Optional[bool] = Field(None, description="Enable AI data extraction")
    
    # Security Settings
    session_timeout: Optional[int] = Field(None, ge=300, le=86400, description="Session timeout in seconds")  # 5 min to 24 hours
    max_login_attempts: Optional[int] = Field(None, ge=3, le=10, description="Max login attempts")
    password_min_length: Optional[int] = Field(None, ge=6, le=128, description="Minimum password length")
    require_2fa: Optional[bool] = Field(None, description="Require two-factor authentication")
    
    # Email Settings
    smtp_host: Optional[str] = Field(None, max_length=255, description="SMTP host")
    smtp_port: Optional[int] = Field(None, ge=1, le=65535, description="SMTP port")
    smtp_username: Optional[str] = Field(None, max_length=255, description="SMTP username")
    smtp_password: Optional[str] = Field(None, max_length=255, description="SMTP password")
    smtp_use_tls: Optional[bool] = Field(None, description="Use TLS for SMTP")
    email_from: Optional[str] = Field(None, max_length=255, description="From email address")
    
    # Notification Settings
    email_notifications: Optional[bool] = Field(None, description="Enable email notifications")
    slack_notifications: Optional[bool] = Field(None, description="Enable Slack notifications")
    slack_webhook_url: Optional[str] = Field(None, max_length=500, description="Slack webhook URL")
    
    # Backup Settings
    auto_backup: Optional[bool] = Field(None, description="Enable automatic backups")
    backup_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly)$", description="Backup frequency")
    backup_retention_days: Optional[int] = Field(None, ge=1, le=365, description="Backup retention in days")
    
    # Maintenance Settings
    maintenance_mode: Optional[bool] = Field(None, description="Enable maintenance mode")
    maintenance_message: Optional[str] = Field(None, max_length=1000, description="Maintenance message")


class SystemSettingsResponse(SystemSettingsBase, IDMixin, TimestampMixin):
    """Schema for system settings responses."""
    
    # File Upload Settings
    max_file_size: int = Field(..., description="Max file size in bytes")
    allowed_file_types: str = Field(..., description="Comma-separated list of allowed file types")
    upload_path: str = Field(..., description="Upload directory path")
    
    # Processing Settings
    auto_process_documents: bool = Field(..., description="Auto-process uploaded documents")
    ocr_enabled: bool = Field(..., description="Enable OCR processing")
    ai_extraction_enabled: bool = Field(..., description="Enable AI data extraction")
    
    # Security Settings
    session_timeout: int = Field(..., description="Session timeout in seconds")
    max_login_attempts: int = Field(..., description="Max login attempts")
    password_min_length: int = Field(..., description="Minimum password length")
    require_2fa: bool = Field(..., description="Require two-factor authentication")
    
    # Email Settings
    smtp_host: Optional[str] = Field(None, description="SMTP host")
    smtp_port: Optional[int] = Field(None, description="SMTP port")
    smtp_username: Optional[str] = Field(None, description="SMTP username")
    smtp_use_tls: bool = Field(..., description="Use TLS for SMTP")
    email_from: Optional[str] = Field(None, description="From email address")
    
    # Notification Settings
    email_notifications: bool = Field(..., description="Enable email notifications")
    slack_notifications: bool = Field(..., description="Enable Slack notifications")
    slack_webhook_url: Optional[str] = Field(None, description="Slack webhook URL")
    
    # Backup Settings
    auto_backup: bool = Field(..., description="Enable automatic backups")
    backup_frequency: str = Field(..., description="Backup frequency")
    backup_retention_days: int = Field(..., description="Backup retention in days")
    
    # Maintenance Settings
    maintenance_mode: bool = Field(..., description="Enable maintenance mode")
    maintenance_message: Optional[str] = Field(None, description="Maintenance message")


class SAPConfigurationBase(BaseSchema):
    """Base SAP configuration schema."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Configuration name")
    host: str = Field(..., min_length=1, max_length=255, description="SAP host")
    port: int = Field(..., ge=1, le=65535, description="SAP port")
    client: str = Field(..., min_length=3, max_length=3, description="SAP client")
    username: str = Field(..., min_length=1, max_length=100, description="SAP username")
    
    @validator("client")
    def validate_client(cls, v):
        """Validate SAP client format."""
        if not v.isdigit():
            raise ValueError("SAP client must be a 3-digit number")
        return v


class SAPConfigurationCreate(SAPConfigurationBase):
    """Schema for creating SAP configuration."""
    
    password: str = Field(..., min_length=1, max_length=255, description="SAP password")
    system_id: Optional[str] = Field(None, max_length=10, description="SAP system ID")
    system_number: Optional[str] = Field(None, max_length=2, description="SAP system number")
    language: str = Field("EN", max_length=2, description="SAP language")
    is_active: bool = Field(True, description="Whether configuration is active")
    auto_post_documents: bool = Field(False, description="Auto-post documents to SAP")
    default_company_code: Optional[str] = Field(None, max_length=4, description="Default company code")
    default_document_type: Optional[str] = Field(None, max_length=2, description="Default document type")
    
    @validator("language")
    def validate_language(cls, v):
        """Validate SAP language code."""
        return v.upper()


class SAPConfigurationUpdate(BaseSchema):
    """Schema for updating SAP configuration."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Configuration name")
    host: Optional[str] = Field(None, min_length=1, max_length=255, description="SAP host")
    port: Optional[int] = Field(None, ge=1, le=65535, description="SAP port")
    client: Optional[str] = Field(None, min_length=3, max_length=3, description="SAP client")
    username: Optional[str] = Field(None, min_length=1, max_length=100, description="SAP username")
    password: Optional[str] = Field(None, min_length=1, max_length=255, description="SAP password")
    system_id: Optional[str] = Field(None, max_length=10, description="SAP system ID")
    system_number: Optional[str] = Field(None, max_length=2, description="SAP system number")
    language: Optional[str] = Field(None, max_length=2, description="SAP language")
    is_active: Optional[bool] = Field(None, description="Whether configuration is active")
    auto_post_documents: Optional[bool] = Field(None, description="Auto-post documents to SAP")
    default_company_code: Optional[str] = Field(None, max_length=4, description="Default company code")
    default_document_type: Optional[str] = Field(None, max_length=2, description="Default document type")
    
    @validator("client")
    def validate_client(cls, v):
        """Validate SAP client format."""
        if v is not None and not v.isdigit():
            raise ValueError("SAP client must be a 3-digit number")
        return v
    
    @validator("language")
    def validate_language(cls, v):
        """Validate SAP language code."""
        return v.upper() if v else v


class SAPConfigurationResponse(SAPConfigurationBase, IDMixin, TimestampMixin):
    """Schema for SAP configuration responses."""
    
    system_id: Optional[str] = Field(None, description="SAP system ID")
    system_number: Optional[str] = Field(None, description="SAP system number")
    language: str = Field(..., description="SAP language")
    is_active: bool = Field(..., description="Whether configuration is active")
    auto_post_documents: bool = Field(..., description="Auto-post documents to SAP")
    default_company_code: Optional[str] = Field(None, description="Default company code")
    default_document_type: Optional[str] = Field(None, description="Default document type")
    connection_status: str = Field(..., description="Connection status")
    last_connection_test: Optional[str] = Field(None, description="Last connection test")
    
    # Note: Password is not included in response for security


class DocumentMappingBase(BaseSchema):
    """Base document mapping schema."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Mapping name")
    document_type: str = Field(..., max_length=50, description="Document type")
    source_field: str = Field(..., max_length=100, description="Source field name")
    target_field: str = Field(..., max_length=100, description="Target field name")
    target_system: str = Field("SAP", max_length=50, description="Target system")


class DocumentMappingCreate(DocumentMappingBase):
    """Schema for creating document mapping."""
    
    description: Optional[str] = Field(None, max_length=1000, description="Mapping description")
    transformation_rule: Optional[str] = Field(None, description="Transformation rule (JSON)")
    validation_rule: Optional[str] = Field(None, description="Validation rule")
    default_value: Optional[str] = Field(None, max_length=255, description="Default value")
    is_required: bool = Field(False, description="Whether field is required")
    is_active: bool = Field(True, description="Whether mapping is active")
    priority: int = Field(0, description="Mapping priority")


class DocumentMappingUpdate(BaseSchema):
    """Schema for updating document mapping."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Mapping name")
    description: Optional[str] = Field(None, max_length=1000, description="Mapping description")
    document_type: Optional[str] = Field(None, max_length=50, description="Document type")
    source_field: Optional[str] = Field(None, max_length=100, description="Source field name")
    target_field: Optional[str] = Field(None, max_length=100, description="Target field name")
    target_system: Optional[str] = Field(None, max_length=50, description="Target system")
    transformation_rule: Optional[str] = Field(None, description="Transformation rule (JSON)")
    validation_rule: Optional[str] = Field(None, description="Validation rule")
    default_value: Optional[str] = Field(None, max_length=255, description="Default value")
    is_required: Optional[bool] = Field(None, description="Whether field is required")
    is_active: Optional[bool] = Field(None, description="Whether mapping is active")
    priority: Optional[int] = Field(None, description="Mapping priority")


class DocumentMappingResponse(DocumentMappingBase, IDMixin, TimestampMixin):
    """Schema for document mapping responses."""
    
    description: Optional[str] = Field(None, description="Mapping description")
    transformation_rule: Optional[str] = Field(None, description="Transformation rule (JSON)")
    validation_rule: Optional[str] = Field(None, description="Validation rule")
    default_value: Optional[str] = Field(None, description="Default value")
    is_required: bool = Field(..., description="Whether field is required")
    is_active: bool = Field(..., description="Whether mapping is active")
    priority: int = Field(..., description="Mapping priority")


class ThresholdBase(BaseSchema):
    """Base threshold schema."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Threshold name")
    category: str = Field(..., max_length=50, description="Threshold category")
    metric: str = Field(..., max_length=100, description="Metric name")


class ThresholdCreate(ThresholdBase):
    """Schema for creating threshold."""
    
    description: Optional[str] = Field(None, max_length=1000, description="Threshold description")
    warning_value: Optional[float] = Field(None, description="Warning threshold value")
    critical_value: Optional[float] = Field(None, description="Critical threshold value")
    unit: Optional[str] = Field(None, max_length=20, description="Unit of measurement")
    comparison_operator: str = Field(">=", pattern="^(>=|<=|==|!=|>|<)$", description="Comparison operator")
    evaluation_period: int = Field(300, ge=60, le=86400, description="Evaluation period in seconds")
    warning_action: Optional[str] = Field(None, description="Warning action (JSON)")
    critical_action: Optional[str] = Field(None, description="Critical action (JSON)")
    is_active: bool = Field(True, description="Whether threshold is active")
    send_notifications: bool = Field(True, description="Send notifications when triggered")


class ThresholdUpdate(BaseSchema):
    """Schema for updating threshold."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Threshold name")
    description: Optional[str] = Field(None, max_length=1000, description="Threshold description")
    category: Optional[str] = Field(None, max_length=50, description="Threshold category")
    metric: Optional[str] = Field(None, max_length=100, description="Metric name")
    warning_value: Optional[float] = Field(None, description="Warning threshold value")
    critical_value: Optional[float] = Field(None, description="Critical threshold value")
    unit: Optional[str] = Field(None, max_length=20, description="Unit of measurement")
    comparison_operator: Optional[str] = Field(None, pattern="^(>=|<=|==|!=|>|<)$", description="Comparison operator")
    evaluation_period: Optional[int] = Field(None, ge=60, le=86400, description="Evaluation period in seconds")
    warning_action: Optional[str] = Field(None, description="Warning action (JSON)")
    critical_action: Optional[str] = Field(None, description="Critical action (JSON)")
    is_active: Optional[bool] = Field(None, description="Whether threshold is active")
    send_notifications: Optional[bool] = Field(None, description="Send notifications when triggered")


class ThresholdResponse(ThresholdBase, IDMixin, TimestampMixin):
    """Schema for threshold responses."""
    
    description: Optional[str] = Field(None, description="Threshold description")
    warning_value: Optional[float] = Field(None, description="Warning threshold value")
    critical_value: Optional[float] = Field(None, description="Critical threshold value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    comparison_operator: str = Field(..., description="Comparison operator")
    evaluation_period: int = Field(..., description="Evaluation period in seconds")
    warning_action: Optional[str] = Field(None, description="Warning action (JSON)")
    critical_action: Optional[str] = Field(None, description="Critical action (JSON)")
    is_active: bool = Field(..., description="Whether threshold is active")
    send_notifications: bool = Field(..., description="Send notifications when triggered")
    last_triggered: Optional[str] = Field(None, description="Last triggered timestamp")
    trigger_count: int = Field(..., description="Number of times triggered")


class SettingsExportResponse(BaseSchema):
    """Schema for settings export."""
    
    system_settings: SystemSettingsResponse = Field(..., description="System settings")
    sap_configurations: List[SAPConfigurationResponse] = Field(default_factory=list, description="SAP configurations")
    document_mappings: List[DocumentMappingResponse] = Field(default_factory=list, description="Document mappings")
    thresholds: List[ThresholdResponse] = Field(default_factory=list, description="Thresholds")
    export_timestamp: str = Field(..., description="Export timestamp")
    export_version: str = Field(..., description="Export format version")