"""
ARIA ERP - Customer Churn Prediction Bot
AI-powered customer retention analytics
"""
from datetime import date, timedelta
from typing import Optional
from .bot_api_client import BotAPIClient

class CustomerChurnPredictionBot:
    def __init__(
        self,
        api_client: Optional[BotAPIClient] = None,
        mode: str = "api",
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        db_session = None,
        tenant_id: Optional[int] = None
    ):
        if api_client:
            self.client = api_client
        else:
            self.client = BotAPIClient(
                mode=mode,
                api_base_url=api_base_url,
                api_token=api_token,
                db_session=db_session,
                tenant_id=tenant_id
            )
    
    def predict_churn_risk(self, customer_id: int) -> dict:
        """Predict customer churn risk using Reports API"""
        try:
            ar_report = self.client.get_aged_receivables()
            
            customer_data = next((c for c in ar_report.get('customers', []) if c.get('customer_id') == customer_id), None)
            
            if not customer_data:
                return {
                    'customer_id': customer_id,
                    'churn_score': 50,
                    'churn_risk': 'MEDIUM',
                    'recommended_action': 'MONITOR'
                }
            
            current_balance = float(customer_data.get('current', 0))
            overdue_balance = float(customer_data.get('over_30', 0)) + float(customer_data.get('over_60', 0)) + float(customer_data.get('over_90', 0))
            
            churn_score = 0
            if current_balance == 0 and overdue_balance == 0:
                churn_score += 40
            elif current_balance < 1000:
                churn_score += 20
            
            if overdue_balance > current_balance:
                churn_score += 30
            
            churn_risk = 'HIGH' if churn_score >= 50 else ('MEDIUM' if churn_score >= 30 else 'LOW')
            
            return {
                'customer_id': customer_id,
                'churn_score': churn_score,
                'churn_risk': churn_risk,
                'current_balance': current_balance,
                'overdue_balance': overdue_balance,
                'recommended_action': 'CONTACT_IMMEDIATELY' if churn_risk == 'HIGH' else 'MONITOR'
            }
            
        except Exception as e:
            return {
                'customer_id': customer_id,
                'error': str(e),
                'churn_score': 50,
                'churn_risk': 'UNKNOWN'
            }

def main():
    print("\n" + "="*60)
    print("ARIA ERP - CUSTOMER CHURN PREDICTION BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - AI churn analytics")
    print("✓ Retention monitoring: ACTIVE")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
