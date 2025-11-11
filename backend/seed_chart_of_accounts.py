"""
Seed Standard South African Chart of Accounts
IFRS/GAAP compliant with SA tax accounts
"""

import sys
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
from enum import Enum

Base = declarative_base()

class AccountType(str, Enum):
    """Chart of Accounts Types"""
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

class AccountSubType(str, Enum):
    """Detailed Account Sub-types"""
    # Assets
    CURRENT_ASSET = "current_asset"
    FIXED_ASSET = "fixed_asset"
    INVENTORY = "inventory"
    ACCOUNTS_RECEIVABLE = "accounts_receivable"
    BANK = "bank"
    CASH = "cash"
    PREPAYMENTS = "prepayments"
    
    # Liabilities
    CURRENT_LIABILITY = "current_liability"
    LONG_TERM_LIABILITY = "long_term_liability"
    ACCOUNTS_PAYABLE = "accounts_payable"
    VAT_PAYABLE = "vat_payable"
    PAYE_PAYABLE = "paye_payable"
    UIF_PAYABLE = "uif_payable"
    SDL_PAYABLE = "sdl_payable"
    
    # Equity
    CAPITAL = "capital"
    RETAINED_EARNINGS = "retained_earnings"
    DRAWINGS = "drawings"
    
    # Revenue
    SALES = "sales"
    SERVICE_REVENUE = "service_revenue"
    OTHER_INCOME = "other_income"
    
    # Expenses
    COST_OF_SALES = "cost_of_sales"
    OPERATING_EXPENSE = "operating_expense"
    SALARY_EXPENSE = "salary_expense"
    DEPRECIATION = "depreciation"
    INTEREST_EXPENSE = "interest_expense"

class ChartOfAccounts(Base):
    """Chart of Accounts - SA Compliant"""
    __tablename__ = "chart_of_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    account_code = Column(String(20), nullable=False, index=True)
    account_name = Column(String(200), nullable=False)
    description = Column(Text)
    account_type = Column(SQLEnum(AccountType), nullable=False, index=True)
    account_subtype = Column(SQLEnum(AccountSubType), nullable=False)
    parent_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=True)
    level = Column(Integer, default=1)
    is_control_account = Column(Boolean, default=False)
    is_system_account = Column(Boolean, default=False)
    accepts_posting = Column(Boolean, default=True)
    is_tax_account = Column(Boolean, default=False)
    vat_rate = Column(Float, default=0.0)
    debit_balance = Column(Float, default=0.0)
    credit_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    sars_reporting_code = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))

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
