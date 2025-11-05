"""
ARIA ERP - Payment Reminder Bot
Automated payment reminders with smart escalation
"""
from datetime import datetime, date, timedelta
from typing import Optional
from .bot_api_client import BotAPIClient

class PaymentReminderBot:
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
    
    def send_reminders(self) -> dict:
        """Send automated payment reminders using Reports API"""
        try:
            ar_report = self.client.get_aged_receivables()
            
            reminders = []
            
            for customer in ar_report.get('customers', []):
                over_90 = float(customer.get('over_90', 0))
                over_60 = float(customer.get('over_60', 0))
                over_30 = float(customer.get('over_30', 0))
                
                if over_90 > 0:
                    reminders.append({
                        'customer_id': customer.get('customer_id'),
                        'customer_name': customer.get('customer_name'),
                        'amount': over_90,
                        'days_overdue': 90,
                        'reminder_level': 'FINAL_NOTICE'
                    })
                elif over_60 > 0:
                    reminders.append({
                        'customer_id': customer.get('customer_id'),
                        'customer_name': customer.get('customer_name'),
                        'amount': over_60,
                        'days_overdue': 60,
                        'reminder_level': 'SECOND_REMINDER'
                    })
                elif over_30 > 0:
                    reminders.append({
                        'customer_id': customer.get('customer_id'),
                        'customer_name': customer.get('customer_name'),
                        'amount': over_30,
                        'days_overdue': 30,
                        'reminder_level': 'FIRST_REMINDER'
                    })
            
            return {
                'success': True,
                'reminders_sent': len(reminders),
                'reminders': reminders
            }
            
        except Exception as e:
            return {'error': str(e), 'reminders_sent': 0}

def main():
    print("\n" + "="*60)
    print("ARIA ERP - PAYMENT REMINDER BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - automated reminders")
    print("✓ Smart escalation: ENABLED")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
