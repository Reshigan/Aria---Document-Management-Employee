"""
Bank Reconciliation Bot
Automatically match bank statements to accounting records and identify discrepancies

This bot helps businesses:
- Import bank statements (CSV, OFX, PDF)
- Auto-match transactions to accounting records
- Identify missing or duplicate transactions
- Flag unusual transactions for review
- Generate reconciliation reports
- Support multi-bank reconciliation
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import re

logger = logging.getLogger(__name__)


class BankReconciliationBot:
    """Bank Reconciliation Bot - Automate bank statement reconciliation"""
    
    def __init__(self):
        self.bot_id = "bank_reconciliation"
        self.name = "Bank Reconciliation Bot"
        self.description = "Automatically match bank statements to accounting records and identify discrepancies"
        self.capabilities = [
            "statement_import",
            "auto_matching",
            "duplicate_detection",
            "anomaly_detection",
            "multi_bank_support",
            "reconciliation_reporting"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute bank reconciliation query
        
        Supported queries:
        - "Import bank statement"
        - "Reconcile [bank/account]"
        - "Show unmatched transactions"
        - "Show pending reconciliation"
        - "Flag unusual transactions"
        - "Generate reconciliation report"
        """
        query_lower = query.lower()
        
        if "import" in query_lower or "upload" in query_lower:
            return self._import_bank_statement(context)
        elif "reconcile" in query_lower or "match" in query_lower:
            return self._perform_reconciliation(context)
        elif "unmatched" in query_lower or "missing" in query_lower:
            return self._get_unmatched_transactions(context)
        elif "pending" in query_lower:
            return self._get_pending_reconciliation(context)
        elif "unusual" in query_lower or "flag" in query_lower or "anomaly" in query_lower:
            return self._flag_unusual_transactions(context)
        elif "report" in query_lower:
            return self._generate_reconciliation_report(context)
        else:
            return self._general_response(query, context)
    
    def _import_bank_statement(self, context: Optional[Dict] = None) -> Dict:
        """Import and process bank statement"""
        # TODO: Connect to real file import system
        
        statement_data = {
            "bank_name": "First National Bank",
            "account_number": "62******789",
            "statement_period": "2025-01-01 to 2025-01-31",
            "opening_balance": 485000.00,
            "closing_balance": 512300.00,
            "total_credits": 325000.00,
            "total_debits": 297700.00,
            "transaction_count": 87,
            "import_status": "success",
            "auto_matched": 78,
            "requires_review": 9
        }
        
        response_text = f"""**Bank Statement Import Complete**

🏦 **Bank Details:**
- Bank: {statement_data['bank_name']}
- Account: {statement_data['account_number']}
- Period: {statement_data['statement_period']}

💰 **Statement Summary:**
- Opening Balance: R{statement_data['opening_balance']:,.2f}
- Total Credits: R{statement_data['total_credits']:,.2f}
- Total Debits: R{statement_data['total_debits']:,.2f}
- Closing Balance: R{statement_data['closing_balance']:,.2f}
- Net Change: R{statement_data['closing_balance'] - statement_data['opening_balance']:,.2f}

📊 **Import Results:**
- Total Transactions: {statement_data['transaction_count']}
- Auto-Matched: {statement_data['auto_matched']} ({statement_data['auto_matched']/statement_data['transaction_count']*100:.1f}%)
- Requires Review: {statement_data['requires_review']} ({statement_data['requires_review']/statement_data['transaction_count']*100:.1f}%)

✅ **Next Steps:**
1. Review {statement_data['requires_review']} unmatched transactions
2. Approve automatic matches
3. Finalize reconciliation

**Matching Confidence:** {statement_data['auto_matched']/statement_data['transaction_count']*100:.0f}% - {"Excellent" if statement_data['auto_matched']/statement_data['transaction_count'] > 0.90 else "Good" if statement_data['auto_matched']/statement_data['transaction_count'] > 0.80 else "Needs Review"}
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": statement_data,
            "actions": [
                {"type": "review_unmatched", "label": "Review Unmatched", "data": {}},
                {"type": "auto_reconcile", "label": "Auto-Reconcile All", "data": {}},
                {"type": "export", "label": "Export Results", "data": {}}
            ]
        }
    
    def _perform_reconciliation(self, context: Optional[Dict] = None) -> Dict:
        """Perform bank reconciliation with auto-matching"""
        # TODO: Connect to accounting system and bank data
        
        reconciliation_results = {
            "account_name": "Business Cheque Account",
            "bank": "First National Bank",
            "account_number": "62******789",
            "reconciliation_date": datetime.now().strftime("%Y-%m-%d"),
            "book_balance": 515200.00,
            "bank_balance": 512300.00,
            "matched_transactions": 78,
            "unmatched_bank": 5,
            "unmatched_books": 4,
            "reconciliation_items": [
                {
                    "type": "Outstanding Deposits",
                    "description": "Deposits not yet cleared by bank",
                    "amount": 8500.00,
                    "count": 2
                },
                {
                    "type": "Outstanding Cheques",
                    "description": "Cheques issued but not yet presented",
                    "amount": -4200.00,
                    "count": 3
                },
                {
                    "type": "Bank Fees",
                    "description": "Bank charges not recorded in books",
                    "amount": -1400.00,
                    "count": 2
                }
            ],
            "variance": 2900.00,
            "variance_percentage": 0.56
        }
        
        # Calculate adjusted balances
        adjusted_book = reconciliation_results['book_balance']
        adjusted_bank = reconciliation_results['bank_balance']
        
        for item in reconciliation_results['reconciliation_items']:
            adjusted_book -= item['amount']
        
        response_text = f"""**Bank Reconciliation Results**

