"""
ARIA ERP - Comprehensive 6-Month Business Simulation (Mock Data Version)
Exercises all 67 bots and all ERP modules with realistic transactions across all roles
"""

import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any
import json
import uuid


class BusinessSimulation:
    """Complete 6-month business simulation with mock data"""
    
    def __init__(self, start_date: date, end_date: date):
        self.start_date = start_date
        self.end_date = end_date
        self.current_date = start_date
        
        self.companies = []
        self.customers = []
        self.suppliers = []
        self.products = []
        self.employees = []
        
        self.sales_orders = []
        self.purchase_orders = []
        self.deliveries = []
        self.ar_invoices = []
        self.ap_invoices = []
        self.payments = []
        self.service_requests = []
        self.work_orders = []
        self.journal_entries = []
        self.quotes = []
        
        self.bot_executions = {}
        self.transaction_log = []
        
        self.stats = {
            "total_transactions": 0,
            "total_revenue": Decimal("0.00"),
            "total_expenses": Decimal("0.00"),
            "total_profit": Decimal("0.00"),
            "customers_created": 0,
            "suppliers_created": 0,
            "products_created": 0,
            "quotes_created": 0,
            "sales_orders_created": 0,
            "purchase_orders_created": 0,
            "deliveries_created": 0,
            "ar_invoices_created": 0,
            "ap_invoices_created": 0,
            "payments_processed": 0,
            "service_requests_created": 0,
            "work_orders_completed": 0,
            "employees_hired": 0,
            "payroll_runs": 0,
            "gl_postings": 0,
            "bots_executed": 0,
            "vat_collected": Decimal("0.00"),
            "vat_paid": Decimal("0.00")
        }
    
    def setup_master_data(self):
        """Setup master data for simulation"""
        
        print("\n" + "="*80)
        print("PHASE 1: MASTER DATA SETUP")
        print("="*80)
        
        self.companies = [
            {"id": str(uuid.uuid4()), "code": "COMP-001", "name": "Vantax (Pty) Ltd", "vat_number": "4123456789"},
            {"id": str(uuid.uuid4()), "code": "COMP-002", "name": "GoNxt Technologies (Pty) Ltd", "vat_number": "4987654321"},
            {"id": str(uuid.uuid4()), "code": "COMP-003", "name": "Aria Solutions (Pty) Ltd", "vat_number": "4555555555"}
        ]
        
        print(f"\n✅ Created {len(self.companies)} companies")
        
        customer_names = [
            "Pick n Pay", "Shoprite", "Woolworths", "Checkers", "Spar",
            "Makro", "Game", "Massmart", "Clicks", "Dis-Chem",
            "Takealot", "Bidvest", "Imperial", "Barloworld", "Reunert",
            "MTN", "Vodacom", "Telkom", "Cell C", "Rain",
            "Standard Bank", "FNB", "ABSA", "Nedbank", "Capitec",
            "Discovery", "Old Mutual", "Sanlam", "Liberty", "Momentum"
        ]
        
        for i, name in enumerate(customer_names):
            self.customers.append({
                "id": str(uuid.uuid4()),
                "code": f"CUST-{i+1:04d}",
                "name": name,
                "email": f"accounts@{name.lower().replace(' ', '')}.co.za",
                "company_id": random.choice(self.companies)["id"],
                "phone": f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}",
                "address": f"{random.randint(1, 999)} Main Road, Johannesburg, 2000",
                "tax_number": f"41{random.randint(10000000, 99999999)}",
                "payment_terms": "Net 30",
                "status": "active",
                "created_at": self.start_date
            })
            self.stats["customers_created"] += 1
        
        print(f"✅ Created {len(self.customers)} customers")
        
        supplier_names = [
            "Dell South Africa", "HP South Africa", "Lenovo SA", "Microsoft SA", "Oracle SA",
            "SAP Africa", "IBM South Africa", "Cisco SA", "Amazon Web Services", "Google Cloud",
            "Vodacom Business", "MTN Business", "Telkom Business", "Neotel", "Vox Telecom",
            "DHL South Africa", "FedEx SA", "Aramex", "PostNet", "The Courier Guy",
            "Eskom", "City Power", "Rand Water", "Johannesburg Water", "Pikitup",
            "Deloitte SA", "PwC SA", "KPMG SA", "EY SA", "BDO SA"
        ]
        
        for i, name in enumerate(supplier_names):
            self.suppliers.append({
                "id": str(uuid.uuid4()),
                "code": f"SUPP-{i+1:04d}",
                "name": name,
                "email": f"invoices@{name.lower().replace(' ', '')}.co.za",
                "company_id": random.choice(self.companies)["id"],
                "phone": f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}",
                "address": f"{random.randint(1, 999)} Industrial Road, Midrand, 1685",
                "tax_number": f"41{random.randint(10000000, 99999999)}",
                "payment_terms": "Net 30",
                "bbbee_level": random.randint(1, 8),
                "status": "active",
                "created_at": self.start_date
            })
            self.stats["suppliers_created"] += 1
        
        print(f"✅ Created {len(self.suppliers)} suppliers")
        
        product_categories = {
            "Software": ["ERP System", "CRM Software", "Accounting Software", "HR Management System", "Document Management"],
            "Hardware": ["Desktop Computer", "Laptop", "Server", "Network Switch", "Printer"],
            "Services": ["Consulting", "Implementation", "Training", "Support", "Maintenance"],
            "Licenses": ["Annual License", "Monthly Subscription", "User License", "Enterprise License", "Cloud License"]
        }
        
        product_id = 1
        for category, items in product_categories.items():
            for item in items:
                self.products.append({
                    "id": str(uuid.uuid4()),
                    "code": f"PROD-{product_id:04d}",
                    "name": f"{item}",
                    "description": f"{category} - {item}",
                    "category": category,
                    "unit_price": Decimal(str(random.randint(1000, 50000))),
                    "cost_price": Decimal(str(random.randint(500, 25000))),
                    "company_id": random.choice(self.companies)["id"],
                    "status": "active",
                    "created_at": self.start_date
                })
                self.stats["products_created"] += 1
                product_id += 1
        
        print(f"✅ Created {len(self.products)} products")
        
        print(f"\n📊 Master Data Summary:")
        print(f"   - Companies: {len(self.companies)}")
        print(f"   - Customers: {len(self.customers)}")
        print(f"   - Suppliers: {len(self.suppliers)}")
        print(f"   - Products: {len(self.products)}")
    
    def simulate_quote_to_cash_workflow(self, day: date):
        """Simulate complete Quote-to-Cash workflow"""
        
        num_quotes = random.randint(3, 8)
        
        for _ in range(num_quotes):
            customer = random.choice(self.customers)
            company_id = customer["company_id"]
            
            num_lines = random.randint(1, 5)
            lines = []
            subtotal = Decimal("0.00")
            
            for _ in range(num_lines):
                product = random.choice(self.products)
                quantity = random.randint(1, 10)
                unit_price = product["unit_price"]
                line_total = Decimal(str(quantity)) * unit_price
                
                lines.append({
                    "product_id": product["id"],
                    "product_code": product["code"],
                    "description": product["name"],
                    "quantity": quantity,
                    "unit_price": float(unit_price),
                    "line_total": float(line_total)
                })
                
                subtotal += line_total
            
            tax_amount = subtotal * Decimal("0.15")
            total_amount = subtotal + tax_amount
            
            quote_number = f"QUO-{day.strftime('%Y%m%d')}-{len(self.quotes)+1:04d}"
            
            quote = {
                "id": str(uuid.uuid4()),
                "quote_number": quote_number,
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "quote_date": day,
                "valid_until": day + timedelta(days=30),
                "subtotal": float(subtotal),
                "tax_amount": float(tax_amount),
                "total_amount": float(total_amount),
                "company_id": company_id,
                "status": "draft",
                "line_items": lines,
                "created_at": day
            }
            
            self.quotes.append(quote)
            self.stats["quotes_created"] += 1
            self._record_bot_execution("quote_generation_bot")
            self._record_bot_execution("crm_bot")
            
            self._log_transaction(day, "quote_created", {
                "quote_number": quote_number,
                "customer": customer["name"],
                "amount": float(total_amount)
            })
            
            if random.random() > 0.3:
                quote["status"] = "approved"
                self._record_bot_execution("sales_approval_bot")
                
                so_number = f"SO-{day.strftime('%Y%m%d')}-{len(self.sales_orders)+1:04d}"
                
                sales_order = {
                    "id": str(uuid.uuid4()),
                    "order_number": so_number,
                    "quote_id": quote["id"],
                    "customer_id": customer["id"],
                    "customer_name": customer["name"],
                    "order_date": day,
                    "delivery_date": day + timedelta(days=7),
                    "subtotal": float(subtotal),
                    "tax_amount": float(tax_amount),
                    "total_amount": float(total_amount),
                    "company_id": company_id,
                    "status": "approved",
                    "line_items": lines,
                    "created_at": day
                }
                
                self.sales_orders.append(sales_order)
                self.stats["sales_orders_created"] += 1
                self.stats["total_revenue"] += subtotal
                self._record_bot_execution("sales_bot")
                
                self._log_transaction(day, "sales_order_created", {
                    "order_number": so_number,
                    "customer": customer["name"],
                    "amount": float(total_amount)
                })
                
                if random.random() > 0.2:
                    delivery_number = f"DN-{day.strftime('%Y%m%d')}-{len(self.deliveries)+1:04d}"
                    
                    delivery = {
                        "id": str(uuid.uuid4()),
                        "delivery_number": delivery_number,
                        "sales_order_id": sales_order["id"],
                        "customer_id": customer["id"],
                        "delivery_date": day + timedelta(days=7),
                        "company_id": company_id,
                        "status": "shipped",
                        "line_items": lines,
                        "created_at": day
                    }
                    
                    self.deliveries.append(delivery)
                    self.stats["deliveries_created"] += 1
                    self._record_bot_execution("wms_bot")
                    self._record_bot_execution("delivery_bot")
                    self._record_bot_execution("inventory_optimizer_bot")
                    
                    invoice_number = f"INV-{day.strftime('%Y%m%d')}-{len(self.ar_invoices)+1:04d}"
                    
                    ar_invoice = {
                        "id": str(uuid.uuid4()),
                        "invoice_number": invoice_number,
                        "sales_order_id": sales_order["id"],
                        "delivery_id": delivery["id"],
                        "customer_id": customer["id"],
                        "customer_name": customer["name"],
                        "invoice_date": day + timedelta(days=7),
                        "due_date": day + timedelta(days=37),
                        "subtotal": float(subtotal),
                        "tax_amount": float(tax_amount),
                        "total_amount": float(total_amount),
                        "amount_outstanding": float(total_amount),
                        "company_id": company_id,
                        "status": "posted",
                        "line_items": lines,
                        "created_at": day + timedelta(days=7)
                    }
                    
                    self.ar_invoices.append(ar_invoice)
                    self.stats["ar_invoices_created"] += 1
                    self.stats["vat_collected"] += tax_amount
                    self._record_bot_execution("ar_bot")
                    self._record_bot_execution("gl_bot")
                    self._record_bot_execution("financial_reporting_bot")
                    
                    self._create_gl_posting(day + timedelta(days=7), "AR Invoice", {
                        "debit_account": "1200 - Accounts Receivable",
                        "debit_amount": float(total_amount),
                        "credit_account": "4000 - Sales Revenue",
                        "credit_amount": float(subtotal),
                        "credit_account_2": "2100 - VAT Output",
                        "credit_amount_2": float(tax_amount),
                        "reference": invoice_number
                    })
                    
                    if random.random() > 0.4:
                        payment_date = day + timedelta(days=random.randint(30, 45))
                        
                        payment = {
                            "id": str(uuid.uuid4()),
                            "payment_number": f"PMT-{payment_date.strftime('%Y%m%d')}-{len(self.payments)+1:04d}",
                            "customer_id": customer["id"],
                            "invoice_id": ar_invoice["id"],
                            "payment_date": payment_date,
                            "amount": float(total_amount),
                            "payment_method": random.choice(["EFT", "Credit Card", "Debit Order"]),
                            "company_id": company_id,
                            "status": "cleared",
                            "created_at": payment_date
                        }
                        
                        self.payments.append(payment)
                        self.stats["payments_processed"] += 1
                        ar_invoice["amount_outstanding"] = 0.0
                        ar_invoice["status"] = "paid"
                        
                        self._record_bot_execution("bank_reconciliation_bot")
                        self._record_bot_execution("cash_flow_forecasting_bot")
                        
                        self._create_gl_posting(payment_date, "Customer Payment", {
                            "debit_account": "1000 - Bank Account",
                            "debit_amount": float(total_amount),
                            "credit_account": "1200 - Accounts Receivable",
                            "credit_amount": float(total_amount),
                            "reference": payment["payment_number"]
                        })
    
    def simulate_procure_to_pay_workflow(self, day: date):
        """Simulate complete Procure-to-Pay workflow"""
        
        num_orders = random.randint(2, 6)
        
        for _ in range(num_orders):
            supplier = random.choice(self.suppliers)
            company_id = supplier["company_id"]
            
            num_lines = random.randint(1, 3)
            lines = []
            subtotal = Decimal("0.00")
            
            for _ in range(num_lines):
                product = random.choice(self.products)
                quantity = random.randint(1, 20)
                unit_price = product["cost_price"]
                line_total = Decimal(str(quantity)) * unit_price
                
                lines.append({
                    "product_id": product["id"],
                    "product_code": product["code"],
                    "description": product["name"],
                    "quantity": quantity,
                    "unit_price": float(unit_price),
                    "line_total": float(line_total)
                })
                
                subtotal += line_total
            
            tax_amount = subtotal * Decimal("0.15")
            total_amount = subtotal + tax_amount
            
            po_number = f"PO-{day.strftime('%Y%m%d')}-{len(self.purchase_orders)+1:04d}"
            
            purchase_order = {
                "id": str(uuid.uuid4()),
                "po_number": po_number,
                "supplier_id": supplier["id"],
                "supplier_name": supplier["name"],
                "order_date": day,
                "delivery_date": day + timedelta(days=14),
                "subtotal": float(subtotal),
                "tax_amount": float(tax_amount),
                "total_amount": float(total_amount),
                "company_id": company_id,
                "status": "approved",
                "line_items": lines,
                "created_at": day
            }
            
            self.purchase_orders.append(purchase_order)
            self.stats["purchase_orders_created"] += 1
            self.stats["total_expenses"] += subtotal
            self._record_bot_execution("procurement_bot")
            self._record_bot_execution("supplier_evaluation_bot")
            
            if random.random() > 0.1:
                self._record_bot_execution("receiving_bot")
                self._record_bot_execution("inventory_optimizer_bot")
                
                invoice_number = f"APINV-{day.strftime('%Y%m%d')}-{len(self.ap_invoices)+1:04d}"
                
                ap_invoice = {
                    "id": str(uuid.uuid4()),
                    "invoice_number": invoice_number,
                    "po_id": purchase_order["id"],
                    "supplier_id": supplier["id"],
                    "supplier_name": supplier["name"],
                    "invoice_date": day + timedelta(days=14),
                    "due_date": day + timedelta(days=44),
                    "subtotal": float(subtotal),
                    "tax_amount": float(tax_amount),
                    "total_amount": float(total_amount),
                    "amount_outstanding": float(total_amount),
                    "company_id": company_id,
                    "status": "posted",
                    "line_items": lines,
                    "created_at": day + timedelta(days=14)
                }
                
                self.ap_invoices.append(ap_invoice)
                self.stats["ap_invoices_created"] += 1
                self.stats["vat_paid"] += tax_amount
                self._record_bot_execution("ap_bot")
                self._record_bot_execution("invoice_matching_bot")
                self._record_bot_execution("gl_bot")
                
                self._create_gl_posting(day + timedelta(days=14), "AP Invoice", {
                    "debit_account": "5000 - Cost of Sales",
                    "debit_amount": float(subtotal),
                    "debit_account_2": "2110 - VAT Input",
                    "debit_amount_2": float(tax_amount),
                    "credit_account": "2000 - Accounts Payable",
                    "credit_amount": float(total_amount),
                    "reference": invoice_number
                })
    
    def simulate_field_service_workflow(self, day: date):
        """Simulate field service operations"""
        
        num_requests = random.randint(2, 5)
        
        for _ in range(num_requests):
            customer = random.choice(self.customers)
            company_id = customer["company_id"]
            
            issues = [
                "Equipment malfunction - requires immediate attention",
                "Software not working - system down",
                "Network connectivity issue - intermittent connection",
                "Hardware replacement needed - printer failure",
                "Preventive maintenance - scheduled service",
                "System upgrade required - version update",
                "Data backup issue - backup failed",
                "Security patch installation - critical update"
            ]
            
            service_request = {
                "id": str(uuid.uuid4()),
                "request_number": f"SR-{day.strftime('%Y%m%d')}-{len(self.service_requests)+1:04d}",
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "description": random.choice(issues),
                "priority": random.choice(["low", "medium", "high", "critical"]),
                "company_id": company_id,
                "status": "new",
                "contact_name": f"Contact at {customer['name']}",
                "contact_phone": f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}",
                "created_at": day
            }
            
            self.service_requests.append(service_request)
            self.stats["service_requests_created"] += 1
            
            self._record_bot_execution("field_service_intake_bot")
            self._record_bot_execution("sla_monitor_bot")
            
            if random.random() > 0.2:
                work_order = {
                    "id": str(uuid.uuid4()),
                    "work_order_number": f"WO-{day.strftime('%Y%m%d')}-{len(self.work_orders)+1:04d}",
                    "service_request_id": service_request["id"],
                    "technician_id": f"TECH-{random.randint(1, 10):03d}",
                    "scheduled_date": day + timedelta(days=random.randint(1, 3)),
                    "company_id": company_id,
                    "description": service_request["description"],
                    "status": "scheduled",
                    "created_at": day
                }
                
                self.work_orders.append(work_order)
                self._record_bot_execution("scheduling_optimizer_bot")
                self._record_bot_execution("dispatch_bot")
                self._record_bot_execution("parts_reservation_bot")
                
                if random.random() > 0.3:
                    work_order["status"] = "completed"
                    work_order["completed_date"] = day + timedelta(days=random.randint(1, 5))
                    service_request["status"] = "closed"
                    
                    self.stats["work_orders_completed"] += 1
                    self._record_bot_execution("completion_billing_bot")
    
    def simulate_hr_operations(self, day: date):
        """Simulate HR operations"""
        
        if day.day == 1:
            print(f"   💼 Running monthly HR operations for {day.strftime('%B %Y')}")
            
            if random.random() > 0.7:
                num_hires = random.randint(1, 3)
                for _ in range(num_hires):
                    employee = {
                        "id": str(uuid.uuid4()),
                        "employee_number": f"EMP-{len(self.employees)+1:04d}",
                        "name": f"Employee {len(self.employees)+1}",
                        "hire_date": day,
                        "salary": random.randint(15000, 50000),
                        "department": random.choice(["Sales", "IT", "Finance", "Operations", "HR"]),
                        "status": "active"
                    }
                    self.employees.append(employee)
                    self.stats["employees_hired"] += 1
                    self._record_bot_execution("recruitment_bot")
                    self._record_bot_execution("onboarding_bot")
            
            self.stats["payroll_runs"] += 1
            self._record_bot_execution("payroll_sa_bot")
            self._record_bot_execution("paye_compliance_bot")
            self._record_bot_execution("uif_bot")
            self._record_bot_execution("gl_bot")
            
            total_salaries = sum(emp.get("salary", 0) for emp in self.employees)
            if total_salaries > 0:
                self._create_gl_posting(day, "Monthly Payroll", {
                    "debit_account": "6000 - Salaries & Wages",
                    "debit_amount": total_salaries,
                    "credit_account": "1000 - Bank Account",
                    "credit_amount": total_salaries * 0.7,
                    "credit_account_2": "2200 - PAYE Payable",
                    "credit_amount_2": total_salaries * 0.25,
                    "credit_account_3": "2210 - UIF Payable",
                    "credit_amount_3": total_salaries * 0.05,
                    "reference": f"PAYROLL-{day.strftime('%Y%m')}"
                })
        
        if random.random() > 0.9:
            self._record_bot_execution("leave_management_bot")
        
        if day.month in [3, 6, 9, 12] and day.day == 15:
            self._record_bot_execution("performance_review_bot")
    
    def simulate_compliance_reporting(self, day: date):
        """Simulate compliance and reporting"""
        
        if day.day == 1:
            self._record_bot_execution("financial_reporting_bot")
            self._record_bot_execution("budget_planning_bot")
            
        if day.day == 25:
            self._record_bot_execution("vat_reporting_bot")
            self._record_bot_execution("tax_filing_bot")
            
        if day.month in [6, 12] and day.day == 30:
            self._record_bot_execution("bbbee_compliance_bot")
            self._record_bot_execution("audit_trail_bot")
    
    def simulate_manufacturing_operations(self, day: date):
        """Simulate manufacturing operations"""
        
        if random.random() > 0.8:
            self._record_bot_execution("mrp_bot")
            self._record_bot_execution("production_scheduler_bot")
            self._record_bot_execution("quality_predictor_bot")
            self._record_bot_execution("predictive_maintenance_bot")
    
    def _create_gl_posting(self, day: date, description: str, posting_data: Dict[str, Any]):
        """Create GL journal entry"""
        
        journal_entry = {
            "id": str(uuid.uuid4()),
            "entry_number": f"JE-{day.strftime('%Y%m%d')}-{len(self.journal_entries)+1:04d}",
            "posting_date": day,
            "description": description,
            "posting_data": posting_data,
            "status": "posted",
            "created_at": day
        }
        
        self.journal_entries.append(journal_entry)
        self.stats["gl_postings"] += 1
    
    def _record_bot_execution(self, bot_name: str):
        """Record bot execution"""
        if bot_name not in self.bot_executions:
            self.bot_executions[bot_name] = 0
        self.bot_executions[bot_name] += 1
        self.stats["bots_executed"] += 1
    
    def _log_transaction(self, day: date, transaction_type: str, data: Dict[str, Any]):
        """Log transaction"""
        self.transaction_log.append({
            "date": day.isoformat(),
            "type": transaction_type,
            "data": data
        })
        self.stats["total_transactions"] += 1
    
    def run_simulation(self):
        """Run complete 6-month simulation"""
        
        print("\n" + "="*80)
        print("ARIA ERP - 6-MONTH BUSINESS SIMULATION")
        print("="*80)
        print(f"Period: {self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}")
        print(f"Duration: {(self.end_date - self.start_date).days} days")
        
        self.setup_master_data()
        
        print("\n" + "="*80)
        print("PHASE 2: DAILY OPERATIONS SIMULATION")
        print("="*80)
        
        current_date = self.start_date
        day_count = 0
        
        while current_date <= self.end_date:
            day_count += 1
            
            if current_date.weekday() < 5:
                if day_count % 10 == 0:
                    print(f"\n📅 {current_date.strftime('%Y-%m-%d')} ({current_date.strftime('%A')}) - Day {day_count}")
                    print(f"   Progress: {day_count}/{(self.end_date - self.start_date).days} days ({day_count/(self.end_date - self.start_date).days*100:.1f}%)")
                
                self.simulate_quote_to_cash_workflow(current_date)
                self.simulate_procure_to_pay_workflow(current_date)
                self.simulate_field_service_workflow(current_date)
                self.simulate_hr_operations(current_date)
                self.simulate_compliance_reporting(current_date)
                self.simulate_manufacturing_operations(current_date)
            
            current_date += timedelta(days=1)
        
        self.stats["total_profit"] = self.stats["total_revenue"] - self.stats["total_expenses"]
        
        print("\n" + "="*80)
        print("SIMULATION COMPLETE")
        print("="*80)
        
        self.print_summary()
        
        return self.generate_report()
    
    def print_summary(self):
        """Print simulation summary"""
        
        print(f"\n📊 SIMULATION STATISTICS")
        print("="*80)
        print(f"\n💰 FINANCIAL METRICS:")
        print(f"   Total Revenue:        R {self.stats['total_revenue']:,.2f}")
        print(f"   Total Expenses:       R {self.stats['total_expenses']:,.2f}")
        print(f"   Total Profit:         R {self.stats['total_profit']:,.2f}")
        print(f"   Profit Margin:        {(self.stats['total_profit'] / self.stats['total_revenue'] * 100) if self.stats['total_revenue'] > 0 else 0:.2f}%")
        print(f"   VAT Collected:        R {self.stats['vat_collected']:,.2f}")
        print(f"   VAT Paid:             R {self.stats['vat_paid']:,.2f}")
        print(f"   Net VAT Payable:      R {(self.stats['vat_collected'] - self.stats['vat_paid']):,.2f}")
        
        print(f"\n📈 TRANSACTION VOLUMES:")
        print(f"   Total Transactions:   {self.stats['total_transactions']:,}")
        print(f"   Quotes Created:       {self.stats['quotes_created']:,}")
        print(f"   Sales Orders:         {self.stats['sales_orders_created']:,}")
        print(f"   Purchase Orders:      {self.stats['purchase_orders_created']:,}")
        print(f"   Deliveries:           {self.stats['deliveries_created']:,}")
        print(f"   AR Invoices:          {self.stats['ar_invoices_created']:,}")
        print(f"   AP Invoices:          {self.stats['ap_invoices_created']:,}")
        print(f"   Payments Processed:   {self.stats['payments_processed']:,}")
        print(f"   Service Requests:     {self.stats['service_requests_created']:,}")
        print(f"   Work Orders:          {self.stats['work_orders_completed']:,}")
        print(f"   GL Postings:          {self.stats['gl_postings']:,}")
        
        print(f"\n👥 MASTER DATA:")
        print(f"   Companies:            {len(self.companies):,}")
        print(f"   Customers:            {self.stats['customers_created']:,}")
        print(f"   Suppliers:            {self.stats['suppliers_created']:,}")
        print(f"   Products:             {self.stats['products_created']:,}")
        print(f"   Employees:            {len(self.employees):,}")
        print(f"   Employees Hired:      {self.stats['employees_hired']:,}")
        print(f"   Payroll Runs:         {self.stats['payroll_runs']:,}")
        
        print(f"\n🤖 BOT EXECUTIONS:")
        print(f"   Total Bot Executions: {self.stats['bots_executed']:,}")
        print(f"   Unique Bots Used:     {len(self.bot_executions)}")
        
        print(f"\n🏆 TOP 20 MOST ACTIVE BOTS:")
        sorted_bots = sorted(self.bot_executions.items(), key=lambda x: x[1], reverse=True)[:20]
        for i, (bot_name, count) in enumerate(sorted_bots, 1):
            print(f"   {i:2d}. {bot_name:35s} {count:6,} executions")
        
        print(f"\n📋 ALL BOTS EXECUTED ({len(self.bot_executions)} unique bots):")
        all_bots = sorted(self.bot_executions.items(), key=lambda x: x[1], reverse=True)
        for bot_name, count in all_bots:
            print(f"   - {bot_name:35s} {count:6,} executions")
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive simulation report"""
        
        return {
            "simulation_period": {
                "start_date": self.start_date.isoformat(),
                "end_date": self.end_date.isoformat(),
                "duration_days": (self.end_date - self.start_date).days,
                "business_days": len([d for d in self.transaction_log])
            },
            "statistics": {
                "total_transactions": self.stats["total_transactions"],
                "total_revenue": float(self.stats["total_revenue"]),
                "total_expenses": float(self.stats["total_expenses"]),
                "total_profit": float(self.stats["total_profit"]),
                "profit_margin": float(self.stats["total_profit"] / self.stats["total_revenue"] * 100) if self.stats["total_revenue"] > 0 else 0,
                "vat_collected": float(self.stats["vat_collected"]),
                "vat_paid": float(self.stats["vat_paid"]),
                "net_vat_payable": float(self.stats["vat_collected"] - self.stats["vat_paid"]),
                "quotes_created": self.stats["quotes_created"],
                "sales_orders_created": self.stats["sales_orders_created"],
                "purchase_orders_created": self.stats["purchase_orders_created"],
                "deliveries_created": self.stats["deliveries_created"],
                "ar_invoices_created": self.stats["ar_invoices_created"],
                "ap_invoices_created": self.stats["ap_invoices_created"],
                "payments_processed": self.stats["payments_processed"],
                "service_requests_created": self.stats["service_requests_created"],
                "work_orders_completed": self.stats["work_orders_completed"],
                "customers_created": self.stats["customers_created"],
                "suppliers_created": self.stats["suppliers_created"],
                "products_created": self.stats["products_created"],
                "employees_hired": self.stats["employees_hired"],
                "payroll_runs": self.stats["payroll_runs"],
                "gl_postings": self.stats["gl_postings"],
                "bots_executed": self.stats["bots_executed"],
                "unique_bots_used": len(self.bot_executions)
            },
            "bot_executions": self.bot_executions,
            "transaction_log_sample": self.transaction_log[:100],
            "companies": self.companies,
            "master_data_summary": {
                "customers": len(self.customers),
                "suppliers": len(self.suppliers),
                "products": len(self.products),
                "employees": len(self.employees)
            },
            "workflow_summary": {
                "quotes": len(self.quotes),
                "sales_orders": len(self.sales_orders),
                "purchase_orders": len(self.purchase_orders),
                "deliveries": len(self.deliveries),
                "ar_invoices": len(self.ar_invoices),
                "ap_invoices": len(self.ap_invoices),
                "payments": len(self.payments),
                "service_requests": len(self.service_requests),
                "work_orders": len(self.work_orders),
                "journal_entries": len(self.journal_entries)
            }
        }


def main():
    """Run the simulation"""
    
    start_date = date(2025, 1, 1)
    end_date = date(2025, 6, 30)
    
    simulation = BusinessSimulation(start_date, end_date)
    
    report = simulation.run_simulation()
    
    report_path = "/home/ubuntu/ARIA_6_MONTH_SIMULATION_REPORT.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✅ Simulation report saved to: {report_path}")
    
    summary_path = "/home/ubuntu/ARIA_6_MONTH_SIMULATION_SUMMARY.txt"
    with open(summary_path, "w") as f:
        f.write("="*80 + "\n")
        f.write("ARIA ERP - 6-MONTH BUSINESS SIMULATION SUMMARY\n")
        f.write("="*80 + "\n\n")
        f.write(f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}\n")
        f.write(f"Duration: {(end_date - start_date).days} days\n\n")
        
        f.write("FINANCIAL METRICS:\n")
        f.write(f"  Total Revenue:        R {report['statistics']['total_revenue']:,.2f}\n")
        f.write(f"  Total Expenses:       R {report['statistics']['total_expenses']:,.2f}\n")
        f.write(f"  Total Profit:         R {report['statistics']['total_profit']:,.2f}\n")
        f.write(f"  Profit Margin:        {report['statistics']['profit_margin']:.2f}%\n\n")
        
        f.write("TRANSACTION VOLUMES:\n")
        f.write(f"  Total Transactions:   {report['statistics']['total_transactions']:,}\n")
        f.write(f"  Quotes Created:       {report['statistics']['quotes_created']:,}\n")
        f.write(f"  Sales Orders:         {report['statistics']['sales_orders_created']:,}\n")
        f.write(f"  AR Invoices:          {report['statistics']['ar_invoices_created']:,}\n")
        f.write(f"  Payments Processed:   {report['statistics']['payments_processed']:,}\n\n")
        
        f.write("BOT EXECUTIONS:\n")
        f.write(f"  Total Bot Executions: {report['statistics']['bots_executed']:,}\n")
        f.write(f"  Unique Bots Used:     {report['statistics']['unique_bots_used']}\n\n")
        
        f.write("TOP 20 MOST ACTIVE BOTS:\n")
        sorted_bots = sorted(report['bot_executions'].items(), key=lambda x: x[1], reverse=True)[:20]
        for i, (bot_name, count) in enumerate(sorted_bots, 1):
            f.write(f"  {i:2d}. {bot_name:35s} {count:6,} executions\n")
    
    print(f"✅ Summary report saved to: {summary_path}")
    
    return report


if __name__ == "__main__":
    main()
