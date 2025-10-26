# 🧪 ARIA DEMO TENANT & END-TO-END TESTING PLAN

**Date**: October 25, 2025  
**Status**: Demo Data Created ✅ | Testing Ready  
**Purpose**: Comprehensive E2E testing of all frontend pages, backend APIs, documents, and reports

---

## 📊 DEMO TENANT OVERVIEW

### Company Profile

**TechForge Manufacturing (Pty) Ltd**  
- **Industry**: Manufacturing (Metal & Electronic Components)
- **Location**: Midrand, Johannesburg, South Africa
- **Employees**: 45
- **BBBEE Level**: 4 (Score: 85.2)
- **Annual Revenue**: ~R25M
- **VAT Registered**: Yes (4123456789)

### Demo Data Generated

✅ **1 Company** (TechForge Manufacturing)  
✅ **5 Users** (Admin, Finance, HR, Manager, Employee)  
✅ **20 Customers** (Across SA - JHB, CT, DBN, PE, etc.)  
✅ **15 Suppliers** (Raw materials, components, services)  
✅ **9 Product Categories** (Hardware, Electronics, Finished Goods)  
✅ **100 Invoices** (Last 6 months, R585K-R750K/month)  
✅ **80 Purchase Orders** (Last 6 months, R350K-R450K/month)  
✅ **50 Expense Claims** (Last 3 months, R50-R2000 each)  
✅ **6 Payroll Runs** (Last 6 months, 45 employees, R1.89M gross)  
✅ **200 Bot Activities** (Last 30 days, 4 bots)

**Total Transactions**: 436 documents  
**Total Value**: R18.5M (invoices + POs + payroll)

---

## 🔐 DEMO USER CREDENTIALS

| Email | Password | Role | Use Case |
|-------|----------|------|----------|
| admin@techforge.co.za | Demo@2025 | Admin | Full system access, configurations |
| finance@techforge.co.za | Demo@2025 | Finance | Financial reports, invoices, payments |
| hr@techforge.co.za | Demo@2025 | HR | Payroll, employees, leave management |
| manager@techforge.co.za | Demo@2025 | Manager | Approvals, workflows, reports |
| employee@techforge.co.za | Demo@2025 | Employee | Basic access, expense claims |

---

## 🧪 END-TO-END TESTING CHECKLIST

### 1. AUTHENTICATION & AUTHORIZATION (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1.1 | Login with admin@techforge.co.za | Redirect to dashboard, show admin menu | ⬜ |
| 1.2 | Login with finance@techforge.co.za | Redirect to dashboard, limited to finance menu | ⬜ |
| 1.3 | Login with invalid credentials | Show error message, stay on login page | ⬜ |
| 1.4 | Logout | Clear session, redirect to login page | ⬜ |
| 1.5 | Access admin page as employee | Show 403 Forbidden error | ⬜ |

### 2. ADMIN DASHBOARD (20 tests)

#### 2.1 Company Settings (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 2.1.1 | Load company settings page | Show 4 tabs, pre-filled with TechForge data | ⬜ |
| 2.1.2 | Edit company name | Save successfully, show success message | ⬜ |
| 2.1.3 | Upload company logo | Upload file, show preview, save | ⬜ |
| 2.1.4 | Change BBBEE level (4 → 3) | Update level, recalculate procurement recognition | ⬜ |
| 2.1.5 | Edit bank details | Update bank account, validate branch code | ⬜ |

#### 2.2 User Management (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 2.2.1 | Load user list | Show 5 users with stats (Total, Active, Invited, Inactive) | ⬜ |
| 2.2.2 | Invite new user (test@techforge.co.za) | Send invitation email, add to pending users | ⬜ |
| 2.2.3 | Change user role (employee → manager) | Update role, update permissions | ⬜ |
| 2.2.4 | Deactivate user | Set status to inactive, disable login | ⬜ |
| 2.2.5 | Reset password | Send password reset email | ⬜ |

