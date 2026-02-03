"""
ARIA ERP - Comprehensive Demo Data Seeder
Seeds a South African demo company with 1 year of realistic data across all tables
"""

import os
import uuid
import random
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
import psycopg2
import psycopg2.extras

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL", "postgresql://aria_user:aria_password@localhost:5432/aria_erp")

DEMO_COMPANY = {
    "id": "5c8a3015-20c7-4be1-963e-e6cf656fb3c2",
    "name": "VantaX Demo Company",
    "registration_number": "2020/123456/07",
    "vat_number": "4123456789",
    "tax_number": "9876543210",
    "address": "123 Main Street, Sandton, Johannesburg, 2196",
    "phone": "+27 11 123 4567",
    "email": "info@vantaxdemo.co.za",
    "website": "https://vantaxdemo.co.za",
    "country": "South Africa",
    "currency": "ZAR",
    "fiscal_year_start": "03",
    "bbbee_level": 2
}

SA_PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"]
SA_CITIES = {
    "Gauteng": ["Johannesburg", "Pretoria", "Sandton", "Midrand", "Centurion"],
    "Western Cape": ["Cape Town", "Stellenbosch", "Paarl", "Somerset West"],
    "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Umhlanga", "Ballito"],
    "Eastern Cape": ["Port Elizabeth", "East London", "Grahamstown"],
    "Free State": ["Bloemfontein", "Welkom"],
    "Limpopo": ["Polokwane", "Tzaneen"],
    "Mpumalanga": ["Nelspruit", "Witbank"],
    "North West": ["Rustenburg", "Potchefstroom"],
    "Northern Cape": ["Kimberley", "Upington"]
}

SA_BANKS = ["Standard Bank", "FNB", "ABSA", "Nedbank", "Capitec", "Investec"]

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_uuid():
    return str(uuid.uuid4())

def random_date(start_date, end_date):
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

def random_amount(min_val, max_val):
    return Decimal(str(round(random.uniform(min_val, max_val), 2)))

def seed_company(cur):
    print("Seeding company...")
    cur.execute("""
        INSERT INTO companies (id, name, registration_number, vat_number, tax_number, 
                              address, phone, email, website, country, currency, 
                              fiscal_year_start, bbbee_level, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
        RETURNING id
    """, (
        DEMO_COMPANY["id"], DEMO_COMPANY["name"], DEMO_COMPANY["registration_number"],
        DEMO_COMPANY["vat_number"], DEMO_COMPANY["tax_number"], DEMO_COMPANY["address"],
        DEMO_COMPANY["phone"], DEMO_COMPANY["email"], DEMO_COMPANY["website"],
        DEMO_COMPANY["country"], DEMO_COMPANY["currency"], DEMO_COMPANY["fiscal_year_start"],
        DEMO_COMPANY["bbbee_level"]
    ))
    return DEMO_COMPANY["id"]

def seed_users(cur, company_id):
    print("Seeding users...")
    users = [
        {"email": "demo@vantax.co.za", "password": "Demo@2025", "first_name": "Demo", "last_name": "Admin", "role": "admin"},
        {"email": "admin@vantax.co.za", "password": "Admin@123", "first_name": "System", "last_name": "Administrator", "role": "admin"},
        {"email": "manager@vantax.co.za", "password": "Manager@123", "first_name": "Operations", "last_name": "Manager", "role": "manager"},
        {"email": "employee@vantax.co.za", "password": "Employee@123", "first_name": "Staff", "last_name": "Member", "role": "user"},
        {"email": "finance@vantax.co.za", "password": "Finance@2025", "first_name": "Finance", "last_name": "Manager", "role": "manager"},
        {"email": "hr@vantax.co.za", "password": "HR@2025", "first_name": "HR", "last_name": "Manager", "role": "manager"},
        {"email": "sales@vantax.co.za", "password": "Sales@2025", "first_name": "Sales", "last_name": "Representative", "role": "user"},
        {"email": "warehouse@vantax.co.za", "password": "Warehouse@2025", "first_name": "Warehouse", "last_name": "Supervisor", "role": "user"},
    ]
    
    user_ids = []
    for user in users:
        user_id = generate_uuid()
        cur.execute("""
            INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, true, NOW())
            ON CONFLICT (email) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = EXCLUDED.role
            RETURNING id
        """, (user_id, user["email"], hash_password(user["password"]), user["first_name"], user["last_name"], user["role"], company_id))
        result = cur.fetchone()
        user_ids.append(result[0] if result else user_id)
    
    return user_ids

