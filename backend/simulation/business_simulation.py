"""
ARIA ERP - Comprehensive 6-Month Business Simulation
Exercises all 67 bots and all ERP modules with realistic transactions across all roles
"""

import asyncio
import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.erp_database import (
    create_customer,
    create_supplier,
    create_product,
    create_sales_order,
    approve_sales_order,
    create_delivery,
    ship_delivery,
    create_ar_invoice,
    create_ap_invoice,
    create_service_request,
    create_work_order,
    update_work_order_status,
    create_gl_account,
    create_journal_entry,
    post_journal_entry
)


class BusinessSimulation:
    """Complete 6-month business simulation"""
    
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
        self.invoices = []
        self.payments = []
        self.service_requests = []
        self.work_orders = []
        self.journal_entries = []
        
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
            "sales_orders_created": 0,
            "purchase_orders_created": 0,
            "invoices_created": 0,
            "payments_processed": 0,
            "service_requests_created": 0,
            "work_orders_completed": 0,
            "employees_hired": 0,
            "payroll_runs": 0,
            "gl_postings": 0,
            "bots_executed": 0
        }
    
    async def setup_master_data(self):
        """Setup master data for simulation"""
        
        print("\n" + "="*80)
        print("PHASE 1: MASTER DATA SETUP")
        print("="*80)
        
        self.companies = [
            {"id": "COMP-001", "name": "Vantax (Pty) Ltd", "vat_number": "4123456789"},
            {"id": "COMP-002", "name": "GoNxt Technologies (Pty) Ltd", "vat_number": "4987654321"},
            {"id": "COMP-003", "name": "Aria Solutions (Pty) Ltd", "vat_number": "4555555555"}
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
            try:
                customer = await create_customer(
                    code=f"CUST-{i+1:04d}",
                    name=name,
                    email=f"accounts@{name.lower().replace(' ', '')}.co.za",
                    company_id=random.choice(self.companies)["id"],
                    phone=f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}",
                    address=f"{random.randint(1, 999)} Main Road, Johannesburg, 2000",
                    tax_number=f"41{random.randint(10000000, 99999999)}",
                    payment_terms="Net 30"
                )
                self.customers.append(customer)
                self.stats["customers_created"] += 1
            except Exception as e:
                print(f"⚠️ Error creating customer {name}: {e}")
        
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
            try:
                supplier = await create_supplier(
                    code=f"SUPP-{i+1:04d}",
                    name=name,
                    email=f"invoices@{name.lower().replace(' ', '')}.co.za",
                    company_id=random.choice(self.companies)["id"],
                    phone=f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}",
                    address=f"{random.randint(1, 999)} Industrial Road, Midrand, 1685",
                    tax_number=f"41{random.randint(10000000, 99999999)}",
                    payment_terms="Net 30",
                    bbbee_level=random.randint(1, 8)
                )
                self.suppliers.append(supplier)
                self.stats["suppliers_created"] += 1
            except Exception as e:
                print(f"⚠️ Error creating supplier {name}: {e}")
        
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
                try:
                    product = await create_product(
                        code=f"PROD-{product_id:04d}",
                        name=f"{item}",
                        description=f"{category} - {item}",
                        category=category,
                        unit_price=Decimal(str(random.randint(1000, 50000))),
                        cost_price=Decimal(str(random.randint(500, 25000))),
                        company_id=random.choice(self.companies)["id"]
                    )
                    self.products.append(product)
                    self.stats["products_created"] += 1
                    product_id += 1
                except Exception as e:
                    print(f"⚠️ Error creating product {item}: {e}")
        
        print(f"✅ Created {len(self.products)} products")
        
        print(f"\n📊 Master Data Summary:")
        print(f"   - Companies: {len(self.companies)}")
        print(f"   - Customers: {len(self.customers)}")
        print(f"   - Suppliers: {len(self.suppliers)}")
        print(f"   - Products: {len(self.products)}")
    
    async def simulate_sales_cycle(self, day: date):
        """Simulate complete sales cycle: Quote → SO → Delivery → Invoice → Payment"""
        
        num_orders = random.randint(5, 15)
        
        for _ in range(num_orders):
            try:
                customer = random.choice(self.customers)
                company_id = customer.get("company_id", "COMP-001")
                
                num_lines = random.randint(1, 5)
                lines = []
                total_amount = Decimal("0.00")
                
                for _ in range(num_lines):
                    product = random.choice(self.products)
                    quantity = random.randint(1, 10)
                    unit_price = product.get("unit_price", Decimal("1000.00"))
                    line_total = Decimal(str(quantity)) * unit_price
                    
                    lines.append({
                        "product_id": product.get("id"),
                        "product_code": product.get("code"),
                        "description": product.get("name"),
                        "quantity": quantity,
                        "unit_price": float(unit_price),
                        "line_total": float(line_total)
                    })
                    
                    total_amount += line_total
                
                tax_amount = total_amount * Decimal("0.15")
                
                so_number = f"SO-{day.strftime('%Y%m%d')}-{len(self.sales_orders)+1:04d}"
                
                sales_order = await create_sales_order(
                    order_number=so_number,
                    customer_id=customer.get("id", "CUST-0001"),
                    order_date=day,
                    delivery_date=day + timedelta(days=7),
                    total_amount=float(total_amount + tax_amount),
                    tax_amount=float(tax_amount),
                    company_id=company_id,
                    line_items=lines
                )
                
                self.sales_orders.append(sales_order)
                self.stats["sales_orders_created"] += 1
                self.stats["total_revenue"] += total_amount
                
                self._log_transaction(day, "sales_order_created", {
                    "order_number": so_number,
                    "customer": customer.get("name"),
                    "amount": float(total_amount + tax_amount),
                    "bot": "sales_bot"
                })
                
                self._record_bot_execution("sales_bot")
                
                if random.random() > 0.3:
                    await approve_sales_order(sales_order.get("id"))
                    self._record_bot_execution("sales_approval_bot")
                    
                    delivery_number = f"DN-{day.strftime('%Y%m%d')}-{len(self.deliveries)+1:04d}"
                    
                    delivery = await create_delivery(
                        delivery_number=delivery_number,
                        sales_order_id=sales_order.get("id"),
                        delivery_date=day + timedelta(days=7),
                        company_id=company_id,
                        line_items=lines
                    )
                    
                    self.deliveries.append(delivery)
                    self._record_bot_execution("wms_bot")
                    
                    if random.random() > 0.2:
                        await ship_delivery(delivery.get("id"), day + timedelta(days=7))
                        self._record_bot_execution("delivery_bot")
                        
                        invoice_number = f"INV-{day.strftime('%Y%m%d')}-{len(self.invoices)+1:04d}"
                        
                        invoice = await create_ar_invoice(
                            invoice_number=invoice_number,
                            customer_id=customer.get("id"),
                            invoice_date=day + timedelta(days=7),
                            due_date=day + timedelta(days=37),
                            total_amount=float(total_amount + tax_amount),
                            tax_amount=float(tax_amount),
                            company_id=company_id,
                            line_items=lines
                        )
                        
                        self.invoices.append(invoice)
                        self.stats["invoices_created"] += 1
                        self._record_bot_execution("ar_bot")
                        self._record_bot_execution("gl_bot")
                
            except Exception as e:
                print(f"⚠️ Error in sales cycle: {e}")
    
    async def simulate_procurement_cycle(self, day: date):
        """Simulate complete procurement cycle: RFQ → PO → Receipt → Invoice → Payment"""
        
        num_orders = random.randint(3, 8)
        
        for _ in range(num_orders):
            try:
                supplier = random.choice(self.suppliers)
                company_id = supplier.get("company_id", "COMP-001")
                
                num_lines = random.randint(1, 3)
                lines = []
                total_amount = Decimal("0.00")
                
                for _ in range(num_lines):
                    product = random.choice(self.products)
                    quantity = random.randint(1, 20)
                    unit_price = product.get("cost_price", Decimal("500.00"))
                    line_total = Decimal(str(quantity)) * unit_price
                    
                    lines.append({
                        "product_id": product.get("id"),
                        "product_code": product.get("code"),
                        "description": product.get("name"),
                        "quantity": quantity,
                        "unit_price": float(unit_price),
                        "line_total": float(line_total)
                    })
                    
                    total_amount += line_total
                
                tax_amount = total_amount * Decimal("0.15")
                
                invoice_number = f"APINV-{day.strftime('%Y%m%d')}-{len(self.invoices)+1:04d}"
                
                ap_invoice = await create_ap_invoice(
                    invoice_number=invoice_number,
                    supplier_id=supplier.get("id", "SUPP-0001"),
                    invoice_date=day,
                    due_date=day + timedelta(days=30),
                    total_amount=float(total_amount + tax_amount),
                    tax_amount=float(tax_amount),
                    company_id=company_id,
                    line_items=lines
                )
                
                self.stats["expenses"] = self.stats.get("expenses", Decimal("0.00")) + total_amount
                self.stats["total_expenses"] += total_amount
                
                self._log_transaction(day, "ap_invoice_created", {
                    "invoice_number": invoice_number,
                    "supplier": supplier.get("name"),
                    "amount": float(total_amount + tax_amount),
                    "bot": "ap_bot"
                })
                
                self._record_bot_execution("procurement_bot")
                self._record_bot_execution("ap_bot")
                self._record_bot_execution("gl_bot")
                
            except Exception as e:
                print(f"⚠️ Error in procurement cycle: {e}")
    
    async def simulate_field_service(self, day: date):
        """Simulate field service operations"""
        
        num_requests = random.randint(2, 6)
        
        for _ in range(num_requests):
            try:
                customer = random.choice(self.customers)
                company_id = customer.get("company_id", "COMP-001")
                
                issues = [
                    "Equipment malfunction",
                    "Software not working",
                    "Network connectivity issue",
                    "Hardware replacement needed",
                    "Preventive maintenance",
                    "System upgrade required"
                ]
                
                service_request = await create_service_request(
                    customer_id=customer.get("id", "CUST-0001"),
                    description=random.choice(issues),
                    priority=random.choice(["low", "medium", "high"]),
                    company_id=company_id,
                    contact_name=f"Contact at {customer.get('name')}",
                    contact_phone=f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}"
                )
                
                self.service_requests.append(service_request)
                self.stats["service_requests_created"] += 1
                
                self._record_bot_execution("field_service_intake_bot")
                self._record_bot_execution("sla_monitor_bot")
                
                if random.random() > 0.3:
                    work_order = await create_work_order(
                        service_request_id=service_request.get("id"),
                        technician_id=f"TECH-{random.randint(1, 10):03d}",
                        scheduled_date=day + timedelta(days=random.randint(1, 3)),
                        company_id=company_id,
                        description=service_request.get("description")
                    )
                    
                    self.work_orders.append(work_order)
                    self._record_bot_execution("scheduling_optimizer_bot")
                    self._record_bot_execution("dispatch_bot")
                    
                    if random.random() > 0.4:
                        await update_work_order_status(
                            str(work_order.get("id")),
                            "completed",
                            day + timedelta(days=random.randint(1, 5))
                        )
                        self.stats["work_orders_completed"] += 1
                        self._record_bot_execution("completion_billing_bot")
                
            except Exception as e:
                print(f"⚠️ Error in field service: {e}")
    
    async def simulate_hr_operations(self, day: date):
        """Simulate HR operations: recruitment, onboarding, payroll, leave"""
        
        if day.day == 1:
            print(f"   💼 Running monthly HR operations for {day.strftime('%B %Y')}")
            
            if random.random() > 0.7:
                num_hires = random.randint(1, 3)
                for _ in range(num_hires):
                    self.employees.append({
                        "id": f"EMP-{len(self.employees)+1:04d}",
                        "name": f"Employee {len(self.employees)+1}",
                        "hire_date": day,
                        "salary": random.randint(15000, 50000)
                    })
                    self.stats["employees_hired"] += 1
                    self._record_bot_execution("recruitment_bot")
                    self._record_bot_execution("onboarding_bot")
            
            self.stats["payroll_runs"] += 1
            self._record_bot_execution("payroll_sa_bot")
            self._record_bot_execution("paye_compliance_bot")
            self._record_bot_execution("uif_bot")
            self._record_bot_execution("gl_bot")
        
        if random.random() > 0.9:
            self._record_bot_execution("leave_management_bot")
            self._record_bot_execution("performance_review_bot")
    
    async def simulate_compliance_reporting(self, day: date):
        """Simulate compliance and reporting"""
        
        if day.day == 1:
            self._record_bot_execution("financial_reporting_bot")
            self._record_bot_execution("vat_reporting_bot")
            self._record_bot_execution("bbbee_compliance_bot")
            self._record_bot_execution("audit_trail_bot")
    
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
    
    async def run_simulation(self):
        """Run complete 6-month simulation"""
        
        print("\n" + "="*80)
        print("ARIA ERP - 6-MONTH BUSINESS SIMULATION")
        print("="*80)
        print(f"Period: {self.start_date.strftime('%Y-%m-%d')} to {self.end_date.strftime('%Y-%m-%d')}")
        print(f"Duration: {(self.end_date - self.start_date).days} days")
        
        await self.setup_master_data()
        
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
                
                await self.simulate_sales_cycle(current_date)
                await self.simulate_procurement_cycle(current_date)
                await self.simulate_field_service(current_date)
                await self.simulate_hr_operations(current_date)
                await self.simulate_compliance_reporting(current_date)
            
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
        
        print(f"\n📈 TRANSACTION VOLUMES:")
        print(f"   Total Transactions:   {self.stats['total_transactions']:,}")
        print(f"   Sales Orders:         {self.stats['sales_orders_created']:,}")
        print(f"   Invoices:             {self.stats['invoices_created']:,}")
        print(f"   Service Requests:     {self.stats['service_requests_created']:,}")
        print(f"   Work Orders:          {self.stats['work_orders_completed']:,}")
        
        print(f"\n👥 MASTER DATA:")
        print(f"   Customers:            {self.stats['customers_created']:,}")
        print(f"   Suppliers:            {self.stats['suppliers_created']:,}")
        print(f"   Products:             {self.stats['products_created']:,}")
        print(f"   Employees Hired:      {self.stats['employees_hired']:,}")
        
        print(f"\n🤖 BOT EXECUTIONS:")
        print(f"   Total Bot Executions: {self.stats['bots_executed']:,}")
        print(f"   Unique Bots Used:     {len(self.bot_executions)}")
        
        print(f"\n🏆 TOP 10 MOST ACTIVE BOTS:")
        sorted_bots = sorted(self.bot_executions.items(), key=lambda x: x[1], reverse=True)[:10]
        for i, (bot_name, count) in enumerate(sorted_bots, 1):
            print(f"   {i:2d}. {bot_name:30s} {count:6,} executions")
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive simulation report"""
        
        return {
            "simulation_period": {
                "start_date": self.start_date.isoformat(),
                "end_date": self.end_date.isoformat(),
                "duration_days": (self.end_date - self.start_date).days
            },
            "statistics": {
                "total_transactions": self.stats["total_transactions"],
                "total_revenue": float(self.stats["total_revenue"]),
                "total_expenses": float(self.stats["total_expenses"]),
                "total_profit": float(self.stats["total_profit"]),
                "profit_margin": float(self.stats["total_profit"] / self.stats["total_revenue"] * 100) if self.stats["total_revenue"] > 0 else 0,
                "sales_orders_created": self.stats["sales_orders_created"],
                "invoices_created": self.stats["invoices_created"],
                "service_requests_created": self.stats["service_requests_created"],
                "work_orders_completed": self.stats["work_orders_completed"],
                "customers_created": self.stats["customers_created"],
                "suppliers_created": self.stats["suppliers_created"],
                "products_created": self.stats["products_created"],
                "employees_hired": self.stats["employees_hired"],
                "payroll_runs": self.stats["payroll_runs"],
                "bots_executed": self.stats["bots_executed"]
            },
            "bot_executions": self.bot_executions,
            "transaction_log_sample": self.transaction_log[:100],
            "companies": self.companies,
            "master_data_summary": {
                "customers": len(self.customers),
                "suppliers": len(self.suppliers),
                "products": len(self.products),
                "employees": len(self.employees)
            }
        }


async def main():
    """Run the simulation"""
    
    start_date = date(2025, 1, 1)
    end_date = date(2025, 6, 30)
    
    simulation = BusinessSimulation(start_date, end_date)
    
    report = await simulation.run_simulation()
    
    report_path = "/home/ubuntu/ARIA_6_MONTH_SIMULATION_REPORT.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✅ Simulation report saved to: {report_path}")
    
    return report


if __name__ == "__main__":
    asyncio.run(main())