#### 2.3 Bot Configuration (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 2.3.1 | Load bot config page | Show 4 bots (Invoice, BBBEE, Payroll, Expense) | ⬜ |
| 2.3.2 | Enable/disable Invoice Bot | Toggle state, confirm change | ⬜ |
| 2.3.3 | Set auto-approval limit (R10,000) | Save limit, apply to future invoices | ⬜ |
| 2.3.4 | Enable WhatsApp notifications | Check WhatsApp, save config | ⬜ |
| 2.3.5 | Change Invoice Bot confidence threshold (95% → 90%) | Update threshold, affect matching | ⬜ |

#### 2.4 System Settings (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 2.4.1 | Load audit logs | Show recent user activities with filters | ⬜ |
| 2.4.2 | Filter audit logs by user | Show only selected user's activities | ⬜ |
| 2.4.3 | Export audit logs to CSV | Download CSV file with all logs | ⬜ |
| 2.4.4 | Change password policy | Update settings, apply to all users | ⬜ |
| 2.4.5 | Change session timeout (60 → 120 min) | Update timeout, test auto-logout | ⬜ |

### 3. BOT REPORTS (25 tests)

#### 3.1 Bot Dashboard (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 3.1.1 | Load bot dashboard | Show 4 metrics cards + activity chart | ⬜ |
| 3.1.2 | Verify total actions | Should show 200 (from demo data) | ⬜ |
| 3.1.3 | Verify success rate | Should show ~96% (192/200 successful) | ⬜ |
| 3.1.4 | Check time saved | Should calculate hours saved (200 actions × avg 20 min) | ⬜ |
| 3.1.5 | View activity chart (last 7 days) | Show line chart with daily activity | ⬜ |

#### 3.2 Invoice Reconciliation Report (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 3.2.1 | Load invoice reconciliation report | Show 4 stats + invoice list | ⬜ |
| 3.2.2 | Verify auto-match count | Should show ~95 invoices auto-matched | ⬜ |
| 3.2.3 | Filter by status (pending) | Show only pending invoices | ⬜ |
| 3.2.4 | Search by invoice number | Find specific invoice (INV-2025-00045) | ⬜ |
| 3.2.5 | Export report to Excel | Download Excel with all invoices | ⬜ |

#### 3.3 BBBEE Compliance Report (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 3.3.1 | Load BBBEE report | Show Level 4, Score 85.2, Recognition 100% | ⬜ |
| 3.3.2 | Verify scorecard elements | Show 5 elements with progress bars | ⬜ |
| 3.3.3 | Check supplier verification | Show verified suppliers count | ⬜ |
| 3.3.4 | Check certificate expiry | Show expiry date (2026-10-31) | ⬜ |
| 3.3.5 | Download BBBEE certificate | Generate PDF with TechForge branding | ⬜ |

#### 3.4 Payroll Activity Report (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 3.4.1 | Load payroll report | Show 3 summary cards + payroll runs | ⬜ |
| 3.4.2 | Verify employee count | Should show 45 employees | ⬜ |
| 3.4.3 | Verify monthly cost | Should show R1.89M gross (45 × avg R42K) | ⬜ |
| 3.4.4 | Check SARS submission status | Should show "Up to date" for all runs | ⬜ |
| 3.4.5 | Export payroll runs | Download Excel with 6 months data | ⬜ |

#### 3.5 Expense Management Report (5 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 3.5.1 | Load expense report | Show 4 stats (Total, Approved, Pending, Rejected) | ⬜ |
| 3.5.2 | Verify total claims | Should show 50 claims | ⬜ |
| 3.5.3 | Verify auto-coding accuracy | Should show ~90% (45/50 auto-coded) | ⬜ |
| 3.5.4 | View top claimants | Show employees with most claims | ⬜ |
| 3.5.5 | Export expense report | Download Excel with all claims | ⬜ |

### 4. PENDING ACTIONS (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 4.1 | Load pending actions page | Show list of pending approvals | ⬜ |
| 4.2 | Verify pending count | Should show pending invoices + expenses + leave | ⬜ |
| 4.3 | Filter by type (Invoice Approval) | Show only invoice approvals | ⬜ |
| 4.4 | Filter by priority (High) | Show only high-priority actions | ⬜ |
| 4.5 | Approve single action | Update status, send notification | ⬜ |
| 4.6 | Reject single action | Update status, request reason | ⬜ |
| 4.7 | Bulk approve (select 5) | Approve multiple actions at once | ⬜ |
| 4.8 | Search by description | Find specific action | ⬜ |
| 4.9 | View action details | Open modal with full details | ⬜ |
| 4.10 | Add comment to action | Save comment, show in history | ⬜ |

