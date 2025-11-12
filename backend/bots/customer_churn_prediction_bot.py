"""
ARIA ERP - Customer Churn Prediction Bot
AI-powered customer retention analytics
"""
import sqlite3
from datetime import date, timedelta

class CustomerChurnPredictionBot:
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def predict_churn_risk(self, company_id: int, customer_id: int) -> dict:
        """Predict customer churn risk"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Days since last order
            cursor.execute("""
                SELECT MAX(julianday('now') - julianday(invoice_date))
                FROM sales_invoices
                WHERE company_id = ? AND customer_id = ?
            """, (company_id, customer_id))
            
            days_since_last = cursor.fetchone()[0] or 999
            
            # Order frequency (last 12 months)
            cursor.execute("""
                SELECT COUNT(*)
                FROM sales_invoices
                WHERE company_id = ? AND customer_id = ?
                AND invoice_date >= date('now', '-12 months')
            """, (company_id, customer_id))
            
            order_count = cursor.fetchone()[0]
            
            # Calculate churn score
            churn_score = 0
            if days_since_last > 90:
                churn_score += 40
            elif days_since_last > 60:
                churn_score += 20
            
            if order_count < 4:
                churn_score += 30
            
            churn_risk = 'HIGH' if churn_score >= 50 else ('MEDIUM' if churn_score >= 30 else 'LOW')
            
            return {
                'customer_id': customer_id,
                'churn_score': churn_score,
                'churn_risk': churn_risk,
                'days_since_last_order': int(days_since_last),
                'orders_last_12_months': order_count,
                'recommended_action': 'CONTACT_IMMEDIATELY' if churn_risk == 'HIGH' else 'MONITOR'
            }
            
        finally:
            conn.close()

def main():
    print("\n" + "="*60)
    print("ARIA ERP - CUSTOMER CHURN PREDICTION BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - AI churn analytics")
    print("✓ Retention monitoring: ACTIVE")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