def seed_customers(cur, company_id):
    print("Seeding customers...")
    customer_names = [
        "Shoprite Holdings", "Pick n Pay", "Woolworths SA", "Clicks Group", "Dis-Chem",
        "Massmart Holdings", "Spar Group", "Mr Price Group", "Truworths", "Foschini Group",
        "Bidvest Group", "Imperial Holdings", "Barloworld", "Nampak", "Sappi Limited",
        "Sasol Limited", "MTN Group", "Vodacom Group", "Telkom SA", "MultiChoice",
        "Discovery Limited", "Old Mutual", "Sanlam", "FirstRand", "Absa Group",
        "Nedbank Group", "Standard Bank", "Capitec Bank", "African Rainbow Minerals", "AngloGold Ashanti",
        "Gold Fields", "Sibanye Stillwater", "Impala Platinum", "Northam Platinum", "Kumba Iron Ore",
        "Exxaro Resources", "Thungela Resources", "Harmony Gold", "Pan African Resources", "DRDGold",
        "Aspen Pharmacare", "Netcare", "Life Healthcare", "Mediclinic", "Adcock Ingram",
        "Tiger Brands", "Pioneer Foods", "RCL Foods", "AVI Limited", "Distell Group"
    ]
    
    customer_ids = []
    for i, name in enumerate(customer_names):
        customer_id = generate_uuid()
        province = random.choice(SA_PROVINCES)
        city = random.choice(SA_CITIES[province])
        
        cur.execute("""
            INSERT INTO customers (id, company_id, customer_name, email, phone, address, city, province, 
                                  postal_code, country, vat_number, credit_limit, payment_terms,
                                  is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            customer_id, company_id, name, f"accounts@{name.lower().replace(' ', '')}.co.za",
            f"+27 {random.randint(10, 99)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            f"{random.randint(1, 999)} {random.choice(['Main', 'Church', 'Long', 'Voortrekker', 'Jan Smuts'])} Street",
            city, province, f"{random.randint(1000, 9999)}", "South Africa",
            f"4{random.randint(100000000, 999999999)}", random_amount(50000, 500000),
            random.choice([30, 60, 90])
        ))
        customer_ids.append(customer_id)
    
    return customer_ids

def seed_suppliers(cur, company_id):
    print("Seeding suppliers...")
    supplier_names = [
        "Makro SA", "Builders Warehouse", "Cashbuild", "Italtile", "Ceramic Industries",
        "PPC Limited", "Afrimat", "Raubex Group", "WBHO", "Murray Roberts",
        "Grindrod", "Transnet", "Prasa", "Eskom", "City Power",
        "Rand Water", "Johannesburg Water", "Telkom Business", "Dimension Data", "BCX",
        "Bytes Technology", "Altron", "Datatec", "EOH Holdings", "Adapt IT",
        "Mustek", "Rectron", "Pinnacle Holdings", "Alviva Holdings", "Reunert"
    ]
    
    supplier_ids = []
    for name in supplier_names:
        supplier_id = generate_uuid()
        province = random.choice(SA_PROVINCES)
        city = random.choice(SA_CITIES[province])
        
        cur.execute("""
            INSERT INTO suppliers (id, company_id, supplier_name, email, phone, address, city, province,
                                  postal_code, country, vat_number, payment_terms, bank_name,
                                  bank_account, bank_branch, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            supplier_id, company_id, name, f"sales@{name.lower().replace(' ', '')}.co.za",
            f"+27 {random.randint(10, 99)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            f"{random.randint(1, 999)} Industrial Road", city, province,
            f"{random.randint(1000, 9999)}", "South Africa",
            f"4{random.randint(100000000, 999999999)}", random.choice([30, 60, 90]),
            random.choice(SA_BANKS), f"{random.randint(1000000000, 9999999999)}",
            f"{random.randint(100000, 999999)}"
        ))
        supplier_ids.append(supplier_id)
    
    return supplier_ids

