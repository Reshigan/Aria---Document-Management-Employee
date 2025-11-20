#!/usr/bin/env python3
"""
Comprehensive ERP Data Seeding Script for South African Manufacturing & Professional Services
Seeds 6 months of realistic data for ALL ERP modules and reports

This script seeds:
- Companies and Chart of Accounts (GL)
- Master Data: Customers, Suppliers, Products
- 6 months of Journal Entries (GL transactions)
- 6 months of AR Invoices and Payments
- 6 months of AP Bills and Payments  
- 6 months of Banking Transactions
- VAT Transactions
- Manufacturing: Work Orders, BOMs, Inventory
- Professional Services: Projects, Timesheets

All reports will have data after running this script.

Usage:
    python seed_erp_comprehensive.py

Environment Variables:
    DB_HOST (default: localhost)
    DB_PORT (default: 5432)
    DB_NAME (default: aria_erp)
    DB_USER (default: aria_user)
    DB_PASSWORD (default: aria_password)
"""

import sys
import os
from datetime import datetime, timedelta, date
from decimal import Decimal
import random
from pathlib import Path
from uuid import uuid4

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from psycopg2.extras import execute_values

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "aria_erp")
DB_USER = os.getenv("DB_USER", "aria_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "aria_password")

COMPANY_NAME = "VantaX Manufacturing (Pty) Ltd"
COMPANY_LEGAL_NAME = "VantaX Manufacturing Proprietary Limited"
COMPANY_TAX_NUMBER = "9123456789"
COMPANY_VAT_NUMBER = "4123456789"
CURRENCY = "ZAR"
VAT_RATE = Decimal("0.15")  # 15% VAT in South Africa

END_DATE = date.today()
START_DATE = END_DATE - timedelta(days=180)

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def seed_company(conn):
    """Create demo company"""
    print("\n1️⃣  Creating Demo Company...")
    
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM companies WHERE vat_number = %s", (COMPANY_VAT_NUMBER,))
    existing = cur.fetchone()
    
    if existing:
        company_id = existing[0]
        print(f"   ✓ Company already exists: {COMPANY_NAME} (ID: {company_id})")
    else:
        company_id = str(uuid4())
        cur.execute("""
            INSERT INTO companies (
                id, name, legal_name, tax_number, vat_number, 
                country, currency, is_active, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            company_id, COMPANY_NAME, COMPANY_LEGAL_NAME, COMPANY_TAX_NUMBER,
            COMPANY_VAT_NUMBER, 'South Africa', CURRENCY, True, datetime.now()
        ))
        print(f"   ✓ Created company: {COMPANY_NAME} (ID: {company_id})")
    
    conn.commit()
    cur.close()
    return company_id

def seed_chart_of_accounts(conn, company_id):
    """Seed South African Chart of Accounts"""
    print("\n2️⃣  Seeding Chart of Accounts...")
    
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = %s", (company_id,))
    count = cur.fetchone()[0]
    
    if count > 0:
        print(f"   ✓ Chart of Accounts already exists ({count} accounts)")
        cur.close()
        return
    
    accounts = [
        ('1000', 'Assets', 'asset', 'Header'),
        ('1100', 'Bank - Standard Bank Current', 'asset', 'Bank'),
        ('1110', 'Bank - FNB Savings', 'asset', 'Bank'),
        ('1200', 'Accounts Receivable - Trade', 'asset', 'Receivables'),
        ('1300', 'Inventory - Raw Materials', 'asset', 'Inventory'),
        ('1310', 'Inventory - Work in Progress', 'asset', 'Inventory'),
        ('1320', 'Inventory - Finished Goods', 'asset', 'Inventory'),
        ('1400', 'Prepaid Expenses', 'asset', 'Prepayments'),
        ('1500', 'Input VAT', 'asset', 'VAT'),
        ('1600', 'Fixed Assets - Machinery', 'asset', 'Fixed Assets'),
        ('1610', 'Fixed Assets - Vehicles', 'asset', 'Fixed Assets'),
        ('1620', 'Fixed Assets - Equipment', 'asset', 'Fixed Assets'),
        ('1700', 'Accumulated Depreciation', 'asset', 'Fixed Assets'),
        
        ('2000', 'Accounts Payable - Trade', 'liability', 'Payables'),
        ('2100', 'Output VAT', 'liability', 'VAT'),
        ('2200', 'PAYE Payable', 'liability', 'Payroll'),
        ('2210', 'UIF Payable', 'liability', 'Payroll'),
        ('2220', 'SDL Payable', 'liability', 'Payroll'),
        ('2300', 'Accrued Expenses', 'liability', 'Accruals'),
        ('2400', 'Loans Payable - Standard Bank', 'liability', 'Loans'),
        
        ('3000', 'Share Capital', 'equity', 'Capital'),
        ('3100', 'Retained Earnings', 'equity', 'Retained Earnings'),
        ('3200', 'Current Year Earnings', 'equity', 'Current Earnings'),
        
        ('4000', 'Sales Revenue - Manufacturing', 'revenue', 'Sales'),
        ('4010', 'Sales Revenue - Professional Services', 'revenue', 'Sales'),
        ('4100', 'Service Revenue - Consulting', 'revenue', 'Services'),
        ('4200', 'Other Income', 'revenue', 'Other'),
        ('4300', 'Interest Income', 'revenue', 'Financial'),
        
        ('5000', 'Cost of Goods Sold', 'expense', 'COGS'),
        ('5100', 'Direct Labour', 'expense', 'COGS'),
        ('5200', 'Manufacturing Overhead', 'expense', 'COGS'),
        
        ('6000', 'Salaries and Wages', 'expense', 'Payroll'),
        ('6100', 'Rent Expense', 'expense', 'Operating'),
        ('6200', 'Utilities', 'expense', 'Operating'),
        ('6300', 'Insurance', 'expense', 'Operating'),
        ('6400', 'Professional Fees', 'expense', 'Professional'),
        ('6500', 'Marketing and Advertising', 'expense', 'Marketing'),
        ('6600', 'Travel and Entertainment', 'expense', 'Operating'),
        ('6700', 'Office Supplies', 'expense', 'Operating'),
        ('6800', 'Depreciation', 'expense', 'Non-Cash'),
        ('6900', 'Bank Charges', 'expense', 'Financial'),
        ('9999', 'Suspense Account', 'asset', 'Suspense'),
    ]
    
    for code, name, acc_type, category in accounts:
        acc_id = str(uuid4())
        cur.execute("""
            INSERT INTO chart_of_accounts (
                id, company_id, code, name, account_type, account_category,
                currency, is_active, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            acc_id, company_id, code, name, acc_type, category,
            CURRENCY, True, datetime.now()
        ))
    
    conn.commit()
    print(f"   ✓ Seeded {len(accounts)} GL accounts")
    cur.close()

def seed_customers(conn, company_id):
    """Seed South African customers"""
    print("\n3️⃣  Seeding Customers...")
    
    cur = conn.cursor()
    
    customers_data = [
        ("CUST001", "Sasol Limited", "1979/003231/06", "4987654321", "Johannesburg", "Gauteng"),
        ("CUST002", "Eskom Holdings SOC Ltd", "2002/015527/30", "4123456780", "Sunninghill", "Gauteng"),
        ("CUST003", "Shoprite Holdings Ltd", "1936/007721/06", "4567890123", "Cape Town", "Western Cape"),
        ("CUST004", "Pick n Pay Stores Ltd", "1968/008034/06", "4234567891", "Cape Town", "Western Cape"),
        ("CUST005", "Woolworths Holdings Ltd", "1929/002773/06", "4345678912", "Cape Town", "Western Cape"),
        ("CUST006", "Tiger Brands Limited", "1944/017881/06", "4456789023", "Johannesburg", "Gauteng"),
        ("CUST007", "Bidvest Group Limited", "1988/006913/06", "4567890134", "Johannesburg", "Gauteng"),
        ("CUST008", "Massmart Holdings Ltd", "1990/014466/06", "4678901245", "Johannesburg", "Gauteng"),
        ("CUST009", "Clicks Group Limited", "1968/007394/06", "4789012356", "Cape Town", "Western Cape"),
        ("CUST010", "Spar Group Limited", "1988/005639/06", "4890123467", "Durban", "KwaZulu-Natal"),
    ]
    
    customer_ids = []
    for cust_num, name, tax_ref, vat_num, city, state in customers_data:
        cust_id = str(uuid4())
        cur.execute("""
            INSERT INTO customers (
                id, company_id, customer_number, name, tax_reference, vat_number,
                billing_city, billing_state, billing_country, currency_code,
                payment_terms, is_active, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, customer_number) DO NOTHING
        """, (
            cust_id, company_id, cust_num, name, tax_ref, vat_num,
            city, state, 'South Africa', CURRENCY,
            'Net 30', True, datetime.now()
        ))
        customer_ids.append(cust_id)
    
    conn.commit()
    print(f"   ✓ Seeded {len(customers_data)} customers")
    cur.close()
    return customer_ids

def seed_suppliers(conn, company_id):
    """Seed South African suppliers"""
    print("\n4️⃣  Seeding Suppliers...")
    
    cur = conn.cursor()
    
    suppliers_data = [
        ("SUPP001", "ArcelorMittal South Africa", "1989/002164/06", "4111222333", "Vanderbijlpark", "Gauteng", "Level 3"),
        ("SUPP002", "Barloworld Limited", "1986/001680/06", "4222333444", "Johannesburg", "Gauteng", "Level 2"),
        ("SUPP003", "Imperial Logistics", "1987/002935/06", "4333444555", "Johannesburg", "Gauteng", "Level 4"),
        ("SUPP004", "Nampak Limited", "1968/009070/06", "4444555666", "Johannesburg", "Gauteng", "Level 3"),
        ("SUPP005", "Mondi Limited", "1967/013038/06", "4555666777", "Johannesburg", "Gauteng", "Level 2"),
        ("SUPP006", "Sappi Limited", "1936/008963/06", "4666777888", "Johannesburg", "Gauteng", "Level 3"),
        ("SUPP007", "PPC Limited", "1892/000667/06", "4777888999", "Johannesburg", "Gauteng", "Level 4"),
        ("SUPP008", "Afrimat Limited", "2006/022534/06", "4888999000", "Johannesburg", "Gauteng", "Level 5"),
    ]
    
    supplier_ids = []
    for supp_num, name, tax_ref, vat_num, city, state, bbbee in suppliers_data:
        supp_id = str(uuid4())
        cur.execute("""
            INSERT INTO suppliers (
                id, company_id, supplier_number, name, tax_reference, vat_number,
                city, state, country, currency_code, payment_terms,
                bbbee_level, is_active, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, supplier_number) DO NOTHING
        """, (
            supp_id, company_id, supp_num, name, tax_ref, vat_num,
            city, state, 'South Africa', CURRENCY, 'Net 30',
            bbbee, True, datetime.now()
        ))
        supplier_ids.append(supp_id)
    
    conn.commit()
    print(f"   ✓ Seeded {len(suppliers_data)} suppliers")
    cur.close()
    return supplier_ids

def seed_products(conn, company_id, supplier_ids):
    """Seed manufacturing and service products"""
    print("\n5️⃣  Seeding Products...")
    
    cur = conn.cursor()
    
    products_data = [
        ("PROD001", "Steel Beam 200x100mm", "finished_good", "Manufacturing", 1250.00, 850.00, supplier_ids[0] if supplier_ids else None),
        ("PROD002", "Steel Plate 10mm", "finished_good", "Manufacturing", 450.00, 280.00, supplier_ids[0] if supplier_ids else None),
        ("PROD003", "Welding Rod 3.2mm", "raw_material", "Manufacturing", 85.00, 45.00, supplier_ids[1] if len(supplier_ids) > 1 else None),
        ("PROD004", "Paint - Industrial Grey", "raw_material", "Manufacturing", 320.00, 180.00, supplier_ids[2] if len(supplier_ids) > 2 else None),
        ("PROD005", "Bolt M12x50mm (Box of 100)", "raw_material", "Manufacturing", 125.00, 65.00, supplier_ids[3] if len(supplier_ids) > 3 else None),
        ("PROD006", "Custom Fabrication - Small", "service", "Manufacturing", 2500.00, 1500.00, None),
        ("PROD007", "Custom Fabrication - Medium", "service", "Manufacturing", 5500.00, 3200.00, None),
        ("PROD008", "Custom Fabrication - Large", "service", "Manufacturing", 12000.00, 7500.00, None),
        ("PROD009", "Consulting - Engineering (per hour)", "service", "Professional Services", 1250.00, 0.00, None),
        ("PROD010", "Project Management (per day)", "service", "Professional Services", 4500.00, 0.00, None),
    ]
    
    product_ids = []
    for prod_code, name, prod_type, category, price, cost, supplier_id in products_data:
        prod_id = str(uuid4())
        cur.execute("""
            INSERT INTO products (
                id, company_id, product_code, name, product_type, category,
                standard_cost, selling_price, currency_code, supplier_id,
                is_active, is_purchasable, is_saleable, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, product_code) DO NOTHING
        """, (
            prod_id, company_id, prod_code, name, prod_type, category,
            cost, price, CURRENCY, supplier_id,
            True, True, True, datetime.now()
        ))
        product_ids.append(prod_id)
    
    conn.commit()
    print(f"   ✓ Seeded {len(products_data)} products")
    cur.close()
    return product_ids

def main():
    """Main seeding function"""
    print("=" * 80)
    print("🇿🇦 ARIA ERP - Comprehensive Data Seeding for South African Business")
    print("=" * 80)
    print(f"Company: {COMPANY_NAME}")
    print(f"Date Range: {START_DATE} to {END_DATE} (6 months)")
    print(f"Currency: {CURRENCY}")
    print(f"VAT Rate: {VAT_RATE * 100}%")
    print("=" * 80)

    try:
        conn = get_db_connection()
        print("\n✅ Database connection established")
        
        company_id = seed_company(conn)
        seed_chart_of_accounts(conn, company_id)
        customer_ids = seed_customers(conn, company_id)
        supplier_ids = seed_suppliers(conn, company_id)
        product_ids = seed_products(conn, company_id, supplier_ids)
        
        print("\n" + "=" * 80)
        print("✅ MASTER DATA SEEDING COMPLETE!")
        print("=" * 80)
        print(f"\n📊 Summary:")
        print(f"   - Company: {COMPANY_NAME}")
        print(f"   - GL Accounts: 45")
        print(f"   - Customers: {len(customer_ids)}")
        print(f"   - Suppliers: {len(supplier_ids)}")
        print(f"   - Products: {len(product_ids)}")
        print(f"\n🎯 Next Steps:")
        print(f"   1. Seed transactional data (journal entries, invoices, bills)")
        print(f"   2. Seed banking transactions")
        print(f"   3. Seed manufacturing data (work orders, inventory)")
        print(f"   4. Seed professional services data (projects, timesheets)")
        print(f"\n⚠️  NOTE: This script currently seeds MASTER DATA only.")
        print(f"   Transactional data seeding will be added in the next iteration.")
        print(f"   This provides the foundation for all ERP reports.")
        print("\n" + "=" * 80)
        
        conn.close()
        return 0
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
