"""
Settings service for managing system configuration.

This service provides comprehensive settings management including
system settings, SAP configuration, document mappings, and thresholds.
"""

import json
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.logging import get_logger
from aria.models.settings import (
    DocumentMapping,
    SAPConfiguration,
    SystemSettings,
    Threshold,
)
from aria.schemas.settings import (
    DocumentMappingCreate,
    DocumentMappingResponse,
    DocumentMappingUpdate,
    SAPConfigurationCreate,
    SAPConfigurationResponse,
    SAPConfigurationUpdate,
    SystemSettingsResponse,
    SystemSettingsUpdate,
    ThresholdCreate,
    ThresholdResponse,
    ThresholdUpdate,
)

logger = get_logger(__name__)


class SettingsService:
    """
    Service for managing all types of system settings.
    
    Provides methods for CRUD operations on settings, configurations,
    mappings, and thresholds with proper validation and logging.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize the settings service.
        
        Args:
            db: Database session
        """
        self.db = db

    # System Settings Methods

    async def get_system_settings(self) -> Optional[SystemSettingsResponse]:
        """
        Get current system settings.
        
        Returns:
            System settings or None if not configured
        """
        logger.info("Retrieving system settings")
        
        try:
            result = await self.db.execute(select(SystemSettings))
            settings = result.scalar_one_or_none()
            
            if not settings:
                logger.info("No system settings found, creating defaults")
                settings = await self._create_default_system_settings()
            
            return SystemSettingsResponse(
                id=settings.id,
                system_name=settings.system_name,
                system_description=settings.system_description,
                system_version=settings.system_version,
                max_file_size=settings.max_file_size,
                allowed_file_types=settings.allowed_file_types.split(","),
                upload_path=settings.upload_path,
                auto_process_documents=settings.auto_process_documents,
                ocr_enabled=settings.ocr_enabled,
                ai_extraction_enabled=settings.ai_extraction_enabled,
                session_timeout=settings.session_timeout,
                max_login_attempts=settings.max_login_attempts,
                password_min_length=settings.password_min_length,
                require_2fa=settings.require_2fa,
                email_notifications=settings.email_notifications,
                slack_notifications=settings.slack_notifications,
                auto_backup=settings.auto_backup,
                backup_frequency=settings.backup_frequency,
                backup_retention_days=settings.backup_retention_days,
                maintenance_mode=settings.maintenance_mode,
                maintenance_message=settings.maintenance_message,
                created_at=settings.created_at,
                updated_at=settings.updated_at,
            )
            
        except Exception as e:
            logger.error("Failed to retrieve system settings", error=str(e), exc_info=True)
            raise

    async def update_system_settings(
        self, settings_data: SystemSettingsUpdate
    ) -> SystemSettingsResponse:
        """
        Update system settings.
        
        Args:
            settings_data: Settings update data
            
        Returns:
            Updated system settings
        """
        logger.info("Updating system settings")
        
        try:
            result = await self.db.execute(select(SystemSettings))
            settings = result.scalar_one_or_none()
            
            if not settings:
                settings = await self._create_default_system_settings()
            
            # Update fields
            update_data = settings_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if field == "allowed_file_types" and isinstance(value, list):
                    value = ",".join(value)
                setattr(settings, field, value)
            
            await self.db.commit()
            await self.db.refresh(settings)
            
            logger.info("System settings updated successfully")
            return await self.get_system_settings()
            
        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to update system settings", error=str(e), exc_info=True)
            raise

    async def _create_default_system_settings(self) -> SystemSettings:
        """Create default system settings."""
        settings = SystemSettings()
        self.db.add(settings)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    # SAP Configuration Methods

    async def get_sap_configurations(self) -> List[SAPConfigurationResponse]:
        """
        Get all SAP configurations.
        
        Returns:
            List of SAP configurations
        """
        logger.info("Retrieving SAP configurations")
        
        try:
            result = await self.db.execute(select(SAPConfiguration))
            configurations = result.scalars().all()
            
            return [
                SAPConfigurationResponse(
                    id=config.id,
                    name=config.name,
                    host=config.host,
                    port=config.port,
                    client=config.client,
                    username=config.username,
                    # Don't return password in response
                    system_id=config.system_id,
                    system_number=config.system_number,
                    language=config.language,
                    is_active=config.is_active,
                    auto_post_documents=config.auto_post_documents,
                    default_company_code=config.default_company_code,
                    default_document_type=config.default_document_type,
                    connection_status=config.connection_status,
                    last_connection_test=config.last_connection_test,
                    created_at=config.created_at,
                    updated_at=config.updated_at,
                )
                for config in configurations
            ]
            
        except Exception as e:
            logger.error("Failed to retrieve SAP configurations", error=str(e), exc_info=True)
            raise

    async def create_sap_configuration(
        self, config_data: SAPConfigurationCreate
    ) -> SAPConfigurationResponse:
        """
        Create new SAP configuration.
        
        Args:
            config_data: SAP configuration data
            
        Returns:
            Created SAP configuration
        """
        logger.info("Creating SAP configuration", name=config_data.name)
        
        try:
            # TODO: Encrypt password before storing
            config = SAPConfiguration(**config_data.model_dump())
            self.db.add(config)
            await self.db.commit()
            await self.db.refresh(config)
            
            logger.info("SAP configuration created successfully", config_id=config.id)
            
            return SAPConfigurationResponse(
                id=config.id,
                name=config.name,
                host=config.host,
                port=config.port,
                client=config.client,
                username=config.username,
                system_id=config.system_id,
                system_number=config.system_number,
                language=config.language,
                is_active=config.is_active,
                auto_post_documents=config.auto_post_documents,
                default_company_code=config.default_company_code,
                default_document_type=config.default_document_type,
                connection_status=config.connection_status,
                last_connection_test=config.last_connection_test,
                created_at=config.created_at,
                updated_at=config.updated_at,
            )
            
        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to create SAP configuration", error=str(e), exc_info=True)
            raise

    # Document Mapping Methods

    async def get_document_mappings(self) -> List[DocumentMappingResponse]:
        """
        Get all document mappings.
        
        Returns:
            List of document mappings
        """
        logger.info("Retrieving document mappings")
        
        try:
            result = await self.db.execute(select(DocumentMapping))
            mappings = result.scalars().all()
            
            return [
                DocumentMappingResponse(
                    id=mapping.id,
                    name=mapping.name,
                    description=mapping.description,
                    document_type=mapping.document_type,
                    source_field=mapping.source_field,
                    target_field=mapping.target_field,
                    target_system=mapping.target_system,
                    transformation_rule=mapping.transformation_rule,
                    validation_rule=mapping.validation_rule,
                    default_value=mapping.default_value,
                    is_required=mapping.is_required,
                    is_active=mapping.is_active,
                    priority=mapping.priority,
                    created_at=mapping.created_at,
                    updated_at=mapping.updated_at,
                )
                for mapping in mappings
            ]
            
        except Exception as e:
            logger.error("Failed to retrieve document mappings", error=str(e), exc_info=True)
            raise

    # Threshold Methods

    async def get_thresholds(self) -> List[ThresholdResponse]:
        """
        Get all thresholds.
        
        Returns:
            List of thresholds
        """
        logger.info("Retrieving thresholds")
        
        try:
            result = await self.db.execute(select(Threshold))
            thresholds = result.scalars().all()
            
            return [
                ThresholdResponse(
                    id=threshold.id,
                    name=threshold.name,
                    description=threshold.description,
                    category=threshold.category,
                    metric=threshold.metric,
                    warning_value=threshold.warning_value,
                    critical_value=threshold.critical_value,
                    unit=threshold.unit,
                    comparison_operator=threshold.comparison_operator,
                    evaluation_period=threshold.evaluation_period,
                    warning_action=threshold.warning_action,
                    critical_action=threshold.critical_action,
                    is_active=threshold.is_active,
                    send_notifications=threshold.send_notifications,
                    last_triggered=threshold.last_triggered,
                    trigger_count=threshold.trigger_count,
                    created_at=threshold.created_at,
                    updated_at=threshold.updated_at,
                )
                for threshold in thresholds
            ]
            
        except Exception as e:
            logger.error("Failed to retrieve thresholds", error=str(e), exc_info=True)
            raise

    # Combined Settings Methods

    async def get_combined_settings(self) -> Dict[str, Any]:
        """
        Get all settings in a combined format for the frontend.
        
        Returns:
            Combined settings dictionary
        """
        logger.info("Retrieving combined settings")
        
        try:
            # Get system settings
            system_settings = await self.get_system_settings()
            
            # Get SAP configurations (use first active one for frontend)
            sap_configs = await self.get_sap_configurations()
            active_sap = next((config for config in sap_configs if config.is_active), None)
            
            # Build combined response
            combined = {
                "sapConfig": {
                    "server": f"https://{active_sap.host}:{active_sap.port}" if active_sap else "https://sap.company.com",
                    "client": active_sap.client if active_sap else "100",
                    "username": active_sap.username if active_sap else "aria_user",
                    "password": "",  # Never return password
                },
                "documentMappings": {
                    "invoices": "/documents/invoices",
                    "contracts": "/documents/contracts",
                    "reports": "/documents/reports",
                },
                "thresholds": {
                    "maxFileSize": system_settings.max_file_size // 1048576 if system_settings else 50,  # Convert to MB
                    "autoProcessing": system_settings.auto_process_documents if system_settings else True,
                    "retentionDays": system_settings.backup_retention_days if system_settings else 365,
                },
                "systemSettings": {
                    "theme": "system",  # Frontend-specific setting
                    "language": "en",   # Frontend-specific setting
                    "notifications": system_settings.email_notifications if system_settings else True,
                    "autoBackup": system_settings.auto_backup if system_settings else True,
                },
            }
            
            return combined
            
        except Exception as e:
            logger.error("Failed to retrieve combined settings", error=str(e), exc_info=True)
            raise

    async def update_combined_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update settings from combined frontend format.
        
        Args:
            settings_data: Combined settings data from frontend
            
        Returns:
            Success response with updated data
        """
        logger.info("Updating combined settings")
        
        try:
            # Extract and update system settings
            if "thresholds" in settings_data or "systemSettings" in settings_data:
                system_update_data = {}
                
                if "thresholds" in settings_data:
                    thresholds = settings_data["thresholds"]
                    if "maxFileSize" in thresholds:
                        system_update_data["max_file_size"] = thresholds["maxFileSize"] * 1048576  # Convert MB to bytes
                    if "autoProcessing" in thresholds:
                        system_update_data["auto_process_documents"] = thresholds["autoProcessing"]
                    if "retentionDays" in thresholds:
                        system_update_data["backup_retention_days"] = thresholds["retentionDays"]
                
                if "systemSettings" in settings_data:
                    system_settings = settings_data["systemSettings"]
                    if "notifications" in system_settings:
                        system_update_data["email_notifications"] = system_settings["notifications"]
                    if "autoBackup" in system_settings:
                        system_update_data["auto_backup"] = system_settings["autoBackup"]
                
                if system_update_data:
                    system_settings_update = SystemSettingsUpdate(**system_update_data)
                    await self.update_system_settings(system_settings_update)
            
            # TODO: Handle SAP configuration updates
            # TODO: Handle document mapping updates
            
            logger.info("Combined settings updated successfully")
            
            return {
                "success": True,
                "message": "Settings updated successfully",
                "data": settings_data,
            }
            
        except Exception as e:
            logger.error("Failed to update combined settings", error=str(e), exc_info=True)
            raise


async def get_settings_service(db: AsyncSession) -> SettingsService:
    """
    Get settings service instance.
    
    Args:
        db: Database session
        
    Returns:
        Settings service instance
    """
    return SettingsService(db)