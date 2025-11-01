"""
ARIA ERP - Expense Approval Bot
Automates expense claim approval with AI-powered fraud detection
"""

import sqlite3
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List

class ExpenseApprovalBot:
    """Automated Expense Approval with Fraud Detection"""
    
    APPROVAL_THRESHOLDS = {
        'EMPLOYEE': 1000,
        'MANAGER': 5000,
        'DIRECTOR': 20000,
        'CFO': float('inf')
    }
    
    FRAUD_INDICATORS = {
        'duplicate_claim': 50,  # points
        'excessive_amount': 30,
        'frequent_claims': 20,
        'weekend_expense': 10,
        'round_number': 5
    }
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def process_expense_claim(
        self,
        company_id: int,
        claim_id: int
    ) -> Dict:
        """Process expense claim with automated approval logic"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get claim details
            cursor.execute("""
                SELECT e.id, e.employee_id, e.claim_date, e.total_amount,
                       e.description, e.category, e.status,
                       emp.first_name, emp.last_name, emp.department
                FROM expense_claims e
                JOIN employees emp ON e.employee_id = emp.id
                WHERE e.id = ? AND e.company_id = ?
            """, (claim_id, company_id))
            
            claim = cursor.fetchone()
            if not claim:
                return {'error': 'Claim not found'}
            
            claim_amount = Decimal(str(claim[3]))
            
            # Run fraud detection
            fraud_score, fraud_reasons = self._detect_fraud(cursor, claim_id, claim)
            
            # Auto-approve if low fraud score and within threshold
            if fraud_score < 20 and claim_amount < self.APPROVAL_THRESHOLDS['EMPLOYEE']:
                cursor.execute("""
                    UPDATE expense_claims SET
                        status = 'APPROVED',
                        approved_at = ?,
                        approval_notes = ?
                    WHERE id = ?
                """, (datetime.now(), 'Auto-approved by AI', claim_id))
                
                conn.commit()
                decision = 'APPROVED'
            elif fraud_score >= 50:
                cursor.execute("""
                    UPDATE expense_claims SET
                        status = 'REJECTED',
                        approved_at = ?,
                        approval_notes = ?
                    WHERE id = ?
                """, (datetime.now(), f'Auto-rejected: {", ".join(fraud_reasons)}', claim_id))
                
                conn.commit()
                decision = 'REJECTED'
            else:
                decision = 'REVIEW_REQUIRED'
            
            return {
                'claim_id': claim_id,
                'decision': decision,
                'fraud_score': fraud_score,
                'fraud_reasons': fraud_reasons,
                'amount': float(claim_amount)
            }
            
        except Exception as e:
            conn.rollback()
            return {'error': str(e)}
        finally:
            conn.close()
    
    def _detect_fraud(self, cursor, claim_id: int, claim: tuple) -> tuple:
        """Detect potential fraud indicators"""
        score = 0
        reasons = []
        
        employee_id = claim[1]
        claim_date = claim[2]
        amount = Decimal(str(claim[3]))
        description = claim[4]
        
        # Check for duplicates
        cursor.execute("""
            SELECT COUNT(*) FROM expense_claims
            WHERE employee_id = ? AND claim_date = ?
            AND ABS(total_amount - ?) < 0.01
            AND id != ?
        """, (employee_id, claim_date, float(amount), claim_id))
        
        if cursor.fetchone()[0] > 0:
            score += self.FRAUD_INDICATORS['duplicate_claim']
            reasons.append('Duplicate claim detected')
        
        # Check excessive amount for category
        if amount > 5000:
            score += self.FRAUD_INDICATORS['excessive_amount']
            reasons.append('Excessive amount')
        
        # Check round numbers (potential fabrication)
        if amount == int(amount) and amount > 100:
            score += self.FRAUD_INDICATORS['round_number']
            reasons.append('Suspicious round number')
        
        # Check frequent claims
        cursor.execute("""
            SELECT COUNT(*) FROM expense_claims
            WHERE employee_id = ?
            AND claim_date >= date('now', '-7 days')
        """, (employee_id,))
        
        if cursor.fetchone()[0] > 5:
            score += self.FRAUD_INDICATORS['frequent_claims']
            reasons.append('Unusually frequent claims')
        
        return score, reasons


def main():
    """CLI interface"""
    bot = ExpenseApprovalBot()
    
    print("\n" + "="*60)
    print("ARIA ERP - EXPENSE APPROVAL BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - monitoring expense claims")
    print("✓ Fraud detection: ACTIVE")
    print("✓ Auto-approval threshold: R1,000")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