def seed_products(cur, company_id):
    print("Seeding products...")
    products_data = [
        ("Laptop Computer 15in", "Electronics", 15999.00, 12500.00),
        ("Desktop Computer", "Electronics", 12999.00, 10000.00),
        ("Monitor 27in 4K", "Electronics", 6999.00, 5500.00),
        ("Wireless Keyboard", "Electronics", 899.00, 650.00),
        ("Wireless Mouse", "Electronics", 499.00, 350.00),
        ("USB-C Hub", "Electronics", 1299.00, 900.00),
        ("External SSD 1TB", "Electronics", 2499.00, 1800.00),
        ("Webcam HD", "Electronics", 1499.00, 1100.00),
        ("Headset Wireless", "Electronics", 1999.00, 1500.00),
        ("Printer Laser", "Electronics", 4999.00, 3800.00),
        ("A4 Paper Ream", "Office Supplies", 89.00, 65.00),
        ("Ballpoint Pens Box", "Office Supplies", 45.00, 30.00),
        ("Stapler Heavy Duty", "Office Supplies", 199.00, 140.00),
        ("File Folders Pack", "Office Supplies", 129.00, 90.00),
        ("Whiteboard Markers", "Office Supplies", 79.00, 55.00),
        ("Desk Organizer", "Office Supplies", 249.00, 180.00),
        ("Calculator Scientific", "Office Supplies", 299.00, 220.00),
        ("Sticky Notes Pack", "Office Supplies", 59.00, 40.00),
        ("Binder Clips Box", "Office Supplies", 39.00, 25.00),
        ("Correction Tape", "Office Supplies", 29.00, 18.00),
        ("Power Drill", "Industrial Equipment", 2499.00, 1900.00),
        ("Angle Grinder", "Industrial Equipment", 1899.00, 1400.00),
        ("Welding Machine", "Industrial Equipment", 8999.00, 7000.00),
        ("Air Compressor", "Industrial Equipment", 5999.00, 4500.00),
        ("Generator 5kVA", "Industrial Equipment", 15999.00, 12000.00),
        ("Forklift Battery", "Industrial Equipment", 25999.00, 20000.00),
        ("Pallet Jack", "Industrial Equipment", 4999.00, 3800.00),
        ("Industrial Fan", "Industrial Equipment", 1999.00, 1500.00),
        ("Pressure Washer", "Industrial Equipment", 3999.00, 3000.00),
        ("Bench Grinder", "Industrial Equipment", 1499.00, 1100.00),
        ("Hard Hat", "Safety Equipment", 149.00, 100.00),
        ("Safety Glasses", "Safety Equipment", 89.00, 60.00),
        ("Safety Boots", "Safety Equipment", 699.00, 500.00),
        ("Hi-Vis Vest", "Safety Equipment", 129.00, 90.00),
        ("Ear Plugs Box", "Safety Equipment", 79.00, 55.00),
        ("Safety Gloves", "Safety Equipment", 99.00, 70.00),
        ("First Aid Kit", "Safety Equipment", 599.00, 450.00),
        ("Fire Extinguisher", "Safety Equipment", 899.00, 700.00),
        ("Safety Harness", "Safety Equipment", 1299.00, 1000.00),
        ("Respirator Mask", "Safety Equipment", 399.00, 300.00),
        ("Floor Cleaner 5L", "Cleaning Supplies", 149.00, 100.00),
        ("Disinfectant 5L", "Cleaning Supplies", 199.00, 140.00),
        ("Hand Sanitizer 5L", "Cleaning Supplies", 249.00, 180.00),
        ("Mop and Bucket", "Cleaning Supplies", 299.00, 220.00),
        ("Broom Industrial", "Cleaning Supplies", 149.00, 100.00),
        ("Dustpan Set", "Cleaning Supplies", 79.00, 55.00),
        ("Trash Bags Roll", "Cleaning Supplies", 129.00, 90.00),
        ("Paper Towels Case", "Cleaning Supplies", 399.00, 300.00),
        ("Toilet Paper Case", "Cleaning Supplies", 499.00, 380.00),
        ("Glass Cleaner 5L", "Cleaning Supplies", 129.00, 90.00),
        ("Network Switch 24-Port", "IT Hardware", 4999.00, 3800.00),
        ("WiFi Router Enterprise", "IT Hardware", 2999.00, 2300.00),
        ("Server Rack 42U", "IT Hardware", 12999.00, 10000.00),
        ("UPS 3000VA", "IT Hardware", 8999.00, 7000.00),
        ("Ethernet Cable Cat6 Box", "IT Hardware", 999.00, 750.00),
        ("Patch Panel 48-Port", "IT Hardware", 1999.00, 1500.00),
        ("Network Tester", "IT Hardware", 1499.00, 1100.00),
        ("Fiber Optic Cable", "IT Hardware", 2499.00, 1900.00),
        ("PoE Injector", "IT Hardware", 599.00, 450.00),
        ("Cable Management Kit", "IT Hardware", 399.00, 300.00),
        ("Office Desk", "Furniture", 3999.00, 3000.00),
        ("Office Chair Ergonomic", "Furniture", 4999.00, 3800.00),
        ("Filing Cabinet 4-Drawer", "Furniture", 2999.00, 2300.00),
        ("Bookshelf 5-Tier", "Furniture", 1999.00, 1500.00),
        ("Conference Table", "Furniture", 8999.00, 7000.00),
        ("Reception Desk", "Furniture", 6999.00, 5500.00),
        ("Visitor Chair", "Furniture", 1499.00, 1100.00),
        ("Whiteboard 2x1m", "Furniture", 1299.00, 1000.00),
        ("Notice Board", "Furniture", 599.00, 450.00),
        ("Coat Rack", "Furniture", 799.00, 600.00),
        ("Steel Sheet 2mm", "Raw Materials", 1999.00, 1500.00),
        ("Aluminum Bar", "Raw Materials", 899.00, 700.00),
        ("Copper Wire 100m", "Raw Materials", 2499.00, 1900.00),
        ("PVC Pipe 50mm", "Raw Materials", 299.00, 220.00),
        ("Cement Bag 50kg", "Raw Materials", 129.00, 95.00),
        ("Sand Ton", "Raw Materials", 599.00, 450.00),
        ("Gravel Ton", "Raw Materials", 499.00, 380.00),
        ("Timber 2x4", "Raw Materials", 149.00, 110.00),
        ("Plywood Sheet", "Raw Materials", 399.00, 300.00),
        ("Paint 20L", "Raw Materials", 899.00, 700.00),
    ]
    
    product_ids = []
    for name, category, price, cost in products_data:
        product_id = generate_uuid()
        sku = f"SKU-{random.randint(10000, 99999)}"
        
        cur.execute("""
            INSERT INTO products (id, company_id, product_name, sku, category, description, 
                                 unit_price, cost_price, reorder_level,
                                 is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            product_id, company_id, name, sku, category,
            f"High quality {name.lower()} for business use",
            Decimal(str(price)), Decimal(str(cost)),
            random.randint(5, 50)
        ))
        product_ids.append(product_id)
    
    return product_ids

def seed_bank_accounts(cur, company_id):
    print("Seeding bank accounts...")
    accounts = [
        ("Main Operating Account", "Standard Bank", "current", 1500000.00),
        ("Savings Account", "FNB", "savings", 500000.00),
        ("Petty Cash", "ABSA", "current", 25000.00),
        ("VAT Account", "Nedbank", "current", 150000.00),
    ]
    
    account_ids = []
    for name, bank, acc_type, balance in accounts:
        account_id = generate_uuid()
        cur.execute("""
            INSERT INTO bank_accounts (id, company_id, account_name, bank_name, account_number,
                                      branch_code, account_type, current_balance, is_active,
                                      created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            account_id, company_id, name, bank,
            f"{random.randint(1000000000, 9999999999)}",
            f"{random.randint(100000, 999999)}", acc_type, Decimal(str(balance))
        ))
        account_ids.append(account_id)
    
    return account_ids

