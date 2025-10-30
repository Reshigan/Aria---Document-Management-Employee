import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

class QualityControlBot:
    """Quality Control management - inspections, defects, nonconformance, statistical QC"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "quality_control"
        self.name = "QualityControlBot"
        self.db = db
        self.capabilities = [
            "create_inspection", "record_results", "defect_tracking", "nonconformance_report",
            "corrective_action", "spc_analysis", "quality_report"
        ]
        self.inspection_results = ['pass', 'fail', 'rework', 'scrap']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_inspection':
                return self._create_inspection(context.get('data', {}))
            elif action == 'record_results':
                return self._record_results(context.get('inspection_id'), context.get('results', {}))
            elif action == 'defect_tracking':
                return self._defect_tracking(context.get('defect_data', {}))
            elif action == 'nonconformance_report':
                return self._nonconformance_report(context.get('ncr_data', {}))
            elif action == 'corrective_action':
                return self._corrective_action(context.get('ncr_id'), context.get('actions', []))
            elif action == 'spc_analysis':
                return self._spc_analysis(context.get('process_id'), context.get('data_points', []))
            elif action == 'quality_report':
                return self._quality_report(context.get('period'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"QC error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_inspection(self, data: Dict) -> Dict:
        """Create quality inspection plan"""
        inspection = {
            'inspection_id': f"QC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'inspection_type': data.get('inspection_type', 'receiving'),
            'item_id': data.get('item_id'),
            'lot_number': data.get('lot_number'),
            'sample_size': data.get('sample_size', 0),
            'characteristics': data.get('characteristics', []),
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'inspection': inspection,
            'bot_id': self.bot_id
        }
    
    def _record_results(self, inspection_id: int, results: Dict) -> Dict:
        """Record inspection results"""
        inspection_results = {
            'inspection_id': inspection_id,
            'inspector': results.get('inspector'),
            'result': results.get('result', 'pass'),
            'measurements': results.get('measurements', []),
            'defects_found': results.get('defects_found', []),
            'disposition': results.get('disposition'),
            'inspected_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'results': inspection_results,
            'bot_id': self.bot_id
        }
    
    def _defect_tracking(self, defect_data: Dict) -> Dict:
        """Track and categorize defects"""
        defect = {
            'defect_id': f"DEF-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'defect_type': defect_data.get('defect_type'),
            'severity': defect_data.get('severity', 'minor'),
            'quantity': defect_data.get('quantity', 1),
            'root_cause': defect_data.get('root_cause'),
            'reported_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'defect': defect,
            'bot_id': self.bot_id
        }
    
    def _nonconformance_report(self, ncr_data: Dict) -> Dict:
        """Create Non-Conformance Report"""
        ncr = {
            'ncr_number': f"NCR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'description': ncr_data.get('description'),
            'item_id': ncr_data.get('item_id'),
            'quantity_affected': ncr_data.get('quantity_affected', 0),
            'disposition': ncr_data.get('disposition'),
            'status': 'open',
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'ncr': ncr,
            'bot_id': self.bot_id
        }
    
    def _corrective_action(self, ncr_id: int, actions: List[Dict]) -> Dict:
        """Define corrective actions for NCR"""
        corrective_actions = {
            'ncr_id': ncr_id,
            'actions': actions,
            'status': 'in_progress'
        }
        
        return {
            'success': True,
            'corrective_actions': corrective_actions,
            'bot_id': self.bot_id
        }
    
    def _spc_analysis(self, process_id: int, data_points: List[float]) -> Dict:
        """Statistical Process Control analysis"""
        if not data_points:
            return {'success': False, 'error': 'No data points provided', 'bot_id': self.bot_id}
        
        import statistics
        mean = statistics.mean(data_points)
        std_dev = statistics.stdev(data_points) if len(data_points) > 1 else 0
        
        spc = {
            'process_id': process_id,
            'mean': mean,
            'std_dev': std_dev,
            'ucl': mean + (3 * std_dev),
            'lcl': mean - (3 * std_dev),
            'out_of_control_points': [],
            'capability_index': 0
        }
        
        return {
            'success': True,
            'spc': spc,
            'bot_id': self.bot_id
        }
    
    def _quality_report(self, period: str) -> Dict:
        """Generate quality metrics report"""
        report = {
            'period': period,
            'metrics': {
                'first_pass_yield': 0,
                'defect_rate': 0,
                'scrap_rate': 0,
                'rework_rate': 0
            },
            'top_defects': [],
            'trends': []
        }
        
        return {
            'success': True,
            'report': report,
            'bot_id': self.bot_id
        }
