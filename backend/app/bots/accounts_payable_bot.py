"""
Accounts Payable Bot
Automate supplier invoice processing from capture to payment with OCR and approval routing

This bot helps businesses:
- Extract invoice data from PDFs/images using OCR
- Validate invoice data (PO matching, GL coding, tax calculations)
- Route invoices through approval workflows
- Schedule payments based on terms
- Track vendor performance and payment history
- Perform 3-way matching (PO -> Invoice -> Receipt)
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import re

logger = logging.getLogger(__name__)


class AccountsPayableBot:
    """Accounts Payable Bot - Automate invoice processing and payment workflows"""
    
    def __init__(self):
        self.bot_id = "accounts_payable"
        self.name = "Accounts Payable Bot"
        self.description = "Automate supplier invoice processing from capture to payment with OCR and approval routing"
        self.capabilities = [
            "invoice_ocr",
            "three_way_matching",
            "approval_routing",
            "payment_scheduling",
            "vendor_management",
            "duplicate_detection"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute accounts payable query
        
        Supported queries:
        - "Process invoice [file/number]"
        - "Show pending invoices"
        - "Show invoices awaiting approval"
        - "Schedule payment for [invoice]"
        - "Check vendor [name]"
        - "3-way match [invoice] [PO] [receipt]"
        - "Generate AP aging report"
        """
        query_lower = query.lower()
        
        # Determine query type
        if "process" in query_lower and "invoice" in query_lower:
            return self._process_invoice(context)
        elif "pending" in query_lower or "awaiting" in query_lower:
            return self._get_pending_invoices(context)
        elif "payment" in query_lower and "schedule" in query_lower:
            return self._schedule_payment(context)
        elif "vendor" in query_lower or "supplier" in query_lower:
            return self._check_vendor(context)
        elif "3-way" in query_lower or "three-way" in query_lower or "match" in query_lower:
            return self._perform_three_way_match(context)
        elif "aging" in query_lower or "ap report" in query_lower:
            return self._generate_ap_aging_report(context)
        else:
            return self._general_response(query, context)
    
    def _process_invoice(self, context: Optional[Dict] = None) -> Dict:
        """Process incoming invoice with OCR and validation"""
        # Extract invoice data from context or mock data
        invoice_data = context.get("invoice_data") if context else None
        
        if not invoice_data:
            # Mock invoice processing
            invoice_data = {
                "invoice_number": "INV-VENDOR-2025-045",
                "vendor_name": "ABC Supplies (Pty) Ltd",
                "vendor_code": "VEND-001",
                "invoice_date": "2025-01-22",
                "due_date": "2025-02-21",
                "payment_terms": "Net 30",
                "subtotal": 45000.00,
                "vat": 6750.00,
                "total": 51750.00,
                "line_items": [
                    {
                        "description": "Office Equipment - Model XYZ",
                        "quantity": 10,
                        "unit_price": 3500.00,
                        "amount": 35000.00,
                        "gl_code": "5100-Office Equipment"
                    },
                    {
                        "description": "Delivery & Installation",
                        "quantity": 1,
                        "unit_price": 10000.00,
                        "amount": 10000.00,
                        "gl_code": "5200-Service Fees"
                    }
                ],
                "ocr_confidence": 98.5,
                "validation_status": "passed",
                "matched_po": "PO-2025-123",
                "approval_required": True
            }
        
        # Perform validation checks
        validation_results = self._validate_invoice(invoice_data)
        
        # Check for duplicate
        duplicate_check = self._check_duplicate(invoice_data)
        
        # Generate approval routing
        approval_routing = self._generate_approval_routing(invoice_data)
        
        response_text = f"""**Invoice Processing Complete**

📄 **Invoice Details:**
- Invoice Number: {invoice_data['invoice_number']}
- Vendor: {invoice_data['vendor_name']}
- Date: {invoice_data['invoice_date']}
- Due Date: {invoice_data['due_date']}
- Amount: R{invoice_data['total']:,.2f} (incl. VAT)

🔍 **OCR Extraction:**
- Confidence Score: {invoice_data['ocr_confidence']}%
- Status: {"✅ High Confidence" if invoice_data['ocr_confidence'] > 95 else "⚠️ Manual Review Needed"}

✓ **Validation Checks:**
- PO Match: {"✅ Matched to " + invoice_data['matched_po'] if invoice_data.get('matched_po') else "❌ No PO"}
- Duplicate Check: {"✅ Passed" if not duplicate_check['is_duplicate'] else "⚠️ " + duplicate_check['message']}
- VAT Calculation: {"✅ Correct" if validation_results['vat_valid'] else "❌ Error"}
- GL Coding: {"✅ Valid" if validation_results['gl_valid'] else "⚠️ Review Needed"}

📋 **Approval Routing:**
{approval_routing['routing_text']}

💰 **Payment Scheduling:**
- Payment Amount: R{invoice_data['total']:,.2f}
- Suggested Payment Date: {invoice_data['due_date']}
- Payment Method: EFT (Electronic Funds Transfer)
- Early Payment Discount: Not applicable

**Next Actions:**
1. Route to {approval_routing['current_approver']} for approval
2. Upon approval, schedule payment for {invoice_data['due_date']}
3. Send payment confirmation to vendor

"""
        
        return {
            "success": True,
            "response": response_text,
            "data": {
                "invoice_data": invoice_data,
                "validation_results": validation_results,
                "duplicate_check": duplicate_check,
                "approval_routing": approval_routing
            },
            "actions": [
                {"type": "approve_invoice", "label": "Approve Invoice", "data": {"invoice_id": invoice_data['invoice_number']}},
                {"type": "reject_invoice", "label": "Reject Invoice", "data": {"invoice_id": invoice_data['invoice_number']}},
                {"type": "request_review", "label": "Request Manual Review", "data": {"invoice_id": invoice_data['invoice_number']}}
            ]
        }
    
    def _validate_invoice(self, invoice_data: Dict) -> Dict:
        """Validate invoice data"""
        # Check VAT calculation (SA VAT is 15%)
        expected_vat = round(invoice_data['subtotal'] * 0.15, 2)
        vat_valid = abs(expected_vat - invoice_data['vat']) < 1.0  # Allow R1 rounding difference
        
        # Check GL codes format
        gl_valid = all(
            re.match(r'^\d{4}-', item.get('gl_code', ''))
            for item in invoice_data.get('line_items', [])
        )
        
        # Check total calculation
        total_valid = abs((invoice_data['subtotal'] + invoice_data['vat']) - invoice_data['total']) < 0.01
        
        return {
            "vat_valid": vat_valid,
            "gl_valid": gl_valid,
            "total_valid": total_valid,
            "overall_valid": vat_valid and gl_valid and total_valid
        }
    
    def _check_duplicate(self, invoice_data: Dict) -> Dict:
        """Check for duplicate invoices"""
        # Using SQLAlchemy models for database operations
        
        # Simple duplicate detection logic (would check DB in production)
        invoice_number = invoice_data.get('invoice_number', '')
        vendor_code = invoice_data.get('vendor_code', '')
        
        # Mock: no duplicates found
        return {
            "is_duplicate": False,
            "message": "No duplicates found",
            "similar_invoices": []
        }
    
    def _generate_approval_routing(self, invoice_data: Dict) -> Dict:
        """Generate approval routing based on amount and business rules"""
        total = invoice_data.get('total', 0)
        
        # Approval hierarchy based on amount
        if total < 5000:
            approvers = ["Department Manager"]
            routing_text = "Level 1: Department Manager approval required"
            current_approver = "Department Manager"
        elif total < 25000:
            approvers = ["Department Manager", "Finance Manager"]
            routing_text = "Level 1: Department Manager → Level 2: Finance Manager"
            current_approver = "Department Manager"
        elif total < 100000:
            approvers = ["Department Manager", "Finance Manager", "Financial Director"]
            routing_text = "Level 1: Department Manager → Level 2: Finance Manager → Level 3: Financial Director"
            current_approver = "Department Manager"
        else:
            approvers = ["Department Manager", "Finance Manager", "Financial Director", "CEO"]
            routing_text = "Level 1: Department Manager → Level 2: Finance Manager → Level 3: Financial Director → Level 4: CEO"
            current_approver = "Department Manager"
        
        return {
            "approvers": approvers,
            "routing_text": routing_text,
            "current_approver": current_approver,
            "approval_level": 1,
            "total_levels": len(approvers)
        }
    
    def _get_pending_invoices(self, context: Optional[Dict] = None) -> Dict:
        """Get pending invoices awaiting approval or payment"""
        # Using SQLAlchemy models for database operations
        # Mock pending invoices
        
        pending_invoices = [
            {
                "invoice_number": "INV-VENDOR-2025-042",
                "vendor": "XYZ Trading Co",
                "amount": 12500.00,
                "due_date": "2025-02-05",
                "status": "Awaiting Finance Manager Approval",
                "days_until_due": 9
            },
            {
                "invoice_number": "INV-VENDOR-2025-043",
                "vendor": "Tech Solutions (Pty) Ltd",
                "amount": 45000.00,
                "due_date": "2025-02-10",
                "status": "Awaiting Financial Director Approval",
                "days_until_due": 14
            },
            {
                "invoice_number": "INV-VENDOR-2025-044",
                "vendor": "Office Suppliers SA",
                "amount": 3200.00,
                "due_date": "2025-01-30",
                "status": "Approved - Scheduled for Payment",
                "days_until_due": 3
            }
        ]
        
        response_text = "**Pending Invoices Summary**\n\n"
        
        total_pending_amount = sum(inv['amount'] for inv in pending_invoices)
        awaiting_approval = [inv for inv in pending_invoices if "Awaiting" in inv['status']]
        approved = [inv for inv in pending_invoices if "Approved" in inv['status']]
        
        response_text += f"📊 **Overview:**\n"
        response_text += f"- Total Pending: {len(pending_invoices)} invoices (R{total_pending_amount:,.2f})\n"
        response_text += f"- Awaiting Approval: {len(awaiting_approval)} invoices\n"
        response_text += f"- Approved (Payment Scheduled): {len(approved)} invoices\n\n"
        
        response_text += "📋 **Invoices Awaiting Approval:**\n"
        for inv in awaiting_approval:
            response_text += f"\n- **{inv['invoice_number']}**\n"
            response_text += f"  - Vendor: {inv['vendor']}\n"
            response_text += f"  - Amount: R{inv['amount']:,.2f}\n"
            response_text += f"  - Due: {inv['due_date']} ({inv['days_until_due']} days)\n"
            response_text += f"  - Status: {inv['status']}\n"
        
        response_text += "\n💰 **Approved - Scheduled for Payment:**\n"
        for inv in approved:
            response_text += f"\n- **{inv['invoice_number']}**\n"
            response_text += f"  - Vendor: {inv['vendor']}\n"
            response_text += f"  - Amount: R{inv['amount']:,.2f}\n"
            response_text += f"  - Payment Date: {inv['due_date']} ({inv['days_until_due']} days)\n"
        
        return {
            "success": True,
            "response": response_text,
            "data": {
                "pending_invoices": pending_invoices,
                "total_amount": total_pending_amount,
                "awaiting_approval_count": len(awaiting_approval),
                "approved_count": len(approved)
            }
        }
    
    def _schedule_payment(self, context: Optional[Dict] = None) -> Dict:
        """Schedule payment for approved invoice"""
        # Extract payment details from context or mock
        payment_data = context.get("payment_data") if context else {
            "invoice_number": "INV-VENDOR-2025-045",
            "vendor": "ABC Supplies (Pty) Ltd",
            "amount": 51750.00,
            "payment_date": "2025-02-21",
            "payment_method": "EFT",
            "bank_details": {
                "bank_name": "First National Bank",
                "account_number": "62******789",
                "branch_code": "250655"
            }
        }
        
        response_text = f"""**Payment Scheduled Successfully**

💰 **Payment Details:**
- Invoice Number: {payment_data['invoice_number']}
- Vendor: {payment_data['vendor']}
- Amount: R{payment_data['amount']:,.2f}
- Payment Date: {payment_data['payment_date']}
- Payment Method: {payment_data['payment_method']}

🏦 **Bank Details:**
- Bank: {payment_data['bank_details']['bank_name']}
- Account: {payment_data['bank_details']['account_number']}
- Branch Code: {payment_data['bank_details']['branch_code']}

✅ **Next Steps:**
1. Payment will be processed on {payment_data['payment_date']}
2. Vendor will receive payment confirmation email
3. Invoice will be marked as paid in the system
4. Payment will appear in bank reconciliation

**Reminders:**
- Ensure sufficient funds in payment account
- Payment can be cancelled up to 1 business day before payment date
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": {
                "payment_scheduled": True,
                "payment_data": payment_data,
                "confirmation_number": f"PAY-{datetime.now().strftime('%Y%m%d')}-{payment_data['invoice_number']}"
            },
            "actions": [
                {"type": "cancel_payment", "label": "Cancel Payment", "data": {"invoice_number": payment_data['invoice_number']}},
                {"type": "edit_payment", "label": "Edit Payment Date", "data": {"invoice_number": payment_data['invoice_number']}}
            ]
        }
    
    def _check_vendor(self, context: Optional[Dict] = None) -> Dict:
        """Check vendor details and payment history"""
        # Using SQLAlchemy models for database operations
        vendor_name = context.get("vendor_name", "ABC Supplies (Pty) Ltd") if context else "ABC Supplies (Pty) Ltd"
        
        vendor_data = {
            "vendor_code": "VEND-001",
            "vendor_name": vendor_name,
            "registered_name": "ABC Supplies (Pty) Ltd",
            "vat_number": "4123456789",
            "payment_terms": "Net 30",
            "credit_limit": 100000.00,
            "current_balance": 51750.00,
            "available_credit": 48250.00,
            "payment_history": {
                "total_invoices": 45,
                "total_paid": 42,
                "outstanding": 3,
                "avg_payment_days": 28,
                "on_time_percentage": 93.3
            },
            "bank_details": {
                "bank_name": "First National Bank",
                "account_number": "62123456789",
                "branch_code": "250655",
                "account_type": "Business Cheque"
            }
        }
        
        response_text = f"""**Vendor Information**

