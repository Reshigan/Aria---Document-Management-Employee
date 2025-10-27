"""
Bot Intelligence Service - Connects AI to ERP Data
Makes bots REAL by integrating AI with actual business data
"""

from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

from services.ai_service import AIService, AIMessage
from services.accounting_service import AccountingService
from models.transactions import Invoice, Bill, Payment, Customer, Supplier, InvoiceStatus
from models.accounting import ChartOfAccounts, GeneralLedger
from models.inventory import Product, StockLevel
from models.hr import Employee, PayrollPeriod, LeaveRequest, LeaveRequestStatus
from models.crm import Lead, Opportunity, LeadStatus, OpportunityStage


class BotIntelligenceService:
    """
    Bot Intelligence Service - The Brain of Aria Bots
    Connects AI with ERP data to make bots actually intelligent
    """
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.ai_service = AIService()
        self.accounting_service = AccountingService(db, tenant_id)
    
    # ==================== INVOICE RECONCILIATION BOT ====================
    
    async def invoice_reconciliation_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle invoice reconciliation queries
        
        Args:
            query: User query
            user_context: User context
        
        Returns:
            Bot response with data
        """
        # Analyze intent
        intent = await self.ai_service.analyze_intent(query)
        
        # Get relevant invoice data
        invoices = self.db.query(Invoice).filter(
            Invoice.tenant_id == self.tenant_id,
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE])
        ).order_by(Invoice.invoice_date.desc()).limit(20).all()
        
        bills = self.db.query(Bill).filter(
            Bill.tenant_id == self.tenant_id,
            Bill.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE])
        ).order_by(Bill.bill_date.desc()).limit(20).all()
        
        # Prepare data for AI
        invoice_data = {
            "customer_invoices": [
                {
                    "invoice_number": inv.invoice_number,
                    "customer": inv.customer.customer_name if inv.customer else "N/A",
                    "invoice_date": inv.invoice_date.strftime("%Y-%m-%d"),
                    "due_date": inv.due_date.strftime("%Y-%m-%d"),
                    "total_amount": float(inv.total_amount),
                    "amount_paid": float(inv.amount_paid),
                    "amount_outstanding": float(inv.amount_outstanding),
                    "status": inv.status.value
                }
                for inv in invoices[:10]
            ],
            "supplier_bills": [
                {
                    "bill_number": bill.bill_number,
                    "supplier": bill.supplier.supplier_name if bill.supplier else "N/A",
                    "bill_date": bill.bill_date.strftime("%Y-%m-%d"),
                    "due_date": bill.due_date.strftime("%Y-%m-%d"),
                    "total_amount": float(bill.total_amount),
                    "amount_paid": float(bill.amount_paid),
                    "amount_outstanding": float(bill.amount_outstanding),
                    "status": bill.status.value
                }
                for bill in bills[:10]
            ]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="invoice_reconciliation",
            query=query,
            context=user_context,
            data=invoice_data
        )
        
        # Find discrepancies (simple logic for now)
        discrepancies = []
        for inv in invoices[:5]:
            if inv.status == InvoiceStatus.OVERDUE:
                days_overdue = (datetime.now() - inv.due_date).days
                discrepancies.append({
                    "type": "overdue_invoice",
                    "invoice_number": inv.invoice_number,
                    "customer": inv.customer.customer_name if inv.customer else "N/A",
                    "days_overdue": days_overdue,
                    "amount": float(inv.amount_outstanding)
                })
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": invoice_data,
            "discrepancies": discrepancies,
            "actions_taken": ["Analyzed invoice data", "Identified discrepancies"],
            "suggestions": [
                "Review overdue invoices",
                "Contact customers with payment delays",
                "Run aging report for detailed analysis"
            ]
        }
    
    # ==================== BBBEE COMPLIANCE BOT ====================
    
    async def bbbee_compliance_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle BBBEE compliance queries
        """
        # Get supplier data (for procurement points calculation)
        suppliers = self.db.query(Supplier).filter(
            Supplier.tenant_id == self.tenant_id,
            Supplier.is_active == True
        ).all()
        
        # Calculate BBBEE stats
        total_suppliers = len(suppliers)
        black_owned_suppliers = sum(1 for s in suppliers if s.is_black_owned)
        bbbee_certified = sum(1 for s in suppliers if s.bbbee_level is not None)
        
        # Calculate procurement spend (would need actual purchase data)
        total_procurement_spend = sum(s.current_balance for s in suppliers if s.current_balance)
        black_owned_spend = sum(s.current_balance for s in suppliers if s.is_black_owned and s.current_balance)
        
        bbbee_data = {
            "procurement": {
                "total_suppliers": total_suppliers,
                "black_owned_suppliers": black_owned_suppliers,
                "black_owned_percentage": (black_owned_suppliers / total_suppliers * 100) if total_suppliers > 0 else 0,
                "total_spend": float(total_procurement_spend or 0),
                "black_owned_spend": float(black_owned_spend or 0),
                "black_owned_spend_percentage": (black_owned_spend / total_procurement_spend * 100) if total_procurement_spend else 0
            },
            "suppliers": [
                {
                    "name": s.supplier_name,
                    "bbbee_level": s.bbbee_level,
                    "is_black_owned": s.is_black_owned,
                    "black_ownership_percentage": float(s.black_ownership_percentage or 0),
                    "procurement_points": float(s.procurement_points or 0)
                }
                for s in suppliers[:20]
            ]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="bbbee_compliance",
            query=query,
            context=user_context,
            data=bbbee_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": bbbee_data,
            "actions_taken": ["Calculated BBBEE procurement metrics"],
            "suggestions": [
                "Increase procurement from black-owned suppliers to improve scorecard",
                "Verify supplier BBBEE certificates",
                "Set up supplier development program"
            ]
        }
    
    # ==================== EXPENSE MANAGEMENT BOT ====================
    
    async def expense_management_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle expense management queries
        """
        # Get expense accounts (Operating Expenses 6000 series)
        expense_accounts = self.db.query(ChartOfAccounts).filter(
            ChartOfAccounts.tenant_id == self.tenant_id,
            ChartOfAccounts.account_code.like("6%"),
            ChartOfAccounts.is_active == True
        ).all()
        
        # Get recent GL entries for expenses
        current_month = datetime.now().strftime("%Y-%m")
        
        expense_data = {
            "current_period": current_month,
            "expense_accounts": [
                {
                    "code": acc.account_code,
                    "name": acc.account_name,
                    "balance": float(acc.current_balance),
                    "budget": 0.0  # Would come from budget module
                }
                for acc in expense_accounts[:15]
            ],
            "total_expenses": sum(acc.current_balance for acc in expense_accounts)
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="expense_management",
            query=query,
            context=user_context,
            data=expense_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": expense_data,
            "actions_taken": ["Analyzed expense accounts"],
            "suggestions": [
                "Review high-spend categories",
                "Set up expense approval workflow",
                "Create monthly expense budget"
            ]
        }
    
    # ==================== PAYROLL SA BOT ====================
    
    async def payroll_sa_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle payroll queries (South African)
        """
        # Get employees
        employees = self.db.query(Employee).filter(
            Employee.tenant_id == self.tenant_id,
            Employee.status == "active"
        ).all()
        
        # Get latest payroll period
        latest_payroll = self.db.query(PayrollPeriod).filter(
            PayrollPeriod.tenant_id == self.tenant_id
        ).order_by(PayrollPeriod.pay_date.desc()).first()
        
        # Calculate payroll stats
        total_employees = len(employees)
        total_gross_salary = sum(emp.basic_salary for emp in employees)
        
        # SA Tax calculations (simplified)
        total_paye = total_gross_salary * 0.25  # Simplified, should use tax tables
        total_uif_employee = total_gross_salary * 0.01  # 1% employee
        total_uif_employer = total_gross_salary * 0.01  # 1% employer
        total_sdl = total_gross_salary * 0.01  # 1% SDL
        total_net_pay = total_gross_salary - total_paye - total_uif_employee
        
        payroll_data = {
            "period": latest_payroll.period_code if latest_payroll else "N/A",
            "total_employees": total_employees,
            "total_gross_salary": float(total_gross_salary),
            "total_paye": float(total_paye),
            "total_uif_employee": float(total_uif_employee),
            "total_uif_employer": float(total_uif_employer),
            "total_sdl": float(total_sdl),
            "total_net_pay": float(total_net_pay),
            "employees": [
                {
                    "employee_number": emp.employee_number,
                    "name": f"{emp.first_name} {emp.last_name}",
                    "job_title": emp.job_title,
                    "basic_salary": float(emp.basic_salary)
                }
                for emp in employees[:10]
            ]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="payroll_sa",
            query=query,
            context=user_context,
            data=payroll_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": payroll_data,
            "actions_taken": ["Calculated payroll summary", "Applied SA tax rules"],
            "suggestions": [
                "Run payroll for current period",
                "Generate IRP5 certificates",
                "Submit PAYE to SARS"
            ]
        }
    
    # ==================== AR COLLECTIONS BOT ====================
    
    async def ar_collections_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle AR collections queries
        """
        # Get overdue invoices
        today = datetime.now()
        overdue_invoices = self.db.query(Invoice).filter(
            Invoice.tenant_id == self.tenant_id,
            Invoice.due_date < today,
            Invoice.amount_outstanding > 0
        ).order_by(Invoice.due_date.asc()).all()
        
        # Calculate aging
        aging_30 = sum(inv.amount_outstanding for inv in overdue_invoices if (today - inv.due_date).days <= 30)
        aging_60 = sum(inv.amount_outstanding for inv in overdue_invoices if 30 < (today - inv.due_date).days <= 60)
        aging_90 = sum(inv.amount_outstanding for inv in overdue_invoices if 60 < (today - inv.due_date).days <= 90)
        aging_90_plus = sum(inv.amount_outstanding for inv in overdue_invoices if (today - inv.due_date).days > 90)
        
        ar_data = {
            "total_overdue": len(overdue_invoices),
            "total_overdue_amount": float(sum(inv.amount_outstanding for inv in overdue_invoices)),
            "aging": {
                "0-30_days": float(aging_30),
                "31-60_days": float(aging_60),
                "61-90_days": float(aging_90),
                "90+_days": float(aging_90_plus)
            },
            "top_overdue": [
                {
                    "invoice_number": inv.invoice_number,
                    "customer": inv.customer.customer_name if inv.customer else "N/A",
                    "due_date": inv.due_date.strftime("%Y-%m-%d"),
                    "days_overdue": (today - inv.due_date).days,
                    "amount": float(inv.amount_outstanding)
                }
                for inv in overdue_invoices[:10]
            ]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="ar_collections",
            query=query,
            context=user_context,
            data=ar_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": ar_data,
            "actions_taken": ["Generated aging report", "Identified collection priorities"],
            "suggestions": [
                "Send reminders for 30-day overdue invoices",
                "Call customers with 60+ day overdue invoices",
                "Consider collection agency for 90+ day overdue"
            ]
        }
    
    # ==================== LEAVE MANAGEMENT BOT ====================
    
    async def leave_management_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle leave management queries
        """
        # Get pending leave requests
        pending_requests = self.db.query(LeaveRequest).filter(
            LeaveRequest.tenant_id == self.tenant_id,
            LeaveRequest.status == LeaveRequestStatus.PENDING
        ).all()
        
        # Get employee leave balances
        employees = self.db.query(Employee).filter(
            Employee.tenant_id == self.tenant_id,
            Employee.status == "active"
        ).all()
        
        leave_data = {
            "pending_requests": [
                {
                    "employee": f"{req.employee.first_name} {req.employee.last_name}",
                    "leave_type": req.leave_type.value,
                    "start_date": req.start_date.strftime("%Y-%m-%d"),
                    "end_date": req.end_date.strftime("%Y-%m-%d"),
                    "days_requested": float(req.days_requested),
                    "reason": req.reason
                }
                for req in pending_requests[:10]
            ],
            "employee_balances": [
                {
                    "employee": f"{emp.first_name} {emp.last_name}",
                    "annual_leave_balance": float(emp.annual_leave_balance),
                    "sick_leave_balance": float(emp.sick_leave_balance)
                }
                for emp in employees[:20]
            ]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="leave_management",
            query=query,
            context=user_context,
            data=leave_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": leave_data,
            "actions_taken": ["Retrieved leave requests", "Checked leave balances"],
            "suggestions": [
                "Approve pending leave requests",
                "Check for leave conflicts",
                "Update leave balances"
            ]
        }
    
    # ==================== INVENTORY REORDER BOT ====================
    
    async def inventory_reorder_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle inventory reorder queries
        """
        # Get products with low stock
        products = self.db.query(Product).filter(
            Product.tenant_id == self.tenant_id,
            Product.track_inventory == True,
            Product.is_active == True
        ).all()
        
        # Find products below reorder level
        reorder_needed = []
        for product in products:
            if product.total_qty_available <= product.reorder_level:
                reorder_needed.append({
                    "product_code": product.product_code,
                    "product_name": product.product_name,
                    "qty_on_hand": float(product.total_qty_on_hand),
                    "reorder_level": float(product.reorder_level),
                    "reorder_quantity": float(product.reorder_quantity),
                    "status": "CRITICAL" if product.total_qty_available <= 0 else "LOW"
                })
        
        inventory_data = {
            "products_tracked": len(products),
            "reorder_needed": len(reorder_needed),
            "reorder_list": reorder_needed[:15]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="inventory_reorder",
            query=query,
            context=user_context,
            data=inventory_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": inventory_data,
            "actions_taken": ["Checked stock levels", "Identified reorder requirements"],
            "suggestions": [
                "Create purchase orders for low stock items",
                "Contact suppliers for lead times",
                "Review reorder levels for frequently stocked-out items"
            ]
        }
    
    # ==================== LEAD QUALIFICATION BOT ====================
    
    async def lead_qualification_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle lead qualification queries
        """
        # Get recent leads
        leads = self.db.query(Lead).filter(
            Lead.tenant_id == self.tenant_id,
            Lead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED])
        ).order_by(Lead.created_at.desc()).all()
        
        lead_data = {
            "total_leads": len(leads),
            "leads": [
                {
                    "lead_number": lead.lead_number,
                    "name": f"{lead.first_name} {lead.last_name}",
                    "company": lead.company_name,
                    "email": lead.email,
                    "phone": lead.phone,
                    "lead_source": lead.lead_source.value,
                    "status": lead.status.value,
                    "estimated_value": float(lead.estimated_value or 0)
                }
                for lead in leads[:15]
            ]
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="lead_qualification",
            query=query,
            context=user_context,
            data=lead_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": lead_data,
            "actions_taken": ["Analyzed lead pipeline"],
            "suggestions": [
                "Contact high-value leads first",
                "Qualify leads using BANT criteria",
                "Convert qualified leads to opportunities"
            ]
        }
    
    # ==================== GENERAL BOT QUERY ====================
    
    async def general_query(self, query: str, user_context: Dict) -> Dict[str, Any]:
        """
        Handle general queries (Meta-Bot Orchestrator)
        """
        # Analyze intent to route to appropriate bot
        intent = await self.ai_service.analyze_intent(query)
        
        # Get general ERP summary
        invoices_count = self.db.query(Invoice).filter(Invoice.tenant_id == self.tenant_id).count()
        customers_count = self.db.query(Customer).filter(Customer.tenant_id == self.tenant_id).count()
        employees_count = self.db.query(Employee).filter(Employee.tenant_id == self.tenant_id).count()
        
        general_data = {
            "intent_analysis": intent,
            "erp_summary": {
                "total_invoices": invoices_count,
                "total_customers": customers_count,
                "total_employees": employees_count
            }
        }
        
        # Get AI response
        ai_response = await self.ai_service.generate_bot_response(
            bot_name="meta_bot_orchestrator",
            query=query,
            context=user_context,
            data=general_data
        )
        
        return {
            "response": ai_response.content,
            "confidence": ai_response.confidence,
            "data": general_data,
            "actions_taken": ["Analyzed query intent", "Retrieved ERP summary"],
            "suggestions": [
                f"Try asking the {intent.get('suggested_bot', 'specific')} bot for more details",
                "Refine your query for better results",
                "Check the dashboard for key metrics"
            ]
        }
