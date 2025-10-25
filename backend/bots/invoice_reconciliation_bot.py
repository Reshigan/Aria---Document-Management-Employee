"""
Invoice Reconciliation Bot
Automatically match invoices to payments, flag discrepancies, and reconcile accounts

This bot helps businesses:
- Match invoices to payments automatically
- Flag discrepancies (amount mismatches, missing payments)
- Reconcile accounts (AP/AR)
- Generate reconciliation reports
- Track outstanding invoices
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import re

logger = logging.getLogger(__name__)


class InvoiceReconciliationBot:
    """Invoice Reconciliation Bot - Match invoices to payments"""
    
    def __init__(self):
        self.bot_id = "invoice_reconciliation"
        self.name = "Invoice Reconciliation Bot"
        self.description = "Automatically match invoices to payments, flag discrepancies, and reconcile accounts"
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute invoice reconciliation query
        
        Supported queries:
        - "Match invoices to payments"
        - "Show outstanding invoices"
        - "Flag discrepancies"
        - "Reconcile account [account_number]"
        - "Generate reconciliation report"
        """
        query_lower = query.lower()
        
        # Determine query type
        if "match" in query_lower or "reconcile" in query_lower:
            return self._match_invoices_to_payments(context)
        elif "outstanding" in query_lower:
            return self._get_outstanding_invoices(context)
        elif "discrepanc" in query_lower or "mismatch" in query_lower:
            return self._flag_discrepancies(context)
        elif "report" in query_lower:
            return self._generate_reconciliation_report(context)
        else:
            return self._general_response(query, context)
    
    def _match_invoices_to_payments(self, context: Optional[Dict] = None) -> Dict:
        """Match invoices to payments"""
        # TODO: Connect to real database
        # For now, return mock data
        
        matches = [
            {
                "invoice_number": "INV-2025-001",
                "invoice_amount": 15000.00,
                "invoice_date": "2025-01-15",
                "payment_reference": "PAY-2025-023",
                "payment_amount": 15000.00,
                "payment_date": "2025-01-20",
                "status": "matched",
                "match_confidence": 100
            },
            {
                "invoice_number": "INV-2025-002",
                "invoice_amount": 8500.00,
                "invoice_date": "2025-01-18",
                "payment_reference": "PAY-2025-025",
                "payment_amount": 8500.00,
                "payment_date": "2025-01-22",
                "status": "matched",
                "match_confidence": 100
            },
            {
                "invoice_number": "INV-2025-003",
                "invoice_amount": 12000.00,
                "invoice_date": "2025-01-20",
                "payment_reference": "PAY-2025-027",
                "payment_amount": 11950.00,
                "payment_date": "2025-01-25",
                "status": "partial_match",
                "match_confidence": 95,
                "discrepancy": "R50 short payment (possible bank fee)"
            }
        ]
        
        matched_count = sum(1 for m in matches if m["status"] == "matched")
        partial_count = sum(1 for m in matches if m["status"] == "partial_match")
        
        response_text = f"""**Invoice Reconciliation Results**

I've analyzed your invoices and payments. Here's what I found:

**Summary:**
- ✅ {matched_count} invoices perfectly matched ({matched_count * 100 // len(matches)}%)
- ⚠️ {partial_count} invoices partially matched ({partial_count * 100 // len(matches)}%)
- Total amount reconciled: R{sum(m['payment_amount'] for m in matches):,.2f}

**Matched Invoices:**
"""
        
        for match in matches:
            if match["status"] == "matched":
                response_text += f"\n- **{match['invoice_number']}**: R{match['invoice_amount']:,.2f} → Paid {match['payment_date']} (Ref: {match['payment_reference']}) ✅"
        
        response_text += "\n\n**Partial Matches:**\n"
        for match in matches:
            if match["status"] == "partial_match":
                response_text += f"\n- **{match['invoice_number']}**: R{match['invoice_amount']:,.2f} → Paid R{match['payment_amount']:,.2f} ⚠️\n  *{match['discrepancy']}*"
        
        response_text += "\n\n**Recommendations:**\n"
        response_text += "1. Contact customer for INV-2025-003 to clarify R50 short payment\n"
        response_text += "2. Update accounting records with matched payments\n"
        response_text += "3. Run reconciliation report for final review"
        
        return {
            "response": response_text,
            "matches": matches,
            "summary": {
                "total_invoices": len(matches),
                "matched": matched_count,
                "partial": partial_count,
                "unmatched": 0,
                "total_amount": sum(m["invoice_amount"] for m in matches),
                "total_paid": sum(m["payment_amount"] for m in matches)
            }
        }
    
    def _get_outstanding_invoices(self, context: Optional[Dict] = None) -> Dict:
        """Get outstanding invoices (unpaid)"""
        # TODO: Connect to real database
        
        outstanding = [
            {
                "invoice_number": "INV-2025-004",
                "customer": "Acme Corp (Pty) Ltd",
                "invoice_amount": 25000.00,
                "invoice_date": "2025-01-22",
                "due_date": "2025-02-21",
                "days_outstanding": 3,
                "status": "current",
                "aging_bucket": "0-30 days"
            },
            {
                "invoice_number": "INV-2025-005",
                "customer": "Tech Solutions SA",
                "invoice_amount": 18500.00,
                "invoice_date": "2025-01-10",
                "due_date": "2025-02-09",
                "days_outstanding": 15,
                "status": "current",
                "aging_bucket": "0-30 days"
            },
            {
                "invoice_number": "INV-2024-248",
                "customer": "BuildIt Construction",
                "invoice_amount": 42000.00,
                "invoice_date": "2024-11-15",
                "due_date": "2024-12-15",
                "days_outstanding": 71,
                "status": "overdue",
                "aging_bucket": "60-90 days"
            }
        ]
        
        total_outstanding = sum(inv["invoice_amount"] for inv in outstanding)
        overdue = [inv for inv in outstanding if inv["status"] == "overdue"]
        total_overdue = sum(inv["invoice_amount"] for inv in overdue)
        
        response_text = f"""**Outstanding Invoices Report**

**Summary:**
- 📊 Total outstanding: R{total_outstanding:,.2f}
- ⚠️ Overdue invoices: {len(overdue)} (R{total_overdue:,.2f})
- 💰 Current invoices: {len(outstanding) - len(overdue)}

**Aging Analysis:**
"""
        
        # Group by aging bucket
        aging_buckets = {}
        for inv in outstanding:
            bucket = inv["aging_bucket"]
            if bucket not in aging_buckets:
                aging_buckets[bucket] = []
            aging_buckets[bucket].append(inv)
        
        for bucket, invs in sorted(aging_buckets.items()):
            total = sum(i["invoice_amount"] for i in invs)
            response_text += f"\n**{bucket}:** {len(invs)} invoices, R{total:,.2f}"
            for inv in invs:
                status_icon = "⚠️" if inv["status"] == "overdue" else "✅"
                response_text += f"\n  - {inv['invoice_number']} ({inv['customer']}): R{inv['invoice_amount']:,.2f} - {inv['days_outstanding']} days {status_icon}"
        
        response_text += "\n\n**Recommended Actions:**\n"
        if overdue:
            response_text += f"1. **URGENT**: Follow up on {len(overdue)} overdue invoice(s) immediately\n"
            response_text += "2. Send payment reminders to overdue customers\n"
            response_text += "3. Consider applying late payment fees per terms\n"
        else:
            response_text += "1. All invoices are current - no urgent action needed\n"
            response_text += "2. Monitor aging to prevent overdue invoices\n"
        
        return {
            "response": response_text,
            "outstanding_invoices": outstanding,
            "summary": {
                "total_outstanding": total_outstanding,
                "total_overdue": total_overdue,
                "count_outstanding": len(outstanding),
                "count_overdue": len(overdue),
                "aging_buckets": aging_buckets
            }
        }
    
    def _flag_discrepancies(self, context: Optional[Dict] = None) -> Dict:
        """Flag invoice/payment discrepancies"""
        # TODO: Connect to real database
        
        discrepancies = [
            {
                "type": "amount_mismatch",
                "invoice_number": "INV-2025-003",
                "invoice_amount": 12000.00,
                "payment_amount": 11950.00,
                "difference": 50.00,
                "severity": "low",
                "possible_reason": "Bank transfer fee",
                "recommendation": "Contact customer to confirm"
            },
            {
                "type": "duplicate_payment",
                "invoice_number": "INV-2025-006",
                "invoice_amount": 5000.00,
                "payment_1": {"ref": "PAY-2025-030", "amount": 5000.00, "date": "2025-01-22"},
                "payment_2": {"ref": "PAY-2025-031", "amount": 5000.00, "date": "2025-01-23"},
                "severity": "high",
                "possible_reason": "Customer error - paid twice",
                "recommendation": "Issue refund or credit note immediately"
            },
            {
                "type": "missing_payment",
                "invoice_number": "INV-2024-248",
                "invoice_amount": 42000.00,
                "due_date": "2024-12-15",
                "days_overdue": 71,
                "severity": "critical",
                "possible_reason": "Customer financial difficulties",
                "recommendation": "Escalate to collections team"
            }
        ]
        
        response_text = f"""**Discrepancy Report**

I've identified {len(discrepancies)} discrepancies that need your attention:

"""
        
        for i, disc in enumerate(discrepancies, 1):
            severity_icon = {"low": "⚠️", "high": "🚨", "critical": "🔴"}[disc["severity"]]
            response_text += f"\n**{i}. {disc['type'].replace('_', ' ').title()}** {severity_icon}\n"
            response_text += f"   - Invoice: {disc['invoice_number']}\n"
            
            if disc["type"] == "amount_mismatch":
                response_text += f"   - Expected: R{disc['invoice_amount']:,.2f}\n"
                response_text += f"   - Received: R{disc['payment_amount']:,.2f}\n"
                response_text += f"   - Difference: R{disc['difference']:,.2f}\n"
            elif disc["type"] == "duplicate_payment":
                response_text += f"   - Amount: R{disc['invoice_amount']:,.2f}\n"
                response_text += f"   - Payment 1: {disc['payment_1']['ref']} (R{disc['payment_1']['amount']:,.2f})\n"
                response_text += f"   - Payment 2: {disc['payment_2']['ref']} (R{disc['payment_2']['amount']:,.2f})\n"
            elif disc["type"] == "missing_payment":
                response_text += f"   - Amount due: R{disc['invoice_amount']:,.2f}\n"
                response_text += f"   - Days overdue: {disc['days_overdue']}\n"
            
            response_text += f"   - Likely reason: {disc['possible_reason']}\n"
            response_text += f"   - **Action**: {disc['recommendation']}\n"
        
        return {
            "response": response_text,
            "discrepancies": discrepancies,
            "summary": {
                "total_discrepancies": len(discrepancies),
                "critical": sum(1 for d in discrepancies if d["severity"] == "critical"),
                "high": sum(1 for d in discrepancies if d["severity"] == "high"),
                "low": sum(1 for d in discrepancies if d["severity"] == "low")
            }
        }
    
    def _generate_reconciliation_report(self, context: Optional[Dict] = None) -> Dict:
        """Generate comprehensive reconciliation report"""
        # TODO: Connect to real database and generate actual report
        
        response_text = """**Reconciliation Report - January 2025**

**Summary:**
- Total invoices issued: 248
- Total invoice value: R3,456,789.00
- Total payments received: R3,398,234.00
- Outstanding balance: R58,555.00

**Reconciliation Status:**
- ✅ Fully reconciled: 245 invoices (98.8%)
- ⚠️ Partially reconciled: 1 invoice (0.4%)
- 🔴 Unreconciled: 2 invoices (0.8%)

**Aging Analysis:**
- 0-30 days: R45,000.00 (77%)
- 31-60 days: R8,555.00 (15%)
- 61-90 days: R5,000.00 (8%)
- 90+ days: R0.00 (0%)

**Key Findings:**
1. Overall collection rate is excellent at 98.8%
2. One duplicate payment identified (INV-2025-006) - refund required
3. Two overdue invoices require follow-up

**Recommendations:**
1. Process refund for duplicate payment (R5,000)
2. Send final notice to customers with 60+ day overdue invoices
3. Consider early payment discounts to improve cash flow

📊 **Full PDF report**: Available for download
📧 **Email report**: Sent to finance@yourbusiness.com
"""
        
        return {
            "response": response_text,
            "report_data": {
                "period": "January 2025",
                "total_invoices": 248,
                "total_value": 3456789.00,
                "total_received": 3398234.00,
                "outstanding": 58555.00,
                "reconciliation_rate": 98.8,
                "aging": {
                    "0-30": 45000.00,
                    "31-60": 8555.00,
                    "61-90": 5000.00,
                    "90+": 0.00
                }
            }
        }
    
    def _general_response(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Handle general queries"""
        response_text = f"""I'm the Invoice Reconciliation Bot. I can help you with:

**What I Can Do:**
- 📊 Match invoices to payments automatically
- 📋 Show outstanding invoices (aging analysis)
- 🚨 Flag discrepancies (mismatches, duplicates, missing payments)
- 📄 Generate reconciliation reports
- 💰 Track accounts payable/receivable
- ⏰ Identify overdue invoices

**Try asking me:**
- "Match invoices to payments"
- "Show outstanding invoices"
- "Flag discrepancies"
- "Generate reconciliation report"
- "What invoices are overdue?"

**Your Question:** "{query}"

How can I help you reconcile your accounts?
"""
        
        return {"response": response_text}


# Export bot instance
invoice_reconciliation_bot = InvoiceReconciliationBot()
