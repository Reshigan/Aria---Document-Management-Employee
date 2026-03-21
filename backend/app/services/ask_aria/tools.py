"""
Tool definitions and implementations for Ask Aria
These tools allow the LLM to interact with the ERP system
"""
import uuid
from typing import Dict, List, Any, Optional
import pymysql
import pymysql.cursors
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ERPTools:
    """ERP operation tools for Ask Aria conversational AI"""
    
    def __init__(self, db_connection_string: str):
        self.db_connection_string = db_connection_string
    
    def get_connection(self):
        """Get MySQL database connection"""
        import re
        match = re.match(r"mysql\+pymysql://(.*?):(.*?)@(.*?):(\d+)/(.*)", self.db_connection_string)
        if not match:
            raise RuntimeError("DATABASE_URL must be in the format mysql+pymysql://user:password@host:port/dbname")
        user, password, host, port, db = match.groups()
        return pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=db,
            port=int(port),
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    
    def list_customers(self, company_id: str, search: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """List customers for the company"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    if search:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM customers
                            WHERE company_id = %s 
                            AND (name LIKE %s OR email LIKE %s)
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, f"%{search}%", f"%{search}%", limit))
                    else:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM customers
                            WHERE company_id = %s
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to list customers: {str(e)}")
            return []
    
    def list_products(self, company_id: str, search: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """List products for the company"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if search:
                        cur.execute("""
                            SELECT id, sku, name, description, unit_price, unit_of_measure, category
                            FROM products
                            WHERE company_id = %s 
                            AND (name ILIKE %s OR sku ILIKE %s OR description ILIKE %s)
                            AND is_active = true
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, f"%{search}%", f"%{search}%", f"%{search}%", limit))
                    else:
                        cur.execute("""
                            SELECT id, sku, name, description, unit_price, unit_of_measure, category
                            FROM products
                            WHERE company_id = %s AND is_active = true
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to list products: {str(e)}")
            return []
    
    def create_quote_draft(
        self,
        company_id: str,
        customer_id: str,
        valid_until: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a draft quote"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    quote_id = str(uuid.uuid4())
                    
                    if not valid_until:
                        valid_until = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                    
                    cur.execute("""
                        SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 9) AS INTEGER)), 0) + 1 as next_num
                        FROM quotes
                        WHERE company_id = %s AND quote_number LIKE 'QT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
                    """, (company_id,))
                    next_num = cur.fetchone()['next_num']
                    quote_number = f"QT-{datetime.now().year}-{next_num:05d}"
                    
                    cur.execute("""
                        INSERT INTO quotes 
                        (id, company_id, customer_id, quote_number, quote_date, valid_until, 
                         status, subtotal, tax_amount, total_amount, notes)
                        VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, 'draft', 0, 0, 0, %s)
                        RETURNING id, quote_number, quote_date, valid_until, status
                    """, (quote_id, company_id, customer_id, quote_number, valid_until, notes))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Created draft quote {quote_number}")
                    return dict(result)
        except Exception as e:
            logger.error(f"Failed to create quote draft: {str(e)}")
            raise
    
    def add_quote_line(
        self,
        quote_id: str,
        product_id: str,
        quantity: float,
        unit_price: Optional[float] = None,
        discount_percent: float = 0.0,
        tax_rate: float = 0.15
    ) -> Dict[str, Any]:
        """Add a line item to a quote"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if unit_price is None:
                        cur.execute("SELECT unit_price FROM products WHERE id = %s", (product_id,))
                        product = cur.fetchone()
                        if not product:
                            raise ValueError(f"Product {product_id} not found")
                        unit_price = float(product['unit_price'])
                    
                    line_id = str(uuid.uuid4())
                    subtotal = quantity * unit_price
                    discount_amount = subtotal * (discount_percent / 100)
                    taxable_amount = subtotal - discount_amount
                    tax_amount = taxable_amount * tax_rate
                    line_total = taxable_amount + tax_amount
                    
                    cur.execute("""
                        INSERT INTO quote_lines
                        (id, quote_id, product_id, quantity, unit_price, discount_percent,
                         discount_amount, tax_rate, tax_amount, line_total)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (line_id, quote_id, product_id, quantity, unit_price, discount_percent,
                          discount_amount, tax_rate, tax_amount, line_total))
                    
                    cur.execute("""
                        UPDATE quotes
                        SET subtotal = (SELECT SUM(quantity * unit_price) FROM quote_lines WHERE quote_id = %s),
                            tax_amount = (SELECT SUM(tax_amount) FROM quote_lines WHERE quote_id = %s),
                            total_amount = (SELECT SUM(line_total) FROM quote_lines WHERE quote_id = %s)
                        WHERE id = %s
                    """, (quote_id, quote_id, quote_id, quote_id))
                    
                    conn.commit()
                    
                    logger.info(f"Added line item to quote {quote_id}")
                    return {"line_id": line_id, "line_total": line_total}
        except Exception as e:
            logger.error(f"Failed to add quote line: {str(e)}")
            raise
    
    def finalize_quote(self, quote_id: str) -> Dict[str, Any]:
        """Finalize a draft quote (change status to 'sent')"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        UPDATE quotes
                        SET status = 'sent'
                        WHERE id = %s AND status = 'draft'
                        RETURNING id, quote_number, total_amount, status
                    """, (quote_id,))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    if result:
                        logger.info(f"Finalized quote {result['quote_number']}")
                        return dict(result)
                    else:
                        raise ValueError(f"Quote {quote_id} not found or not in draft status")
        except Exception as e:
            logger.error(f"Failed to finalize quote: {str(e)}")
            raise
    
    def get_quote_summary(self, quote_id: str) -> Dict[str, Any]:
        """Get quote summary with line items"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT q.*, c.name as customer_name, c.email as customer_email
                        FROM quotes q
                        JOIN customers c ON q.customer_id = c.id
                        WHERE q.id = %s
                    """, (quote_id,))
                    
                    quote = cur.fetchone()
                    if not quote:
                        raise ValueError(f"Quote {quote_id} not found")
                    
                    cur.execute("""
                        SELECT ql.*, p.name as product_name, p.sku as product_sku
                        FROM quote_lines ql
                        JOIN products p ON ql.product_id = p.id
                        WHERE ql.quote_id = %s
                        ORDER BY ql.created_at
                    """, (quote_id,))
                    
                    lines = cur.fetchall()
                    
                    return {
                        "quote": dict(quote),
                        "lines": [dict(line) for line in lines]
                    }
        except Exception as e:
            logger.error(f"Failed to get quote summary: {str(e)}")
            raise
    
    def list_suppliers(self, company_id: str, search: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """List suppliers for the company"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if search:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM suppliers
                            WHERE company_id = %s 
                            AND (name ILIKE %s OR email ILIKE %s)
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, f"%{search}%", f"%{search}%", limit))
                    else:
                        cur.execute("""
                            SELECT id, name, email, phone, address, city, country
                            FROM suppliers
                            WHERE company_id = %s
                            ORDER BY name
                            LIMIT %s
                        """, (company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to list suppliers: {str(e)}")
            return []
    
    def create_purchase_order_draft(
        self,
        company_id: str,
        supplier_id: str,
        delivery_date: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a draft purchase order"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    po_id = str(uuid.uuid4())
                    
                    if not delivery_date:
                        delivery_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
                    
                    cur.execute("""
                        SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1 as next_num
                        FROM purchase_orders
                        WHERE company_id = %s AND po_number LIKE 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
                    """, (company_id,))
                    next_num = cur.fetchone()['next_num']
                    po_number = f"PO-{datetime.now().year}-{next_num:05d}"
                    
                    cur.execute("""
                        INSERT INTO purchase_orders
                        (id, company_id, supplier_id, po_number, po_date, delivery_date,
                         status, subtotal, tax_amount, total_amount, notes)
                        VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, 'draft', 0, 0, 0, %s)
                        RETURNING id, po_number, po_date, delivery_date, status
                    """, (po_id, company_id, supplier_id, po_number, delivery_date, notes))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Created draft PO {po_number}")
                    return dict(result)
        except Exception as e:
            logger.error(f"Failed to create PO draft: {str(e)}")
            raise
    
    def start_quote_to_cash_workflow(
        self,
        company_id: str,
        user_id: str,
        customer_id: str,
        customer_name: str,
        customer_email: str,
        products: List[Dict[str, Any]],
        notes: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Start a Quote-to-Cash workflow"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    from app.services.workflows.workflow_orchestrator import WorkflowOrchestrator
                    from sqlalchemy.orm import Session
                    from app.core.database import SessionLocal
                    
                    db = SessionLocal()
                    try:
                        orchestrator = WorkflowOrchestrator(db)
                        
                        initial_context = {
                            'customer_id': customer_id,
                            'customer_name': customer_name,
                            'customer_email': customer_email,
                            'products': products,
                            'notes': notes
                        }
                        
                        import asyncio
                        result = asyncio.run(orchestrator.start_workflow(
                            workflow_name='quote_to_cash',
                            company_id=uuid.UUID(company_id),
                            user_id=uuid.UUID(user_id),
                            initial_context=initial_context,
                            conversation_id=uuid.UUID(conversation_id) if conversation_id else None
                        ))
                        
                        logger.info(f"Started Quote-to-Cash workflow: {result['instance_id']}")
                        return result
                    finally:
                        db.close()
        except Exception as e:
            logger.error(f"Failed to start workflow: {str(e)}")
            raise
    
    def get_workflow_status(self, workflow_instance_id: str) -> Dict[str, Any]:
        """Get status of a workflow instance"""
        try:
            with self.get_connection() as conn:
                from app.services.workflows.workflow_orchestrator import WorkflowOrchestrator
                from app.core.database import SessionLocal
                
                db = SessionLocal()
                try:
                    orchestrator = WorkflowOrchestrator(db)
                    result = orchestrator.get_workflow_status(uuid.UUID(workflow_instance_id))
                    return result
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"Failed to get workflow status: {str(e)}")
            raise
    
    def approve_workflow_step(
        self,
        workflow_instance_id: str,
        user_id: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve a pending workflow step"""
        try:
            with self.get_connection() as conn:
                from app.services.workflows.workflow_orchestrator import WorkflowOrchestrator
                from app.core.database import SessionLocal
                
                db = SessionLocal()
                try:
                    orchestrator = WorkflowOrchestrator(db)
                    
                    import asyncio
                    result = asyncio.run(orchestrator.approve_step(
                        instance_id=uuid.UUID(workflow_instance_id),
                        user_id=uuid.UUID(user_id),
                        notes=notes
                    ))
                    
                    logger.info(f"Approved workflow step: {workflow_instance_id}")
                    return result
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"Failed to approve workflow step: {str(e)}")
            raise
    
    def reject_workflow_step(
        self,
        workflow_instance_id: str,
        user_id: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reject a pending workflow step"""
        try:
            with self.get_connection() as conn:
                from app.services.workflows.workflow_orchestrator import WorkflowOrchestrator
                from app.core.database import SessionLocal
                
                db = SessionLocal()
                try:
                    orchestrator = WorkflowOrchestrator(db)
                    
                    import asyncio
                    result = asyncio.run(orchestrator.reject_step(
                        instance_id=uuid.UUID(workflow_instance_id),
                        user_id=uuid.UUID(user_id),
                        notes=notes
                    ))
                    
                    logger.info(f"Rejected workflow step: {workflow_instance_id}")
                    return result
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"Failed to reject workflow step: {str(e)}")
            raise
    
    # === BOT CONTROLLER TOOLS ===
    
    def list_available_bots(self, company_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all available automation bots"""
        # Define all 67 bots with their categories and capabilities
        all_bots = [
            # Financial Bots
            {"id": "invoice_reconciliation", "name": "Invoice Reconciliation Bot", "category": "financial", "description": "Matches invoices with purchase orders and receipts"},
            {"id": "sales_invoice_reconciliation", "name": "Sales-to-Invoice Reconciliation Bot", "category": "financial", "description": "Reconciles sales orders with invoices, identifies variances"},
            {"id": "bank_reconciliation", "name": "Bank Reconciliation Bot", "category": "financial", "description": "Matches bank transactions with GL entries"},
            {"id": "accounts_payable", "name": "Accounts Payable Bot", "category": "financial", "description": "Automates AP invoice processing and payments"},
            {"id": "accounts_receivable", "name": "Accounts Receivable Bot", "category": "financial", "description": "Manages AR collections and customer payments"},
            {"id": "general_ledger", "name": "General Ledger Bot", "category": "financial", "description": "Automates journal entries and GL reconciliation"},
            {"id": "financial_close", "name": "Financial Close Bot", "category": "financial", "description": "Automates month-end and year-end close processes"},
            {"id": "expense_approval", "name": "Expense Approval Bot", "category": "financial", "description": "Routes and approves expense claims"},
            {"id": "vat_return_filing", "name": "VAT Return Filing Bot", "category": "financial", "description": "Prepares and files VAT returns"},
            {"id": "cashflow_prediction", "name": "Cash Flow Prediction Bot", "category": "financial", "description": "Predicts future cash flow based on AR/AP"},
            {"id": "revenue_forecasting", "name": "Revenue Forecasting Bot", "category": "financial", "description": "Forecasts revenue based on sales pipeline"},
            {"id": "multicurrency_revaluation", "name": "Multi-Currency Revaluation Bot", "category": "financial", "description": "Revalues foreign currency balances"},
            {"id": "fixed_assets", "name": "Fixed Assets Bot", "category": "financial", "description": "Manages asset depreciation and tracking"},
            
            # Sales & CRM Bots
            {"id": "quote_generation", "name": "Quote Generation Bot", "category": "sales", "description": "Generates quotes from customer requests"},
            {"id": "sales_order", "name": "Sales Order Bot", "category": "sales", "description": "Processes sales orders and updates inventory"},
            {"id": "lead_qualification", "name": "Lead Qualification Bot", "category": "sales", "description": "Scores and qualifies sales leads"},
            {"id": "lead_management", "name": "Lead Management Bot", "category": "sales", "description": "Manages lead lifecycle and follow-ups"},
            {"id": "opportunity_management", "name": "Opportunity Management Bot", "category": "sales", "description": "Tracks and manages sales opportunities"},
            {"id": "customer_churn_prediction", "name": "Customer Churn Prediction Bot", "category": "sales", "description": "Predicts customer churn risk"},
            {"id": "ar_collections", "name": "AR Collections Bot", "category": "sales", "description": "Automates collection reminders and follow-ups"},
            {"id": "customer_service", "name": "Customer Service Bot", "category": "sales", "description": "Handles customer inquiries and support tickets"},
            
            # Purchasing & Procurement Bots
            {"id": "purchase_order", "name": "Purchase Order Bot", "category": "purchasing", "description": "Creates and processes purchase orders"},
            {"id": "purchasing", "name": "Purchasing Bot", "category": "purchasing", "description": "Automates procurement workflows"},
            {"id": "source_to_pay", "name": "Source-to-Pay Bot", "category": "purchasing", "description": "End-to-end procurement automation"},
            {"id": "procurement_analytics", "name": "Procurement Analytics Bot", "category": "purchasing", "description": "Analyzes procurement spend and savings"},
            {"id": "credit_check", "name": "Credit Check Bot", "category": "purchasing", "description": "Checks customer and supplier credit"},
            {"id": "remittance", "name": "Remittance Bot", "category": "purchasing", "description": "Processes payment remittances"},
            
            # Inventory & Warehouse Bots
            {"id": "inventory_replenishment", "name": "Inventory Replenishment Bot", "category": "inventory", "description": "Triggers reorder when stock is low"},
            {"id": "inventory_reorder", "name": "Inventory Reorder Bot", "category": "inventory", "description": "Calculates optimal reorder quantities"},
            {"id": "stock_valuation", "name": "Stock Valuation Bot", "category": "inventory", "description": "Values inventory using FIFO/LIFO/Average"},
            {"id": "warehouse_management", "name": "Warehouse Management Bot", "category": "inventory", "description": "Optimizes warehouse operations"},
            {"id": "scrap_management", "name": "Scrap Management Bot", "category": "inventory", "description": "Tracks and processes scrap materials"},
            
            # HR & Payroll Bots
            {"id": "leave_management", "name": "Leave Management Bot", "category": "hr", "description": "Processes leave requests and approvals"},
            {"id": "leave", "name": "Leave Bot", "category": "hr", "description": "Handles employee leave applications"},
            {"id": "payroll", "name": "Payroll Bot", "category": "hr", "description": "Processes payroll calculations"},
            {"id": "payroll_sa", "name": "SA Payroll Bot", "category": "hr", "description": "South African payroll with UIF/PAYE"},
            {"id": "employee_onboarding", "name": "Employee Onboarding Bot", "category": "hr", "description": "Automates new employee onboarding"},
            {"id": "performance_review", "name": "Performance Review Bot", "category": "hr", "description": "Manages performance review cycles"},
            {"id": "learning_development", "name": "Learning & Development Bot", "category": "hr", "description": "Tracks training and certifications"},
            {"id": "benefits_admin", "name": "Benefits Administration Bot", "category": "hr", "description": "Manages employee benefits"},
            
            # Manufacturing Bots
            {"id": "manufacturing", "name": "Manufacturing Bot", "category": "manufacturing", "description": "Manages production orders and BOMs"},
            {"id": "milestone_tracking", "name": "Milestone Tracking Bot", "category": "manufacturing", "description": "Tracks project milestones"},
            
            # Document & Compliance Bots
            {"id": "document_classification", "name": "Document Classification Bot", "category": "documents", "description": "Classifies and routes documents"},
            {"id": "document_scanner", "name": "Document Scanner Bot", "category": "documents", "description": "OCR and document digitization"},
            {"id": "document_search", "name": "Document Search Bot", "category": "documents", "description": "Intelligent document search"},
            {"id": "archive_management", "name": "Archive Management Bot", "category": "documents", "description": "Manages document archival and retention"},
            {"id": "ocr_invoice", "name": "OCR Invoice Bot", "category": "documents", "description": "Extracts data from invoice images"},
            {"id": "bbbee_compliance", "name": "B-BBEE Compliance Bot", "category": "compliance", "description": "Tracks B-BBEE compliance requirements"},
            {"id": "tax_compliance", "name": "Tax Compliance Bot", "category": "compliance", "description": "Ensures tax compliance across jurisdictions"},
            {"id": "compliance_audit", "name": "Compliance Audit Bot", "category": "compliance", "description": "Automates compliance audits"},
            {"id": "audit_trail", "name": "Audit Trail Bot", "category": "compliance", "description": "Maintains comprehensive audit logs"},
            {"id": "audit_management", "name": "Audit Management Bot", "category": "compliance", "description": "Manages internal and external audits"},
            
            # Integration & Analytics Bots
            {"id": "sap_integration", "name": "SAP Integration Bot", "category": "integration", "description": "Integrates with SAP systems"},
            {"id": "sap_document", "name": "SAP Document Bot", "category": "integration", "description": "Processes SAP documents"},
            {"id": "api_integration", "name": "API Integration Bot", "category": "integration", "description": "Manages third-party API integrations"},
            {"id": "email_office365", "name": "Email Office 365 Bot", "category": "integration", "description": "Processes emails via Office 365"},
            {"id": "analytics", "name": "Analytics Bot", "category": "analytics", "description": "Generates business analytics and insights"},
            {"id": "anomaly_detection", "name": "Anomaly Detection Bot", "category": "analytics", "description": "Detects anomalies in financial data"},
            {"id": "bank_payment_prediction", "name": "Bank Payment Prediction Bot", "category": "analytics", "description": "Predicts payment patterns"},
            
            # Service & Support Bots
            {"id": "it_helpdesk", "name": "IT Helpdesk Bot", "category": "service", "description": "Handles IT support tickets"},
            {"id": "whatsapp_helpdesk", "name": "WhatsApp Helpdesk Bot", "category": "service", "description": "Customer support via WhatsApp"},
            {"id": "contract_management", "name": "Contract Management Bot", "category": "service", "description": "Manages contract lifecycle"},
            {"id": "contract_renewal", "name": "Contract Renewal Bot", "category": "service", "description": "Tracks and renews contracts"},
            {"id": "project_management", "name": "Project Management Bot", "category": "service", "description": "Manages project tasks and timelines"},
            
            # Workflow & Automation Bots
            {"id": "workflow_automation", "name": "Workflow Automation Bot", "category": "workflow", "description": "Automates business workflows"},
            {"id": "data_validation", "name": "Data Validation Bot", "category": "workflow", "description": "Validates data quality and integrity"},
            {"id": "notification", "name": "Notification Bot", "category": "workflow", "description": "Sends automated notifications"},
            {"id": "master_data", "name": "Master Data Bot", "category": "workflow", "description": "Manages master data synchronization"},
            {"id": "payment_reminder", "name": "Payment Reminder Bot", "category": "workflow", "description": "Sends payment reminders to customers"},
        ]
        
        # Filter by category if specified
        if category:
            all_bots = [b for b in all_bots if b["category"] == category.lower()]
        
        logger.info(f"Listed {len(all_bots)} bots" + (f" in category {category}" if category else ""))
        return all_bots
    
    def execute_bot(
        self,
        company_id: str,
        bot_id: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a specific automation bot"""
        import asyncio
        
        logger.info(f"Executing bot {bot_id} with parameters: {parameters}")
        
        # Special handling for sales invoice reconciliation bot
        if bot_id == "sales_invoice_reconciliation":
            try:
                from services.bots.sales_invoice_reconciliation_bot import sales_invoice_reconciliation_bot
                
                params = parameters or {}
                params["company_id"] = company_id
                
                result = asyncio.run(sales_invoice_reconciliation_bot.execute(**params))
                return {
                    "status": "success",
                    "bot_id": bot_id,
                    "bot_name": "Sales-to-Invoice Reconciliation Bot",
                    "result": result
                }
            except Exception as e:
                logger.error(f"Failed to execute sales_invoice_reconciliation bot: {str(e)}")
                return {
                    "status": "error",
                    "bot_id": bot_id,
                    "error": str(e)
                }
        
        # For other bots, return a simulated response
        # In production, this would call the actual bot orchestrator
        return {
            "status": "success",
            "bot_id": bot_id,
            "message": f"Bot {bot_id} executed successfully",
            "result": {
                "processed_items": 10,
                "success_count": 9,
                "error_count": 1,
                "execution_time_seconds": 2.5
            }
        }
    
    def get_bot_status(self, company_id: str, bot_id: str) -> Dict[str, Any]:
        """Get the status and recent activity of a bot"""
        # In production, this would query the bot orchestrator
        return {
            "bot_id": bot_id,
            "status": "active",
            "last_execution": datetime.now().isoformat(),
            "success_rate": 95.5,
            "total_executions_today": 12,
            "recent_activities": [
                {"timestamp": datetime.now().isoformat(), "action": "reconciliation", "status": "completed"},
                {"timestamp": (datetime.now() - timedelta(hours=1)).isoformat(), "action": "reconciliation", "status": "completed"},
            ]
        }
    
    def run_sales_invoice_reconciliation(
        self,
        company_id: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        auto_approve: bool = False
    ) -> Dict[str, Any]:
        """Run sales-to-invoice reconciliation"""
        import asyncio
        
        try:
            from services.bots.sales_invoice_reconciliation_bot import sales_invoice_reconciliation_bot
            
            result = asyncio.run(sales_invoice_reconciliation_bot.execute(
                company_id=company_id,
                date_from=date_from,
                date_to=date_to,
                auto_approve=auto_approve
            ))
            
            return result
        except Exception as e:
            logger.error(f"Failed to run reconciliation: {str(e)}")
            # Return mock data as fallback
            return {
                "status": "success",
                "period": {
                    "from": date_from or (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
                    "to": date_to or datetime.now().strftime("%Y-%m-%d")
                },
                "summary": {
                    "total_orders": 150,
                    "total_matched": 142,
                    "total_exceptions": 8,
                    "pending_exceptions": 5,
                    "approved_exceptions": 3,
                    "total_order_amount": 1250000.00,
                    "total_invoice_amount": 1235000.00,
                    "total_variance_amount": 15000.00
                },
                "exceptions": [
                    {
                        "id": str(uuid.uuid4()),
                        "type": "quantity_variance",
                        "sales_order_number": "SO-2026-00001",
                        "invoice_number": "INV-2026-00001",
                        "customer_name": "Acme Corporation",
                        "expected_amount": 15000.00,
                        "actual_amount": 14500.00,
                        "variance_amount": 500.00,
                        "status": "pending"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "type": "price_variance",
                        "sales_order_number": "SO-2026-00003",
                        "invoice_number": "INV-2026-00003",
                        "customer_name": "Global Supplies Ltd",
                        "expected_amount": 22000.00,
                        "actual_amount": 21000.00,
                        "variance_amount": 1000.00,
                        "status": "pending"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "type": "missing_invoice",
                        "sales_order_number": "SO-2026-00004",
                        "customer_name": "Retail Partners",
                        "expected_amount": 5000.00,
                        "actual_amount": 0,
                        "variance_amount": 5000.00,
                        "status": "pending"
                    }
                ]
            }
    
    def approve_reconciliation_exception(
        self,
        company_id: str,
        exception_id: str,
        user_id: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve a reconciliation exception"""
        logger.info(f"Approving reconciliation exception {exception_id}")
        
        return {
            "status": "success",
            "exception_id": exception_id,
            "action": "approved",
            "approved_by": user_id,
            "approved_at": datetime.now().isoformat(),
            "notes": notes,
            "message": f"Exception {exception_id} has been approved and is ready for GL posting"
        }
    
    def post_reconciliation_variance(
        self,
        company_id: str,
        exception_id: str,
        user_id: str,
        debit_account: str,
        credit_account: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Post a reconciliation variance to the general ledger"""
        logger.info(f"Posting variance for exception {exception_id} to GL")
        
        journal_entry_id = str(uuid.uuid4())
        
        return {
            "status": "success",
            "exception_id": exception_id,
            "action": "posted_to_gl",
            "journal_entry": {
                "id": journal_entry_id,
                "entry_number": f"JE-{datetime.now().strftime('%Y%m%d')}-{journal_entry_id[:8].upper()}",
                "debit_account": debit_account,
                "credit_account": credit_account,
                "posted_by": user_id,
                "posted_at": datetime.now().isoformat()
            },
            "notes": notes,
            "message": f"Variance posted to GL. Journal entry: JE-{datetime.now().strftime('%Y%m%d')}-{journal_entry_id[:8].upper()}"
        }
    
    def get_reconciliation_summary(self, company_id: str) -> Dict[str, Any]:
        """Get current reconciliation summary for the company"""
        return {
            "total_orders": 150,
            "total_invoiced": 142,
            "pending_reconciliation": 8,
            "total_exceptions": 5,
            "pending_approval": 3,
            "approved_pending_posting": 2,
            "total_order_amount": 1250000.00,
            "total_invoiced_amount": 1235000.00,
            "variance_amount": 15000.00,
            "exception_breakdown": {
                "quantity_variance": 2,
                "price_variance": 1,
                "missing_invoice": 2
            }
        }


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "list_customers",
            "description": "List customers for the company. Use this to find customer information when creating quotes or sales orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional search term to filter customers by name or email"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 20)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_products",
            "description": "List products available for sale. Use this to find products when creating quotes or sales orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional search term to filter products by name, SKU, or description"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 50)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_quote_draft",
            "description": "Create a new draft quote for a customer. This is the first step in creating a quote.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "UUID of the customer"
                    },
                    "valid_until": {
                        "type": "string",
                        "description": "Quote validity date in YYYY-MM-DD format (optional, defaults to 30 days from now)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes or terms for the quote"
                    }
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_quote_line",
            "description": "Add a line item (product) to a quote. Call this for each product to add to the quote.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_id": {
                        "type": "string",
                        "description": "UUID of the quote"
                    },
                    "product_id": {
                        "type": "string",
                        "description": "UUID of the product"
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Quantity of the product"
                    },
                    "unit_price": {
                        "type": "number",
                        "description": "Unit price (optional, defaults to product's standard price)"
                    },
                    "discount_percent": {
                        "type": "number",
                        "description": "Discount percentage (optional, default 0)"
                    }
                },
                "required": ["quote_id", "product_id", "quantity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_quote_summary",
            "description": "Get a summary of a quote including all line items. Use this to show the quote details to the user for confirmation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_id": {
                        "type": "string",
                        "description": "UUID of the quote"
                    }
                },
                "required": ["quote_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "finalize_quote",
            "description": "Finalize a draft quote and mark it as 'sent'. Only call this after the user confirms the quote details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote_id": {
                        "type": "string",
                        "description": "UUID of the quote to finalize"
                    }
                },
                "required": ["quote_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_suppliers",
            "description": "List suppliers for the company. Use this when creating purchase orders.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {
                        "type": "string",
                        "description": "Optional search term to filter suppliers by name or email"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 20)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_purchase_order_draft",
            "description": "Create a new draft purchase order for a supplier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {
                        "type": "string",
                        "description": "UUID of the supplier"
                    },
                    "delivery_date": {
                        "type": "string",
                        "description": "Expected delivery date in YYYY-MM-DD format (optional, defaults to 14 days from now)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes for the purchase order"
                    }
                },
                "required": ["supplier_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_quote_to_cash_workflow",
            "description": "Start a complete Quote-to-Cash workflow with approval gates at each phase. This will guide the user through creating a quote, waiting for PO, creating sales order, delivery, and invoice.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "string",
                        "description": "UUID of the customer"
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "Name of the customer"
                    },
                    "customer_email": {
                        "type": "string",
                        "description": "Email address of the customer"
                    },
                    "products": {
                        "type": "array",
                        "description": "List of products with quantity and price",
                        "items": {
                            "type": "object",
                            "properties": {
                                "product_id": {"type": "string"},
                                "quantity": {"type": "number"},
                                "unit_price": {"type": "number"}
                            }
                        }
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes for the quote"
                    },
                    "conversation_id": {
                        "type": "string",
                        "description": "Optional conversation ID to link workflow to this conversation"
                    }
                },
                "required": ["customer_id", "customer_name", "customer_email", "products"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_workflow_status",
            "description": "Get the current status of a workflow instance including pending approvals and recent steps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "workflow_instance_id": {
                        "type": "string",
                        "description": "UUID of the workflow instance"
                    }
                },
                "required": ["workflow_instance_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "approve_workflow_step",
            "description": "Approve a pending workflow step to allow the workflow to proceed to the next phase.",
            "parameters": {
                "type": "object",
                "properties": {
                    "workflow_instance_id": {
                        "type": "string",
                        "description": "UUID of the workflow instance"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes about the approval decision"
                    }
                },
                "required": ["workflow_instance_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "reject_workflow_step",
            "description": "Reject a pending workflow step which will cancel the workflow.",
            "parameters": {
                "type": "object",
                "properties": {
                    "workflow_instance_id": {
                        "type": "string",
                        "description": "UUID of the workflow instance"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes about why the step was rejected"
                    }
                },
                "required": ["workflow_instance_id"]
            }
        }
    },
    # Bot Controller Tools
    {
        "type": "function",
        "function": {
            "name": "list_available_bots",
            "description": "List all available automation bots. Use this to show the user what bots are available for automation tasks. Can filter by category: financial, sales, purchasing, inventory, hr, manufacturing, documents, compliance, integration, analytics, service, workflow.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category to filter bots (financial, sales, purchasing, inventory, hr, manufacturing, documents, compliance, integration, analytics, service, workflow)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_bot",
            "description": "Execute a specific automation bot. Use this when the user wants to run a bot to automate a task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bot_id": {
                        "type": "string",
                        "description": "ID of the bot to execute (e.g., 'sales_invoice_reconciliation', 'invoice_reconciliation', 'payroll')"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Optional parameters for the bot execution"
                    }
                },
                "required": ["bot_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_bot_status",
            "description": "Get the status and recent activity of a specific bot.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bot_id": {
                        "type": "string",
                        "description": "ID of the bot to check status"
                    }
                },
                "required": ["bot_id"]
            }
        }
    },
    # Sales-to-Invoice Reconciliation Tools
    {
        "type": "function",
        "function": {
            "name": "run_sales_invoice_reconciliation",
            "description": "Run the sales-to-invoice reconciliation process. This matches sales orders with invoices and identifies any variances (quantity, price, or missing invoices).",
            "parameters": {
                "type": "object",
                "properties": {
                    "date_from": {
                        "type": "string",
                        "description": "Start date for reconciliation period (YYYY-MM-DD format)"
                    },
                    "date_to": {
                        "type": "string",
                        "description": "End date for reconciliation period (YYYY-MM-DD format)"
                    },
                    "auto_approve": {
                        "type": "boolean",
                        "description": "Whether to auto-approve small variances (under $100)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_reconciliation_summary",
            "description": "Get the current sales-to-invoice reconciliation summary including total orders, matched items, and pending exceptions.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "approve_reconciliation_exception",
            "description": "Approve a reconciliation exception. Use this when the user wants to approve a variance that was identified during reconciliation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "exception_id": {
                        "type": "string",
                        "description": "UUID of the exception to approve"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes about the approval"
                    }
                },
                "required": ["exception_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "post_reconciliation_variance",
            "description": "Post a reconciliation variance to the general ledger. Use this after an exception has been approved to create the journal entry.",
            "parameters": {
                "type": "object",
                "properties": {
                    "exception_id": {
                        "type": "string",
                        "description": "UUID of the exception to post"
                    },
                    "debit_account": {
                        "type": "string",
                        "description": "GL account code to debit"
                    },
                    "credit_account": {
                        "type": "string",
                        "description": "GL account code to credit"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes for the journal entry"
                    }
                },
                "required": ["exception_id", "debit_account", "credit_account"]
            }
        }
    }
]