def seed_gl_accounts(cur, company_id):
    print("Seeding chart of accounts...")
    accounts = [
        ("1000", "Cash and Cash Equivalents", "asset", "current_asset"),
        ("1100", "Accounts Receivable", "asset", "current_asset"),
        ("1200", "Inventory", "asset", "current_asset"),
        ("1300", "Prepaid Expenses", "asset", "current_asset"),
        ("1500", "Property Plant Equipment", "asset", "fixed_asset"),
        ("1600", "Accumulated Depreciation", "asset", "fixed_asset"),
        ("2000", "Accounts Payable", "liability", "current_liability"),
        ("2100", "Accrued Expenses", "liability", "current_liability"),
        ("2200", "VAT Payable", "liability", "current_liability"),
        ("2300", "PAYE Payable", "liability", "current_liability"),
        ("2400", "UIF Payable", "liability", "current_liability"),
        ("2500", "Long-term Debt", "liability", "long_term_liability"),
        ("3000", "Share Capital", "equity", "equity"),
        ("3100", "Retained Earnings", "equity", "equity"),
        ("3200", "Current Year Earnings", "equity", "equity"),
        ("4000", "Sales Revenue", "revenue", "operating_revenue"),
        ("4100", "Service Revenue", "revenue", "operating_revenue"),
        ("4200", "Interest Income", "revenue", "other_income"),
        ("4300", "Other Income", "revenue", "other_income"),
        ("5000", "Cost of Goods Sold", "expense", "cost_of_sales"),
        ("5100", "Salaries and Wages", "expense", "operating_expense"),
        ("5200", "Rent Expense", "expense", "operating_expense"),
        ("5300", "Utilities Expense", "expense", "operating_expense"),
        ("5400", "Insurance Expense", "expense", "operating_expense"),
        ("5500", "Depreciation Expense", "expense", "operating_expense"),
        ("5600", "Marketing Expense", "expense", "operating_expense"),
        ("5700", "Professional Fees", "expense", "operating_expense"),
        ("5800", "Office Supplies Expense", "expense", "operating_expense"),
        ("5900", "Bank Charges", "expense", "other_expense"),
    ]
    
    account_ids = []
    for code, name, acc_type, category in accounts:
        account_id = generate_uuid()
        cur.execute("""
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type,
                                          account_category, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (account_id, company_id, code, name, acc_type, category))
        account_ids.append(account_id)
    
    return account_ids

def seed_employees(cur, company_id):
    print("Seeding employees...")
    departments = ["Finance", "Sales", "Operations", "IT", "HR", "Warehouse", "Management"]
    positions = {
        "Finance": ["Financial Manager", "Accountant", "Bookkeeper", "Accounts Clerk"],
        "Sales": ["Sales Manager", "Sales Representative", "Account Executive"],
        "Operations": ["Operations Manager", "Operations Coordinator", "Quality Controller"],
        "IT": ["IT Manager", "System Administrator", "Developer", "Support Technician"],
        "HR": ["HR Manager", "HR Officer", "Recruitment Specialist"],
        "Warehouse": ["Warehouse Manager", "Stock Controller", "Picker Packer", "Forklift Operator"],
        "Management": ["CEO", "COO", "CFO", "Director"]
    }
    
    first_names = ["Thabo", "Sipho", "Nomvula", "Zanele", "Bongani", "Lerato", "Mandla", "Palesa",
                   "Kagiso", "Lindiwe", "Tshepo", "Nokuthula", "Sibusiso", "Ayanda", "Mpho",
                   "Nkosazana", "Themba", "Busisiwe", "Siyabonga", "Nonhlanhla", "Vusi", "Thandiwe",
                   "Jabulani", "Precious", "Lucky"]
    last_names = ["Nkosi", "Dlamini", "Ndlovu", "Zulu", "Mkhize", "Mokoena", "Molefe", "Khumalo",
                  "Sithole", "Ngcobo", "Mahlangu", "Maseko", "Radebe", "Mthembu", "Cele"]
    
    employee_ids = []
    for i in range(25):
        employee_id = generate_uuid()
        dept = random.choice(departments)
        position = random.choice(positions[dept])
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        
        birth_year = random.randint(1970, 2000)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        id_number = f"{birth_year % 100:02d}{birth_month:02d}{birth_day:02d}{random.randint(1000, 9999)}{random.randint(0, 1)}{random.randint(8, 9)}{random.randint(0, 9)}"
        
        hire_date = random_date(datetime(2020, 1, 1), datetime(2025, 12, 31))
        salary = random_amount(15000, 85000)
        
        cur.execute("""
            INSERT INTO employees (id, company_id, employee_number, employee_name,
                                  email, phone, department, job_title, hire_date,
                                  salary, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            employee_id, company_id, f"EMP{i+1:04d}", f"{first_name} {last_name}",
            f"{first_name.lower()}.{last_name.lower()}@vantaxdemo.co.za",
            f"+27 {random.randint(60, 84)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            dept, position, hire_date.date(), salary
        ))
        employee_ids.append(employee_id)
    
    return employee_ids

