"""
ARIA ERP - Bot Testing Suite
Tests all 15 automation bots
"""

import sys
import os

# List of all bots
BOTS = [
    "invoice_reconciliation_bot.py",
    "expense_approval_bot.py",
    "purchase_order_bot.py",
    "credit_check_bot.py",
    "payment_reminder_bot.py",
    "tax_compliance_bot.py",
    "ocr_invoice_bot.py",
    "bank_payment_prediction_bot.py",
    "inventory_replenishment_bot.py",
    "customer_churn_prediction_bot.py",
    "revenue_forecasting_bot.py",
    "cashflow_prediction_bot.py",
    "anomaly_detection_bot.py",
    "document_classification_bot.py",
    "multicurrency_revaluation_bot.py"
]

def test_bot(bot_name):
    """Test a single bot"""
    print(f"\n{'='*60}")
    print(f"Testing: {bot_name}")
    print('='*60)
    
    try:
        result = os.system(f"cd bots && python3 {bot_name}")
        if result == 0:
            print(f"✅ {bot_name}: PASSED")
            return True
        else:
            print(f"❌ {bot_name}: FAILED (exit code {result})")
            return False
    except Exception as e:
        print(f"❌ {bot_name}: ERROR - {str(e)}")
        return False

def main():
    print("\n" + "="*60)
    print("ARIA ERP - BOT TESTING SUITE")
    print("="*60)
    print(f"\nTesting {len(BOTS)} automation bots...\n")
    
    passed = 0
    failed = 0
    
    for bot in BOTS:
        if test_bot(bot):
            passed += 1
        else:
            failed += 1
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total Bots:   {len(BOTS)}")
    print(f"✅ Passed:    {passed}")
    print(f"❌ Failed:    {failed}")
    print(f"Success Rate: {(passed/len(BOTS)*100):.1f}%")
    print("="*60 + "\n")
    
    if failed == 0:
        print("🎉 ALL BOTS OPERATIONAL! 🎉\n")
        return 0
    else:
        print(f"⚠️  {failed} bot(s) need attention\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
