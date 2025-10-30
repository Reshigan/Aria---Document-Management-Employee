import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

class ShippingBot:
    """Manage shipments, carriers, rate calculation, tracking, and label generation"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "shipping"
        self.name = "ShippingBot"
        self.db = db
        self.capabilities = [
            "create_shipment", "calculate_rates", "generate_label", "track_shipment",
            "update_status", "schedule_pickup", "bulk_ship", "carrier_performance"
        ]
        
        self.carriers = {
            'fedex': {'name': 'FedEx', 'services': ['ground', 'express', '2day', 'overnight']},
            'ups': {'name': 'UPS', 'services': ['ground', 'express', '2day', 'overnight']},
            'usps': {'name': 'USPS', 'services': ['first_class', 'priority', 'priority_express']},
            'dhl': {'name': 'DHL', 'services': ['domestic', 'international']},
        }
        
        self.statuses = ['created', 'picked', 'packed', 'labeled', 'manifested', 'picked_up', 'in_transit', 'delivered', 'exception']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_shipment':
                return self._create_shipment(context.get('data', {}))
            elif action == 'calculate_rates':
                return self._calculate_rates(context.get('data', {}))
            elif action == 'generate_label':
                return self._generate_label(context.get('shipment_id'), context.get('carrier'), context.get('service'))
            elif action == 'track_shipment':
                return self._track_shipment(context.get('tracking_number'), context.get('carrier'))
            elif action == 'update_status':
                return self._update_status(context.get('shipment_id'), context.get('status'), context.get('notes'))
            elif action == 'schedule_pickup':
                return self._schedule_pickup(context.get('data', {}))
            elif action == 'bulk_ship':
                return self._bulk_ship(context.get('shipment_ids', []))
            elif action == 'carrier_performance':
                return self._carrier_performance(context.get('period', 'month'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Shipping error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_shipment(self, data: Dict) -> Dict:
        """Create new shipment record"""
        required = ['order_id', 'to_address', 'weight', 'dimensions']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        shipment = {
            'order_id': data['order_id'],
            'from_address': data.get('from_address', {}),
            'to_address': data['to_address'],
            'weight_lbs': data['weight'],
            'dimensions': data['dimensions'],  # length, width, height
            'insurance_value': data.get('insurance_value', 0),
            'signature_required': data.get('signature_required', False),
            'status': 'created',
            'carrier': None,
            'service': None,
            'tracking_number': None,
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'shipment': shipment,
            'message': 'Shipment created successfully',
            'next_steps': ['Calculate shipping rates', 'Select carrier and service', 'Generate label'],
            'bot_id': self.bot_id
        }
    
    def _calculate_rates(self, data: Dict) -> Dict:
        """Calculate shipping rates from all carriers"""
        required = ['from_zip', 'to_zip', 'weight', 'dimensions']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        rates = []
        base_rate = Decimal('10.00')
        weight = Decimal(str(data['weight']))
        
        # Calculate rates for each carrier/service combination
        for carrier_code, carrier_info in self.carriers.items():
            for service in carrier_info['services']:
                service_multiplier = {
                    'ground': Decimal('1.0'),
                    'express': Decimal('1.5'),
                    '2day': Decimal('1.8'),
                    'overnight': Decimal('2.5'),
                    'first_class': Decimal('0.8'),
                    'priority': Decimal('1.3'),
                    'priority_express': Decimal('2.0'),
                    'domestic': Decimal('1.2'),
                    'international': Decimal('3.0')
                }.get(service, Decimal('1.0'))
                
                rate = base_rate + (weight * Decimal('0.50')) * service_multiplier
                
                # Estimate delivery time
                delivery_days = {
                    'ground': 5, 'express': 2, '2day': 2, 'overnight': 1,
                    'first_class': 3, 'priority': 2, 'priority_express': 1,
                    'domestic': 3, 'international': 7
                }.get(service, 5)
                
                rates.append({
                    'carrier': carrier_code,
                    'carrier_name': carrier_info['name'],
                    'service': service,
                    'rate': float(rate),
                    'currency': 'USD',
                    'estimated_days': delivery_days,
                    'estimated_delivery': (datetime.now() + timedelta(days=delivery_days)).date().isoformat()
                })
        
        # Sort by rate
        rates.sort(key=lambda x: x['rate'])
        
        return {
            'success': True,
            'rates': rates,
            'cheapest': rates[0] if rates else None,
            'fastest': min(rates, key=lambda x: x['estimated_days']) if rates else None,
            'calculated_at': datetime.now().isoformat(),
            'bot_id': self.bot_id
        }
    
    def _generate_label(self, shipment_id: int, carrier: str, service: str) -> Dict:
        """Generate shipping label"""
        if carrier not in self.carriers:
            return {'success': False, 'error': f'Invalid carrier: {carrier}', 'bot_id': self.bot_id}
        
        if service not in self.carriers[carrier]['services']:
            return {'success': False, 'error': f'Invalid service for {carrier}', 'bot_id': self.bot_id}
        
        tracking_number = f"{carrier.upper()}{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        label = {
            'shipment_id': shipment_id,
            'carrier': carrier,
            'service': service,
            'tracking_number': tracking_number,
            'label_format': 'PDF',
            'label_size': '4x6',
            'label_url': f'/labels/{tracking_number}.pdf',
            'generated_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'label': label,
            'message': f'Label generated: {tracking_number}',
            'bot_id': self.bot_id
        }
    
    def _track_shipment(self, tracking_number: str, carrier: Optional[str]) -> Dict:
        """Track shipment status"""
        if not tracking_number:
            return {'success': False, 'error': 'Tracking number required', 'bot_id': self.bot_id}
        
        tracking_info = {
            'tracking_number': tracking_number,
            'carrier': carrier or 'auto-detected',
            'current_status': 'in_transit',
            'estimated_delivery': (datetime.now() + timedelta(days=2)).isoformat(),
            'current_location': 'Sorting facility',
            'events': [
                {
                    'timestamp': (datetime.now() - timedelta(days=1)).isoformat(),
                    'status': 'picked_up',
                    'location': 'Origin facility',
                    'description': 'Package picked up'
                },
                {
                    'timestamp': datetime.now().isoformat(),
                    'status': 'in_transit',
                    'location': 'Sorting facility',
                    'description': 'In transit to destination'
                }
            ]
        }
        
        return {
            'success': True,
            'tracking': tracking_info,
            'bot_id': self.bot_id
        }
    
    def _update_status(self, shipment_id: int, status: str, notes: Optional[str]) -> Dict:
        """Update shipment status"""
        if status not in self.statuses:
            return {'success': False, 'error': f'Invalid status. Must be: {", ".join(self.statuses)}', 'bot_id': self.bot_id}
        
        return {
            'success': True,
            'shipment_id': shipment_id,
            'previous_status': 'created',
            'new_status': status,
            'notes': notes,
            'updated_at': datetime.now().isoformat(),
            'bot_id': self.bot_id
        }
    
    def _schedule_pickup(self, data: Dict) -> Dict:
        """Schedule carrier pickup"""
        required = ['carrier', 'pickup_date', 'location']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        pickup = {
            'carrier': data['carrier'],
            'pickup_date': data['pickup_date'],
            'location': data['location'],
            'time_window': data.get('time_window', '9:00-17:00'),
            'package_count': data.get('package_count', 1),
            'total_weight': data.get('total_weight', 0),
            'confirmation_number': f"PU{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'status': 'scheduled',
            'scheduled_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'pickup': pickup,
            'message': f"Pickup scheduled with {data['carrier']}",
            'bot_id': self.bot_id
        }
    
    def _bulk_ship(self, shipment_ids: List[int]) -> Dict:
        """Process multiple shipments in batch"""
        if not shipment_ids:
            return {'success': False, 'error': 'No shipments provided', 'bot_id': self.bot_id}
        
        results = {
            'total': len(shipment_ids),
            'processed': 0,
            'failed': 0,
            'shipments': []
        }
        
        for shipment_id in shipment_ids:
            results['shipments'].append({
                'shipment_id': shipment_id,
                'status': 'processed',
                'tracking_number': f"BULK{shipment_id}{datetime.now().strftime('%H%M%S')}"
            })
            results['processed'] += 1
        
        return {
            'success': True,
            'batch_results': results,
            'message': f"Processed {results['processed']}/{results['total']} shipments",
            'bot_id': self.bot_id
        }
    
    def _carrier_performance(self, period: str) -> Dict:
        """Analyze carrier performance metrics"""
        performance = {
            'period': period,
            'by_carrier': {}
        }
        
        for carrier_code, carrier_info in self.carriers.items():
            performance['by_carrier'][carrier_code] = {
                'name': carrier_info['name'],
                'shipments': 0,
                'on_time_rate': 0,
                'avg_transit_days': 0,
                'avg_cost': 0,
                'exception_rate': 0,
                'damage_rate': 0
            }
        
        return {
            'success': True,
            'performance': performance,
            'recommendations': self._generate_carrier_recommendations(performance),
            'bot_id': self.bot_id
        }
    
    def _generate_carrier_recommendations(self, performance: Dict) -> List[str]:
        """Generate recommendations based on carrier performance"""
        return [
            'Review carriers with >5% exception rates',
            'Negotiate rates with high-volume carriers',
            'Consider backup carriers for critical shipments'
        ]