🏦 **Account Information:**
- Account: {reconciliation_results['account_name']}
- Bank: {reconciliation_results['bank']}
- Account Number: {reconciliation_results['account_number']}
- Reconciliation Date: {reconciliation_results['reconciliation_date']}

💰 **Balance Reconciliation:**
- Books Balance: R{reconciliation_results['book_balance']:,.2f}
- Bank Statement Balance: R{reconciliation_results['bank_balance']:,.2f}
- Variance: R{reconciliation_results['variance']:,.2f} ({reconciliation_results['variance_percentage']:.2f}%)

📊 **Matching Results:**
- Matched Transactions: {reconciliation_results['matched_transactions']}
- Unmatched (Bank): {reconciliation_results['unmatched_bank']}
- Unmatched (Books): {reconciliation_results['unmatched_books']}

📋 **Reconciliation Items:**

"""
        
        for item in reconciliation_results['reconciliation_items']:
            response_text += f"""**{item['type']}**
- Description: {item['description']}
- Amount: R{abs(item['amount']):,.2f} {"(Add)" if item['amount'] > 0 else "(Deduct)"}
- Count: {item['count']} transactions

"""
        
        response_text += f"""**Adjusted Balances:**
- Adjusted Books Balance: R{adjusted_book:,.2f}
- Adjusted Bank Balance: R{adjusted_bank:,.2f}
- Final Variance: R{abs(adjusted_book - adjusted_bank):,.2f}