def seed_warehouses(cur, company_id):
    print("Seeding warehouses...")
    warehouses = [
        ("Main Warehouse", "Johannesburg", "Gauteng", "123 Industrial Road, Midrand"),
        ("Cape Town DC", "Cape Town", "Western Cape", "45 Harbour Road, Paarden Eiland"),
        ("Durban Depot", "Durban", "KwaZulu-Natal", "78 North Coast Road, Umhlanga"),
    ]
    
    warehouse_ids = []
    for name, city, province, address in warehouses:
        warehouse_id = generate_uuid()
        cur.execute("""
            INSERT INTO warehouses (id, company_id, warehouse_name, warehouse_code, address, city,
                                   is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, true, NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            warehouse_id, company_id, name, name[:3].upper(),
            address, city
        ))
        warehouse_ids.append(warehouse_id)
    
    return warehouse_ids

def seed_sales_orders(cur, company_id, customer_ids, product_ids):
    print("Seeding sales orders...")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    order_ids = []
    statuses = ["draft", "confirmed", "shipped", "delivered", "invoiced", "cancelled"]
    status_weights = [5, 10, 15, 30, 35, 5]
    
    for i in range(500):
        order_id = generate_uuid()
        order_date = random_date(start_date, end_date)
        customer_id = random.choice(customer_ids)
        status = random.choices(statuses, weights=status_weights)[0]
        
        num_lines = random.randint(1, 8)
        selected_products = random.sample(product_ids, min(num_lines, len(product_ids)))
        
        subtotal = Decimal("0")
        lines = []
        for j, product_id in enumerate(selected_products):
            quantity = random.randint(1, 20)
            cur.execute("SELECT unit_price FROM products WHERE id = %s", (product_id,))
            result = cur.fetchone()
            unit_price = result[0] if result else Decimal("100.00")
            line_total = unit_price * quantity
            subtotal += line_total
            lines.append((product_id, quantity, unit_price, line_total))
        
        vat_amount = subtotal * Decimal("0.15")
        total_amount = subtotal + vat_amount
        
        cur.execute("""
            INSERT INTO sales_orders (id, company_id, order_number, customer_id, order_date,
                                     status, subtotal, vat_amount, total_amount, 
                                     created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            order_id, company_id, f"SO-{order_date.year}-{i+1:05d}",
            customer_id, order_date.date(), status, subtotal, vat_amount, total_amount
        ))
        
        for j, (product_id, quantity, unit_price, line_total) in enumerate(lines):
            line_id = generate_uuid()
            cur.execute("""
                INSERT INTO sales_order_lines (id, sales_order_id, product_id, quantity,
                                              unit_price, line_total, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (id) DO NOTHING
            """, (line_id, order_id, product_id, quantity, unit_price, line_total))
        
        order_ids.append(order_id)
    
    return order_ids

