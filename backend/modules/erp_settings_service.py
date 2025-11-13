"""
ERP Settings Service
Provides per-company configuration for ERP modules
"""
import asyncpg
import os
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

async def get_setting(company_id: str, setting_key: str, default_value: Optional[str] = None) -> Optional[str]:
    """
    Get a setting value for a company
    
    Args:
        company_id: Company UUID
        setting_key: Setting key (e.g., 'default_labor_product_id')
        default_value: Default value if setting not found
    
    Returns:
        Setting value or default_value
    """
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL not configured")
        return default_value
    
    try:
        conn = await asyncpg.connect(database_url)
        
        result = await conn.fetchrow(
            """
            SELECT setting_value 
            FROM erp_settings 
            WHERE company_id = $1 AND setting_key = $2 AND is_active = true
            """,
            company_id,
            setting_key
        )
        
        await conn.close()
        
        if result:
            return result['setting_value']
        else:
            return default_value
    
    except Exception as e:
        logger.error(f"Error fetching setting {setting_key} for company {company_id}: {e}")
        return default_value


async def get_settings(company_id: str) -> Dict[str, str]:
    """
    Get all settings for a company
    
    Args:
        company_id: Company UUID
    
    Returns:
        Dictionary of setting_key: setting_value
    """
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL not configured")
        return {}
    
    try:
        conn = await asyncpg.connect(database_url)
        
        results = await conn.fetch(
            """
            SELECT setting_key, setting_value 
            FROM erp_settings 
            WHERE company_id = $1 AND is_active = true
            """,
            company_id
        )
        
        await conn.close()
        
        return {row['setting_key']: row['setting_value'] for row in results}
    
    except Exception as e:
        logger.error(f"Error fetching settings for company {company_id}: {e}")
        return {}


async def set_setting(company_id: str, setting_key: str, setting_value: str, setting_type: str = 'string', description: Optional[str] = None) -> bool:
    """
    Set a setting value for a company
    
    Args:
        company_id: Company UUID
        setting_key: Setting key
        setting_value: Setting value
        setting_type: Type of setting (string, uuid, int, float, bool)
        description: Optional description
    
    Returns:
        True if successful, False otherwise
    """
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL not configured")
        return False
    
    try:
        conn = await asyncpg.connect(database_url)
        
        await conn.execute(
            """
            INSERT INTO erp_settings (company_id, setting_key, setting_value, setting_type, description)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (company_id, setting_key) 
            DO UPDATE SET 
                setting_value = EXCLUDED.setting_value,
                setting_type = EXCLUDED.setting_type,
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
            """,
            company_id,
            setting_key,
            setting_value,
            setting_type,
            description
        )
        
        await conn.close()
        
        return True
    
    except Exception as e:
        logger.error(f"Error setting {setting_key} for company {company_id}: {e}")
        return False
