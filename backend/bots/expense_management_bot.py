"""
Expense Management Bot
Track expenses, categorize costs, enforce policies, approve claims, and generate reports

This bot helps businesses:
- Track employee expenses (receipts, claims)
- Categorize expenses automatically (AI-powered)
- Enforce expense policies (limits, approvals)
- Approve/reject expense claims (workflow)
- Generate expense reports (monthly, by department, by employee)
- Flag policy violations and fraud
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


class ExpenseManagementBot:
    """Expense Management Bot - Track, categorize, approve expenses"""
    
    # Expense categories
    EXPENSE_CATEGORIES = [
        "Travel", "Accommodation", "Meals", "Entertainment",
        "Office Supplies", "Software", "Training", "Marketing",
        "Telecommunications", "Utilities", "Other"
    ]
    
    # Default expense policy limits (can be customized per company)
    DEFAULT_POLICY = {
        "Travel": {"daily_limit": 2000, "requires_approval": True, "requires_receipt": True},
        "Accommodation": {"daily_limit": 1500, "requires_approval": True, "requires_receipt": True},
        "Meals": {"daily_limit": 500, "requires_approval": False, "requires_receipt": True},
        "Entertainment": {"daily_limit": 1000, "requires_approval": True, "requires_receipt": True},
        "Office Supplies": {"daily_limit": 1000, "requires_approval": False, "requires_receipt": True},
        "Software": {"daily_limit": 5000, "requires_approval": True, "requires_receipt": True},
        "Training": {"daily_limit": 10000, "requires_approval": True, "requires_receipt": True},
        "Marketing": {"daily_limit": 5000, "requires_approval": True, "requires_receipt": True},
        "Telecommunications": {"daily_limit": 1000, "requires_approval": False, "requires_receipt": False},
        "Utilities": {"daily_limit": 2000, "requires_approval": False, "requires_receipt": True},
        "Other": {"daily_limit": 500, "requires_approval": True, "requires_receipt": True}
    }
    
    def __init__(self):
        self.bot_id = "expense_management"
        self.name = "Expense Management Bot"
        self.description = "Track expenses, categorize costs, enforce policies, and approve claims"
    

    def get_capabilities(self):
        """Return bot capabilities"""
        return ["expense_tracking", "approval", "reimbursement"]

    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute expense management query
        
        Supported queries:
        - "Submit expense claim"
        - "Show pending expenses"
        - "Approve/reject expense [id]"
        - "Generate expense report"
        - "Flag policy violations"
        """
        query_lower = query.lower()
        
        # Determine query type
        if "submit" in query_lower or "claim" in query_lower:
            return self._submit_expense_claim(context)
        elif "pending" in query_lower or "awaiting" in query_lower:
            return self._show_pending_expenses(context)
        elif "approve" in query_lower or "reject" in query_lower:
            return self._process_approval(context)
        elif "report" in query_lower or "summary" in query_lower:
            return self._generate_expense_report(context)
        elif "violation" in query_lower or "flag" in query_lower:
            return self._flag_policy_violations(context)
        elif "categorize" in query_lower or "category" in query_lower:
            return self._categorize_expense(context)
        else:
            return self._general_response(query, context)
    
    def _submit_expense_claim(self, context: Optional[Dict] = None) -> Dict:
        """Submit an expense claim"""
        # TODO: Connect to real database and file storage
        # For now, simulate submission
        
        # Extract expense details from context
        if context:
            category = context.get("category", "Meals")
            amount = context.get("amount", 450.00)
            description = context.get("description", "Client lunch meeting")
            receipt_attached = context.get("receipt_attached", True)
        else:
            category = "Meals"
            amount = 450.00
            description = "Client lunch meeting"
            receipt_attached = True
        
        # Get policy for category
        policy = self.DEFAULT_POLICY.get(category, self.DEFAULT_POLICY["Other"])
        
        # Check policy compliance
        policy_violations = []
        if amount > policy["daily_limit"]:
            policy_violations.append(f"Amount exceeds daily limit (R{policy['daily_limit']:,.2f})")
        if policy["requires_receipt"] and not receipt_attached:
            policy_violations.append("Receipt required but not attached")
        
        # Determine approval status
        if policy_violations:
            status = "pending_review"
            status_icon = "⚠️"
            status_message = "Expense flagged for review due to policy violations"
        elif policy["requires_approval"]:
            status = "pending_approval"
            status_icon = "⏳"
            status_message = "Expense submitted for manager approval"
        else:
            status = "auto_approved"
            status_icon = "✅"
            status_message = "Expense auto-approved (within policy limits)"
        
        expense_id = "EXP-2025-0123"  # Mock ID
        
        response_text = f"""**Expense Claim Submitted** {status_icon}

**Expense ID:** {expense_id}

**Details:**
- Category: {category}
- Amount: R{amount:,.2f}
- Description: {description}
- Receipt: {'✅ Attached' if receipt_attached else '❌ Missing'}

**Status:** {status_message}

**Policy Check:**
- Daily Limit: R{policy['daily_limit']:,.2f} {'✅' if amount <= policy['daily_limit'] else '❌'}
- Requires Approval: {'Yes' if policy['requires_approval'] else 'No'}
- Receipt Required: {'Yes ✅' if receipt_attached or not policy['requires_receipt'] else 'Yes ❌'}
"""
        
        if policy_violations:
            response_text += f"\n**⚠️ Policy Violations:**\n"
            for violation in policy_violations:
                response_text += f"- {violation}\n"
        
        if status == "auto_approved":
            response_text += "\n✅ **Reimbursement**: Will be processed in next payroll cycle"
        elif status == "pending_approval":
            response_text += "\n⏳ **Next Step**: Awaiting manager approval"
        else:
            response_text += "\n⚠️ **Next Step**: Finance team will review"
        
        return {
            "response": response_text,
            "expense": {
                "expense_id": expense_id,
                "category": category,
                "amount": amount,
                "description": description,
                "status": status,
                "policy_violations": policy_violations
            }
        }
    
    def _show_pending_expenses(self, context: Optional[Dict] = None) -> Dict:
        """Show pending expense claims"""
        # TODO: Connect to real database
        
        pending_expenses = [
            {
                "expense_id": "EXP-2025-0120",
                "employee": "John Doe",
                "category": "Travel",
                "amount": 1500.00,
                "description": "Flight to Cape Town - client meeting",
                "submitted_date": "2025-01-20",
                "status": "pending_approval",
                "days_pending": 5
            },
            {
                "expense_id": "EXP-2025-0121",
                "employee": "Sarah Smith",
                "category": "Software",
                "amount": 3500.00,
                "description": "Adobe Creative Cloud annual license",
                "submitted_date": "2025-01-22",
                "status": "pending_approval",
                "days_pending": 3
            },
            {
                "expense_id": "EXP-2025-0122",
                "employee": "Peter Jones",
                "category": "Entertainment",
                "amount": 2500.00,
                "description": "Client dinner (5 people)",
                "submitted_date": "2025-01-23",
                "status": "pending_review",
                "days_pending": 2,
                "policy_violation": "Exceeds daily limit (R1,000)"
            }
        ]
        
        total_pending = sum(exp["amount"] for exp in pending_expenses)
        total_count = len(pending_expenses)
        review_count = sum(1 for exp in pending_expenses if exp["status"] == "pending_review")
        
        response_text = f"""**Pending Expense Claims**

**Summary:**
- 📊 Total Claims: {total_count}
- 💰 Total Amount: R{total_pending:,.2f}
- ⚠️ Requires Review: {review_count}

**Claims Awaiting Approval:**
"""
        
        for exp in pending_expenses:
            status_icon = "⚠️" if exp["status"] == "pending_review" else "⏳"
            response_text += f"\n**{exp['expense_id']}** {status_icon}\n"
            response_text += f"  - Employee: {exp['employee']}\n"
            response_text += f"  - Category: {exp['category']}\n"
            response_text += f"  - Amount: R{exp['amount']:,.2f}\n"
            response_text += f"  - Description: {exp['description']}\n"
            response_text += f"  - Submitted: {exp['submitted_date']} ({exp['days_pending']} days ago)\n"
            if "policy_violation" in exp:
                response_text += f"  - ⚠️ **Issue**: {exp['policy_violation']}\n"
        
        response_text += "\n**Quick Actions:**\n"
        response_text += "- 'Approve expense [ID]'\n"
        response_text += "- 'Reject expense [ID]'\n"
        response_text += "- 'Request more info for [ID]'\n"
        
        return {
            "response": response_text,
            "pending_expenses": pending_expenses,
            "summary": {
                "total_count": total_count,
                "total_amount": total_pending,
                "review_count": review_count
            }
        }
    
    def _process_approval(self, context: Optional[Dict] = None) -> Dict:
        """Approve or reject an expense claim"""
        # TODO: Connect to real database
        
        expense_id = context.get("expense_id", "EXP-2025-0120") if context else "EXP-2025-0120"
        action = context.get("action", "approve") if context else "approve"
        reason = context.get("reason", "") if context else ""
        
        # Mock expense details
        expense = {
            "expense_id": expense_id,
            "employee": "John Doe",
            "category": "Travel",
            "amount": 1500.00,
            "description": "Flight to Cape Town - client meeting"
        }
        
        if action == "approve":
            status_icon = "✅"
            status_text = "APPROVED"
            message = f"Expense claim {expense_id} has been approved. Reimbursement will be processed in the next payroll cycle."
        else:
            status_icon = "❌"
            status_text = "REJECTED"
            message = f"Expense claim {expense_id} has been rejected. The employee will be notified."
        
        response_text = f"""**Expense Claim {status_text}** {status_icon}

**Expense ID:** {expense_id}

**Details:**
- Employee: {expense['employee']}
- Category: {expense['category']}
- Amount: R{expense['amount']:,.2f}
- Description: {expense['description']}

**Decision:** {status_text}
{'**Reason:** ' + reason if reason else ''}

**Next Steps:**
"""
        
        if action == "approve":
            response_text += f"1. ✅ Employee will be notified\n"
            response_text += f"2. 💰 Reimbursement scheduled for next payroll\n"
            response_text += f"3. 📊 Expense recorded in accounting system\n"
        else:
            response_text += f"1. 📧 Employee will receive rejection notification\n"
            response_text += f"2. 💬 Employee can resubmit with corrections\n"
        
        response_text += f"\n✅ **Action completed successfully**"
        
        return {
            "response": response_text,
            "expense_id": expense_id,
            "action": action,
            "status": "completed"
        }
    
    def _generate_expense_report(self, context: Optional[Dict] = None) -> Dict:
        """Generate expense report"""
        # TODO: Connect to real database
        
        period = context.get("period", "January 2025") if context else "January 2025"
        
        response_text = f"""**Expense Report - {period}**

**Summary:**
- 📊 Total Expenses: R48,650.00
- 💰 Approved: R42,150.00 (87%)
- ⏳ Pending: R5,000.00 (10%)
- ❌ Rejected: R1,500.00 (3%)
- 👥 Employees: 12

**By Category:**
| Category | Amount | % | Status |
|----------|--------|---|--------|
| Travel | R18,500 | 38% | ✅ |
| Accommodation | R9,500 | 20% | ✅ |
| Meals | R6,850 | 14% | ✅ |
| Software | R7,000 | 14% | ⏳ |
| Entertainment | R4,300 | 9% | ✅ |
| Office Supplies | R2,500 | 5% | ✅ |

**By Department:**
- Sales: R22,000 (45%)
- Marketing: R12,500 (26%)
- Operations: R8,150 (17%)
- IT: R6,000 (12%)

**Top Spenders:**
1. John Doe (Sales): R8,500
2. Sarah Smith (Marketing): R6,800
3. Peter Jones (Sales): R5,200

**Policy Compliance:**
- ✅ 94% within policy limits
- ⚠️ 6% exceeded limits (but approved by management)
- 🔴 0% fraudulent claims detected

**Recommendations:**
1. Review travel policy (38% of total spend)
2. Consider negotiated hotel rates (reduce accommodation costs)
3. Implement meal per-diem instead of receipts

📊 **Full PDF Report**: Available for download
📧 **Emailed to**: finance@yourcompany.com
"""
        
        return {"response": response_text}
    
    def _flag_policy_violations(self, context: Optional[Dict] = None) -> Dict:
        """Flag expense policy violations"""
        # TODO: Connect to real database
        
        violations = [
            {
                "expense_id": "EXP-2025-0118",
                "employee": "Peter Jones",
                "category": "Entertainment",
                "amount": 2500.00,
                "limit": 1000.00,
                "violation_type": "Exceeded limit",
                "severity": "medium",
                "status": "pending_review"
            },
            {
                "expense_id": "EXP-2025-0115",
                "employee": "Jane Brown",
                "category": "Travel",
                "amount": 850.00,
                "violation_type": "Missing receipt",
                "severity": "low",
                "status": "pending_review"
            },
            {
                "expense_id": "EXP-2025-0112",
                "employee": "Mike Wilson",
                "category": "Meals",
                "amount": 1200.00,
                "violation_type": "Duplicate claim",
                "severity": "high",
                "status": "flagged_fraud"
            }
        ]
        
        response_text = f"""**Policy Violations Report**

I've identified {len(violations)} expense claims that violate company policy:

"""
        
        for i, viol in enumerate(violations, 1):
            severity_icon = {"low": "⚠️", "medium": "🚨", "high": "🔴"}[viol["severity"]]
            response_text += f"\n**{i}. {viol['violation_type']}** {severity_icon}\n"
            response_text += f"   - Expense ID: {viol['expense_id']}\n"
            response_text += f"   - Employee: {viol['employee']}\n"
            response_text += f"   - Category: {viol['category']}\n"
            response_text += f"   - Amount: R{viol['amount']:,.2f}\n"
            
            if "limit" in viol:
                response_text += f"   - Limit: R{viol['limit']:,.2f} (exceeded by R{viol['amount'] - viol['limit']:,.2f})\n"
            
            response_text += f"   - Status: {viol['status'].replace('_', ' ').title()}\n"
        
        response_text += "\n**Recommended Actions:**\n"
        response_text += "1. Review high-severity violations immediately\n"
        response_text += "2. Request additional documentation for medium violations\n"
        response_text += "3. Update policy communication if violations are systemic\n"
        
        return {
            "response": response_text,
            "violations": violations,
            "summary": {
                "total_violations": len(violations),
                "high": sum(1 for v in violations if v["severity"] == "high"),
                "medium": sum(1 for v in violations if v["severity"] == "medium"),
                "low": sum(1 for v in violations if v["severity"] == "low")
            }
        }
    
    def _categorize_expense(self, context: Optional[Dict] = None) -> Dict:
        """Auto-categorize an expense using AI"""
        # TODO: Implement actual AI categorization
        
        description = context.get("description", "Uber to airport for business trip") if context else "Uber to airport for business trip"
        amount = context.get("amount", 350.00) if context else 350.00
        
        # Simple keyword-based categorization (can be enhanced with ML)
        description_lower = description.lower()
        category = "Other"
        confidence = 0
        
        if any(word in description_lower for word in ["flight", "uber", "taxi", "fuel", "car", "airport"]):
            category = "Travel"
            confidence = 95
        elif any(word in description_lower for word in ["hotel", "accommodation", "airbnb"]):
            category = "Accommodation"
            confidence = 90
        elif any(word in description_lower for word in ["lunch", "dinner", "breakfast", "restaurant", "coffee"]):
            category = "Meals"
            confidence = 85
        elif any(word in description_lower for word in ["software", "subscription", "license", "saas"]):
            category = "Software"
            confidence = 90
        
        policy = self.DEFAULT_POLICY[category]
        
        response_text = f"""**Expense Categorization**

**Description:** "{description}"
**Amount:** R{amount:,.2f}

**Suggested Category:** {category} ({confidence}% confidence)

**Policy for {category}:**
- Daily Limit: R{policy['daily_limit']:,.2f} {'✅' if amount <= policy['daily_limit'] else '❌ EXCEEDED'}
- Requires Approval: {'Yes' if policy['requires_approval'] else 'No'}
- Receipt Required: {'Yes' if policy['requires_receipt'] else 'No'}

{'✅ Within policy limits' if amount <= policy['daily_limit'] else '⚠️ Exceeds policy limit - requires management approval'}
"""
        
        return {
            "response": response_text,
            "categorization": {
                "description": description,
                "amount": amount,
                "suggested_category": category,
                "confidence": confidence,
                "policy": policy
            }
        }
    
    def _general_response(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Handle general queries"""
        response_text = f"""I'm the Expense Management Bot. I can help you with:

**What I Can Do:**
- 📝 Submit expense claims (with receipt upload)
- 🔍 Categorize expenses automatically (AI-powered)
- ✅ Approve/reject expense claims (workflow)
- 📊 Generate expense reports (by period, department, employee)
- 🚨 Flag policy violations (limits, receipts, fraud)
- 💰 Track spending (real-time analytics)
- 📋 Enforce expense policies (custom rules)

**Expense Categories:**
- Travel, Accommodation, Meals, Entertainment
- Office Supplies, Software, Training, Marketing
- Telecommunications, Utilities, Other

**Try asking me:**
- "Submit expense claim for R450 (Meals)"
- "Show pending expenses"
- "Approve expense EXP-2025-0120"
- "Generate expense report for January"
- "Flag policy violations"
- "Categorize expense: 'Uber to client meeting'"

**Your Question:** "{query}"

💡 **Tip**: Upload receipts (photo/PDF) for instant AI categorization and approval!

How can I help you manage expenses?
"""
        
        return {"response": response_text}


# Export bot instance
expense_management_bot = ExpenseManagementBot()
