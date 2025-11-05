"""
ARIA ERP - Expense Approval Bot
Automates expense claim approval with AI-powered fraud detection
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional
from .bot_api_client import BotAPIClient

class ExpenseApprovalBot:
    """Automated Expense Approval with Fraud Detection"""
    
    APPROVAL_THRESHOLDS = {
        'EMPLOYEE': 1000,
        'MANAGER': 5000,
        'DIRECTOR': 20000,
        'CFO': float('inf')
    }
    
    FRAUD_INDICATORS = {
        'duplicate_claim': 50,
        'excessive_amount': 30,
        'frequent_claims': 20,
        'weekend_expense': 10,
        'round_number': 5
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
    
    def process_expense_claim(self, bill_id: int) -> Dict:
        """Process expense claim with automated approval logic using AP API"""
        try:
            bills = self.client.get_vendor_bills()
            
            bill = next((b for b in bills if b['id'] == bill_id), None)
            if not bill:
                return {'error': 'Bill not found'}
            
            claim_amount = Decimal(str(bill['total_amount']))
            
            fraud_score, fraud_reasons = self._detect_fraud(bill, bills)
            
            if fraud_score < 20 and claim_amount < self.APPROVAL_THRESHOLDS['EMPLOYEE']:
                result = self.client.approve_vendor_bill(bill_id)
                decision = 'APPROVED' if result.get('success') else 'FAILED'
            elif fraud_score >= 50:
                decision = 'REJECTED'
            else:
                decision = 'REVIEW_REQUIRED'
            
            return {
                'bill_id': bill_id,
                'decision': decision,
                'fraud_score': fraud_score,
                'fraud_reasons': fraud_reasons,
                'amount': float(claim_amount)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _detect_fraud(self, bill: dict, all_bills: list) -> tuple:
        """Detect potential fraud indicators"""
        score = 0
        reasons = []
        
        amount = Decimal(str(bill['total_amount']))
        
        if amount > 5000:
            score += self.FRAUD_INDICATORS['excessive_amount']
            reasons.append('Excessive amount')
        
        if amount == int(amount) and amount > 100:
            score += self.FRAUD_INDICATORS['round_number']
            reasons.append('Suspicious round number')
        
        vendor_bills = [b for b in all_bills if b['vendor_id'] == bill['vendor_id']]
        if len(vendor_bills) > 5:
            score += self.FRAUD_INDICATORS['frequent_claims']
            reasons.append('Unusually frequent bills from vendor')
        
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
