"""Configuration API endpoints."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


class SAPConfig(BaseModel):
    """SAP configuration model."""
    server: str = Field(..., description="SAP server URL")
    client: str = Field(..., description="SAP client")
    username: str = Field(..., description="SAP username")
    password: str = Field(..., description="SAP password")


class DocumentMappings(BaseModel):
    """Document mappings configuration."""
    invoices: str = Field(..., description="Invoices path")
    contracts: str = Field(..., description="Contracts path")
    reports: str = Field(..., description="Reports path")


class Thresholds(BaseModel):
    """System thresholds configuration."""
    maxFileSize: int = Field(..., description="Maximum file size in MB")
    autoProcessing: bool = Field(..., description="Enable auto processing")
    retentionDays: int = Field(..., description="Data retention days")


class SystemSettings(BaseModel):
    """System settings configuration."""
    theme: str = Field(..., description="UI theme")
    language: str = Field(..., description="System language")
    notifications: bool = Field(..., description="Enable notifications")
    autoBackup: bool = Field(..., description="Enable auto backup")


class ConfigurationData(BaseModel):
    """Complete configuration data model."""
    sapConfig: SAPConfig
    documentMappings: DocumentMappings
    thresholds: Thresholds
    systemSettings: SystemSettings


# In-memory storage for demo purposes
# In production, this would be stored in a database
_config_storage: Dict[str, Any] = {
    "sapConfig": {
        "server": "https://sap.company.com",
        "client": "100",
        "username": "aria_user",
        "password": ""
    },
    "documentMappings": {
        "invoices": "/documents/invoices",
        "contracts": "/documents/contracts",
        "reports": "/documents/reports"
    },
    "thresholds": {
        "maxFileSize": 50,
        "autoProcessing": True,
        "retentionDays": 365
    },
    "systemSettings": {
        "theme": "system",
        "language": "en",
        "notifications": True,
        "autoBackup": True
    }
}


@router.get("/config")
async def get_configuration() -> Dict[str, Any]:
    """Get current system configuration."""
    try:
        logger.info("Retrieving system configuration")
        return {
            "success": True,
            "data": _config_storage
        }
    except Exception as e:
        logger.error(f"Failed to retrieve configuration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration")


@router.post("/config")
async def update_configuration(config: ConfigurationData) -> Dict[str, Any]:
    """Update system configuration."""
    try:
        logger.info("Updating system configuration")
        
        # Convert Pydantic models to dict for storage
        _config_storage.update({
            "sapConfig": config.sapConfig.dict(),
            "documentMappings": config.documentMappings.dict(),
            "thresholds": config.thresholds.dict(),
            "systemSettings": config.systemSettings.dict()
        })
        
        logger.info("Configuration updated successfully")
        
        return {
            "success": True,
            "message": "Configuration updated successfully",
            "data": _config_storage
        }
        
    except Exception as e:
        logger.error(f"Failed to update configuration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update configuration")


@router.get("/config/sap")
async def get_sap_config() -> Dict[str, Any]:
    """Get SAP configuration only."""
    try:
        return {
            "success": True,
            "data": _config_storage.get("sapConfig", {})
        }
    except Exception as e:
        logger.error(f"Failed to retrieve SAP configuration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve SAP configuration")


@router.get("/config/system")
async def get_system_settings() -> Dict[str, Any]:
    """Get system settings only."""
    try:
        return {
            "success": True,
            "data": _config_storage.get("systemSettings", {})
        }
    except Exception as e:
        logger.error(f"Failed to retrieve system settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system settings")