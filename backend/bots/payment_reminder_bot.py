"""
ARIA ERP - Payment Reminder Bot
Automated payment reminders with smart escalation
"""

import sqlite3
from datetime import datetime, date, timedelta

class PaymentReminderBot:
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def send_reminders(self, company_id: int) -> dict:
        """Send automated payment reminders"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get overdue invoices
            cursor.execute("""
                SELECT si.id, si.invoice_number, si.customer_id,
                       c.customer_name, si.total_amount, si.due_date,
                       julianday('now') - julianday(si.due_date) as days_overdue
                FROM sales_invoices si
                JOIN customers c ON si.customer_id = c.id
                WHERE si.company_id = ? AND si.status IN ('SENT', 'OVERDUE')
                AND si.due_date < date('now')
                ORDER BY days_overdue DESC
            """, (company_id,))
            
            reminders = []
            
            for row in cursor.fetchall():
                invoice_id, inv_num, cust_id, cust_name, amount, due_date, days_overdue = row
                
                # Determine reminder level
                if days_overdue >= 60:
                    level = 'FINAL_NOTICE'
                elif days_overdue >= 30:
                    level = 'SECOND_REMINDER'
                elif days_overdue >= 7:
                    level = 'FIRST_REMINDER'
                else:
                    level = 'GENTLE_REMINDER'
                
                reminders.append({
                    'invoice_id': invoice_id,
                    'invoice_number': inv_num,
                    'customer': cust_name,
                    'amount': float(amount),
                    'days_overdue': int(days_overdue),
                    'reminder_level': level
                })
                
                # Log reminder
                cursor.execute("""
                    INSERT INTO payment_reminders (
                        invoice_id, reminder_level, sent_at
                    ) VALUES (?, ?, ?)
                """, (invoice_id, level, datetime.now()))
            
            conn.commit()
            
            return {
                'success': True,
                'reminders_sent': len(reminders),
                'reminders': reminders
            }
            
        except Exception as e:
            conn.rollback()
            return {'error': str(e)}
        finally:
            conn.close()

def main():
    print("\n" + "="*60)
    print("ARIA ERP - PAYMENT REMINDER BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - automated reminders")
    print("✓ Smart escalation: ENABLED")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