### 5. WORKFLOW MANAGEMENT (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 5.1 | Load workflow page | Show 3 workflow types + active workflows | ⬜ |
| 5.2 | Click "Start Workflow" | Open modal with workflow selection | ⬜ |
| 5.3 | Start P2P workflow | Create new workflow, show first step | ⬜ |
| 5.4 | Start O2C workflow | Create new workflow, show first step | ⬜ |
| 5.5 | Start H2R workflow | Create new workflow, show first step | ⬜ |
| 5.6 | View active workflows | Show list with progress (step X/Y) | ⬜ |
| 5.7 | Click workflow ID | Open workflow details view | ⬜ |
| 5.8 | View workflow progress | Show visual stepper with current step | ⬜ |
| 5.9 | Filter by status (In Progress) | Show only in-progress workflows | ⬜ |
| 5.10 | Search by workflow ID | Find specific workflow | ⬜ |

### 6. DOCUMENT MANAGEMENT (30 tests)

#### 6.1 Document Templates (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 6.1.1 | Load templates page | Show 7 categories with template counts | ⬜ |
| 6.1.2 | Verify Sales category | Should show 11 templates | ⬜ |
| 6.1.3 | Verify Purchase category | Should show 8 templates | ⬜ |
| 6.1.4 | Verify HR/Payroll category | Should show 12 templates | ⬜ |
| 6.1.5 | Verify Compliance category | Should show 9 templates (SARS, BBBEE) | ⬜ |
| 6.1.6 | Search for "Invoice" | Show all invoice-related templates | ⬜ |
| 6.1.7 | Filter by category (Sales) | Show only Sales templates | ⬜ |
| 6.1.8 | Click template | Navigate to generate document page | ⬜ |
| 6.1.9 | Count total templates | Should show 73+ templates | ⬜ |
| 6.1.10 | Check template customization | Should allow editing template fields | ⬜ |

#### 6.2 Generate Document (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 6.2.1 | Load generate page | Show document type dropdown | ⬜ |
| 6.2.2 | Select "Tax Invoice" | Show invoice form fields | ⬜ |
| 6.2.3 | Search customer (ABC Manufacturing) | Auto-complete, pre-fill customer details | ⬜ |
| 6.2.4 | Add line item (PROD-001, qty 10) | Calculate line total (R450) | ⬜ |
| 6.2.5 | Add 2nd line item | Update subtotal | ⬜ |
| 6.2.6 | Calculate VAT (15%) | Add to subtotal, show grand total | ⬜ |
| 6.2.7 | Preview document | Open PDF in modal | ⬜ |
| 6.2.8 | Generate & Download | Download PDF to computer | ⬜ |
| 6.2.9 | Send via Email | Open email modal, send to customer | ⬜ |
| 6.2.10 | Send via WhatsApp | Open WhatsApp with PDF link | ⬜ |

#### 6.3 Document History (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 6.3.1 | Load document history | Show list of 100+ generated documents | ⬜ |
| 6.3.2 | Verify invoice count | Should show 100 invoices | ⬜ |
| 6.3.3 | Search by document number | Find INV-2025-00001 | ⬜ |
| 6.3.4 | Filter by type (Tax Invoice) | Show only tax invoices | ⬜ |
| 6.3.5 | Filter by customer (ABC Manufacturing) | Show only ABC invoices | ⬜ |
| 6.3.6 | Filter by date range | Show documents in selected range | ⬜ |
| 6.3.7 | View document (click View) | Open PDF in new tab | ⬜ |
| 6.3.8 | Download document | Download PDF | ⬜ |
| 6.3.9 | Resend document | Resend via email/WhatsApp | ⬜ |
| 6.3.10 | Export document list | Download Excel with all documents | ⬜ |

### 7. FINANCIAL REPORTS (40 tests)