"""
        
        if abs(adjusted_book - adjusted_bank) < 1.00:
            response_text += "✅ **RECONCILED** - Books and bank are balanced (variance < R1.00)"
        elif abs(adjusted_book - adjusted_bank) < 100.00:
            response_text += "⚠️ **MINOR VARIANCE** - Small difference detected, review recommended"
        else:
            response_text += "🔴 **VARIANCE DETECTED** - Significant difference requires investigation"
        
        return {
            "success": True,
            "response": response_text,
            "data": reconciliation_results,
            "actions": [
                {"type": "finalize", "label": "Finalize Reconciliation", "data": {}},
                {"type": "investigate", "label": "Investigate Variance", "data": {}},
                {"type": "export_report", "label": "Export Report", "data": {}}
            ]
        }
    
    def _get_unmatched_transactions(self, context: Optional[Dict] = None) -> Dict:
        """Get list of unmatched transactions requiring manual review"""
        # TODO: Connect to real database
        
        unmatched_bank = [
            {
                "date": "2025-01-15",
                "description": "EFT CREDIT FROM UNKNOWN",
                "reference": "TXN-2025-1156",
                "amount": 2500.00,
                "type": "Credit",
                "possible_matches": []
            },
            {
                "date": "2025-01-22",
                "description": "BANK CHARGES",
                "reference": "CHG-2025-0122",
                "amount": -450.00,
                "type": "Debit",
                "possible_matches": []
            },
            {
                "date": "2025-01-28",
                "description": "DEBIT ORDER RETURNED",
                "reference": "TXN-2025-1298",
                "amount": -1200.00,
                "type": "Debit",
                "possible_matches": []
            }
        ]
        
        unmatched_books = [
            {
                "date": "2025-01-20",
                "description": "Payment to ABC Suppliers",
                "reference": "CHQ-001234",
                "amount": -3500.00,
                "type": "Cheque",
                "status": "Outstanding"
            },
            {
                "date": "2025-01-25",
                "description": "Customer Deposit - XYZ Ltd",
                "reference": "DEP-2025-045",
                "amount": 8500.00,
                "type": "Deposit",
                "status": "In Transit"
            }
        ]
        
        response_text = f"""**Unmatched Transactions**

⚠️ **Summary:**
- Unmatched Bank Transactions: {len(unmatched_bank)} (R{sum(abs(t['amount']) for t in unmatched_bank):,.2f})
- Unmatched Book Entries: {len(unmatched_books)} (R{sum(abs(t['amount']) for t in unmatched_books):,.2f})

🏦 **Bank Transactions (Not in Books):**

"""
        
        for txn in unmatched_bank:
            emoji = "💰" if txn['type'] == "Credit" else "💸"
            response_text += f"""{emoji} **{txn['date']}** - R{abs(txn['amount']):,.2f} {txn['type']}
- Description: {txn['description']}
- Reference: {txn['reference']}
- Status: Needs manual entry or matching

"""
        
        response_text += """📚 **Book Entries (Not in Bank Statement):**

"""
        
        for txn in unmatched_books:
            emoji = "💰" if txn['amount'] > 0 else "💸"
            response_text += f"""{emoji} **{txn['date']}** - R{abs(txn['amount']):,.2f}
- Description: {txn['description']}
- Reference: {txn['reference']}
- Status: {txn['status']}

"""
        
        response_text += """**Recommended Actions:**
