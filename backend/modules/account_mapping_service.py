"""
Account Mapping Service
Maps business transaction types to GL account codes (configurable per company)
Replaces hardcoded account codes throughout the ERP system
"""
from typing import Dict, Optional
from uuid import UUID
import asyncpg
import os
import logging

logger = logging.getLogger(__name__)

DEFAULT_ACCOUNT_MAPPINGS = {
    "AR": "1200",  # Accounts Receivable
    "REVENUE": "4000",  # Sales Revenue
    "SERVICE_REVENUE": "4100",  # Service Revenue
    
    "AP": "2000",  # Accounts Payable
    "COGS": "5000",  # Cost of Goods Sold
    "SALARY_EXPENSE": "6000",  # Salaries and Wages
    "BENEFITS_EXPENSE": "6100",  # Employee Benefits
    
    "INVENTORY": "1400",  # Inventory
    "GR_IR_CLEARING": "2100",  # Goods Receipt / Invoice Receipt Clearing
    
    "VAT_PAYABLE": "2200",  # VAT Payable (Output VAT)
    "VAT_RECOVERABLE": "1450",  # VAT Recoverable (Input VAT)
    
    "PAYROLL_LIABILITY": "2500",  # Payroll Liabilities
    "PAYROLL_EXPENSE": "6000",  # Salaries and Wages
    
    "CASH": "1000",  # Cash and Cash Equivalents
    "BANK": "1000",  # Bank Account
}

class AccountMappingService:
    """Service for managing GL account mappings"""
    
    def __init__(self):
        self.cache: Dict[str, Dict[str, str]] = {}
    
    async def get_account_code(
        self,
        company_id: UUID,
        role: str,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> str:
        """
        Get GL account code for a specific role and company
        
        Args:
            company_id: Company UUID
            role: Account role (e.g., 'AR', 'REVENUE', 'COGS')
            db_conn: Optional database connection (creates new if not provided)
        
        Returns:
            Account code string
        """
        cache_key = f"{company_id}:{role}"
        
        # Check cache first
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                db_conn = await asyncpg.connect(database_url)
                should_close = True
        
        try:
            if db_conn:
                mapping = await db_conn.fetchrow(
                    """
                    SELECT account_code 
                    FROM gl_account_mappings 
                    WHERE company_id = $1 AND role = $2 AND is_active = true
                    """,
                    str(company_id),
                    role
                )
                
                if mapping:
                    account_code = mapping['account_code']
                    self.cache[cache_key] = account_code
                    return account_code
        except Exception as e:
            logger.warning(f"Could not fetch account mapping from database: {e}")
        finally:
            if should_close and db_conn:
                await db_conn.close()
        
        if role in DEFAULT_ACCOUNT_MAPPINGS:
            account_code = DEFAULT_ACCOUNT_MAPPINGS[role]
            self.cache[cache_key] = account_code
            return account_code
        
        raise ValueError(f"No account mapping found for role '{role}' in company {company_id}")
    
    async def get_multiple_accounts(
        self,
        company_id: UUID,
        roles: list[str],
        db_conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, str]:
        """
        Get multiple account codes at once
        
        Args:
            company_id: Company UUID
            roles: List of account roles
            db_conn: Optional database connection
        
        Returns:
            Dictionary mapping role to account code
        """
        result = {}
        for role in roles:
            try:
                result[role] = await self.get_account_code(company_id, role, db_conn)
            except ValueError as e:
                logger.error(f"Failed to get account code for role {role}: {e}")
                raise
        return result
    
    def clear_cache(self, company_id: Optional[UUID] = None):
        """Clear cache for a specific company or all companies"""
        if company_id:
            keys_to_remove = [k for k in self.cache.keys() if k.startswith(f"{company_id}:")]
            for key in keys_to_remove:
                del self.cache[key]
        else:
            self.cache.clear()
    
    async def create_mapping(
        self,
        company_id: UUID,
        role: str,
        account_code: str,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        """
        Create or update account mapping for a company
        
        Args:
            company_id: Company UUID
            role: Account role
            account_code: GL account code
            db_conn: Optional database connection
        
        Returns:
            True if successful
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            account = await db_conn.fetchrow(
                """
                SELECT code FROM chart_of_accounts 
                WHERE code = $1 AND company_id = $2 AND is_active = true
                """,
                account_code,
                str(company_id)
            )
            
            if not account:
                raise ValueError(f"Account code {account_code} not found in chart of accounts")
            
            await db_conn.execute(
                """
                INSERT INTO gl_account_mappings (company_id, role, account_code, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (company_id, role) 
                DO UPDATE SET account_code = $3, updated_at = CURRENT_TIMESTAMP
                """,
                str(company_id),
                role,
                account_code
            )
            
            cache_key = f"{company_id}:{role}"
            if cache_key in self.cache:
                del self.cache[cache_key]
            
            return True
        finally:
            if should_close and db_conn:
                await db_conn.close()


account_mapping_service = AccountMappingService()


async def get_account_code(company_id: UUID, role: str) -> str:
    """
    Convenience function to get account code
    
    Usage:
        from modules.account_mapping_service import get_account_code
        ar_account = await get_account_code(company_id, "AR")
    """
    return await account_mapping_service.get_account_code(company_id, role)


async def get_accounts(company_id: UUID, roles: list[str]) -> Dict[str, str]:
    """
    Convenience function to get multiple account codes
    
    Usage:
        from modules.account_mapping_service import get_accounts
        accounts = await get_accounts(company_id, ["AR", "REVENUE", "VAT_PAYABLE"])
        ar_code = accounts["AR"]
    """
    return await account_mapping_service.get_multiple_accounts(company_id, roles)