#### 7.1 Profit & Loss Statement (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 7.1.1 | Load P&L page | Show period selector + P&L statement | ⬜ |
| 7.1.2 | Select period (This Month) | Calculate P&L for current month | ⬜ |
| 7.1.3 | Select period (This Quarter) | Calculate P&L for Q4 2025 | ⬜ |
| 7.1.4 | Select period (This Year) | Calculate P&L for 2025 | ⬜ |
| 7.1.5 | Verify Revenue section | Show Sales, Services, Other income with totals | ⬜ |
| 7.1.6 | Verify Cost of Sales | Show COGS, Labor, Overhead with totals | ⬜ |
| 7.1.7 | Verify Operating Expenses | Show Marketing, Admin, Depreciation with totals | ⬜ |
| 7.1.8 | Calculate Net Profit | Revenue - Costs - Expenses = Net Profit | ⬜ |
| 7.1.9 | Calculate profit margin | (Net Profit / Revenue) × 100 | ⬜ |
| 7.1.10 | Export P&L to PDF | Download PDF with TechForge branding | ⬜ |

**Expected P&L Results (October 2025)**:
- Revenue: R750,000 (from 100 invoices over 6 months avg)
- Cost of Sales: R375,000 (50% margin)
- Operating Expenses: R220,000 (salaries R189K + other R31K)
- **Net Profit**: R155,000 (20.7% margin)

#### 7.2 Balance Sheet (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 7.2.1 | Load Balance Sheet page | Show as-at date selector + balance sheet | ⬜ |
| 7.2.2 | Select as-at date (Today) | Calculate balances as of today | ⬜ |
| 7.2.3 | Verify Current Assets | Show Cash, Debtors, Inventory with totals | ⬜ |
| 7.2.4 | Verify Fixed Assets | Show Property, Equipment, Vehicles with totals | ⬜ |
| 7.2.5 | Calculate Total Assets | Current Assets + Fixed Assets | ⬜ |
| 7.2.6 | Verify Current Liabilities | Show Creditors, Short-term loans with totals | ⬜ |
| 7.2.7 | Verify Long-term Liabilities | Show Loans, Mortgage with totals | ⬜ |
| 7.2.8 | Calculate Total Liabilities | Current + Long-term liabilities | ⬜ |
| 7.2.9 | Calculate Equity | Assets - Liabilities = Equity | ⬜ |
| 7.2.10 | Export Balance Sheet to PDF | Download PDF | ⬜ |

**Expected Balance Sheet (as-at Oct 25, 2025)**:
- **Assets**: R1,675,000
  - Current: R525,000 (Cash R250K, Debtors R180K, Inventory R95K)
  - Fixed: R1,150,000 (Property R800K, Equipment R150K, Vehicles R200K)
- **Liabilities**: R1,070,000
  - Current: R170,000 (Creditors R120K, Short-term R50K)
  - Long-term: R900,000 (Loans R400K, Mortgage R500K)
- **Equity**: R605,000

#### 7.3 Cash Flow Statement (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 7.3.1 | Load Cash Flow page | Show period selector + cash flow statement | ⬜ |
| 7.3.2 | Select period (This Month) | Calculate cash flow for current month | ⬜ |
| 7.3.3 | Verify Operating Activities | Show receipts and payments with net | ⬜ |
| 7.3.4 | Calculate Operating Cash Flow | Receipts - Payments = Net Operating | ⬜ |
| 7.3.5 | Verify Investing Activities | Show asset purchases/sales with net | ⬜ |
| 7.3.6 | Calculate Investing Cash Flow | Receipts - Payments = Net Investing | ⬜ |
| 7.3.7 | Verify Financing Activities | Show loans, repayments, dividends with net | ⬜ |
| 7.3.8 | Calculate Financing Cash Flow | Receipts - Repayments - Dividends = Net Financing | ⬜ |
| 7.3.9 | Calculate Net Increase in Cash | Operating + Investing + Financing | ⬜ |
| 7.3.10 | Export Cash Flow to PDF | Download PDF | ⬜ |

