"""
Accounting Service - GL Posting, Trial Balance, Financial Statements
South African ERP
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from decimal import Decimal

from models.accounting import (
    ChartOfAccounts, GeneralLedger, GeneralLedgerLine, TaxRate, FiscalPeriod,
    AccountType, AccountSubType, JournalEntryType, JournalStatus
)
from models.transactions import Invoice, Bill, Payment, Customer, Supplier


class AccountingService:
    """
    Core Accounting Business Logic
    """
    
    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
    
    # ==================== CHART OF ACCOUNTS ====================
    
    def get_or_create_default_coa(self) -> List[ChartOfAccounts]:
        """
        Get or create default South African Chart of Accounts
        """
        # Check if COA exists
        existing = self.db.query(ChartOfAccounts).filter(
            ChartOfAccounts.tenant_id == self.tenant_id
        ).first()
        
        if existing:
            return self.get_chart_of_accounts()
        
        # Create default SA Chart of Accounts
        default_accounts = [
            # ===== ASSETS =====
            {"code": "1000", "name": "Assets", "type": AccountType.ASSET, "subtype": AccountSubType.CURRENT_ASSET, "level": 1, "accepts_posting": False, "is_system": True},
            
            # Current Assets
            {"code": "1100", "name": "Current Assets", "type": AccountType.ASSET, "subtype": AccountSubType.CURRENT_ASSET, "level": 2, "parent_code": "1000", "accepts_posting": False},
            {"code": "1110", "name": "Bank - Current Account", "type": AccountType.ASSET, "subtype": AccountSubType.BANK, "level": 3, "parent_code": "1100", "is_system": True},
            {"code": "1120", "name": "Bank - Savings Account", "type": AccountType.ASSET, "subtype": AccountSubType.BANK, "level": 3, "parent_code": "1100"},
            {"code": "1130", "name": "Petty Cash", "type": AccountType.ASSET, "subtype": AccountSubType.CASH, "level": 3, "parent_code": "1100"},
            {"code": "1200", "name": "Accounts Receivable", "type": AccountType.ASSET, "subtype": AccountSubType.ACCOUNTS_RECEIVABLE, "level": 3, "parent_code": "1100", "is_control": True, "is_system": True},
            {"code": "1300", "name": "Inventory", "type": AccountType.ASSET, "subtype": AccountSubType.INVENTORY, "level": 3, "parent_code": "1100", "is_system": True},
            {"code": "1400", "name": "VAT Input (Reclaimable)", "type": AccountType.ASSET, "subtype": AccountSubType.PREPAYMENTS, "level": 3, "parent_code": "1100", "is_tax": True, "vat_rate": 15.0, "sars_code": "VAT-INPUT"},
            
            # Fixed Assets
            {"code": "1500", "name": "Fixed Assets", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "level": 2, "parent_code": "1000", "accepts_posting": False},
            {"code": "1510", "name": "Property", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "level": 3, "parent_code": "1500"},
            {"code": "1520", "name": "Equipment", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "level": 3, "parent_code": "1500"},
            {"code": "1530", "name": "Vehicles", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "level": 3, "parent_code": "1500"},
            {"code": "1540", "name": "Accumulated Depreciation", "type": AccountType.ASSET, "subtype": AccountSubType.FIXED_ASSET, "level": 3, "parent_code": "1500"},
            
            # ===== LIABILITIES =====
            {"code": "2000", "name": "Liabilities", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "level": 1, "accepts_posting": False, "is_system": True},
            
            # Current Liabilities
            {"code": "2100", "name": "Current Liabilities", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "level": 2, "parent_code": "2000", "accepts_posting": False},
            {"code": "2110", "name": "Accounts Payable", "type": AccountType.LIABILITY, "subtype": AccountSubType.ACCOUNTS_PAYABLE, "level": 3, "parent_code": "2100", "is_control": True, "is_system": True},
            {"code": "2120", "name": "Credit Card", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "level": 3, "parent_code": "2100"},
            
            # Tax Liabilities (SA specific)
            {"code": "2200", "name": "Tax Liabilities", "type": AccountType.LIABILITY, "subtype": AccountSubType.CURRENT_LIABILITY, "level": 2, "parent_code": "2000", "accepts_posting": False},
            {"code": "2210", "name": "VAT Output (Payable)", "type": AccountType.LIABILITY, "subtype": AccountSubType.VAT_PAYABLE, "level": 3, "parent_code": "2200", "is_tax": True, "vat_rate": 15.0, "sars_code": "VAT-OUTPUT"},
            {"code": "2220", "name": "PAYE Payable", "type": AccountType.LIABILITY, "subtype": AccountSubType.PAYE_PAYABLE, "level": 3, "parent_code": "2200", "is_tax": True, "sars_code": "PAYE"},
            {"code": "2230", "name": "UIF Payable", "type": AccountType.LIABILITY, "subtype": AccountSubType.UIF_PAYABLE, "level": 3, "parent_code": "2200", "is_tax": True, "sars_code": "UIF"},
            {"code": "2240", "name": "SDL Payable", "type": AccountType.LIABILITY, "subtype": AccountSubType.SDL_PAYABLE, "level": 3, "parent_code": "2200", "is_tax": True, "sars_code": "SDL"},
            
            # Long-term Liabilities
            {"code": "2300", "name": "Long-term Liabilities", "type": AccountType.LIABILITY, "subtype": AccountSubType.LONG_TERM_LIABILITY, "level": 2, "parent_code": "2000", "accepts_posting": False},
            {"code": "2310", "name": "Bank Loan", "type": AccountType.LIABILITY, "subtype": AccountSubType.LONG_TERM_LIABILITY, "level": 3, "parent_code": "2300"},
            
            # ===== EQUITY =====
            {"code": "3000", "name": "Equity", "type": AccountType.EQUITY, "subtype": AccountSubType.CAPITAL, "level": 1, "accepts_posting": False, "is_system": True},
            {"code": "3100", "name": "Owner's Capital", "type": AccountType.EQUITY, "subtype": AccountSubType.CAPITAL, "level": 2, "parent_code": "3000"},
            {"code": "3200", "name": "Retained Earnings", "type": AccountType.EQUITY, "subtype": AccountSubType.RETAINED_EARNINGS, "level": 2, "parent_code": "3000", "is_system": True},
            {"code": "3300", "name": "Current Year Earnings", "type": AccountType.EQUITY, "subtype": AccountSubType.RETAINED_EARNINGS, "level": 2, "parent_code": "3000", "is_system": True},
            
            # ===== REVENUE =====
            {"code": "4000", "name": "Revenue", "type": AccountType.REVENUE, "subtype": AccountSubType.SALES, "level": 1, "accepts_posting": False, "is_system": True},
            {"code": "4100", "name": "Sales - Goods", "type": AccountType.REVENUE, "subtype": AccountSubType.SALES, "level": 2, "parent_code": "4000", "is_system": True},
            {"code": "4200", "name": "Sales - Services", "type": AccountType.REVENUE, "subtype": AccountSubType.SERVICE_REVENUE, "level": 2, "parent_code": "4000"},
            {"code": "4300", "name": "Other Income", "type": AccountType.REVENUE, "subtype": AccountSubType.OTHER_INCOME, "level": 2, "parent_code": "4000"},
            
            # ===== EXPENSES =====
            {"code": "5000", "name": "Cost of Sales", "type": AccountType.EXPENSE, "subtype": AccountSubType.COST_OF_SALES, "level": 1, "accepts_posting": False, "is_system": True},
            {"code": "5100", "name": "Cost of Goods Sold", "type": AccountType.EXPENSE, "subtype": AccountSubType.COST_OF_SALES, "level": 2, "parent_code": "5000", "is_system": True},
            
            {"code": "6000", "name": "Operating Expenses", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 1, "accepts_posting": False, "is_system": True},
            
            # Salary & Wages
            {"code": "6100", "name": "Salaries & Wages", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "level": 2, "parent_code": "6000", "is_system": True},
            {"code": "6110", "name": "Gross Salaries", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "level": 3, "parent_code": "6100", "is_system": True},
            {"code": "6120", "name": "UIF - Employer Contribution", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "level": 3, "parent_code": "6100", "is_system": True},
            {"code": "6130", "name": "SDL - Skills Development Levy", "type": AccountType.EXPENSE, "subtype": AccountSubType.SALARY_EXPENSE, "level": 3, "parent_code": "6100", "is_system": True},
            
            # Operating Expenses
            {"code": "6200", "name": "Rent", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6300", "name": "Utilities", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6400", "name": "Insurance", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6500", "name": "Marketing & Advertising", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6600", "name": "Travel & Entertainment", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6700", "name": "Professional Fees", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6800", "name": "Depreciation", "type": AccountType.EXPENSE, "subtype": AccountSubType.DEPRECIATION, "level": 2, "parent_code": "6000"},
            {"code": "6900", "name": "Bank Charges", "type": AccountType.EXPENSE, "subtype": AccountSubType.OPERATING_EXPENSE, "level": 2, "parent_code": "6000"},
            {"code": "6910", "name": "Interest Expense", "type": AccountType.EXPENSE, "subtype": AccountSubType.INTEREST_EXPENSE, "level": 2, "parent_code": "6000"},
        ]
        
        # Create parent lookup
        code_to_id = {}
        
        # First pass: create accounts without parent_id
        for acc_data in default_accounts:
            account = ChartOfAccounts(
                tenant_id=self.tenant_id,
                account_code=acc_data["code"],
                account_name=acc_data["name"],
                account_type=acc_data["type"],
                account_subtype=acc_data["subtype"],
                level=acc_data["level"],
                accepts_posting=acc_data.get("accepts_posting", True),
                is_system_account=acc_data.get("is_system", False),
                is_control_account=acc_data.get("is_control", False),
                is_tax_account=acc_data.get("is_tax", False),
                vat_rate=acc_data.get("vat_rate", 0.0),
                sars_reporting_code=acc_data.get("sars_code"),
                created_by="system"
            )
            self.db.add(account)
            self.db.flush()
            code_to_id[acc_data["code"]] = account.id
        
        # Second pass: update parent relationships
        for acc_data in default_accounts:
            if "parent_code" in acc_data:
                account = self.db.query(ChartOfAccounts).filter(
                    ChartOfAccounts.tenant_id == self.tenant_id,
                    ChartOfAccounts.account_code == acc_data["code"]
                ).first()
                if account:
                    account.parent_account_id = code_to_id.get(acc_data["parent_code"])
        
        self.db.commit()
        
        return self.get_chart_of_accounts()
    
    def get_chart_of_accounts(self, account_type: Optional[AccountType] = None) -> List[ChartOfAccounts]:
        """Get Chart of Accounts"""
        query = self.db.query(ChartOfAccounts).filter(
            ChartOfAccounts.tenant_id == self.tenant_id,
            ChartOfAccounts.is_active == True
        )
        
        if account_type:
            query = query.filter(ChartOfAccounts.account_type == account_type)
        
        return query.order_by(ChartOfAccounts.account_code).all()
    
    def get_account_by_code(self, account_code: str) -> Optional[ChartOfAccounts]:
        """Get account by code"""
        return self.db.query(ChartOfAccounts).filter(
            ChartOfAccounts.tenant_id == self.tenant_id,
            ChartOfAccounts.account_code == account_code
        ).first()
    
    def get_control_accounts(self) -> Dict[str, ChartOfAccounts]:
        """Get control accounts (AR, AP, Bank)"""
        accounts = self.db.query(ChartOfAccounts).filter(
            ChartOfAccounts.tenant_id == self.tenant_id,
            ChartOfAccounts.is_control_account == True
        ).all()
        
        return {
            "ar": next((a for a in accounts if a.account_subtype == AccountSubType.ACCOUNTS_RECEIVABLE), None),
            "ap": next((a for a in accounts if a.account_subtype == AccountSubType.ACCOUNTS_PAYABLE), None),
            "bank": next((a for a in accounts if a.account_subtype == AccountSubType.BANK), None),
        }
    
    # ==================== JOURNAL ENTRIES ====================
    
    def create_journal_entry(
        self,
        entry_type: JournalEntryType,
        entry_date: datetime,
        description: str,
        lines: List[Dict],
        reference: Optional[str] = None,
        source_document_type: Optional[str] = None,
        source_document_id: Optional[int] = None,
        created_by: str = "system"
    ) -> GeneralLedger:
        """
        Create a journal entry
        
        Args:
            entry_type: Type of journal entry
            entry_date: Entry date
            description: Description
            lines: List of line items [{"account_code": "1100", "debit": 100.0, "credit": 0.0, "description": "..."}]
            reference: Reference number
            source_document_type: Source document type
            source_document_id: Source document ID
            created_by: User who created
        
        Returns:
            GeneralLedger entry
        """
        # Generate journal number
        period = entry_date.strftime("%Y-%m")
        year = entry_date.year
        
        # Count existing journals this year
        count = self.db.query(func.count(GeneralLedger.id)).filter(
            GeneralLedger.tenant_id == self.tenant_id,
            GeneralLedger.financial_year == year
        ).scalar() or 0
        
        journal_number = f"JE-{year}-{count + 1:05d}"
        
        # Calculate totals
        total_debit = sum(line.get("debit", 0.0) for line in lines)
        total_credit = sum(line.get("credit", 0.0) for line in lines)
        
        # Validate balance
        if abs(total_debit - total_credit) > 0.01:
            raise ValueError(f"Journal entry not balanced: Dr {total_debit}, Cr {total_credit}")
        
        # Create journal
        journal = GeneralLedger(
            tenant_id=self.tenant_id,
            journal_number=journal_number,
            entry_type=entry_type,
            reference=reference,
            entry_date=entry_date,
            period=period,
            financial_year=year,
            description=description,
            total_debit=total_debit,
            total_credit=total_credit,
            status=JournalStatus.DRAFT,
            source_document_type=source_document_type,
            source_document_id=source_document_id,
            created_by=created_by
        )
        self.db.add(journal)
        self.db.flush()
        
        # Create lines
        for idx, line_data in enumerate(lines, start=1):
            account = self.get_account_by_code(line_data["account_code"])
            if not account:
                raise ValueError(f"Account {line_data['account_code']} not found")
            
            if not account.accepts_posting:
                raise ValueError(f"Account {account.account_code} - {account.account_name} does not accept postings")
            
            line = GeneralLedgerLine(
                tenant_id=self.tenant_id,
                journal_id=journal.id,
                line_number=idx,
                account_id=account.id,
                debit=line_data.get("debit", 0.0),
                credit=line_data.get("credit", 0.0),
                description=line_data.get("description", description),
                department=line_data.get("department"),
                project=line_data.get("project"),
                cost_center=line_data.get("cost_center"),
                is_vat_line=line_data.get("is_vat_line", False),
                vat_rate=line_data.get("vat_rate", 0.0),
                vat_amount=line_data.get("vat_amount", 0.0)
            )
            self.db.add(line)
        
        self.db.commit()
        self.db.refresh(journal)
        
        return journal
    
    def post_journal_entry(self, journal_id: int, posted_by: str) -> GeneralLedger:
        """Post a journal entry to the GL"""
        journal = self.db.query(GeneralLedger).filter(
            GeneralLedger.id == journal_id,
            GeneralLedger.tenant_id == self.tenant_id
        ).first()
        
        if not journal:
            raise ValueError("Journal entry not found")
        
        if journal.status != JournalStatus.DRAFT:
            raise ValueError(f"Cannot post journal in status: {journal.status}")
        
        if not journal.is_balanced():
            raise ValueError("Journal entry not balanced")
        
        # Update status
        journal.status = JournalStatus.POSTED
        journal.posting_date = datetime.utcnow()
        journal.posted_by = posted_by
        
        # Update account balances
        for line in journal.lines:
            account = line.account
            account.debit_balance += line.debit
            account.credit_balance += line.credit
            
            # Update current balance based on account type
            if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
                account.current_balance = account.debit_balance - account.credit_balance
            else:  # LIABILITY, EQUITY, REVENUE
                account.current_balance = account.credit_balance - account.debit_balance
            
            account.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(journal)
        
        return journal
    
    # ==================== TRIAL BALANCE ====================
    
    def get_trial_balance(self, period: Optional[str] = None) -> List[Dict]:
        """
        Generate Trial Balance
        
        Args:
            period: Period in format "2025-10" (optional, defaults to current period)
        
        Returns:
            List of accounts with balances
        """
        if not period:
            period = datetime.now().strftime("%Y-%m")
        
        # Get all posted journals up to this period
        journals = self.db.query(GeneralLedger).filter(
            GeneralLedger.tenant_id == self.tenant_id,
            GeneralLedger.status == JournalStatus.POSTED,
            GeneralLedger.period <= period
        ).all()
        
        # Calculate balances per account
        account_balances = {}
        
        for journal in journals:
            for line in journal.lines:
                if line.account_id not in account_balances:
                    account_balances[line.account_id] = {
                        "account": line.account,
                        "debit_total": 0.0,
                        "credit_total": 0.0,
                        "balance": 0.0
                    }
                
                account_balances[line.account_id]["debit_total"] += line.debit
                account_balances[line.account_id]["credit_total"] += line.credit
        
        # Calculate final balances
        trial_balance = []
        total_debit = 0.0
        total_credit = 0.0
        
        for acc_id, data in account_balances.items():
            account = data["account"]
            debit_total = data["debit_total"]
            credit_total = data["credit_total"]
            
            # Calculate balance based on account type
            if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
                balance = debit_total - credit_total
                if balance > 0:
                    trial_balance.append({
                        "account_code": account.account_code,
                        "account_name": account.account_name,
                        "account_type": account.account_type.value,
                        "debit": balance,
                        "credit": 0.0
                    })
                    total_debit += balance
                else:
                    trial_balance.append({
                        "account_code": account.account_code,
                        "account_name": account.account_name,
                        "account_type": account.account_type.value,
                        "debit": 0.0,
                        "credit": abs(balance)
                    })
                    total_credit += abs(balance)
            else:  # LIABILITY, EQUITY, REVENUE
                balance = credit_total - debit_total
                if balance > 0:
                    trial_balance.append({
                        "account_code": account.account_code,
                        "account_name": account.account_name,
                        "account_type": account.account_type.value,
                        "debit": 0.0,
                        "credit": balance
                    })
                    total_credit += balance
                else:
                    trial_balance.append({
                        "account_code": account.account_code,
                        "account_name": account.account_name,
                        "account_type": account.account_type.value,
                        "debit": abs(balance),
                        "credit": 0.0
                    })
                    total_debit += abs(balance)
        
        # Sort by account code
        trial_balance.sort(key=lambda x: x["account_code"])
        
        # Add totals
        trial_balance.append({
            "account_code": "TOTAL",
            "account_name": "TOTAL",
            "account_type": "TOTAL",
            "debit": total_debit,
            "credit": total_credit
        })
        
        return trial_balance
    
    # ==================== FINANCIAL STATEMENTS ====================
    
    def get_profit_and_loss(self, start_period: str, end_period: str) -> Dict:
        """
        Generate Profit & Loss Statement
        
        Args:
            start_period: Start period "2025-01"
            end_period: End period "2025-10"
        
        Returns:
            P&L statement
        """
        # Get all posted journals in period range
        journals = self.db.query(GeneralLedger).filter(
            GeneralLedger.tenant_id == self.tenant_id,
            GeneralLedger.status == JournalStatus.POSTED,
            GeneralLedger.period >= start_period,
            GeneralLedger.period <= end_period
        ).all()
        
        # Calculate revenue and expenses
        revenue_total = 0.0
        cost_of_sales_total = 0.0
        operating_expenses_total = 0.0
        
        revenue_accounts = []
        cos_accounts = []
        expense_accounts = []
        
        for journal in journals:
            for line in journal.lines:
                account = line.account
                amount = line.credit - line.debit
                
                if account.account_type == AccountType.REVENUE:
                    revenue_total += amount
                    revenue_accounts.append({
                        "code": account.account_code,
                        "name": account.account_name,
                        "amount": amount
                    })
                elif account.account_type == AccountType.EXPENSE:
                    if account.account_subtype == AccountSubType.COST_OF_SALES:
                        cost_of_sales_total += line.debit - line.credit
                        cos_accounts.append({
                            "code": account.account_code,
                            "name": account.account_name,
                            "amount": line.debit - line.credit
                        })
                    else:
                        operating_expenses_total += line.debit - line.credit
                        expense_accounts.append({
                            "code": account.account_code,
                            "name": account.account_name,
                            "amount": line.debit - line.credit
                        })
        
        # Calculate totals
        gross_profit = revenue_total - cost_of_sales_total
        net_profit = gross_profit - operating_expenses_total
        
        return {
            "period": f"{start_period} to {end_period}",
            "revenue": {
                "accounts": self._consolidate_accounts(revenue_accounts),
                "total": revenue_total
            },
            "cost_of_sales": {
                "accounts": self._consolidate_accounts(cos_accounts),
                "total": cost_of_sales_total
            },
            "gross_profit": gross_profit,
            "operating_expenses": {
                "accounts": self._consolidate_accounts(expense_accounts),
                "total": operating_expenses_total
            },
            "net_profit": net_profit
        }
    
    def get_balance_sheet(self, as_at_period: str) -> Dict:
        """
        Generate Balance Sheet
        
        Args:
            as_at_period: Period "2025-10"
        
        Returns:
            Balance Sheet
        """
        trial_balance = self.get_trial_balance(as_at_period)
        
        assets = {"current": [], "fixed": [], "total": 0.0}
        liabilities = {"current": [], "long_term": [], "total": 0.0}
        equity = {"accounts": [], "total": 0.0}
        
        for item in trial_balance:
            if item["account_code"] == "TOTAL":
                continue
            
            account_type = item["account_type"]
            balance = item["debit"] if item["debit"] > 0 else item["credit"]
            
            if account_type == "asset":
                assets["total"] += balance
                if "current" in item["account_name"].lower() or item["account_code"].startswith("11"):
                    assets["current"].append(item)
                else:
                    assets["fixed"].append(item)
            
            elif account_type == "liability":
                liabilities["total"] += balance
                if "current" in item["account_name"].lower() or item["account_code"].startswith("21"):
                    liabilities["current"].append(item)
                else:
                    liabilities["long_term"].append(item)
            
            elif account_type == "equity":
                equity["total"] += balance
                equity["accounts"].append(item)
        
        return {
            "as_at": as_at_period,
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
            "total_liabilities_and_equity": liabilities["total"] + equity["total"]
        }
    
    def _consolidate_accounts(self, accounts: List[Dict]) -> List[Dict]:
        """Consolidate duplicate accounts"""
        consolidated = {}
        for acc in accounts:
            key = acc["code"]
            if key in consolidated:
                consolidated[key]["amount"] += acc["amount"]
            else:
                consolidated[key] = acc
        return list(consolidated.values())
