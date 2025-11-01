"""
ARIA ERP - Multi-currency Revaluation Bot
Automated forex revaluation and currency conversion
"""
import sqlite3
from decimal import Decimal
from datetime import date

class MulticurrencyRevaluationBot:
    EXCHANGE_RATES = {
        'USD': Decimal('18.50'),
        'EUR': Decimal('20.10'),
        'GBP': Decimal('23.40'),
        'ZAR': Decimal('1.00')
    }
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def revalue_balances(self, company_id: int, target_currency: str = 'ZAR') -> dict:
        """Revalue all forex balances"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get bank accounts in foreign currencies
            cursor.execute("""
                SELECT id, account_name, current_balance, currency
                FROM bank_accounts
                WHERE company_id = ? AND currency != ? AND is_active = 1
            """, (company_id, target_currency))
            
            revaluations = []
            total_gain_loss = Decimal('0')
            
            for acc_id, name, balance, currency in cursor.fetchall():
                balance_dec = Decimal(str(balance))
                rate = self.EXCHANGE_RATES.get(currency, Decimal('1.00'))
                
                revalued_amount = balance_dec * rate
                gain_loss = revalued_amount - balance_dec
                
                revaluations.append({
                    'account': name,
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
        finally:
            conn.close()

def main():
    print("\n" + "="*60)
    print("ARIA ERP - MULTI-CURRENCY REVALUATION BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - forex revaluation")
    print("✓ Supported currencies: 4")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
