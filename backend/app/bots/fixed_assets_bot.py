"""
Fixed Assets Bot - REAL IMPLEMENTATION
Automate asset tracking, depreciation, and disposal

Features:
- Create and track fixed assets
- Calculate depreciation (straight-line, declining balance)
- Process asset disposals
- Generate asset register
- Real GL posting
"""
import logging
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session

from ..services.fixed_assets_service import FixedAssetsService

logger = logging.getLogger(__name__)


class FixedAssetsBot:
    """Fixed Assets Bot - Real asset management and depreciation"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "fixed_assets"
        self.name = "Fixed Assets Bot"
        self.description = "Automate asset tracking and depreciation with real database operations"
        self.db = db
        self.fa_service = FixedAssetsService(db) if db else None
        self.capabilities = [
            "create_asset",
            "calculate_depreciation",
            "dispose_asset",
            "asset_register"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute fixed assets operations with REAL database operations
        
        Supported actions:
        - create_asset: Register a new fixed asset
        - calculate_depreciation: Calculate and post depreciation
        - dispose_asset: Process asset disposal
        - asset_register: Generate asset register report
        """
        if not self.fa_service:
            return {
                'success': False,
                'error': 'Database connection not available',
                'bot_id': self.bot_id
            }
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_asset':
                return self._create_asset(context.get('asset_data', {}))
            elif action == 'calculate_depreciation':
                return self._calculate_depreciation(
                    context.get('asset_id'),
                    context.get('period_end_date')
                )
            elif action == 'dispose_asset':
                return self._dispose_asset(context.get('disposal_data', {}))
            elif action == 'asset_register':
                return self._asset_register(context.get('category'))
            else:
                return {
                    'success': False,
                    'error': f'Unknown action: {action}',
                    'supported_actions': self.capabilities,
                    'bot_id': self.bot_id
                }
        except Exception as e:
            logger.error(f"Error in FA bot: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'bot_id': self.bot_id
            }
    
    def _create_asset(self, asset_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new fixed asset"""
        logger.info(f"Creating asset: {asset_data.get('asset_name')}")
        result = self.fa_service.create_asset(asset_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _calculate_depreciation(self, asset_id: int, period_end_date: str) -> Dict[str, Any]:
        """Calculate depreciation for an asset"""
        logger.info(f"Calculating depreciation for asset ID: {asset_id}")
        result = self.fa_service.calculate_depreciation(asset_id, period_end_date)
        result['bot_id'] = self.bot_id
        return result
    
    def _dispose_asset(self, disposal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process asset disposal"""
        logger.info(f"Disposing asset ID: {disposal_data.get('asset_id')}")
        result = self.fa_service.dispose_asset(disposal_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _asset_register(self, category: str = None) -> Dict[str, Any]:
        """Generate asset register"""
        logger.info(f"Generating asset register for category: {category or 'all'}")
        result = self.fa_service.get_asset_register(category)
        result['bot_id'] = self.bot_id
        return result