def seed_purchase_orders(cur, company_id, supplier_ids, product_ids):
    print("Seeding purchase orders...")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    order_ids = []
    statuses = ["draft", "sent", "confirmed", "received", "invoiced", "cancelled"]
    status_weights = [5, 10, 15, 30, 35, 5]
    
    for i in range(300):
        order_id = generate_uuid()
        order_date = random_date(start_date, end_date)
        supplier_id = random.choice(supplier_ids)
        status = random.choices(statuses, weights=status_weights)[0]
        
        num_lines = random.randint(1, 6)
        selected_products = random.sample(product_ids, min(num_lines, len(product_ids)))
        
        subtotal = Decimal("0")
        lines = []
        for product_id in selected_products:
            quantity = random.randint(5, 100)
            cur.execute("SELECT cost_price FROM products WHERE id = %s", (product_id,))
            result = cur.fetchone()
            unit_price = result[0] if result else Decimal("80.00")
            line_total = unit_price * quantity
            subtotal += line_total
            lines.append((product_id, quantity, unit_price, line_total))
        
        vat_amount = subtotal * Decimal("0.15")
        total_amount = subtotal + vat_amount
        
        cur.execute("""
            INSERT INTO purchase_orders (id, company_id, po_number, supplier_id, order_date,
                                        status, subtotal, vat_amount, total_amount,
                                        created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            order_id, company_id, f"PO-{order_date.year}-{i+1:05d}",
            supplier_id, order_date.date(), status, subtotal, vat_amount, total_amount
        ))
        
        for product_id, quantity, unit_price, line_total in lines:
            line_id = generate_uuid()
            cur.execute("""
                INSERT INTO purchase_order_lines (id, purchase_order_id, product_id, quantity,
                                                 unit_price, line_total, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (id) DO NOTHING
            """, (line_id, order_id, product_id, quantity, unit_price, line_total))
        
        order_ids.append(order_id)
    
    return order_ids

def seed_ar_invoices(cur, company_id, customer_ids):
    print("Seeding AR invoices...")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    invoice_ids = []
    statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
    status_weights = [5, 15, 50, 25, 5]
    
    for i in range(400):
        invoice_id = generate_uuid()
        invoice_date = random_date(start_date, end_date)
        due_date = invoice_date + timedelta(days=random.choice([30, 60, 90]))
        customer_id = random.choice(customer_ids)
        status = random.choices(statuses, weights=status_weights)[0]
        
        subtotal = random_amount(1000, 150000)
        vat_amount = subtotal * Decimal("0.15")
        total_amount = subtotal + vat_amount
        
        status_map = {"draft": "open", "sent": "open", "paid": "paid", "overdue": "overdue", "cancelled": "cancelled"}
        db_status = status_map.get(status, "open")
        cur.execute("""
            INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, invoice_date,
                                          due_date, status, subtotal, vat_amount, total_amount,
                                          created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            invoice_id, company_id, f"INV-{invoice_date.year}-{i+1:05d}",
            customer_id, invoice_date.date(), due_date.date(), db_status,
            subtotal, vat_amount, total_amount
        ))
        invoice_ids.append(invoice_id)
    
    return invoice_ids

def seed_ap_invoices(cur, company_id, supplier_ids):
    print("Seeding AP invoices...")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    invoice_ids = []
    statuses = ["draft", "received", "approved", "paid", "overdue", "cancelled"]
    status_weights = [5, 10, 15, 45, 20, 5]
    
    for i in range(250):
        invoice_id = generate_uuid()
        invoice_date = random_date(start_date, end_date)
        due_date = invoice_date + timedelta(days=random.choice([30, 60, 90]))
        supplier_id = random.choice(supplier_ids)
        status = random.choices(statuses, weights=status_weights)[0]
        
        subtotal = random_amount(500, 100000)
        vat_amount = subtotal * Decimal("0.15")
        total_amount = subtotal + vat_amount
        
        status_map = {"draft": "pending", "received": "pending", "approved": "approved", "paid": "paid", "overdue": "overdue", "cancelled": "cancelled"}
        db_status = status_map.get(status, "pending")
        cur.execute("""
            INSERT INTO supplier_invoices (id, company_id, invoice_number, supplier_id, invoice_date,
                                          due_date, status, subtotal, vat_amount, total_amount,
                                          created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            invoice_id, company_id, f"APINV-{invoice_date.year}-{i+1:05d}",
            supplier_id, invoice_date.date(), due_date.date(), db_status,
            subtotal, vat_amount, total_amount
        ))
        invoice_ids.append(invoice_id)
    
    return invoice_ids

def seed_quotes(cur, company_id, customer_ids, product_ids):
    print("Seeding quotes...")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    quote_ids = []
    statuses = ["draft", "sent", "accepted", "rejected", "expired"]
    status_weights = [10, 20, 40, 20, 10]
    
    for i in range(200):
        quote_id = generate_uuid()
        quote_date = random_date(start_date, end_date)
        valid_until = quote_date + timedelta(days=30)
        customer_id = random.choice(customer_ids)
        status = random.choices(statuses, weights=status_weights)[0]
        
        subtotal = random_amount(5000, 200000)
        vat_amount = subtotal * Decimal("0.15")
        total_amount = subtotal + vat_amount
        
        cur.execute("""
            INSERT INTO quotes (id, company_id, quote_number, customer_id, quote_date,
                               valid_until, status, subtotal, vat_amount, total_amount,
                               created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            quote_id, company_id, f"QT-{quote_date.year}-{i+1:05d}",
            customer_id, quote_date.date(), valid_until.date(), status,
            subtotal, vat_amount, total_amount
        ))
        quote_ids.append(quote_id)
    
    return quote_ids