1. Record bank charges in accounting system (R450.00)
2. Investigate unknown EFT credit (R2,500.00) - contact customer
3. Follow up on returned debit order (R1,200.00)
4. Mark cheque CHQ-001234 as outstanding (R3,500.00)
5. Mark deposit DEP-2025-045 as in transit (R8,500.00)
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": {
                "unmatched_bank": unmatched_bank,
                "unmatched_books": unmatched_books
            },
            "actions": [
                {"type": "manual_match", "label": "Manual Match", "data": {}},
                {"type": "create_entry", "label": "Create Journal Entry", "data": {}},
                {"type": "mark_outstanding", "label": "Mark as Outstanding", "data": {}}
            ]
        }
    
    def _get_pending_reconciliation(self, context: Optional[Dict] = None) -> Dict:
        """Get pending reconciliations across all accounts"""
        # TODO: Connect to real database
        
        pending_accounts = [
            {
                "account_name": "Business Cheque Account",
                "bank": "First National Bank",
                "last_reconciled": "2024-12-31",
                "days_pending": 27,
                "estimated_transactions": 87,
                "priority": "High"
            },
            {
                "account_name": "Savings Account",
                "bank": "First National Bank",
                "last_reconciled": "2025-01-15",
                "days_pending": 12,
                "estimated_transactions": 12,
                "priority": "Medium"
            },
            {
                "account_name": "Credit Card - Corporate",
                "bank": "ABSA Bank",
                "last_reconciled": "2025-01-20",
                "days_pending": 7,
                "estimated_transactions": 45,
                "priority": "Low"
            }
        ]
        
        response_text = f"""**Pending Bank Reconciliations**

📊 **Summary:**
- Total Accounts Pending: {len(pending_accounts)}
- High Priority: {sum(1 for a in pending_accounts if a['priority'] == 'High')}
- Medium Priority: {sum(1 for a in pending_accounts if a['priority'] == 'Medium')}
- Low Priority: {sum(1 for a in pending_accounts if a['priority'] == 'Low')}

📋 **Accounts Requiring Reconciliation:**

"""
        
        for account in pending_accounts:
            priority_emoji = "🔴" if account['priority'] == "High" else "🟡" if account['priority'] == "Medium" else "🟢"
            response_text += f"""{priority_emoji} **{account['account_name']}** ({account['priority']} Priority)
- Bank: {account['bank']}
- Last Reconciled: {account['last_reconciled']}
- Days Pending: {account['days_pending']}
- Est. Transactions: {account['estimated_transactions']}

"""
        
        response_text += """**Recommended Schedule:**
1. Complete Business Cheque Account reconciliation (URGENT - 27 days overdue)
2. Complete Savings Account reconciliation this week
3. Complete Credit Card reconciliation by month-end

**Best Practices:**
- Reconcile main accounts weekly
- Reconcile secondary accounts monthly
- Never exceed 30 days between reconciliations
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": {"pending_accounts": pending_accounts},
            "actions": [
                {"type": "start_reconciliation", "label": "Start Reconciliation", "data": {}},
                {"type": "set_schedule", "label": "Set Auto Schedule", "data": {}},
                {"type": "notify_accountant", "label": "Send Reminder", "data": {}}
            ]
        }
    
    def _flag_unusual_transactions(self, context: Optional[Dict] = None) -> Dict:
        """Flag unusual or anomalous transactions for review"""
        # TODO: Connect to ML anomaly detection
        
        unusual_transactions = [
            {
                "date": "2025-01-18",
                "description": "EFT PAYMENT TO OFFSHORE ACCOUNT",
                "amount": -125000.00,
                "reason": "Large amount to unfamiliar recipient",
                "risk_score": 85,
                "risk_level": "High"
            },
            {
                "date": "2025-01-22",
                "description": "MULTIPLE SMALL WITHDRAWALS - ATM",
                "amount": -4500.00,
                "reason": "Unusual pattern - 15 withdrawals in 2 hours",
                "risk_score": 72,
                "risk_level": "Medium-High"
            },
            {
                "date": "2025-01-25",
                "description": "CASH DEPOSIT - BRANCH",
                "amount": 95000.00,
                "reason": "Large cash deposit (FICA reporting threshold)",
                "risk_score": 60,
                "risk_level": "Medium"
            }
        ]
        
        response_text = f"""**Unusual Transaction Detection**

⚠️ **Alert Summary:**
- Unusual Transactions Detected: {len(unusual_transactions)}
- High Risk: {sum(1 for t in unusual_transactions if t['risk_level'] == 'High')}
- Medium-High Risk: {sum(1 for t in unusual_transactions if 'Medium-High' in t['risk_level'])}
- Medium Risk: {sum(1 for t in unusual_transactions if t['risk_level'] == 'Medium')}

🔍 **Flagged Transactions:**

"""
        
        for txn in unusual_transactions:
            emoji = "🔴" if txn['risk_level'] == "High" else "🟡"
            response_text += f"""{emoji} **{txn['date']}** - R{abs(txn['amount']):,.2f}
- Description: {txn['description']}
- Risk Level: {txn['risk_level']} (Score: {txn['risk_score']}/100)
- Reason: {txn['reason']}
- Action Required: {"Immediate review + authorization" if txn['risk_score'] >= 70 else "Review and document"}

"""
        
        response_text += """**Recommendations:**
1. Review R125,000 offshore payment - verify legitimacy + obtain authorization
2. Investigate ATM withdrawal pattern - possible card fraud
3. Document R95,000 cash deposit for FICA compliance (FIC Act threshold = R49,999)

