"""
Seed Standard South African Chart of Accounts
IFRS/GAAP compliant with SA tax accounts
"""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.accounting import ChartOfAccounts, AccountType, AccountSubType
from models.base import Base

STANDARD_ACCOUNTS = [
    {"code": "1000", "name": "Bank Account", "type": AccountType.ASSET, "subtype": AccountSubType.BANK, "system": True},
    {"code": "1100", "name": "Accounts Receivable", "type": AccountType.ASSET, "subtype": AccountSubType.ACCOUNTS_RECEIVABLE, "system": True, "control": True},
    {"code": "1200", "name": "Inventory", "type": AccountType.ASSET, "subtype": AccountSubType.INVENTORY, "system": True},
    {"code": "1300", "name": "VAT Input", "type": AccountType.ASSET, "subtype": AccountSubType.CURRENT_ASSET, "system": True, "tax": True, "vat_rate": 15.0},
    {"code": "1400", "name": "Work in Progress (WIP)", "type": AccountType.ASSET, "subtype": AccountSubType.INVENTORY, "system": True},
    {"code": "1500", "name": "Fixed Assets", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "system": True},
    {"code": "1510", "name": "Accumulated Depreciation", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "system": True},
    {"code": "1600", "name": "Prepayments", "type": AccountType.ASSET, "subtype": AccountSubType.PREPAYMENTS, "system": False},
    
    {"code": "2000", "name": "Accounts Payable", "type": AccountType.LIABILITY, "subtype": AccountSubType.ACCOUNTS_PAYABLE, "system": True, "control": True},
    {"code": "2100", "name": "VAT Output", "type": AccountType.LIABILITY, "subtype": AccountSubType.VAT_PAYABLE, "system": True, "tax": True, "vat_rate": 15.0},
    {"code": "2200", "name": "Goods Received Not Invoiced (GRNI)", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "system": True},
    {"code": "2300", "name": "Net Pay Liability", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "system": True},
    {"code": "2310", "name": "PAYE Liability", "type": AccountType.LIABILITY, "subtype": AccountSubType.PAYE_PAYABLE, "system": True, "tax": True},
    {"code": "2311", "name": "UIF Liability", "type": AccountType.LIABILITY, "subtype": AccountSubType.UIF_PAYABLE, "system": True, "tax": True},
    {"code": "2312", "name": "SDL Liability", "type": AccountType.LIABILITY, "subtype": AccountSubType.SDL_PAYABLE, "system": True, "tax": True},
    {"code": "2400", "name": "Accruals", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "system": False},
    
    {"code": "3000", "name": "Share Capital", "type": AccountType.EQUITY, "subtype": AccountSubType.CAPITAL, "system": True},
    {"code": "3100", "name": "Retained Earnings", "type": AccountType.EQUITY, "subtype": AccountSubType.RETAINED_EARNINGS, "system": True},
    {"code": "3200", "name": "Current Year Earnings", "type": AccountType.EQUITY, "subtype": AccountSubType.RETAINED_EARNINGS, "system": True},
    
    {"code": "4000", "name": "Sales Revenue", "type": AccountType.REVENUE, "subtype": AccountSubType.SALES, "system": False},
    {"code": "4100", "name": "Service Revenue", "type": AccountType.REVENUE, "subtype": AccountSubType.SERVICE_REVENUE, "system": False},
    {"code": "4200", "name": "Other Income", "type": AccountType.REVENUE, "subtype": AccountSubType.OTHER_INCOME, "system": False},
    
    {"code": "5000", "name": "Cost of Goods Sold (COGS)", "type": AccountType.EXPENSE, "subtype": AccountSubType.COST_OF_SALES, "system": True},
    {"code": "5100", "name": "Wage Expense", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "system": True},
    {"code": "5110", "name": "Employer PAYE", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "system": True},
    {"code": "5111", "name": "Employer UIF", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "system": True},
    {"code": "5112", "name": "Employer SDL", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "system": True},
    {"code": "5200", "name": "Depreciation Expense", "type": AccountType.EXPENSE, "subtype": AccountSubType.DEPRECIATION, "system": True},
    {"code": "5300", "name": "Operating Expenses", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "system": False},
    {"code": "5400", "name": "Marketing Expenses", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "system": False},
    {"code": "5500", "name": "Administrative Expenses", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "system": False},
]

def seed_chart_of_accounts(tenant_id: str = "default"):
    """Seed standard SA Chart of Accounts"""
    
    engine = create_engine('sqlite:///aria_erp_production.db')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        existing = session.query(ChartOfAccounts).filter_by(tenant_id=tenant_id).count()
        if existing > 0:
            print(f"Chart of Accounts already seeded for tenant '{tenant_id}' ({existing} accounts)")
            return
        
        created_count = 0
        for acc_data in STANDARD_ACCOUNTS:
            account = ChartOfAccounts(
                tenant_id=tenant_id,
                account_code=acc_data["code"],
                account_name=acc_data["name"],
                description=f"Standard SA account: {acc_data['name']}",
                account_type=acc_data["type"],
                account_subtype=acc_data["subtype"],
                is_system_account=acc_data.get("system", False),
                is_control_account=acc_data.get("control", False),
                is_tax_account=acc_data.get("tax", False),
                vat_rate=acc_data.get("vat_rate", 0.0),
                accepts_posting=True,
                is_active=True,
                level=1,
                created_by="system"
            )
            session.add(account)
            created_count += 1
        
        session.commit()
        print(f"✅ Successfully seeded {created_count} accounts for tenant '{tenant_id}'")
        
        print("\nChart of Accounts Summary:")
        print(f"  Assets:      {len([a for a in STANDARD_ACCOUNTS if a['type'] == AccountType.ASSET])} accounts")
        print(f"  Liabilities: {len([a for a in STANDARD_ACCOUNTS if a['type'] == AccountType.LIABILITY])} accounts")
        print(f"  Equity:      {len([a for a in STANDARD_ACCOUNTS if a['type'] == AccountType.EQUITY])} accounts")
        print(f"  Revenue:     {len([a for a in STANDARD_ACCOUNTS if a['type'] == AccountType.REVENUE])} accounts")
        print(f"  Expenses:    {len([a for a in STANDARD_ACCOUNTS if a['type'] == AccountType.EXPENSE])} accounts")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding Chart of Accounts: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    tenant_id = sys.argv[1] if len(sys.argv) > 1 else "default"
    seed_chart_of_accounts(tenant_id)