**Expected Cash Flow (October 2025)**:
- **Operating**: +R130,000 (Receipts R450K - Payments R320K)
- **Investing**: -R30,000 (Purchases R50K - Sales R20K)
- **Financing**: +R35,000 (Loans R100K - Repayments R45K - Dividends R20K)
- **Net Increase**: +R135,000

#### 7.4 Aged Reports (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 7.4.1 | Load Aged Reports page | Show Aged Debtors table by default | ⬜ |
| 7.4.2 | Verify aging buckets | Show Current, 30, 60, 90+ days columns | ⬜ |
| 7.4.3 | Calculate total debtors | Sum all outstanding invoices (~R220K) | ⬜ |
| 7.4.4 | Sort by total (descending) | Show largest debtors first | ⬜ |
| 7.4.5 | Click customer name | Drill-down to customer transactions | ⬜ |
| 7.4.6 | Switch to Aged Creditors | Show supplier balances | ⬜ |
| 7.4.7 | Calculate total creditors | Sum all outstanding bills (~R120K) | ⬜ |
| 7.4.8 | Export Aged Debtors | Download Excel | ⬜ |
| 7.4.9 | Send statement to customer | Generate & email statement | ⬜ |
| 7.4.10 | Filter by overdue only | Show only overdue balances | ⬜ |

**Expected Aged Debtors (Oct 2025)**:
- Total Outstanding: R220,000
  - Current (0-30 days): R150,000
  - 30-60 days: R50,000
  - 60-90 days: R15,000
  - 90+ days: R5,000

### 8. INTEGRATION SETUP (20 tests)

#### 8.1 Integrations List (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 8.1.1 | Load integrations page | Show 6 integration cards | ⬜ |
| 8.1.2 | Verify Xero card | Show connected, last sync time | ⬜ |
| 8.1.3 | Verify Sage card | Show connected, last sync time | ⬜ |
| 8.1.4 | Verify Pastel card | Show not connected | ⬜ |
| 8.1.5 | Verify Microsoft 365 card | Show connected, last sync time | ⬜ |
| 8.1.6 | Verify SARS eFiling card | Show connected, last sync time | ⬜ |
| 8.1.7 | Click Xero "Configure" | Open config modal | ⬜ |
| 8.1.8 | Click Xero "Sync Now" | Trigger manual sync, show progress | ⬜ |
| 8.1.9 | Click Pastel "Connect" | Open OAuth/credentials form | ⬜ |
| 8.1.10 | Test connection | Validate credentials, show success/error | ⬜ |

#### 8.2 Integration Sync (10 tests)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 8.2.1 | Load sync history page | Show 3 summary cards + sync log | ⬜ |
| 8.2.2 | Verify total syncs today | Count all syncs from today | ⬜ |
| 8.2.3 | Verify successful syncs | Show success count with green indicator | ⬜ |
| 8.2.4 | Verify failed syncs | Show failure count with red indicator | ⬜ |
| 8.2.5 | View sync history table | Show integration, type, status, records, time | ⬜ |
| 8.2.6 | Filter by integration (Xero) | Show only Xero syncs | ⬜ |
| 8.2.7 | Filter by status (Failed) | Show only failed syncs | ⬜ |
| 8.2.8 | Click failed sync | Show error details, retry button | ⬜ |
| 8.2.9 | Click "Retry" | Re-run failed sync | ⬜ |
| 8.2.10 | Export sync history | Download CSV | ⬜ |

### 9. DOCUMENT GENERATION ACCURACY (20 tests)

