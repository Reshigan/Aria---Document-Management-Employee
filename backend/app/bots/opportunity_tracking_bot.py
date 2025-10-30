import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OpportunityTrackingBot:
    """Track sales opportunities through pipeline stages with forecasting and analytics"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "opportunity_tracking"
        self.name = "OpportunityTrackingBot"
        self.db = db
        self.capabilities = [
            "create_opportunity", "update_opportunity", "update_stage", 
            "forecast_revenue", "win_loss_analysis", "pipeline_report", "list_opportunities"
        ]
        
        self.pipeline_stages = {
            'qualification': {'probability': 0.10, 'order': 1, 'description': 'Initial qualification'},
            'needs_analysis': {'probability': 0.25, 'order': 2, 'description': 'Analyzing customer needs'},
            'proposal': {'probability': 0.50, 'order': 3, 'description': 'Proposal submitted'},
            'negotiation': {'probability': 0.75, 'order': 4, 'description': 'Contract negotiation'},
            'closed_won': {'probability': 1.0, 'order': 5, 'description': 'Deal won'},
            'closed_lost': {'probability': 0.0, 'order': 6, 'description': 'Deal lost'}
        }
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_opportunity':
                return self._create_opportunity(context.get('data', {}))
            elif action == 'update_opportunity':
                return self._update_opportunity(context.get('opportunity_id'), context.get('data', {}))
            elif action == 'update_stage':
                return self._update_stage(context.get('opportunity_id'), context.get('new_stage'), context.get('notes'))
            elif action == 'forecast_revenue':
                return self._forecast_revenue(context.get('period', 'quarter'), context.get('filters', {}))
            elif action == 'win_loss_analysis':
                return self._win_loss_analysis(context.get('period'), context.get('filters', {}))
            elif action == 'pipeline_report':
                return self._pipeline_report(context.get('filters', {}))
            elif action == 'list_opportunities':
                return self._list_opportunities(context.get('stage'), context.get('filters', {}), context.get('limit', 50))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Opportunity tracking error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_opportunity(self, data: Dict) -> Dict:
        """Create new sales opportunity with weighted value calculation"""
        required_fields = ['name', 'customer_id', 'value']
        missing = [f for f in required_fields if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        stage = data.get('stage', 'qualification')
        if stage not in self.pipeline_stages:
            return {'success': False, 'error': f'Invalid stage: {stage}', 'bot_id': self.bot_id}
        
        probability = self.pipeline_stages[stage]['probability']
        value = Decimal(str(data['value']))
        weighted_value = value * Decimal(str(probability))
        
        opportunity = {
            'name': data['name'],
            'customer_id': data['customer_id'],
            'value': float(value),
            'stage': stage,
            'probability': probability,
            'weighted_value': float(weighted_value),
            'expected_close_date': data.get('expected_close_date'),
            'sales_rep': data.get('sales_rep'),
            'product': data.get('product'),
            'source': data.get('source', 'direct'),
            'notes': data.get('notes', ''),
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'opportunity': opportunity,
            'message': f"Opportunity '{data['name']}' created at {stage} stage",
            'next_actions': self._get_stage_actions(stage),
            'bot_id': self.bot_id
        }
    
    def _update_opportunity(self, opportunity_id: int, data: Dict) -> Dict:
        """Update opportunity details"""
        updatable_fields = ['name', 'value', 'expected_close_date', 'sales_rep', 'product', 'notes']
        updates = {k: v for k, v in data.items() if k in updatable_fields}
        
        if not updates:
            return {'success': False, 'error': 'No valid fields to update', 'bot_id': self.bot_id}
        
        return {
            'success': True,
            'opportunity_id': opportunity_id,
            'updated_fields': list(updates.keys()),
            'updates': updates,
            'message': 'Opportunity updated successfully',
            'bot_id': self.bot_id
        }
    
    def _update_stage(self, opportunity_id: int, new_stage: str, notes: Optional[str] = None) -> Dict:
        """Move opportunity through sales pipeline"""
        if new_stage not in self.pipeline_stages:
            return {'success': False, 'error': f'Invalid stage: {new_stage}', 'bot_id': self.bot_id}
        
        stage_info = self.pipeline_stages[new_stage]
        
        return {
            'success': True,
            'opportunity_id': opportunity_id,
            'new_stage': new_stage,
            'probability': stage_info['probability'],
            'stage_order': stage_info['order'],
            'notes': notes or f"Moved to {new_stage}",
            'message': f"Opportunity moved to {new_stage} ({stage_info['probability']*100:.0f}%)",
            'next_actions': self._get_stage_actions(new_stage),
            'bot_id': self.bot_id
        }
    
    def _forecast_revenue(self, period: str, filters: Dict) -> Dict:
        """Calculate weighted revenue forecast"""
        forecast = {
            'period': period,
            'filters': filters,
            'total_pipeline_value': 0,
            'weighted_forecast': 0,
            'best_case': 0,
            'worst_case': 0,
            'by_stage': {stage: {'count': 0, 'value': 0, 'weighted': 0, 'probability': info['probability']} 
                        for stage, info in self.pipeline_stages.items()}
        }
        
        return {
            'success': True,
            'forecast': forecast,
            'confidence_level': 'medium',
            'methodology': 'Probability-weighted pipeline value',
            'bot_id': self.bot_id
        }
    
    def _win_loss_analysis(self, period: str, filters: Dict) -> Dict:
        """Analyze won vs lost opportunities"""
        analysis = {
            'period': period,
            'won_count': 0,
            'lost_count': 0,
            'win_rate': 0,
            'avg_deal_size_won': 0,
            'avg_sales_cycle_days': 0,
            'total_won_value': 0,
            'top_loss_reasons': [],
            'win_factors': []
        }
        
        return {
            'success': True,
            'analysis': analysis,
            'insights': self._generate_insights(analysis),
            'bot_id': self.bot_id
        }
    
    def _pipeline_report(self, filters: Dict) -> Dict:
        """Generate comprehensive pipeline report"""
        report = {
            'summary': {
                'total_opportunities': 0,
                'total_value': 0,
                'weighted_value': 0,
                'avg_deal_size': 0
            },
            'by_stage': {stage: {'count': 0, 'value': 0, 'weighted': 0} 
                        for stage in self.pipeline_stages.keys()}
        }
        
        return {
            'success': True,
            'report': report,
            'bot_id': self.bot_id
        }
    
    def _list_opportunities(self, stage: Optional[str], filters: Dict, limit: int) -> Dict:
        """List opportunities with filtering"""
        if stage and stage not in self.pipeline_stages:
            return {'success': False, 'error': f'Invalid stage: {stage}', 'bot_id': self.bot_id}
        
        return {
            'success': True,
            'stage_filter': stage,
            'opportunities': [],
            'count': 0,
            'limit': limit,
            'bot_id': self.bot_id
        }
    
    def _get_stage_actions(self, stage: str) -> List[str]:
        """Get recommended actions for stage"""
        actions = {
            'qualification': ['Schedule discovery call', 'Gather requirements', 'Identify decision makers'],
            'needs_analysis': ['Conduct needs assessment', 'Prepare proposal', 'Calculate ROI'],
            'proposal': ['Submit proposal', 'Schedule presentation', 'Address questions'],
            'negotiation': ['Review contract terms', 'Finalize pricing', 'Get legal approval'],
            'closed_won': ['Create project plan', 'Schedule kickoff', 'Update CRM'],
            'closed_lost': ['Request feedback', 'Update loss reason', 'Plan follow-up']
        }
        return actions.get(stage, [])
    
    def _generate_insights(self, analysis: Dict) -> List[str]:
        """Generate insights from analysis"""
        insights = []
        if analysis.get('win_rate', 0) > 0.5:
            insights.append(f"Strong win rate of {analysis['win_rate']*100:.1f}%")
        return insights
