"""
ARIA ERP - BBBEE Compliance Bot
Automated BBBEE scorecard calculation and reporting for South African businesses
"""
from typing import Dict, List, Any
from datetime import datetime
import json

class BBBEEComplianceBot:
    """Automated BBBEE scorecard calculation and reporting"""
    
    def __init__(self):
        self.name = "bbbee_compliance_bot"
        self.description = "Calculate and monitor BBBEE compliance scorecards"
        self.capabilities = ["scorecard_calculation", "compliance_monitoring", "reporting"]
        
        # BBBEE scorecard elements and weights (South Africa)
        self.scorecard_elements = {
            'ownership': {'weight': 25.0, 'max_points': 25.0},
            'management_control': {'weight': 15.0, 'max_points': 15.0},
            'skills_development': {'weight': 10.0, 'max_points': 10.0},
            'enterprise_development': {'weight': 20.0, 'max_points': 20.0},
            'socio_economic_development': {'weight': 5.0, 'max_points': 5.0},
            'preferential_procurement': {'weight': 20.0, 'max_points': 20.0},
            'localisation': {'weight': 5.0, 'max_points': 5.0}
        }
        
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, str]:
        """Validate input data"""
        # Minimal validation for demo purposes
        return True, ""
        
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute BBBEE compliance calculation"""
        try:
            company_data = input_data.get('company_data', {})
            reporting_period = input_data.get('reporting_period', '2024')
            previous_scores = input_data.get('previous_scores', {})
            
            # Calculate current BBBEE score
            scorecard = self._calculate_bbbee_score(company_data)
            
            # Determine BBBEE level
            bbbee_level = self._determine_bbbee_level(scorecard['total_score'])
            
            # Generate recommendations
            recommendations = self._generate_recommendations(scorecard, previous_scores)
            
            return {
                'success': True,
                'bot': 'BBBEE Compliance Bot',
                'results': {
                    'scorecard': scorecard,
                    'bbbee_level': bbbee_level,
                    'certification_status': 'Pending Verification',
                    'reporting_period': reporting_period,
                    'recommendations': recommendations,
                    'next_review_date': self._calculate_next_review_date()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'bot': 'BBBEE Compliance Bot',
                'error': str(e)
            }
    
    def _calculate_bbbee_score(self, company_data: Dict) -> Dict[str, Any]:
        """Calculate BBBEE score based on company data"""
        # Mock calculation with realistic values
        ownership_score = company_data.get('black_ownership_percentage', 25.0) * 0.8  # Max 20 points
        management_control_score = company_data.get('black_management_percentage', 30.0) * 0.5  # Max 7.5 points
        skills_dev_score = min(company_data.get('skills_expenditure', 100000) / 10000, 10.0)  # Scale expenditure
        ent_dev_score = min(company_data.get('enterprise_development_spending', 200000) / 10000, 20.0)  # Scale spending
        
        scorecard = {
            'ownership': round(min(ownership_score, 25.0), 2),
            'management_control': round(min(management_control_score, 15.0), 2),
            'skills_development': round(min(skills_dev_score, 10.0), 2),
            'enterprise_development': round(min(ent_dev_score, 20.0), 2),
            'socio_economic_development': 3.5,  # Mock value
            'preferential_procurement': 12.8,  # Mock value
            'localisation': 4.2  # Mock value
        }
        
        scorecard['total_score'] = round(sum(scorecard.values()), 2)
        scorecard['maximum_possible'] = 100.0
        
        return scorecard
    
    def _determine_bbbee_level(self, total_score: float) -> Dict[str, str]:
        """Determine BBBEE level based on score"""
        if total_score >= 80:
            return {'level': 'Level 1', 'description': 'Contributor EE status recognised as Exempt Micro Enterprises (EMEs)'}
        elif total_score >= 65:
            return {'level': 'Level 2', 'description': 'Contributor with 51%+ black ownership'}
        elif total_score >= 50:
            return {'level': 'Level 3', 'description': 'Achieved minimum BBBEE contributor score'}
        elif total_score >= 40:
            return {'level': 'Level 4', 'description': 'Meets minimum requirements under Codes of Good Practice'}
        elif total_score >= 30:
            return {'level': 'Level 5', 'description': 'Meets lower minimum requirements'}
        elif total_score >= 15:
            return {'level': 'Level 6', 'description': 'Basic BBBEE recognition'}
        else:
            return {'level': 'None', 'description': 'Does not meet BBBEE requirements'}
    
    def _generate_recommendations(self, scorecard: Dict, previous_scores: Dict) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        # Analyze scorecard elements
        if scorecard['ownership'] < 20:
            recommendations.append('Increase black ownership stake to maximize ownership points')
        
        if scorecard['skills_development'] < 7:
            recommendations.append('Increase skills development expenditure and program scope')
            
        if scorecard['enterprise_development'] < 15:
            recommendations.append('Enhance enterprise development initiatives and partnerships')
            
        # Compare with previous scores if available
        if previous_scores:
            current_total = scorecard['total_score']
            previous_total = sum(previous_scores.get('elements', {}).values())
            if current_total > previous_total:
                recommendations.append('Score improvement maintained - continue current strategies')
            else:
                recommendations.append('Focus on areas with lowest scores for maximum impact')
        
        if not recommendations:
            recommendations.append('Current BBBEE performance is strong - monitor key metrics regularly')
            
        return recommendations
    
    def _calculate_next_review_date(self) -> str:
        """Calculate next review date"""
        from datetime import datetime, timedelta
        next_review = datetime.now() + timedelta(days=90)
        return next_review.strftime('%Y-%m-%d')

# Global instance
bbbee_compliance_bot = BBBEEComplianceBot()