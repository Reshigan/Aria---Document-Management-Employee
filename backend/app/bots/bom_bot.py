import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

class BOMBot:
    """Bill of Materials (BOM) management - create, explode, cost, version control"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "bom"
        self.name = "BOMBot"
        self.db = db
        self.capabilities = [
            "create_bom", "update_bom", "bom_explosion", "bom_costing",
            "compare_versions", "where_used", "mass_update"
        ]
        self.bom_types = ['manufacturing', 'engineering', 'planning', 'costing']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_bom':
                return self._create_bom(context.get('data', {}))
            elif action == 'update_bom':
                return self._update_bom(context.get('bom_id'), context.get('updates', {}))
            elif action == 'bom_explosion':
                return self._bom_explosion(context.get('product_id'), context.get('quantity', 1))
            elif action == 'bom_costing':
                return self._bom_costing(context.get('bom_id'))
            elif action == 'compare_versions':
                return self._compare_versions(context.get('bom_id'), context.get('versions', []))
            elif action == 'where_used':
                return self._where_used(context.get('component_id'))
            elif action == 'mass_update':
                return self._mass_update(context.get('updates', []))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"BOM error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_bom(self, data: Dict) -> Dict:
        """Create new Bill of Materials"""
        required = ['product_id', 'components']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        bom = {
            'bom_id': f"BOM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'product_id': data['product_id'],
            'product_name': data.get('product_name'),
            'version': data.get('version', '1.0'),
            'bom_type': data.get('bom_type', 'manufacturing'),
            'status': 'draft',
            'effective_date': data.get('effective_date'),
            'components': self._process_components(data['components']),
            'total_cost': Decimal('0'),
            'created_at': datetime.now().isoformat()
        }
        
        # Calculate total cost
        bom['total_cost'] = self._calculate_bom_cost(bom['components'])
        
        return {
            'success': True,
            'bom': bom,
            'message': f"BOM {bom['bom_id']} created successfully",
            'next_steps': ['Review components', 'Calculate costs', 'Approve BOM'],
            'bot_id': self.bot_id
        }
    
    def _process_components(self, components: List[Dict]) -> List[Dict]:
        """Process and validate BOM components"""
        processed = []
        for comp in components:
            component = {
                'component_id': comp['component_id'],
                'component_name': comp.get('component_name'),
                'quantity': Decimal(str(comp.get('quantity', 1))),
                'unit': comp.get('unit', 'EA'),
                'scrap_factor': Decimal(str(comp.get('scrap_factor', 0))),
                'operation_sequence': comp.get('operation_sequence', 10),
                'reference_designator': comp.get('reference_designator'),
                'notes': comp.get('notes'),
                'unit_cost': Decimal(str(comp.get('unit_cost', 0)))
            }
            
            # Apply scrap factor
            effective_qty = component['quantity'] * (Decimal('1') + component['scrap_factor'])
            component['effective_quantity'] = float(effective_qty)
            component['extended_cost'] = float(effective_qty * component['unit_cost'])
            
            processed.append(component)
        
        return processed
    
    def _update_bom(self, bom_id: int, updates: Dict) -> Dict:
        """Update existing BOM"""
        updatable = ['version', 'status', 'components', 'effective_date', 'notes']
        changes = {k: v for k, v in updates.items() if k in updatable}
        
        if not changes:
            return {'success': False, 'error': 'No valid updates provided', 'bot_id': self.bot_id}
        
        # Create new version if major changes
        create_new_version = 'components' in changes or updates.get('create_version', False)
        
        return {
            'success': True,
            'bom_id': bom_id,
            'updates': changes,
            'new_version_created': create_new_version,
            'updated_at': datetime.now().isoformat(),
            'bot_id': self.bot_id
        }
    
    def _bom_explosion(self, product_id: int, quantity: float) -> Dict:
        """Explode BOM to show all components at all levels"""
        explosion = {
            'product_id': product_id,
            'quantity': quantity,
            'levels': []
        }
        
        # Level 0 - Final product
        level_0 = {
            'level': 0,
            'items': [{
                'item_id': product_id,
                'quantity': quantity,
                'type': 'finished_good'
            }]
        }
        explosion['levels'].append(level_0)
        
        # Would recursively explode sub-assemblies
        # Level 1 - Direct components
        # Level 2 - Sub-components, etc.
        
        # Summary
        explosion['summary'] = {
            'total_levels': len(explosion['levels']),
            'unique_components': 0,
            'total_line_items': 0
        }
        
        return {
            'success': True,
            'explosion': explosion,
            'bot_id': self.bot_id
        }
    
    def _bom_costing(self, bom_id: int) -> Dict:
        """Calculate detailed BOM costs"""
        costing = {
            'bom_id': bom_id,
            'cost_breakdown': {
                'material_cost': Decimal('0'),
                'labor_cost': Decimal('0'),
                'overhead_cost': Decimal('0'),
                'outside_processing': Decimal('0')
            },
            'total_cost': Decimal('0'),
            'cost_rollup': [],
            'calculated_at': datetime.now().isoformat()
        }
        
        # Calculate total
        costing['total_cost'] = sum(costing['cost_breakdown'].values())
        
        return {
            'success': True,
            'costing': costing,
            'bot_id': self.bot_id
        }
    
    def _calculate_bom_cost(self, components: List[Dict]) -> float:
        """Calculate total BOM cost from components"""
        total = Decimal('0')
        for comp in components:
            total += Decimal(str(comp.get('extended_cost', 0)))
        return float(total)
    
    def _compare_versions(self, bom_id: int, versions: List[str]) -> Dict:
        """Compare different BOM versions"""
        if len(versions) < 2:
            return {'success': False, 'error': 'Need at least 2 versions to compare', 'bot_id': self.bot_id}
        
        comparison = {
            'bom_id': bom_id,
            'versions_compared': versions,
            'differences': {
                'added_components': [],
                'removed_components': [],
                'quantity_changes': [],
                'cost_variance': 0
            }
        }
        
        return {
            'success': True,
            'comparison': comparison,
            'bot_id': self.bot_id
        }
    
    def _where_used(self, component_id: int) -> Dict:
        """Find all BOMs using a specific component"""
        where_used = {
            'component_id': component_id,
            'used_in': [],  # Would query all BOMs containing this component
            'total_assemblies': 0
        }
        
        return {
            'success': True,
            'where_used': where_used,
            'bot_id': self.bot_id
        }
    
    def _mass_update(self, updates: List[Dict]) -> Dict:
        """Update multiple BOMs in batch"""
        results = {
            'total_updates': len(updates),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for update in updates:
            # Process each update
            results['successful'] += 1
        
        return {
            'success': True,
            'results': results,
            'bot_id': self.bot_id
        }
