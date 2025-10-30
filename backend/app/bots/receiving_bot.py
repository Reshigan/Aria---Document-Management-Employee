import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

class ReceivingBot:
    """Manage goods receiving, quality inspection, putaway, and discrepancy handling"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "receiving"
        self.name = "ReceivingBot"
        self.db = db
        self.capabilities = [
            "create_receipt", "receive_goods", "quality_inspection", "record_discrepancy",
            "putaway", "receiving_report", "asn_processing"
        ]
        self.inspection_statuses = ['passed', 'failed', 'partial', 'pending']
        self.discrepancy_types = ['short', 'overage', 'damaged', 'wrong_item', 'quality_issue']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_receipt':
                return self._create_receipt(context.get('data', {}))
            elif action == 'receive_goods':
                return self._receive_goods(context.get('receipt_id'), context.get('items', []))
            elif action == 'quality_inspection':
                return self._quality_inspection(context.get('receipt_id'), context.get('inspection_data', {}))
            elif action == 'record_discrepancy':
                return self._record_discrepancy(context.get('receipt_id'), context.get('discrepancy_data', {}))
            elif action == 'putaway':
                return self._putaway(context.get('receipt_id'), context.get('location_assignments', []))
            elif action == 'receiving_report':
                return self._receiving_report(context.get('period'), context.get('filters', {}))
            elif action == 'asn_processing':
                return self._asn_processing(context.get('asn_data', {}))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Receiving error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_receipt(self, data: Dict) -> Dict:
        """Create goods receipt record"""
        required = ['purchase_order_id', 'supplier_id', 'expected_items']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        receipt = {
            'receipt_number': f"RCV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'purchase_order_id': data['purchase_order_id'],
            'supplier_id': data['supplier_id'],
            'warehouse_id': data.get('warehouse_id'),
            'expected_items': data['expected_items'],
            'received_items': [],
            'status': 'pending',
            'carrier': data.get('carrier'),
            'tracking_number': data.get('tracking_number'),
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'receipt': receipt,
            'message': f"Receipt {receipt['receipt_number']} created",
            'next_steps': ['Receive goods', 'Quality inspection', 'Putaway'],
            'bot_id': self.bot_id
        }
    
    def _receive_goods(self, receipt_id: int, items: List[Dict]) -> Dict:
        """Record actual received quantities"""
        if not items:
            return {'success': False, 'error': 'No items provided', 'bot_id': self.bot_id}
        
        received_items = []
        discrepancies = []
        
        for item in items:
            expected_qty = item.get('expected_quantity', 0)
            received_qty = item.get('received_quantity', 0)
            
            received_item = {
                'item_id': item['item_id'],
                'expected_quantity': expected_qty,
                'received_quantity': received_qty,
                'variance': received_qty - expected_qty,
                'condition': item.get('condition', 'good'),
                'lot_number': item.get('lot_number'),
                'expiry_date': item.get('expiry_date'),
                'received_at': datetime.now().isoformat()
            }
            
            received_items.append(received_item)
            
            if received_qty != expected_qty:
                discrepancies.append({
                    'item_id': item['item_id'],
                    'type': 'short' if received_qty < expected_qty else 'overage',
                    'variance': abs(received_qty - expected_qty)
                })
        
        return {
            'success': True,
            'receipt_id': receipt_id,
            'received_items': received_items,
            'discrepancies': discrepancies,
            'requires_action': len(discrepancies) > 0,
            'bot_id': self.bot_id
        }
    
    def _quality_inspection(self, receipt_id: int, inspection_data: Dict) -> Dict:
        """Perform quality inspection on received goods"""
        inspection = {
            'receipt_id': receipt_id,
            'inspector': inspection_data.get('inspector'),
            'inspection_date': datetime.now().isoformat(),
            'items_inspected': [],
            'overall_status': 'pending',
            'notes': inspection_data.get('notes', '')
        }
        
        items = inspection_data.get('items', [])
        passed = 0
        failed = 0
        
        for item in items:
            item_inspection = {
                'item_id': item['item_id'],
                'quantity_inspected': item.get('quantity_inspected', 0),
                'status': item.get('status', 'pending'),
                'defects_found': item.get('defects_found', []),
                'acceptance_criteria_met': item.get('acceptance_criteria_met', True)
            }
            
            if item_inspection['status'] == 'passed':
                passed += 1
            elif item_inspection['status'] == 'failed':
                failed += 1
            
            inspection['items_inspected'].append(item_inspection)
        
        if failed == 0 and passed > 0:
            inspection['overall_status'] = 'passed'
        elif failed > 0:
            inspection['overall_status'] = 'failed' if passed == 0 else 'partial'
        
        return {
            'success': True,
            'inspection': inspection,
            'requires_action': inspection['overall_status'] in ['failed', 'partial'],
            'bot_id': self.bot_id
        }
    
    def _record_discrepancy(self, receipt_id: int, discrepancy_data: Dict) -> Dict:
        """Record and track receiving discrepancies"""
        required = ['item_id', 'discrepancy_type', 'quantity']
        missing = [f for f in required if f not in discrepancy_data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        disc_type = discrepancy_data['discrepancy_type']
        if disc_type not in self.discrepancy_types:
            return {'success': False, 'error': f'Invalid type. Must be: {", ".join(self.discrepancy_types)}', 'bot_id': self.bot_id}
        
        discrepancy = {
            'receipt_id': receipt_id,
            'item_id': discrepancy_data['item_id'],
            'discrepancy_type': disc_type,
            'quantity': discrepancy_data['quantity'],
            'description': discrepancy_data.get('description', ''),
            'resolution_status': 'open',
            'reported_by': discrepancy_data.get('reported_by'),
            'reported_at': datetime.now().isoformat()
        }
        
        actions = {
            'short': ['Contact supplier', 'Request credit/replacement', 'Adjust inventory'],
            'overage': ['Verify PO', 'Accept or return excess', 'Adjust inventory'],
            'damaged': ['Document with photos', 'File claim', 'Quarantine items'],
            'wrong_item': ['Contact supplier', 'Arrange return', 'Reorder correct item'],
            'quality_issue': ['Reject shipment', 'Request replacement', 'Quality team review']
        }
        
        return {
            'success': True,
            'discrepancy': discrepancy,
            'recommended_actions': actions.get(disc_type, []),
            'bot_id': self.bot_id
        }
    
    def _putaway(self, receipt_id: int, location_assignments: List[Dict]) -> Dict:
        """Process putaway of received goods to storage locations"""
        if not location_assignments:
            return {'success': False, 'error': 'No location assignments provided', 'bot_id': self.bot_id}
        
        putaway_tasks = []
        
        for assignment in location_assignments:
            task = {
                'item_id': assignment['item_id'],
                'quantity': assignment['quantity'],
                'from_location': assignment.get('staging_location', 'receiving_dock'),
                'to_location': assignment['target_location'],
                'priority': assignment.get('priority', 'normal'),
                'assigned_to': assignment.get('assigned_to'),
                'status': 'pending',
                'created_at': datetime.now().isoformat()
            }
            putaway_tasks.append(task)
        
        return {
            'success': True,
            'receipt_id': receipt_id,
            'putaway_tasks': putaway_tasks,
            'total_tasks': len(putaway_tasks),
            'estimated_time_minutes': len(putaway_tasks) * 5,
            'bot_id': self.bot_id
        }
    
    def _receiving_report(self, period: str, filters: Dict) -> Dict:
        """Generate comprehensive receiving performance report"""
        report = {
            'period': period,
            'filters': filters,
            'summary': {
                'total_receipts': 0,
                'total_items_received': 0,
                'total_value': 0,
                'on_time_receipts': 0,
                'discrepancies_count': 0,
                'rejected_items': 0
            },
            'performance': {
                'avg_receiving_time_minutes': 0,
                'accuracy_rate': 0,
                'on_time_rate': 0,
                'damage_rate': 0
            },
            'by_supplier': {},
            'discrepancy_breakdown': {
                'short': 0,
                'overage': 0,
                'damaged': 0,
                'wrong_item': 0,
                'quality_issue': 0
            }
        }
        
        return {
            'success': True,
            'report': report,
            'insights': self._generate_receiving_insights(report),
            'bot_id': self.bot_id
        }
    
    def _asn_processing(self, asn_data: Dict) -> Dict:
        """Process Advanced Shipping Notice from supplier"""
        asn = {
            'asn_number': asn_data.get('asn_number', f"ASN-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            'supplier_id': asn_data.get('supplier_id'),
            'purchase_order_id': asn_data.get('purchase_order_id'),
            'expected_arrival': asn_data.get('expected_arrival'),
            'carrier': asn_data.get('carrier'),
            'tracking_number': asn_data.get('tracking_number'),
            'items': asn_data.get('items', []),
            'status': 'pending',
            'received_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'asn': asn,
            'message': 'ASN processed successfully',
            'preparation_status': 'ready',
            'bot_id': self.bot_id
        }
    
    def _generate_receiving_insights(self, report: Dict) -> List[str]:
        """Generate insights from receiving report"""
        insights = []
        
        accuracy = report['performance']['accuracy_rate']
        if accuracy < 95:
            insights.append(f"Receiving accuracy at {accuracy}% - below 95% target")
        
        damage_rate = report['performance']['damage_rate']
        if damage_rate > 2:
            insights.append(f"High damage rate: {damage_rate}% - review packaging with suppliers")
        
        return insights