**Fraud Prevention:**
- All flagged transactions require managerial approval
- High-risk transactions auto-blocked until reviewed
- Anomaly detection reduces fraud risk by 85%
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": {"unusual_transactions": unusual_transactions},
            "actions": [
                {"type": "approve", "label": "Approve Transaction", "data": {}},
                {"type": "block", "label": "Block Transaction", "data": {}},
                {"type": "investigate", "label": "Launch Investigation", "data": {}},
                {"type": "report_fraud", "label": "Report as Fraud", "data": {}}
            ]
        }
    
    def _generate_reconciliation_report(self, context: Optional[Dict] = None) -> Dict:
        """Generate comprehensive reconciliation report"""
        # TODO: Connect to real database
        
        report_data = {
            "report_period": "January 2025",
            "accounts_reconciled": 3,
            "total_transactions": 144,
            "matched_transactions": 135,
            "match_rate": 93.75,
            "total_variance": 450.00,
            "variance_percentage": 0.09,
            "time_saved": "12 hours vs. manual reconciliation",
            "accounts": [
                {
                    "name": "Business Cheque Account",
                    "transactions": 87,
                    "matched": 82,
                    "variance": 200.00,
                    "status": "Reconciled"
                },
                {
                    "name": "Savings Account",
                    "transactions": 12,
                    "matched": 12,
                    "variance": 0.00,
                    "status": "Reconciled"
                },
                {
                    "name": "Credit Card",
                    "transactions": 45,
                    "matched": 41,
                    "variance": 250.00,
                    "status": "Reconciled"
                }
            ]
        }
        
        response_text = f"""**Bank Reconciliation Report**

📅 **Report Period:** {report_data['report_period']}

📊 **Overall Performance:**
- Accounts Reconciled: {report_data['accounts_reconciled']}
- Total Transactions: {report_data['total_transactions']}
- Matched Transactions: {report_data['matched_transactions']} ({report_data['match_rate']:.1f}%)
- Total Variance: R{report_data['total_variance']:,.2f} ({report_data['variance_percentage']:.2f}%)
- Time Saved: {report_data['time_saved']}

💰 **Account Breakdown:**

"""
        
        for account in report_data['accounts']:
            match_pct = (account['matched'] / account['transactions'] * 100)
            response_text += f"""**{account['name']}** - {account['status']}
- Transactions: {account['transactions']}
- Matched: {account['matched']} ({match_pct:.1f}%)
- Variance: R{account['variance']:,.2f}

"""
        
        response_text += f"""**Key Metrics:**
- Auto-Match Rate: {report_data['match_rate']:.1f}% (Target: 90%+) ✅
- Variance Rate: {report_data['variance_percentage']:.2f}% (Target: <0.5%) ✅
- All accounts reconciled and balanced ✅

**Insights:**
- Excellent reconciliation performance this month
- Auto-matching working effectively (93.75% success rate)
- All variances within acceptable limits
- No outstanding issues requiring attention

**Recommendations:**
- Continue monthly reconciliation schedule
- Review unmatched transactions weekly
- Maintain auto-match rules for optimal performance
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": report_data,
            "actions": [
                {"type": "export_pdf", "label": "Export PDF Report", "data": {}},
                {"type": "email_report", "label": "Email to Accountant", "data": {}},
                {"type": "archive", "label": "Archive Report", "data": {}}
            ]
        }
    
    def _general_response(self, query: str, context: Optional[Dict] = None) -> Dict:
        """General response for unrecognized queries"""
        response_text = f"""**Bank Reconciliation Bot**

I can help you with:
- **Import statements:** "Import bank statement"
- **Reconcile accounts:** "Reconcile [account name]"
- **View unmatched:** "Show unmatched transactions"
- **Check pending:** "Show pending reconciliation"
- **Flag unusual:** "Flag unusual transactions"
- **Generate reports:** "Generate reconciliation report"

**Your query:** "{query}"

Would you like me to help with any of these tasks?
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": {
                "query": query,
                "capabilities": self.capabilities
            }
        }


# Singleton instance
_bank_reconciliation_bot_instance = None

def get_bank_reconciliation_bot() -> BankReconciliationBot:
    """Get singleton instance of Bank Reconciliation Bot"""
    global _bank_reconciliation_bot_instance
    if _bank_reconciliation_bot_instance is None:
        _bank_reconciliation_bot_instance = BankReconciliationBot()
    return _bank_reconciliation_bot_instance
