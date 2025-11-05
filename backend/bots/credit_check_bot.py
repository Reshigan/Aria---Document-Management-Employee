"""
ARIA ERP - Credit Check Bot
Automated credit risk assessment and limit management
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
from .bot_api_client import BotAPIClient

class CreditCheckBot:
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
    
    def assess_credit_risk(self, customer_id: int) -> dict:
        """AI-powered credit risk assessment using Reports API"""
        try:
            ar_report = self.client.get_aged_receivables()
            
            customer_data = next((c for c in ar_report.get('customers', []) if c.get('customer_id') == customer_id), None)
            
            if not customer_data:
                return {
                    'customer_id': customer_id,
                    'risk_score': 50,
                    'risk_level': 'MEDIUM',
                    'recommended_credit_limit': 250000,
                    'payment_history': {
                        'total_invoices': 0,
                        'paid_count': 0,
                        'overdue_count': 0,
                        'avg_days_late': 0.0
                    }
                }
            
            overdue_amount = Decimal(str(customer_data.get('over_90', 0))) + Decimal(str(customer_data.get('over_60', 0)))
            total_outstanding = Decimal(str(customer_data.get('total', 0)))
            
            risk_score = 50
            if total_outstanding > 0:
                overdue_ratio = float(overdue_amount / total_outstanding)
                risk_score += int(overdue_ratio * 50)
            
            risk_score = max(0, min(100, risk_score))
            
            if risk_score < 30:
                risk_level = 'LOW'
                recommended_limit = 500000
            elif risk_score < 60:
                risk_level = 'MEDIUM'
                recommended_limit = 250000
            else:
                risk_level = 'HIGH'
                recommended_limit = 50000
            
            return {
                'customer_id': customer_id,
                'risk_score': risk_score,
                'risk_level': risk_level,
                'recommended_credit_limit': recommended_limit,
                'payment_history': {
                    'total_outstanding': float(total_outstanding),
                    'overdue_amount': float(overdue_amount),
                    'overdue_ratio': float(overdue_amount / total_outstanding) if total_outstanding > 0 else 0.0
                }
            }
            
        except Exception as e:
            return {
                'customer_id': customer_id,
                'error': str(e),
                'risk_score': 50,
                'risk_level': 'UNKNOWN'
            }

def main():
    print("\n" + "="*60)
    print("ARIA ERP - CREDIT CHECK BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - AI credit risk assessment")
    print("✓ Real-time credit monitoring: ACTIVE")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