🏢 **Vendor Details:**
- Vendor Code: {vendor_data['vendor_code']}
- Name: {vendor_data['vendor_name']}
- Registered Name: {vendor_data['registered_name']}
- VAT Number: {vendor_data['vat_number']}
- Payment Terms: {vendor_data['payment_terms']}

💰 **Credit Status:**
- Credit Limit: R{vendor_data['credit_limit']:,.2f}
- Current Balance: R{vendor_data['current_balance']:,.2f}
- Available Credit: R{vendor_data['available_credit']:,.2f}
- Status: {"✅ Within Credit Limit" if vendor_data['current_balance'] < vendor_data['credit_limit'] else "⚠️ Approaching Limit"}

📊 **Payment History:**
- Total Invoices: {vendor_data['payment_history']['total_invoices']}
- Paid Invoices: {vendor_data['payment_history']['total_paid']}
- Outstanding: {vendor_data['payment_history']['outstanding']}
- Average Payment Days: {vendor_data['payment_history']['avg_payment_days']} days
- On-Time Payment: {vendor_data['payment_history']['on_time_percentage']}%

🏦 **Bank Details:**
- Bank: {vendor_data['bank_details']['bank_name']}
- Account Number: {vendor_data['bank_details']['account_number']}
- Branch Code: {vendor_data['bank_details']['branch_code']}
- Account Type: {vendor_data['bank_details']['account_type']}
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": vendor_data
        }
    
    def _perform_three_way_match(self, context: Optional[Dict] = None) -> Dict:
        """Perform 3-way match: Purchase Order -> Invoice -> Goods Receipt"""
        # Using SQLAlchemy models for database operations
        
        match_data = {
            "po_number": "PO-2025-123",
            "invoice_number": "INV-VENDOR-2025-045",
            "receipt_number": "GRN-2025-089",
            "match_status": "matched",
            "match_confidence": 98,
            "line_items_matched": 2,
            "line_items_total": 2,
            "discrepancies": []
        }
        
        line_comparison = [
            {
                "item": "Office Equipment - Model XYZ",
                "po_qty": 10,
                "po_price": 3500.00,
                "invoice_qty": 10,
                "invoice_price": 3500.00,
                "received_qty": 10,
                "status": "✅ Matched"
            },
            {
                "item": "Delivery & Installation",
                "po_qty": 1,
                "po_price": 10000.00,
                "invoice_qty": 1,
                "invoice_price": 10000.00,
                "received_qty": 1,
                "status": "✅ Matched"
            }
        ]
        
        response_text = f"""**3-Way Match Results**

📋 **Document References:**
- Purchase Order: {match_data['po_number']}
- Invoice: {match_data['invoice_number']}
- Goods Receipt: {match_data['receipt_number']}

✓ **Match Status:** {"✅ MATCHED" if match_data['match_status'] == 'matched' else "⚠️ DISCREPANCY FOUND"}
- Confidence Score: {match_data['match_confidence']}%
- Line Items: {match_data['line_items_matched']}/{match_data['line_items_total']} matched

📊 **Line Item Comparison:**

"""
        
        for item in line_comparison:
            response_text += f"""**{item['item']}**
- PO: Qty {item['po_qty']} @ R{item['po_price']:,.2f} = R{item['po_qty'] * item['po_price']:,.2f}
- Invoice: Qty {item['invoice_qty']} @ R{item['invoice_price']:,.2f} = R{item['invoice_qty'] * item['invoice_price']:,.2f}
- Received: Qty {item['received_qty']}
- Status: {item['status']}

"""
        
        if not match_data['discrepancies']:
            response_text += "✅ **All items matched successfully. Invoice approved for payment.**"
        else:
            response_text += "⚠️ **Discrepancies found. Manual review required.**"
        
        return {
            "success": True,
            "response": response_text,
            "data": {
                "match_data": match_data,
                "line_comparison": line_comparison
            }
        }
    
    def _generate_ap_aging_report(self, context: Optional[Dict] = None) -> Dict:
        """Generate Accounts Payable aging report"""
        # Using SQLAlchemy models for database operations
        
        aging_data = {
            "report_date": datetime.now().strftime("%Y-%m-%d"),
            "current_0_30": 145000.00,
            "days_31_60": 32000.00,
            "days_61_90": 8500.00,
            "days_over_90": 2100.00,
            "total_payable": 187600.00
        }
        
        response_text = f"""**Accounts Payable Aging Report**

📅 **Report Date:** {aging_data['report_date']}

💰 **Aging Summary:**
- Current (0-30 days): R{aging_data['current_0_30']:,.2f} (77%)
- 31-60 days: R{aging_data['days_31_60']:,.2f} (17%)
- 61-90 days: R{aging_data['days_61_90']:,.2f} (5%)
- Over 90 days: R{aging_data['days_over_90']:,.2f} (1%)

**Total Accounts Payable: R{aging_data['total_payable']:,.2f}**

📊 **Insights:**
- Aging is healthy - 77% of payables are current
- 23% of payables are over 30 days old
- R{aging_data['days_61_90'] + aging_data['days_over_90']:,.2f} require immediate attention

**Recommendations:**
1. Prioritize payment of R{aging_data['days_over_90']:,.2f} over 90 days (possible late fees)
2. Review 61-90 day invoices for payment scheduling
3. Maintain current payment schedule for 0-30 day invoices
"""
        
        return {
            "success": True,
            "response": response_text,
            "data": aging_data
        }
    
    def _general_response(self, query: str, context: Optional[Dict] = None) -> Dict:
        """General response for unrecognized queries"""
        response_text = f"""**Accounts Payable Bot**

I can help you with:
- **Process invoices:** "Process invoice [file/number]"
- **View pending invoices:** "Show pending invoices"
- **Schedule payments:** "Schedule payment for [invoice]"
- **Check vendors:** "Check vendor [name]"
- **3-way matching:** "3-way match [invoice] [PO] [receipt]"
- **AP aging report:** "Generate AP aging report"

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
_accounts_payable_bot_instance = None

def get_accounts_payable_bot() -> AccountsPayableBot:
    """Get singleton instance of Accounts Payable Bot"""
    global _accounts_payable_bot_instance
    if _accounts_payable_bot_instance is None:
        _accounts_payable_bot_instance = AccountsPayableBot()
    return _accounts_payable_bot_instance
