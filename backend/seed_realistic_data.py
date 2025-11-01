"""
ARIA ERP - Realistic Seed Data Generator
Creates production-quality demo data for testing and demonstration
"""

import sqlite3
import hashlib
from datetime import datetime, timedelta, date
import random
import json

DATABASE = 'aria_erp_production.db'

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def seed_data():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print("🌱 Seeding realistic data...")
    
    # ==================================================================
    # 1. COMPANY
    # ==================================================================
    cursor.execute("""
        INSERT INTO companies (
            name, registration_number, tax_number, vat_number,
            industry, employees_count, currency_code,
            address_line1, city, province, postal_code, country,
            phone, email, website, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'Acme Manufacturing (Pty) Ltd',
        '2020/123456/07',
        '9876543210',
        '4567891234',
        'Manufacturing',
        150,
        'ZAR',
        '123 Industrial Road',
        'Johannesburg',
        'Gauteng',
        '2001',
        'South Africa',
        '+27 11 123 4567',
        'info@acmemanufacturing.co.za',
        'www.acmemanufacturing.co.za',
        1
    ))
    company_id = cursor.lastrowid
    print(f"✅ Company created: ID {company_id}")
    
    # ==================================================================
    # 2. USERS
    # ==================================================================
    users = [
        ('admin@acme.co.za', 'Admin2025!', 'System', 'Administrator', 'admin'),
        ('finance@acme.co.za', 'Finance2025!', 'Sarah', 'Johnson', 'finance_manager'),
        ('hr@acme.co.za', 'HR2025!', 'Michael', 'Smith', 'hr_manager'),
        ('sales@acme.co.za', 'Sales2025!', 'Emma', 'Williams', 'sales_manager'),
        ('demo@acme.co.za', 'Demo2025!', 'Demo', 'User', 'user'),
    ]
    
    user_ids = {}
    for email, password, first_name, last_name, role in users:
        cursor.execute("""
            INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (company_id, email, hash_password(password), first_name, last_name, role, 1))
        user_ids[role] = cursor.lastrowid
    
    print(f"✅ Created {len(users)} users")
    
    # ==================================================================
    # 3. FISCAL PERIODS
    # ==================================================================
    current_year = datetime.now().year
    for month in range(1, 13):
        start_date = date(current_year, month, 1)
        if month == 12:
            end_date = date(current_year, 12, 31)
        else:
            end_date = date(current_year, month + 1, 1) - timedelta(days=1)
        
        cursor.execute("""
            INSERT INTO fiscal_periods (company_id, name, start_date, end_date, is_closed)
            VALUES (?, ?, ?, ?, ?)
        """, (company_id, f"{current_year}-{month:02d}", start_date, end_date, month < datetime.now().month))
    
    print("✅ Created 12 fiscal periods")
    
    # ==================================================================
    # 4. CHART OF ACCOUNTS
    # ==================================================================
    accounts = [
        # ASSETS
        ('1000', 'Assets', None, 'ASSET', 'HEADER'),
        ('1100', 'Current Assets', 1, 'ASSET', 'CURRENT_ASSET'),
        ('1110', 'Bank - Standard Bank Current', 2, 'ASSET', 'BANK'),
        ('1120', 'Bank - FNB Savings', 2, 'ASSET', 'BANK'),
        ('1200', 'Accounts Receivable', 2, 'ASSET', 'ACCOUNTS_RECEIVABLE'),
        ('1300', 'Inventory', 2, 'ASSET', 'INVENTORY'),
        ('1400', 'Prepayments', 2, 'ASSET', 'PREPAYMENT'),
        ('1500', 'Fixed Assets', 1, 'ASSET', 'FIXED_ASSET'),
        ('1510', 'Property', 8, 'ASSET', 'FIXED_ASSET'),
        ('1520', 'Plant & Equipment', 8, 'ASSET', 'FIXED_ASSET'),
        ('1530', 'Vehicles', 8, 'ASSET', 'FIXED_ASSET'),
        ('1540', 'Furniture & Fittings', 8, 'ASSET', 'FIXED_ASSET'),
        ('1550', 'Computer Equipment', 8, 'ASSET', 'FIXED_ASSET'),
        ('1590', 'Accumulated Depreciation', 8, 'ASSET', 'ACCUMULATED_DEPRECIATION'),
        
        # LIABILITIES
        ('2000', 'Liabilities', None, 'LIABILITY', 'HEADER'),
        ('2100', 'Current Liabilities', 15, 'LIABILITY', 'CURRENT_LIABILITY'),
        ('2110', 'Accounts Payable', 16, 'LIABILITY', 'ACCOUNTS_PAYABLE'),
        ('2120', 'VAT Payable', 16, 'LIABILITY', 'VAT_PAYABLE'),
        ('2130', 'PAYE Payable', 16, 'LIABILITY', 'PAYE_PAYABLE'),
        ('2140', 'UIF Payable', 16, 'LIABILITY', 'UIF_PAYABLE'),
        ('2150', 'SDL Payable', 16, 'LIABILITY', 'SDL_PAYABLE'),
        ('2160', 'Salaries Payable', 16, 'LIABILITY', 'SALARIES_PAYABLE'),
        ('2200', 'Long-term Liabilities', 15, 'LIABILITY', 'LONG_TERM_LIABILITY'),
        ('2210', 'Bank Loans', 23, 'LIABILITY', 'BANK_LOAN'),
        
        # EQUITY
        ('3000', 'Equity', None, 'EQUITY', 'HEADER'),
        ('3100', 'Share Capital', 25, 'EQUITY', 'SHARE_CAPITAL'),
        ('3200', 'Retained Earnings', 25, 'EQUITY', 'RETAINED_EARNINGS'),
        ('3900', 'Current Year Earnings', 25, 'EQUITY', 'CURRENT_EARNINGS'),
        
        # REVENUE
        ('4000', 'Revenue', None, 'REVENUE', 'HEADER'),
        ('4100', 'Sales Revenue', 29, 'REVENUE', 'SALES'),
        ('4200', 'Service Revenue', 29, 'REVENUE', 'SERVICES'),
        ('4300', 'Other Revenue', 29, 'REVENUE', 'OTHER'),
        
        # EXPENSES
        ('5000', 'Cost of Sales', None, 'EXPENSE', 'HEADER'),
        ('5100', 'Cost of Goods Sold', 33, 'EXPENSE', 'COGS'),
        ('5200', 'Direct Labour', 33, 'EXPENSE', 'DIRECT_LABOUR'),
        
        ('6000', 'Operating Expenses', None, 'EXPENSE', 'HEADER'),
        ('6100', 'Salaries & Wages', 36, 'EXPENSE', 'SALARIES'),
        ('6110', 'Directors Remuneration', 37, 'EXPENSE', 'DIRECTORS_REMUNERATION'),
        ('6120', 'Employee Benefits', 37, 'EXPENSE', 'EMPLOYEE_BENEFITS'),
        ('6200', 'Rent & Rates', 36, 'EXPENSE', 'RENT'),
        ('6300', 'Utilities', 36, 'EXPENSE', 'UTILITIES'),
        ('6310', 'Electricity', 41, 'EXPENSE', 'ELECTRICITY'),
        ('6320', 'Water', 41, 'EXPENSE', 'WATER'),
        ('6400', 'Insurance', 36, 'EXPENSE', 'INSURANCE'),
        ('6500', 'Professional Fees', 36, 'EXPENSE', 'PROFESSIONAL_FEES'),
        ('6510', 'Audit Fees', 45, 'EXPENSE', 'AUDIT_FEES'),
        ('6520', 'Legal Fees', 45, 'EXPENSE', 'LEGAL_FEES'),
        ('6530', 'Consulting Fees', 45, 'EXPENSE', 'CONSULTING_FEES'),
        ('6600', 'Motor Vehicle Expenses', 36, 'EXPENSE', 'MOTOR_VEHICLE'),
        ('6700', 'Travel & Entertainment', 36, 'EXPENSE', 'TRAVEL'),
        ('6800', 'Repairs & Maintenance', 36, 'EXPENSE', 'REPAIRS'),
        ('6900', 'Depreciation', 36, 'EXPENSE', 'DEPRECIATION'),
        ('7000', 'Administrative Expenses', 36, 'EXPENSE', 'ADMIN'),
        ('7100', 'Stationery & Printing', 53, 'EXPENSE', 'STATIONERY'),
        ('7200', 'Telephone & Internet', 53, 'EXPENSE', 'TELEPHONE'),
        ('7300', 'Bank Charges', 53, 'EXPENSE', 'BANK_CHARGES'),
    ]
    
    account_ids = {}
    for code, name, parent_idx, acc_type, subtype in accounts:
        parent_id = account_ids[accounts[parent_idx-1][0]] if parent_idx else None
        cursor.execute("""
            INSERT INTO accounts (company_id, code, name, parent_id, account_type, account_subtype, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (company_id, code, name, parent_id, acc_type, subtype, 1))
        account_ids[code] = cursor.lastrowid
    
    print(f"✅ Created {len(accounts)} accounts")
    
    # ==================================================================
    # 5. SUPPLIERS
    # ==================================================================
    suppliers = [
        ('SUP001', 'ABC Supplies (Pty) Ltd', '2015/654321/07', '1234567890', '2345678901', 4, date(2026, 6, 30), 'NET30', 500000, 'Pretoria'),
        ('SUP002', 'XYZ Materials', '2018/789012/07', '2345678901', '3456789012', 3, date(2025, 12, 31), 'NET30', 750000, 'Durban'),
        ('SUP003', 'Global Tech Solutions', '2016/345678/07', '3456789012', '4567890123', 2, date(2026, 3, 15), 'NET60', 1000000, 'Cape Town'),
        ('SUP004', 'SA Steel & Metal', '2010/901234/07', '4567890123', '5678901234', 5, date(2026, 9, 30), 'NET30', 2000000, 'Johannesburg'),
        ('SUP005', 'Office Depot SA', '2012/567890/07', '5678901234', '6789012345', None, None, 'COD', 100000, 'Sandton'),
    ]
    
    supplier_ids = {}
    for code, name, reg_num, tax_num, vat_num, bbbee, bbbee_exp, terms, credit, city in suppliers:
        cursor.execute("""
            INSERT INTO suppliers (
                company_id, code, name, registration_number, tax_number, vat_number,
                bbbee_level, bbbee_certificate_expiry, payment_terms, credit_limit,
                account_id, city, province, country, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, code, name, reg_num, tax_num, vat_num, bbbee, bbbee_exp, 
              terms, credit, account_ids['2110'], city, 'Gauteng', 'South Africa', 1))
        supplier_ids[code] = cursor.lastrowid
    
    print(f"✅ Created {len(suppliers)} suppliers")
    
    # ==================================================================
    # 6. CUSTOMERS
    # ==================================================================
    customers = [
        ('CUS001', 'Retail Giants (Pty) Ltd', '2017/111222/07', '9876543211', '8765432109', 'NET30', 1000000, 'Sandton'),
        ('CUS002', 'Tech Distributors SA', '2019/333444/07', '8765432109', '7654321098', 'NET30', 1500000, 'Pretoria'),
        ('CUS003', 'Manufacturing Solutions', '2016/555666/07', '7654321098', '6543210987', 'NET60', 2000000, 'Durban'),
        ('CUS004', 'Construction Co.', '2015/777888/07', '6543210987', '5432109876', 'NET30', 2500000, 'Cape Town'),
        ('CUS005', 'Hospitality Group', '2018/999000/07', '5432109876', '4321098765', 'NET30', 500000, 'Johannesburg'),
        ('CUS006', 'Mining Operations Ltd', '2014/121314/07', '4321098765', '3210987654', 'NET45', 3000000, 'Rustenburg'),
    ]
    
    customer_ids = {}
    for code, name, reg_num, tax_num, vat_num, terms, credit, city in customers:
        cursor.execute("""
            INSERT INTO customers (
                company_id, code, name, registration_number, tax_number, vat_number,
                payment_terms, credit_limit, account_id, city, province, country, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, code, name, reg_num, tax_num, vat_num, terms, credit,
              account_ids['1200'], city, 'Gauteng', 'South Africa', 1))
        customer_ids[code] = cursor.lastrowid
    
    print(f"✅ Created {len(customers)} customers")
    
    # ==================================================================
    # 7. BANK ACCOUNTS
    # ==================================================================
    cursor.execute("""
        INSERT INTO bank_accounts (
            company_id, account_id, bank_name, account_number, account_type,
            branch_code, currency_code, opening_balance, current_balance, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (company_id, account_ids['1110'], 'Standard Bank', '1234567890', 'CURRENT',
          '051001', 'ZAR', 500000.00, 500000.00, 1))
    bank_account_id = cursor.lastrowid
    
    print("✅ Created bank account")
    
    # ==================================================================
    # 8. TAX RATES
    # ==================================================================
    cursor.execute("""
        INSERT INTO tax_rates (company_id, code, name, rate, account_id, is_active, effective_from)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (company_id, 'VAT15', 'VAT 15%', 15.00, account_ids['2120'], 1, date(2020, 1, 1)))
    vat_rate_id = cursor.lastrowid
    
    print("✅ Created VAT rate")
    
    # ==================================================================
    # 9. EMPLOYEES
    # ==================================================================
    employees_data = [
        ('EMP001', 'John', 'Doe', '8501155800080', date(1985, 1, 15), 'M', 'MARRIED', 'CEO', 'Executive', None, date(2015, 1, 1), 95000),
        ('EMP002', 'Sarah', 'Johnson', '9002225700081', date(1990, 2, 22), 'F', 'SINGLE', 'Finance Manager', 'Finance', 1, date(2016, 3, 1), 65000),
        ('EMP003', 'Michael', 'Smith', '8803136800082', date(1988, 3, 13), 'M', 'MARRIED', 'HR Manager', 'HR', 1, date(2017, 5, 15), 55000),
        ('EMP004', 'Emma', 'Williams', '9204147800083', date(1992, 4, 14), 'F', 'SINGLE', 'Sales Manager', 'Sales', 1, date(2018, 7, 1), 60000),
        ('EMP005', 'David', 'Brown', '8705158800084', date(1987, 5, 15), 'M', 'MARRIED', 'Production Manager', 'Production', 1, date(2016, 9, 1), 58000),
        ('EMP006', 'Lisa', 'Taylor', '9406166800085', date(1994, 6, 16), 'F', 'SINGLE', 'Accountant', 'Finance', 2, date(2019, 1, 15), 45000),
        ('EMP007', 'James', 'Wilson', '8907177800086', date(1989, 7, 17), 'M', 'MARRIED', 'Sales Rep', 'Sales', 4, date(2019, 3, 1), 35000),
        ('EMP008', 'Sophie', 'Anderson', '9608188800087', date(1996, 8, 18), 'F', 'SINGLE', 'HR Officer', 'HR', 3, date(2020, 2, 1), 28000),
        ('EMP009', 'Robert', 'Thomas', '8509199800088', date(1985, 9, 19), 'M', 'MARRIED', 'Production Supervisor', 'Production', 5, date(2017, 6, 1), 38000),
        ('EMP010', 'Michelle', 'Moore', '9310205700089', date(1993, 10, 20), 'F', 'SINGLE', 'Admin Assistant', 'Admin', 1, date(2020, 8, 1), 22000),
    ]
    
    employee_ids = {}
    for emp_num, first, last, id_num, dob, gender, marital, title, dept, mgr_idx, start, salary in employees_data:
        manager_id = employee_ids[employees_data[mgr_idx-1][0]] if mgr_idx else None
        cursor.execute("""
            INSERT INTO employees (
                company_id, employee_number, first_name, last_name, id_number,
                date_of_birth, gender, marital_status, job_title, department,
                manager_id, employment_type, start_date, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, emp_num, first, last, id_num, dob, gender, marital,
              title, dept, manager_id, 'PERMANENT', start, 1))
        emp_id = cursor.lastrowid
        employee_ids[emp_num] = emp_id
        
        # Create payroll config
        cursor.execute("""
            INSERT INTO payroll_configs (
                company_id, employee_id, basic_salary, salary_frequency,
                payment_method, effective_from
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (company_id, emp_id, salary, 'MONTHLY', 'EFT', start))
    
    print(f"✅ Created {len(employees_data)} employees with payroll configs")
    
    # ==================================================================
    # 10. LEAVE TYPES
    # ==================================================================
    leave_types_data = [
        ('ANNUAL', 'Annual Leave', 21.00, 1, 10.00, 1, 1),
        ('SICK', 'Sick Leave', 30.00, 0, 0.00, 1, 1),
        ('FAMILY', 'Family Responsibility', 3.00, 0, 0.00, 1, 1),
        ('UNPAID', 'Unpaid Leave', 0.00, 0, 0.00, 1, 0),
    ]
    
    leave_type_ids = {}
    for code, name, days, carry, max_carry, requires_approval, is_paid in leave_types_data:
        cursor.execute("""
            INSERT INTO leave_types (
                company_id, code, name, days_per_year, carry_forward,
                max_carry_forward_days, requires_approval, is_paid, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, code, name, days, carry, max_carry, requires_approval, is_paid, 1))
        leave_type_ids[code] = cursor.lastrowid
    
    print(f"✅ Created {len(leave_types_data)} leave types")
    
    # ==================================================================
    # 11. PRODUCTS
    # ==================================================================
    products_data = [
        ('PROD-001', 'Widget A', 'Standard Widget Type A', 'STOCK', 'Finished Goods', 'UNIT', 150.00, 250.00),
        ('PROD-002', 'Widget B', 'Premium Widget Type B', 'STOCK', 'Finished Goods', 'UNIT', 200.00, 350.00),
        ('PROD-003', 'Widget C', 'Economy Widget Type C', 'STOCK', 'Finished Goods', 'UNIT', 100.00, 180.00),
        ('PROD-004', 'Installation Service', 'Professional Installation', 'SERVICE', 'Services', 'HOUR', 0.00, 500.00),
        ('PROD-005', 'Maintenance Contract', 'Annual Maintenance', 'SERVICE', 'Services', 'YEAR', 0.00, 12000.00),
        ('RAW-001', 'Steel Sheet', 'Raw Material - Steel', 'STOCK', 'Raw Materials', 'KG', 45.00, 0.00),
        ('RAW-002', 'Plastic Resin', 'Raw Material - Plastic', 'STOCK', 'Raw Materials', 'KG', 25.00, 0.00),
    ]
    
    product_ids = {}
    for sku, name, desc, ptype, cat, uom, cost, price in products_data:
        cursor.execute("""
            INSERT INTO products (
                company_id, sku, name, description, product_type, category,
                unit_of_measure, cost_price, selling_price, tax_rate_id,
                inventory_account_id, cogs_account_id, revenue_account_id,
                reorder_level, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, sku, name, desc, ptype, cat, uom, cost, price, vat_rate_id,
              account_ids['1300'], account_ids['5100'], account_ids['4100'], 50.00, 1))
        product_ids[sku] = cursor.lastrowid
    
    print(f"✅ Created {len(products_data)} products")
    
    # ==================================================================
    # 12. WAREHOUSE
    # ==================================================================
    cursor.execute("""
        INSERT INTO warehouses (company_id, code, name, address_line1, city, province, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (company_id, 'WH001', 'Main Warehouse', '123 Industrial Road', 'Johannesburg', 'Gauteng', 1))
    warehouse_id = cursor.lastrowid
    
    # Create initial stock levels
    for sku in ['PROD-001', 'PROD-002', 'PROD-003', 'RAW-001', 'RAW-002']:
        qty = random.randint(100, 500)
        cost = products_data[[p[0] for p in products_data].index(sku)][7]
        cursor.execute("""
            INSERT INTO stock_levels (
                company_id, product_id, warehouse_id, quantity_on_hand,
                quantity_available, last_cost, average_cost, total_value
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, product_ids[sku], warehouse_id, qty, qty, cost, cost, qty * cost))
    
    print("✅ Created warehouse with initial stock levels")
    
    # ==================================================================
    # 13. SUPPLIER INVOICES (For AP testing)
    # ==================================================================
    current_period = datetime.now().month
    fiscal_period_id = current_period
    
    # Get fiscal period
    cursor.execute("SELECT id FROM fiscal_periods WHERE company_id = ? AND name = ?",
                   (company_id, f"{current_year}-{current_period:02d}"))
    fiscal_period_id = cursor.fetchone()[0]
    
    # Create some supplier invoices (last 30 days)
    for i in range(10):
        days_ago = random.randint(1, 30)
        inv_date = datetime.now().date() - timedelta(days=days_ago)
        due_date = inv_date + timedelta(days=30)
        
        supplier_code = random.choice(['SUP001', 'SUP002', 'SUP003', 'SUP004'])
        supplier_id = supplier_ids[supplier_code]
        
        subtotal = random.uniform(5000, 50000)
        tax = subtotal * 0.15
        total = subtotal + tax
        
        cursor.execute("""
            INSERT INTO supplier_invoices (
                company_id, supplier_id, invoice_number, invoice_date, due_date,
                currency_code, subtotal, tax_amount, total_amount,
                amount_outstanding, status, payment_status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, supplier_id, f"INV-{supplier_code}-{i+1:03d}", inv_date, due_date,
              'ZAR', round(subtotal, 2), round(tax, 2), round(total, 2),
              round(total, 2), 'POSTED', 'UNPAID', user_ids['admin']))
        
        invoice_id = cursor.lastrowid
        
        # Add invoice lines
        num_lines = random.randint(1, 4)
        for line_num in range(1, num_lines + 1):
            qty = random.randint(1, 20)
            price = random.uniform(100, 1000)
            line_total = qty * price
            line_tax = line_total * 0.15
            
            cursor.execute("""
                INSERT INTO supplier_invoice_lines (
                    invoice_id, line_number, description, quantity, unit_price,
                    line_total, tax_rate, tax_amount, account_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (invoice_id, line_num, f"Item {line_num}", qty, round(price, 2),
                  round(line_total, 2), 15.00, round(line_tax, 2), account_ids['5100']))
    
    print("✅ Created 10 supplier invoices with line items")
    
    # ==================================================================
    # 14. CUSTOMER INVOICES (For AR testing)
    # ==================================================================
    for i in range(15):
        days_ago = random.randint(1, 60)
        inv_date = datetime.now().date() - timedelta(days=days_ago)
        due_date = inv_date + timedelta(days=30)
        
        customer_code = random.choice(['CUS001', 'CUS002', 'CUS003', 'CUS004', 'CUS005', 'CUS006'])
        customer_id = customer_ids[customer_code]
        
        subtotal = random.uniform(10000, 100000)
        tax = subtotal * 0.15
        total = subtotal + tax
        
        # Some invoices are paid, some partial, some unpaid
        payment_status = random.choice(['PAID', 'PARTIAL', 'UNPAID', 'UNPAID', 'UNPAID'])
        if payment_status == 'PAID':
            amount_paid = total
            amount_outstanding = 0
        elif payment_status == 'PARTIAL':
            amount_paid = total * random.uniform(0.3, 0.7)
            amount_outstanding = total - amount_paid
        else:
            amount_paid = 0
            amount_outstanding = total
        
        cursor.execute("""
            INSERT INTO customer_invoices (
                company_id, customer_id, invoice_number, invoice_date, due_date,
                currency_code, subtotal, tax_amount, total_amount,
                amount_paid, amount_outstanding, status, payment_status,
                sent_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, customer_id, f"SI-{current_year}-{i+1:04d}", inv_date, due_date,
              'ZAR', round(subtotal, 2), round(tax, 2), round(total, 2),
              round(amount_paid, 2), round(amount_outstanding, 2), 'POSTED',
              payment_status, inv_date, user_ids['admin']))
        
        invoice_id = cursor.lastrowid
        
        # Add invoice lines
        num_lines = random.randint(1, 5)
        for line_num in range(1, num_lines + 1):
            product_sku = random.choice(['PROD-001', 'PROD-002', 'PROD-003'])
            product_data = [p for p in products_data if p[0] == product_sku][0]
            
            qty = random.randint(5, 50)
            price = product_data[7]  # selling_price (index 7, not 8)
            line_total = qty * price
            line_tax = line_total * 0.15
            
            cursor.execute("""
                INSERT INTO customer_invoice_lines (
                    invoice_id, line_number, description, quantity, unit_price,
                    line_total, tax_rate, tax_amount, account_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (invoice_id, line_num, product_data[1], qty, round(price, 2),
                  round(line_total, 2), 15.00, round(line_tax, 2), account_ids['4100']))
    
    print("✅ Created 15 customer invoices with line items")
    
    # ==================================================================
    # 15. LEADS & OPPORTUNITIES (For CRM testing)
    # ==================================================================
    for i in range(20):
        days_ago = random.randint(1, 90)
        created_date = datetime.now() - timedelta(days=days_ago)
        
        companies = ['TechCorp', 'BuildCo', 'RetailPlus', 'ManuFacture', 'ServicePro',
                    'IndustrialMax', 'CommercePro', 'TradeSolutions', 'BusinessHub', 'EnterpriseLtd']
        company_name = random.choice(companies) + f" {i+1}"
        
        status = random.choice(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'])
        score = random.randint(0, 100)
        
        cursor.execute("""
            INSERT INTO leads (
                company_id, lead_number, company_name, contact_name, email, phone,
                source, industry, revenue_estimate, lead_score, status,
                assigned_to, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, f"LEAD-{i+1:04d}", company_name, f"Contact {i+1}",
              f"contact{i+1}@{company_name.lower().replace(' ', '')}.com",
              f"+27 11 {random.randint(100, 999)} {random.randint(1000, 9999)}",
              random.choice(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'LINKEDIN']),
              random.choice(['Manufacturing', 'Retail', 'Services', 'Construction']),
              random.uniform(50000, 500000), score, status,
              user_ids['sales_manager'], user_ids['admin'], created_date))
    
    print("✅ Created 20 leads")
    
    # Create opportunities from some qualified leads
    for i in range(10):
        days_ago = random.randint(1, 60)
        created_date = datetime.now().date() - timedelta(days=days_ago)
        expected_close = created_date + timedelta(days=random.randint(30, 90))
        
        customer_code = random.choice(['CUS001', 'CUS002', 'CUS003', 'CUS004'])
        customer_id = customer_ids[customer_code]
        
        value = random.uniform(50000, 500000)
        probability = random.choice([25, 50, 75, 90])
        stage = random.choice(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'])
        
        cursor.execute("""
            INSERT INTO opportunities (
                company_id, opportunity_number, customer_id, name, description,
                value, probability, expected_close_date, stage, status,
                assigned_to, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, f"OPP-{i+1:04d}", customer_id, f"Opportunity {i+1}",
              f"Major deal for products and services", round(value, 2), probability,
              expected_close, stage, 'OPEN', user_ids['sales_manager'], user_ids['admin']))
    
    print("✅ Created 10 opportunities")
    
    # ==================================================================
    # 16. BOT CONFIGURATIONS
    # ==================================================================
    bots_config = [
        ('invoice_reconciliation', 'Invoice Reconciliation Bot', 1, 'SCHEDULED', '0 2 * * *'),
        ('bank_reconciliation', 'Bank Reconciliation Bot', 1, 'SCHEDULED', '0 3 * * *'),
        ('ap_automation', 'Accounts Payable Automation', 1, 'EVENT_DRIVEN', None),
        ('payroll_processing', 'Payroll Processing Bot', 0, 'MANUAL', None),
        ('bbbee_compliance', 'BBBEE Compliance Tracker', 1, 'SCHEDULED', '0 0 1 * *'),
    ]
    
    for bot_id, bot_name, enabled, sched_type, cron in bots_config:
        config_json = json.dumps({
            'auto_approve_threshold': 1000.00,
            'tolerance_percent': 2.0,
            'notification_email': 'finance@acme.co.za'
        })
        
        cursor.execute("""
            INSERT INTO bot_configurations (
                company_id, bot_id, bot_name, is_enabled, schedule_type,
                schedule_cron, configuration_json, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, bot_id, bot_name, enabled, sched_type, cron,
              config_json, user_ids['admin']))
    
    print("✅ Created 5 bot configurations")
    
    # ==================================================================
    # 17. BBBEE SCORECARD
    # ==================================================================
    cursor.execute("""
        INSERT INTO bbbee_scorecards (
            company_id, assessment_date, ownership_points, ownership_max,
            management_points, management_max, skills_points, skills_max,
            enterprise_points, enterprise_max, socioeconomic_points, socioeconomic_max,
            total_points, bbbee_level, certificate_issued_date, certificate_expiry_date,
            assessment_agency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (company_id, date(2024, 6, 1), 18.50, 25.00, 14.25, 19.00, 15.80, 20.00,
          30.50, 40.00, 4.00, 5.00, 83.05, 3, date(2024, 6, 1), date(2025, 6, 1),
          'BBB-EE Verification Agency'))
    
    print("✅ Created BBBEE scorecard")
    
    conn.commit()
    conn.close()
    
    print("\n✅ ================================")
    print("✅ SEED DATA COMPLETED SUCCESSFULLY")
    print("✅ ================================")
    print(f"\n📊 Summary:")
    print(f"  - 1 Company (Acme Manufacturing)")
    print(f"  - 5 Users (various roles)")
    print(f"  - 12 Fiscal Periods")
    print(f"  - {len(accounts)} Chart of Accounts")
    print(f"  - {len(suppliers)} Suppliers")
    print(f"  - {len(customers)} Customers")
    print(f"  - {len(employees_data)} Employees with Payroll")
    print(f"  - {len(leave_types_data)} Leave Types")
    print(f"  - {len(products_data)} Products")
    print(f"  - 1 Warehouse with Stock")
    print(f"  - 10 Supplier Invoices (AP)")
    print(f"  - 15 Customer Invoices (AR)")
    print(f"  - 20 Leads")
    print(f"  - 10 Opportunities")
    print(f"  - 5 Bot Configurations")
    print(f"  - 1 BBBEE Scorecard")
    print(f"\n🔐 Login Credentials:")
    print(f"  Email: admin@acme.co.za")
    print(f"  Password: Admin2025!")
    print(f"\n  Email: finance@acme.co.za")
    print(f"  Password: Finance2025!")
    print(f"\n  Email: demo@acme.co.za")
    print(f"  Password: Demo2025!")

if __name__ == "__main__":
    seed_data()
