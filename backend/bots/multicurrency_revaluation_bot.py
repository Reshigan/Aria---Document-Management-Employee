"""
ARIA ERP - Multi-currency Revaluation Bot
Automated forex revaluation and currency conversion
"""
from decimal import Decimal
from datetime import date
from typing import Optional
from .bot_api_client import BotAPIClient

class MulticurrencyRevaluationBot:
    EXCHANGE_RATES = {
        'USD': Decimal('18.50'),
        'EUR': Decimal('20.10'),
        'GBP': Decimal('23.40'),
        'ZAR': Decimal('1.00')
    }
    
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
    
    def revalue_balances(self, target_currency: str = 'ZAR') -> dict:
        """Revalue all forex balances using Banking API"""
        try:
            accounts = self.client.get_bank_accounts()
            
            revaluations = []
            total_gain_loss = Decimal('0')
            
            for acc in accounts:
                currency = acc.get('currency', 'ZAR')
                if currency == target_currency:
                    continue
                
                balance_dec = Decimal(str(acc.get('current_balance', 0)))
                rate = self.EXCHANGE_RATES.get(currency, Decimal('1.00'))
                
                revalued_amount = balance_dec * rate
                gain_loss = revalued_amount - balance_dec
                
                revaluations.append({
                    'account': acc.get('account_name'),
                    'original_currency': currency,
                    'original_amount': float(balance_dec),
                    'exchange_rate': float(rate),
                    'revalued_amount': float(revalued_amount),
                    'gain_loss': float(gain_loss)
                })
                
                total_gain_loss += gain_loss
            
            return {
                'revaluation_date': str(date.today()),
                'target_currency': target_currency,
                'accounts_revalued': len(revaluations),
                'total_gain_loss': float(total_gain_loss),
                'revaluations': revaluations
            }
        except Exception as e:
            return {
                'error': str(e),
                'accounts_revalued': 0,
                'total_gain_loss': 0.0
            }

def main():
    print("\n" + "="*60)
    print("ARIA ERP - MULTI-CURRENCY REVALUATION BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - forex revaluation")
    print("✓ Supported currencies: 4")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