| # | Document Type | Test | Expected Result | Status |
|---|--------------|------|----------------|--------|
| 9.1 | Tax Invoice | Generate INV-TEST-001 for ABC Manufacturing | PDF with TechForge logo, correct VAT calc (15%), totals accurate | ⬜ |
| 9.2 | Quote | Generate QTE-TEST-001 | Valid for 30 days, terms & conditions, no VAT | ⬜ |
| 9.3 | Purchase Order | Generate PO-TEST-001 for Steel Suppliers SA | Delivery address, payment terms, authorized signature | ⬜ |
| 9.4 | Payslip | Generate payslip for Thabo Mokoena (Oct 2025) | PAYE, UIF, SDL calculations correct, YTD totals | ⬜ |
| 9.5 | IRP5 | Generate IRP5 for tax year 2025 | SARS-compliant format, correct tax codes | ⬜ |
| 9.6 | VAT201 | Generate VAT return for Sep 2025 | Output VAT R97,500, Input VAT R52,500, Net R45,000 | ⬜ |
| 9.7 | EMP201 | Generate PAYE submission for Oct 2025 | PAYE R472,500, UIF R7,970, SDL R18,900, Total R499,370 | ⬜ |
| 9.8 | BBBEE Certificate | Generate certificate for TechForge | Level 4, Score 85.2, valid until 2026-10-31 | ⬜ |
| 9.9 | Employment Contract | Generate contract for new hire | SA labour law compliant, BCEA terms | ⬜ |
| 9.10 | GRN | Generate goods received note | Match to PO, quantities correct | ⬜ |
| 9.11 | Credit Note | Generate credit note for returned goods | Negative amounts, VAT reversal | ⬜ |
| 9.12 | Debit Note | Generate debit note for price adjustment | Positive adjustment, VAT correction | ⬜ |
| 9.13 | Statement | Generate customer statement | Opening balance, transactions, closing balance | ⬜ |
| 9.14 | Payment Voucher | Generate payment voucher | Bank details, authorization, proof of payment | ⬜ |
| 9.15 | Receipt | Generate receipt for payment received | Payment method, bank reference | ⬜ |
| 9.16 | Journal Entry | Generate journal entry | Debit = Credit, balanced entries | ⬜ |
| 9.17 | Manufacturing Order | Generate MO with BOM | Components list, quantities, costs | ⬜ |
| 9.18 | Stock Transfer | Generate stock transfer between warehouses | From/To locations, batch numbers | ⬜ |
| 9.19 | Leave Application | Generate leave request | Leave type, dates, balance calculation | ⬜ |
| 9.20 | Tax Clearance Request | Generate SARS tax clearance request | Company details, tax compliance status | ⬜ |

### 10. REPORT ACCURACY VALIDATION (15 tests)

| # | Report | Validation | Expected Result | Status |
|---|--------|-----------|----------------|--------|
| 10.1 | P&L | Total Revenue | Sum all invoices for period = Revenue | ⬜ |
| 10.2 | P&L | Cost of Sales | Sum all purchase costs = COGS | ⬜ |
| 10.3 | P&L | Operating Expenses | Sum salaries + overheads = Expenses | ⬜ |
| 10.4 | P&L | Net Profit | Revenue - COGS - Expenses = Net Profit | ⬜ |
| 10.5 | Balance Sheet | Total Assets | Current Assets + Fixed Assets = Total | ⬜ |
| 10.6 | Balance Sheet | Total Liabilities | Current + Long-term = Total | ⬜ |
| 10.7 | Balance Sheet | Equity | Assets - Liabilities = Equity | ⬜ |
| 10.8 | Balance Sheet | Accounting Equation | Assets = Liabilities + Equity | ⬜ |
| 10.9 | Cash Flow | Operating Cash | Receipts - Payments = Net Operating | ⬜ |
| 10.10 | Cash Flow | Net Increase | Operating + Investing + Financing = Net | ⬜ |
| 10.11 | Aged Debtors | Total Outstanding | Sum all unpaid invoices = Total Debtors | ⬜ |
| 10.12 | Aged Debtors | Aging Buckets | Invoices correctly bucketed by due date | ⬜ |
| 10.13 | Aged Creditors | Total Outstanding | Sum all unpaid bills = Total Creditors | ⬜ |
| 10.14 | Payroll | PAYE Calculation | (Gross - Threshold) × Tax Rate = PAYE | ⬜ |
| 10.15 | VAT Return | Net VAT | Output VAT - Input VAT = Net VAT Payable | ⬜ |

---

## 🤖 BOT ACCURACY TESTING (20 tests)

### Invoice Reconciliation Bot

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| B1.1 | Upload invoice PDF | Extract supplier, amount, date, line items | ⬜ |
| B1.2 | Match to PO | Find matching PO-2025-00045, confidence 95%+ | ⬜ |
| B1.3 | 3-way match (PO-GRN-Invoice) | Verify quantities match, approve | ⬜ |
| B1.4 | Mismatch detection | Detect price difference, flag for review | ⬜ |
| B1.5 | Auto-approval (< R10K limit) | Auto-approve invoice R8,500 | ⬜ |

