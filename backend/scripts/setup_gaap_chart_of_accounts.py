"""
Setup GAAP-Compliant Chart of Accounts
Creates a standard chart of accounts following US GAAP principles
"""
import asyncio
import asyncpg
import os
from uuid import uuid4
from datetime import datetime

CHART_OF_ACCOUNTS = [
    {"code": "1000", "name": "Cash and Cash Equivalents", "account_type": "asset", "category": "current_assets"},
    {"code": "1100", "name": "Petty Cash", "account_type": "asset", "category": "current_assets"},
    {"code": "1200", "name": "Accounts Receivable", "account_type": "asset", "category": "current_assets"},
    {"code": "1210", "name": "Allowance for Doubtful Accounts", "account_type": "asset", "category": "current_assets"},
    {"code": "1400", "name": "Inventory", "account_type": "asset", "category": "current_assets"},
    {"code": "1450", "name": "VAT Recoverable", "account_type": "asset", "category": "current_assets"},
    {"code": "1500", "name": "Prepaid Expenses", "account_type": "asset", "category": "current_assets"},
    {"code": "1600", "name": "Property, Plant & Equipment", "account_type": "asset", "category": "fixed_assets"},
    {"code": "1610", "name": "Accumulated Depreciation - PPE", "account_type": "asset", "category": "fixed_assets"},
    {"code": "1700", "name": "Intangible Assets", "account_type": "asset", "category": "fixed_assets"},
    {"code": "1710", "name": "Accumulated Amortization", "account_type": "asset", "category": "fixed_assets"},
    
    {"code": "2000", "name": "Accounts Payable", "account_type": "liability", "category": "current_liabilities"},
    {"code": "2100", "name": "GR/IR Clearing Account", "account_type": "liability", "category": "current_liabilities"},
    {"code": "2200", "name": "VAT Payable", "account_type": "liability", "category": "current_liabilities"},
    {"code": "2300", "name": "Accrued Expenses", "account_type": "liability", "category": "current_liabilities"},
    {"code": "2400", "name": "Short-term Loans", "account_type": "liability", "category": "current_liabilities"},
    {"code": "2500", "name": "Payroll Liabilities", "account_type": "liability", "category": "current_liabilities"},
    {"code": "2600", "name": "Long-term Debt", "account_type": "liability", "category": "long_term_liabilities"},
    
    {"code": "3000", "name": "Common Stock", "account_type": "equity", "category": "equity"},
    {"code": "3100", "name": "Retained Earnings", "account_type": "equity", "category": "equity"},
    {"code": "3200", "name": "Current Year Earnings", "account_type": "equity", "category": "equity"},
    {"code": "3300", "name": "Dividends", "account_type": "equity", "category": "equity"},
    
    {"code": "4000", "name": "Sales Revenue", "account_type": "revenue", "category": "operating_revenue"},
    {"code": "4100", "name": "Service Revenue", "account_type": "revenue", "category": "operating_revenue"},
    {"code": "4200", "name": "Interest Income", "account_type": "revenue", "category": "other_revenue"},
    {"code": "4300", "name": "Other Income", "account_type": "revenue", "category": "other_revenue"},
    {"code": "4900", "name": "Sales Returns and Allowances", "account_type": "revenue", "category": "operating_revenue"},
    
    {"code": "5000", "name": "Cost of Goods Sold", "account_type": "expense", "category": "cost_of_sales"},
    {"code": "5100", "name": "Direct Labor", "account_type": "expense", "category": "cost_of_sales"},
    {"code": "5200", "name": "Manufacturing Overhead", "account_type": "expense", "category": "cost_of_sales"},
    {"code": "6000", "name": "Salaries and Wages", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6100", "name": "Employee Benefits", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6200", "name": "Rent Expense", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6300", "name": "Utilities", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6400", "name": "Office Supplies", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6500", "name": "Depreciation Expense", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6600", "name": "Amortization Expense", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6700", "name": "Marketing and Advertising", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6800", "name": "Professional Fees", "account_type": "expense", "category": "operating_expenses"},
    {"code": "6900", "name": "Insurance Expense", "account_type": "expense", "category": "operating_expenses"},
    {"code": "7000", "name": "Interest Expense", "account_type": "expense", "category": "other_expenses"},
    {"code": "7100", "name": "Bank Charges", "account_type": "expense", "category": "other_expenses"},
    {"code": "7200", "name": "Bad Debt Expense", "account_type": "expense", "category": "other_expenses"},
]


async def setup_chart_of_accounts():
    """Setup GAAP chart of accounts for all companies"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    try:
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
        companies = await conn.fetch("SELECT id, name FROM companies")
        print(f"📊 Found {len(companies)} companies")
        
        for company in companies:
            company_id = company['id']
            company_name = company['name']
            print(f"\n🏢 Setting up chart of accounts for: {company_name}")
            
            accounts_created = 0
            accounts_skipped = 0
            
            for account in CHART_OF_ACCOUNTS:
                existing = await conn.fetchrow(
                    """
                    SELECT id FROM chart_of_accounts 
                    WHERE code = $1 AND company_id = $2
                    """,
                    account['code'],
                    company_id
                )
                
                if existing:
                    accounts_skipped += 1
                    continue
                
                try:
                    await conn.execute(
                        """
                        INSERT INTO chart_of_accounts (
                            id, company_id, code, name, account_type, category,
                            is_active, current_balance, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (code) DO NOTHING
                        """,
                        str(uuid4()),
                        company_id,
                        account['code'],
                        account['name'],
                        account['account_type'],
                        account['category'],
                        True,
                        0.00,
                        datetime.now(),
                        datetime.now()
                    )
                    accounts_created += 1
                except Exception as e:
                    accounts_skipped += 1
            
            print(f"   ✅ Created {accounts_created} accounts")
            if accounts_skipped > 0:
                print(f"   ⏭️  Skipped {accounts_skipped} existing accounts")
        
        await conn.close()
        print("\n✅ Chart of accounts setup complete!")
        
    except Exception as e:
        print(f"❌ Error setting up chart of accounts: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(setup_chart_of_accounts())
