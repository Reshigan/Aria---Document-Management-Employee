"""
Fixed Assets Service - Real Implementation
Handles asset tracking, depreciation calculation, and disposal
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..models.fixed_asset import FixedAsset, AssetStatus, DepreciationMethod
from ..models.depreciation_entry import DepreciationEntry
from .general_ledger_service import GeneralLedgerService


logger = logging.getLogger(__name__)


class FixedAssetsService:
    """Service for managing fixed assets and depreciation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gl_service = GeneralLedgerService(db)
    
    def create_asset(self, asset_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new fixed asset"""
        try:
            # Generate asset code if not provided
            if 'asset_code' not in asset_data:
                asset_data['asset_code'] = self._generate_asset_code(asset_data.get('asset_category', 'GEN'))
            
            # Check for duplicate
            existing = self.db.query(FixedAsset).filter_by(
                asset_code=asset_data['asset_code']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Asset code {asset_data['asset_code']} already exists"
                }
            
            # Calculate net book value
            purchase_cost = Decimal(str(asset_data['purchase_cost']))
            asset_data['net_book_value'] = purchase_cost
            
            # Create asset
            asset = FixedAsset(**asset_data)
            self.db.add(asset)
            self.db.flush()
            
            # Post acquisition to GL (DR: Asset, CR: Cash/AP)
            journal_entry = {
                'date': asset_data['acquisition_date'],
                'description': f"Asset Acquisition - {asset.asset_name}",
                'reference': asset.asset_code,
                'lines': [
                    {
                        'account': asset.asset_account_number,
                        'debit': float(purchase_cost),
                        'credit': 0,
                        'description': f'{asset.asset_name}'
                    },
                    {
                        'account': asset_data.get('payment_account', '1100'),  # Cash or AP
                        'debit': 0,
                        'credit': float(purchase_cost),
                        'description': 'Asset purchase'
                    }
                ]
            }
            
            # Post to GL
            gl_result = self.gl_service.post_journal_entry(journal_entry)
            if not gl_result['success']:
                self.db.rollback()
                return {'success': False, 'error': f"GL posting failed: {gl_result['error']}"}
            
            self.db.commit()
            self.db.refresh(asset)
            
            logger.info(f"Created asset: {asset.asset_code} - {asset.asset_name}")
            
            return {
                'success': True,
                'asset_id': asset.id,
                'asset_code': asset.asset_code,
                'asset_name': asset.asset_name,
                'purchase_cost': float(purchase_cost),
                'gl_reference': gl_result['reference']
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating asset: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def calculate_depreciation(self, asset_id: int, period_end_date: str) -> Dict[str, Any]:
        """Calculate depreciation for an asset for a period"""
        try:
            asset = self.db.query(FixedAsset).filter_by(id=asset_id).first()
            if not asset:
                return {'success': False, 'error': 'Asset not found'}
            
            if asset.status != AssetStatus.ACTIVE:
                return {'success': False, 'error': f'Asset is {asset.status}'}
            
            end_date = datetime.strptime(period_end_date, '%Y-%m-%d').date()
            start_date = asset.last_depreciation_date or asset.depreciation_start_date or asset.acquisition_date
            
            if start_date >= end_date:
                return {'success': False, 'error': 'Period already depreciated'}
            
            # Calculate depreciation amount based on method
            if asset.depreciation_method == DepreciationMethod.STRAIGHT_LINE:
                depreciation_amount = self._calculate_straight_line(asset, start_date, end_date)
            elif asset.depreciation_method == DepreciationMethod.DECLINING_BALANCE:
                depreciation_amount = self._calculate_declining_balance(asset, start_date, end_date)
            else:
                return {'success': False, 'error': f'Depreciation method {asset.depreciation_method} not implemented'}
            
            if depreciation_amount <= 0:
                return {'success': False, 'error': 'Asset is fully depreciated'}
            
            # Create depreciation entry
            opening_book_value = asset.net_book_value
            accumulated_depreciation = asset.accumulated_depreciation + depreciation_amount
            closing_book_value = asset.purchase_cost - accumulated_depreciation
            
            # Ensure we don't go below salvage value
            if closing_book_value < asset.salvage_value:
                depreciation_amount = opening_book_value - asset.salvage_value
                accumulated_depreciation = asset.purchase_cost - asset.salvage_value
                closing_book_value = asset.salvage_value
            
            dep_entry = DepreciationEntry(
                asset_id=asset.id,
                period_start_date=start_date,
                period_end_date=end_date,
                depreciation_date=end_date,
                opening_book_value=opening_book_value,
                depreciation_amount=depreciation_amount,
                accumulated_depreciation=accumulated_depreciation,
                closing_book_value=closing_book_value,
                created_by=1  # System
            )
            self.db.add(dep_entry)
            self.db.flush()
            
            # Post to GL (DR: Depreciation Expense, CR: Accumulated Depreciation)
            journal_entry = {
                'date': period_end_date,
                'description': f"Depreciation - {asset.asset_name}",
                'reference': f"{asset.asset_code}-DEP-{end_date.strftime('%Y%m')}",
                'lines': [
                    {
                        'account': asset.depreciation_expense_account,
                        'debit': float(depreciation_amount),
                        'credit': 0,
                        'description': f'Depreciation for {asset.asset_name}',
                        'cost_center': asset.cost_center
                    },
                    {
                        'account': asset.accumulated_depreciation_account,
                        'debit': 0,
                        'credit': float(depreciation_amount),
                        'description': f'Accumulated depreciation'
                    }
                ]
            }
            
            # Post to GL
            gl_result = self.gl_service.post_journal_entry(journal_entry)
            if not gl_result['success']:
                self.db.rollback()
                return {'success': False, 'error': f"GL posting failed: {gl_result['error']}"}
            
            # Update depreciation entry with GL reference
            dep_entry.gl_entry_id = gl_result['entry_id']
            
            # Update asset
            asset.accumulated_depreciation = accumulated_depreciation
            asset.net_book_value = closing_book_value
            asset.last_depreciation_date = end_date
            
            if closing_book_value <= asset.salvage_value:
                asset.status = AssetStatus.FULLY_DEPRECIATED
            
            self.db.commit()
            
            logger.info(f"Depreciated asset {asset.asset_code}: {depreciation_amount}")
            
            return {
                'success': True,
                'asset_code': asset.asset_code,
                'depreciation_amount': float(depreciation_amount),
                'opening_book_value': float(opening_book_value),
                'closing_book_value': float(closing_book_value),
                'accumulated_depreciation': float(accumulated_depreciation),
                'gl_reference': gl_result['reference']
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error calculating depreciation: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def dispose_asset(self, disposal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Dispose of a fixed asset"""
        try:
            asset = self.db.query(FixedAsset).filter_by(
                id=disposal_data['asset_id']
            ).first()
            if not asset:
                return {'success': False, 'error': 'Asset not found'}
            
            if asset.status == AssetStatus.DISPOSED:
                return {'success': False, 'error': 'Asset already disposed'}
            
            disposal_date = datetime.strptime(disposal_data['disposal_date'], '%Y-%m-%d').date()
            disposal_proceeds = Decimal(str(disposal_data.get('disposal_proceeds', 0)))
            
            # Calculate gain/loss
            net_book_value = asset.net_book_value
            disposal_gain_loss = disposal_proceeds - net_book_value
            
            # Post disposal to GL
            journal_lines = [
                {
                    'account': '1100',  # Cash/Bank
                    'debit': float(disposal_proceeds),
                    'credit': 0,
                    'description': 'Proceeds from asset disposal'
                },
                {
                    'account': asset.accumulated_depreciation_account,
                    'debit': float(asset.accumulated_depreciation),
                    'credit': 0,
                    'description': 'Clear accumulated depreciation'
                },
                {
                    'account': asset.asset_account_number,
                    'debit': 0,
                    'credit': float(asset.purchase_cost),
                    'description': 'Remove asset from books'
                }
            ]
            
            # Add gain or loss account
            if disposal_gain_loss > 0:
                # Gain (Credit)
                journal_lines.append({
                    'account': '8100',  # Gain on disposal
                    'debit': 0,
                    'credit': float(disposal_gain_loss),
                    'description': 'Gain on asset disposal'
                })
            elif disposal_gain_loss < 0:
                # Loss (Debit)
                journal_lines.append({
                    'account': '6900',  # Loss on disposal
                    'debit': float(abs(disposal_gain_loss)),
                    'credit': 0,
                    'description': 'Loss on asset disposal'
                })
            
            journal_entry = {
                'date': disposal_data['disposal_date'],
                'description': f"Asset Disposal - {asset.asset_name}",
                'reference': f"{asset.asset_code}-DISP",
                'lines': journal_lines
            }
            
            # Post to GL
            gl_result = self.gl_service.post_journal_entry(journal_entry)
            if not gl_result['success']:
                self.db.rollback()
                return {'success': False, 'error': f"GL posting failed: {gl_result['error']}"}
            
            # Update asset
            asset.disposal_date = disposal_date
            asset.disposal_proceeds = disposal_proceeds
            asset.disposal_gain_loss = disposal_gain_loss
            asset.disposal_gl_entry_id = gl_result['entry_id']
            asset.status = AssetStatus.DISPOSED
            asset.net_book_value = Decimal('0')
            
            self.db.commit()
            
            logger.info(f"Disposed asset {asset.asset_code}, Proceeds: {disposal_proceeds}, Gain/Loss: {disposal_gain_loss}")
            
            return {
                'success': True,
                'asset_code': asset.asset_code,
                'disposal_proceeds': float(disposal_proceeds),
                'net_book_value': float(net_book_value),
                'disposal_gain_loss': float(disposal_gain_loss),
                'gl_reference': gl_result['reference']
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error disposing asset: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_asset_register(self, category: str = None) -> Dict[str, Any]:
        """Get asset register report"""
        try:
            query = self.db.query(FixedAsset)
            
            if category:
                query = query.filter(FixedAsset.asset_category == category)
            
            assets = query.filter(FixedAsset.status != AssetStatus.DISPOSED).all()
            
            asset_list = [
                {
                    'asset_code': asset.asset_code,
                    'asset_name': asset.asset_name,
                    'category': asset.asset_category,
                    'acquisition_date': asset.acquisition_date.isoformat(),
                    'purchase_cost': float(asset.purchase_cost),
                    'accumulated_depreciation': float(asset.accumulated_depreciation),
                    'net_book_value': float(asset.net_book_value),
                    'status': asset.status.value,
                    'location': asset.location,
                    'department': asset.department
                }
                for asset in assets
            ]
            
            total_cost = sum(float(a.purchase_cost) for a in assets)
            total_depreciation = sum(float(a.accumulated_depreciation) for a in assets)
            total_nbv = sum(float(a.net_book_value) for a in assets)
            
            return {
                'success': True,
                'assets': asset_list,
                'count': len(asset_list),
                'totals': {
                    'purchase_cost': total_cost,
                    'accumulated_depreciation': total_depreciation,
                    'net_book_value': total_nbv
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting asset register: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _calculate_straight_line(self, asset: FixedAsset, start_date: date, end_date: date) -> Decimal:
        """Calculate straight-line depreciation"""
        if not asset.useful_life_years:
            return Decimal('0')
        
        # Annual depreciation
        depreciable_amount = asset.purchase_cost - asset.salvage_value
        annual_depreciation = depreciable_amount / Decimal(str(asset.useful_life_years))
        
        # Calculate for period (monthly proration)
        months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1
        period_depreciation = (annual_depreciation / Decimal('12')) * Decimal(str(months))
        
        # Don't exceed remaining depreciable amount
        remaining = asset.net_book_value - asset.salvage_value
        return min(period_depreciation, remaining)
    
    def _calculate_declining_balance(self, asset: FixedAsset, start_date: date, end_date: date) -> Decimal:
        """Calculate declining balance depreciation (double declining balance)"""
        if not asset.useful_life_years:
            return Decimal('0')
        
        # Rate = 2 / useful life
        rate = Decimal('2') / Decimal(str(asset.useful_life_years))
        
        # Calculate for period (monthly proration)
        months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1
        period_rate = rate * (Decimal(str(months)) / Decimal('12'))
        
        period_depreciation = asset.net_book_value * period_rate
        
        # Don't go below salvage value
        remaining = asset.net_book_value - asset.salvage_value
        return min(period_depreciation, remaining)
    
    def _generate_asset_code(self, category: str) -> str:
        """Generate unique asset code"""
        prefix = category[:3].upper()
        
        # Get last asset for this category
        last_asset = self.db.query(FixedAsset).filter(
            FixedAsset.asset_code.like(f"{prefix}%")
        ).order_by(desc(FixedAsset.id)).first()
        
        if last_asset:
            try:
                last_num = int(last_asset.asset_code[3:])
                return f"{prefix}{last_num + 1:05d}"
            except ValueError:
                pass
        
        return f"{prefix}00001"