### BBBEE Compliance Bot

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| B2.1 | Verify supplier certificate | Check cert validity, expiry date | ⬜ |
| B2.2 | Calculate procurement recognition | Level 4 supplier = 100% recognition | ⬜ |
| B2.3 | Update scorecard | Recalculate score after new procurement | ⬜ |
| B2.4 | Certificate expiry alert | Send alert 30 days before expiry | ⬜ |
| B2.5 | Generate BBBEE report | Create PDF with scorecard breakdown | ⬜ |

### Payroll Automation Bot

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| B3.1 | Calculate PAYE | Apply tax tables correctly | ⬜ |
| B3.2 | Calculate UIF | 1% of gross, capped at R177.12 | ⬜ |
| B3.3 | Calculate SDL | 1% of gross, no cap | ⬜ |
| B3.4 | Generate IRP5 | Accurate tax certificate | ⬜ |
| B3.5 | Submit EMP201 to SARS | Auto-submit via eFiling API | ⬜ |

### Expense Management Bot

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| B4.1 | Auto-code expense claim | Classify "Fuel" → Expense Code 6400 | ⬜ |
| B4.2 | Detect policy violation | Flag R5,000 meal claim (exceeds R200 limit) | ⬜ |
| B4.3 | VAT reclaim calculation | Extract VAT from receipt, calculate reclaim | ⬜ |
| B4.4 | Duplicate detection | Detect duplicate receipt upload | ⬜ |
| B4.5 | Auto-approval workflow | Route to manager if > R1,000 | ⬜ |

---

## 📊 PERFORMANCE TESTING (10 tests)

| # | Test | Metric | Target | Status |
|---|------|--------|--------|--------|
| P1 | Page load time (Dashboard) | Time to interactive | < 2 seconds | ⬜ |
| P2 | API response time (GET /invoices) | Response time | < 500ms | ⬜ |
| P3 | Document generation (PDF) | Generation time | < 3 seconds | ⬜ |
| P4 | Report calculation (P&L) | Calculation time | < 2 seconds | ⬜ |
| P5 | Search performance (1000 invoices) | Search response | < 300ms | ⬜ |
| P6 | Export to Excel (500 rows) | Export time | < 5 seconds | ⬜ |
| P7 | File upload (5MB PDF) | Upload time | < 10 seconds | ⬜ |
| P8 | Concurrent users (10 users) | Response time degradation | < 20% | ⬜ |
| P9 | Database queries | Query execution time | < 100ms | ⬜ |
| P10 | Frontend bundle size | Gzipped size | < 500KB | ⬜ |

---

## 🔒 SECURITY TESTING (10 tests)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| S1 | SQL injection | Reject malicious input, no DB access | ⬜ |
| S2 | XSS attack | Sanitize input, no script execution | ⬜ |
| S3 | CSRF protection | Validate CSRF tokens on all POST requests | ⬜ |
| S4 | Authentication bypass | Reject unauthenticated API calls | ⬜ |
| S5 | Authorization bypass | Reject unauthorized access (employee accessing admin) | ⬜ |
| S6 | Password strength | Enforce password policy (8+ chars, uppercase, number) | ⬜ |
| S7 | Session timeout | Auto-logout after 60 minutes inactivity | ⬜ |
| S8 | API rate limiting | Block excessive requests (> 100/min) | ⬜ |
| S9 | File upload validation | Reject non-PDF files, limit size to 10MB | ⬜ |
| S10 | Data encryption | Encrypt sensitive data at rest (passwords, bank details) | ⬜ |

---

## 📱 RESPONSIVE DESIGN TESTING (10 tests)