def seed_journal_entries(cur, company_id):
    print("Seeding journal entries...")
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    entry_ids = []
    descriptions = [
        "Monthly salary payment", "Rent payment", "Utility bill payment",
        "Sales revenue", "Purchase of inventory", "Bank charges",
        "Insurance premium", "Marketing expense", "Professional fees",
        "Depreciation entry", "VAT payment", "PAYE payment"
    ]
    
    for i in range(150):
        entry_id = generate_uuid()
        entry_date = random_date(start_date, end_date)
        description = random.choice(descriptions)
        amount = random_amount(1000, 50000)
        
        cur.execute("""
            INSERT INTO journal_entries (id, company_id, entry_number, entry_date,
                                        description, total_debit, total_credit, status,
                                        created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'posted', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            entry_id, company_id, f"JE-{entry_date.year}-{i+1:05d}",
            entry_date.date(), description, amount, amount
        ))
        entry_ids.append(entry_id)
    
    return entry_ids

def seed_payroll_runs(cur, company_id, employee_ids):
    print("Seeding payroll runs...")
    
    run_ids = []
    for month in range(1, 13):
        run_id = generate_uuid()
        run_date = datetime(2025, month, 25)
        
        total_gross = Decimal("0")
        total_net = Decimal("0")
        total_paye = Decimal("0")
        total_uif = Decimal("0")
        
        for emp_id in employee_ids:
            cur.execute("SELECT salary FROM employees WHERE id = %s", (emp_id,))
            result = cur.fetchone()
            salary = result[0] if result else Decimal("25000")
            
            paye = salary * Decimal("0.25")
            uif = salary * Decimal("0.01")
            net = salary - paye - uif
            
            total_gross += salary
            total_paye += paye
            total_uif += uif
            total_net += net
        
        total_deductions = total_paye + total_uif
        cur.execute("""
            INSERT INTO payroll_runs (id, company_id, pay_period_start, pay_period_end,
                                     payment_date, total_gross, total_deductions, total_net,
                                     employee_count, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'completed', NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            run_id, company_id,
            datetime(2025, month, 1).date(),
            datetime(2025, month, 28).date(),
            run_date.date(),
            total_gross, total_deductions, total_net, len(employee_ids)
        ))
        run_ids.append(run_id)
    
    return run_ids

def seed_leads(cur, company_id):
    print("Seeding leads...")
    
    lead_sources = ["Website", "Referral", "Trade Show", "Cold Call", "Social Media", "Advertisement"]
    statuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
    
    lead_ids = []
    for i in range(100):
        lead_id = generate_uuid()
        created_date = random_date(datetime(2025, 1, 1), datetime(2025, 12, 31))
        
        cur.execute("""
            INSERT INTO leads (id, company_id, lead_name, company_name,
                              email, phone, source, status, estimated_value,
                              created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            lead_id, company_id, f"Contact Person {i+1}",
            f"Prospect Company {i+1}",
            f"contact{i+1}@prospect{i+1}.co.za",
            f"+27 {random.randint(60, 84)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            random.choice(lead_sources), random.choice(statuses),
            random_amount(10000, 500000), created_date
        ))
        lead_ids.append(lead_id)
    
    return lead_ids

def seed_opportunities(cur, company_id, customer_ids):
    print("Seeding opportunities...")
    
    stages = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]
    stage_weights = [15, 20, 25, 20, 15, 5]
    
    opp_ids = []
    for i in range(80):
        opp_id = generate_uuid()
        created_date = random_date(datetime(2025, 1, 1), datetime(2025, 12, 31))
        close_date = created_date + timedelta(days=random.randint(30, 180))
        
        cur.execute("""
            INSERT INTO opportunities (id, company_id, opportunity_name, customer_id,
                                      stage, status, probability, estimated_value, expected_close_date,
                                      created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            opp_id, company_id, f"Opportunity {i+1}",
            random.choice(customer_ids),
            random.choices(stages, weights=stage_weights)[0],
            "open", random.randint(10, 90), random_amount(50000, 1000000),
            close_date.date(), created_date
        ))
        opp_ids.append(opp_id)
    
    return opp_ids

def seed_work_orders(cur, company_id, product_ids):
    print("Seeding work orders...")
    
    statuses = ["planned", "in_progress", "completed", "cancelled"]
    status_weights = [20, 30, 45, 5]
    
    wo_ids = []
    for i in range(60):
        wo_id = generate_uuid()
        start_date = random_date(datetime(2025, 1, 1), datetime(2025, 12, 31))
        due_date = start_date + timedelta(days=random.randint(7, 30))
        
        cur.execute("""
            INSERT INTO work_orders (id, company_id, work_order_number, product_id, quantity,
                                    status, priority, start_date, due_date,
                                    created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            wo_id, company_id, f"WO-{i+1:05d}",
            random.choice(product_ids), random.randint(10, 500),
            random.choices(statuses, weights=status_weights)[0],
            random.choice(["low", "medium", "high"]),
            start_date.date(), due_date.date()
        ))
        wo_ids.append(wo_id)
    
    return wo_ids

def seed_bank_transactions(cur, company_id, bank_account_ids):
    print("Seeding bank transactions...")
    
    transaction_types = ["deposit", "withdrawal", "transfer", "payment", "receipt"]
    
    txn_ids = []
    for i in range(500):
        txn_id = generate_uuid()
        txn_date = random_date(datetime(2025, 1, 1), datetime(2025, 12, 31))
        txn_type = random.choice(transaction_types)
        amount = random_amount(100, 50000)
        
        if txn_type in ["withdrawal", "payment"]:
            amount = -amount
        
        cur.execute("""
            INSERT INTO bank_transactions (id, company_id, bank_account_id, transaction_date,
                                          transaction_type, amount, description, reference,
                                          is_reconciled, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            txn_id, company_id, random.choice(bank_account_ids),
            txn_date.date(), txn_type, amount,
            f"{txn_type.title()} - {txn_date.strftime('%Y-%m-%d')}",
            f"REF-{random.randint(100000, 999999)}",
            random.choice([True, True, True, False])
        ))
        txn_ids.append(txn_id)
    
    return txn_ids

def main():
    print("=" * 60)
    print("ARIA ERP - Comprehensive Demo Data Seeder")
    print("=" * 60)
    print(f"Database: {DATABASE_URL}")
    print(f"Company: {DEMO_COMPANY['name']}")
    print("=" * 60)
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        company_id = seed_company(cur)
        user_ids = seed_users(cur, company_id)
        customer_ids = seed_customers(cur, company_id)
        supplier_ids = seed_suppliers(cur, company_id)
        product_ids = seed_products(cur, company_id)
        bank_account_ids = seed_bank_accounts(cur, company_id)
        gl_account_ids = seed_gl_accounts(cur, company_id)
        employee_ids = seed_employees(cur, company_id)
        warehouse_ids = seed_warehouses(cur, company_id)
        
        sales_order_ids = seed_sales_orders(cur, company_id, customer_ids, product_ids)
        purchase_order_ids = seed_purchase_orders(cur, company_id, supplier_ids, product_ids)
        ar_invoice_ids = seed_ar_invoices(cur, company_id, customer_ids)
        ap_invoice_ids = seed_ap_invoices(cur, company_id, supplier_ids)
        quote_ids = seed_quotes(cur, company_id, customer_ids, product_ids)
        journal_entry_ids = seed_journal_entries(cur, company_id)
        payroll_run_ids = seed_payroll_runs(cur, company_id, employee_ids)
        lead_ids = seed_leads(cur, company_id)
        opportunity_ids = seed_opportunities(cur, company_id, customer_ids)
        work_order_ids = seed_work_orders(cur, company_id, product_ids)
        bank_txn_ids = seed_bank_transactions(cur, company_id, bank_account_ids)
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("SEEDING COMPLETE!")
        print("=" * 60)
        print(f"Company: {DEMO_COMPANY['name']}")
        print(f"Users: {len(user_ids)}")
        print(f"Customers: {len(customer_ids)}")
        print(f"Suppliers: {len(supplier_ids)}")
        print(f"Products: {len(product_ids)}")
        print(f"Bank Accounts: {len(bank_account_ids)}")
        print(f"GL Accounts: {len(gl_account_ids)}")
        print(f"Employees: {len(employee_ids)}")
        print(f"Warehouses: {len(warehouse_ids)}")
        print(f"Sales Orders: {len(sales_order_ids)}")
        print(f"Purchase Orders: {len(purchase_order_ids)}")
        print(f"AR Invoices: {len(ar_invoice_ids)}")
        print(f"AP Invoices: {len(ap_invoice_ids)}")
        print(f"Quotes: {len(quote_ids)}")
        print(f"Journal Entries: {len(journal_entry_ids)}")
        print(f"Payroll Runs: {len(payroll_run_ids)}")
        print(f"Leads: {len(lead_ids)}")
        print(f"Opportunities: {len(opportunity_ids)}")
        print(f"Work Orders: {len(work_order_ids)}")
        print(f"Bank Transactions: {len(bank_txn_ids)}")
        print("=" * 60)
        
    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