| # | Device | Test | Expected Result | Status |
|---|--------|------|----------------|--------|
| R1 | Mobile (375x667) | Load dashboard | Stacked layout, no horizontal scroll | ⬜ |
| R2 | Mobile | Navigate menu | Hamburger menu, full-screen overlay | ⬜ |
| R3 | Mobile | DataTable | Horizontal scroll, readable text | ⬜ |
| R4 | Mobile | Forms | Full-width inputs, stacked fields | ⬜ |
| R5 | Tablet (768x1024) | Load reports | 2-column grid, charts visible | ⬜ |
| R6 | Tablet | Generate document | Full form visible, no truncation | ⬜ |
| R7 | Desktop (1920x1080) | Load admin pages | 3-4 column grid, optimal spacing | ⬜ |
| R8 | Desktop | DataTable | Show all columns, paginated | ⬜ |
| R9 | Touch device | Click buttons | Large tap targets (min 44x44px) | ⬜ |
| R10 | All devices | Image loading | Optimized images, fast load | ⬜ |

---

## ✅ SUCCESS CRITERIA

**Frontend (28 pages)**:
- [ ] All pages load without errors
- [ ] All forms submit successfully
- [ ] All tables display data correctly
- [ ] All buttons/links work as expected
- [ ] All modals open/close properly
- [ ] All exports (CSV, PDF) work
- [ ] Mobile responsive on all pages

**Backend (APIs)**:
- [ ] All CRUD operations work
- [ ] Authentication/authorization working
- [ ] API response times < 500ms
- [ ] No 500 errors
- [ ] Audit logs recording all actions

**Documents (87+ types)**:
- [ ] All document types generate correctly
- [ ] PDFs render properly
- [ ] Calculations accurate (VAT, totals)
- [ ] Company branding appears
- [ ] SARS-compliant formats

**Reports (Financial)**:
- [ ] P&L balances (Revenue - Costs - Expenses = Profit)
- [ ] Balance Sheet balances (Assets = Liabilities + Equity)
- [ ] Cash Flow balances (Operating + Investing + Financing = Net)
- [ ] Aged Reports accurate (aging buckets correct)
- [ ] All calculations verified against source data

**Bots (4 bots)**:
- [ ] Invoice Bot: 95%+ auto-match rate
- [ ] BBBEE Bot: Certificate verification working
- [ ] Payroll Bot: Tax calculations correct
- [ ] Expense Bot: 90%+ auto-coding accuracy

---

## 🚀 TESTING TIMELINE

**Week 1: Functional Testing**
- Day 1-2: Authentication + Admin pages (40 tests)
- Day 3-4: Reports + Pending Actions (45 tests)
- Day 5: Workflows + Documents (40 tests)

**Week 2: Accuracy Validation**
- Day 1-2: Financial reports validation (15 tests)
- Day 3-4: Document generation accuracy (20 tests)
- Day 5: Bot accuracy testing (20 tests)

**Week 3: Non-Functional Testing**
- Day 1: Performance testing (10 tests)
- Day 2: Security testing (10 tests)
- Day 3: Responsive design testing (10 tests)
- Day 4-5: Bug fixes + retesting

**Total**: 280+ test cases over 3 weeks

---

## 📋 TESTING TOOLS

**Manual Testing**:
- Browser DevTools (Chrome, Firefox, Safari)
- Postman (API testing)
- DB Browser (database validation)

**Automated Testing (Optional)**:
- **E2E**: Playwright or Cypress
- **API**: pytest + requests
- **Unit**: Jest (frontend), pytest (backend)
- **Performance**: Lighthouse, k6
- **Security**: OWASP ZAP

---

## 🎯 CONCLUSION

**ARIA is ready for comprehensive end-to-end testing with:**

✅ **Complete demo tenant** (TechForge Manufacturing)  
✅ **Realistic data** (436 transactions, R18.5M value)  
✅ **5 demo users** (all roles covered)  
✅ **280+ test cases** (covering all functionality)  
✅ **Accuracy validation** (documents + reports)  
✅ **Bot testing** (4 bots)  

**Next Steps**:
1. Run manual tests (Week 1-3)
2. Document bugs in issue tracker
3. Fix critical bugs
4. Retest
5. Launch! 🚀

---

**Demo Credentials**: admin@techforge.co.za / Demo@2025  
**Demo URL**: https://demo.aria.vantax.com (when deployed)

**Ready for beta testing!** 🎉
