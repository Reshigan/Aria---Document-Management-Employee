# Aria ERP System - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Core Modules](#core-modules)
3. [Common Workflows](#common-workflows)
4. [Reports](#reports)
5. [Data Import](#data-import)
6. [Troubleshooting](#troubleshooting)

## Getting Started

### Logging In
1. Navigate to https://aria.vantax.co.za
2. Enter your email and password
3. Click "Sign In"

### Dashboard Overview
The dashboard provides quick access to:
- Recent transactions
- Key performance indicators
- Pending approvals
- Quick actions

## Core Modules

### 1. Sales (Order-to-Cash)
**Quotes**
- Create: Sales → Quotes → New Quote
- Add customer, line items, terms
- Save as draft or send to customer
- Convert to Sales Order when accepted

**Sales Orders**
- Create from Quote or directly
- Edit while in draft status
- Approve to lock the order
- Create Delivery from approved orders
- Cancel if needed (draft/approved status)

**Deliveries**
- Create from Sales Order
- Record shipped quantities
- Update delivery status
- Generate delivery note

**AR Invoices**
- Create from Sales Order or Delivery
- Post to General Ledger
- Track payment status
- Cancel if needed (draft status only)

**AR Receipts**
- Record customer payments
- Allocate to invoices
- Post to GL
- Cancel if needed (draft status only)

### 2. Purchasing (Procure-to-Pay)
**Purchase Orders**
- Create: Purchasing → Purchase Orders → New PO
- Add supplier, line items, delivery date
- Approve to send to supplier
- Track receipt status
- Cancel if needed

**Goods Receipts**
- Create from Purchase Order
- Record received quantities
- Update quality inspection status
- Post to inventory

**AP Invoices**
- Create from Purchase Order or Goods Receipt
- Match to PO (3-way matching)
- Post to GL
- Schedule payment

### 3. Manufacturing
**Work Orders**
- Create production orders
- Assign to production line
- Track progress (draft → in_progress → completed)
- Cancel if needed (draft/planned status)

**Production Runs**
- Record actual production
- Track materials consumed
- Record finished goods
- Cancel if needed (in_progress status)

### 4. Field Services
**Service Requests**
- Create service tickets
- Assign to technicians
- Track status (open → scheduled → in_progress → completed)
- Cancel if needed

### 5. General Ledger
**Journal Entries**
- Create manual journal entries
- Must balance (debits = credits)
- Post to GL
- Reverse posted entries
- Cancel draft entries

**Chart of Accounts**
- US GAAP compliant (149 accounts)
- View account hierarchy
- Add custom accounts
- Deactivate unused accounts

## Common Workflows

### Quote to Cash Workflow
1. Create Quote (Sales → Quotes → New)
2. Send to customer for approval
3. Convert to Sales Order when accepted
4. Create Delivery from Sales Order
5. Ship goods and update delivery status
6. Create Invoice from Delivery
7. Post invoice to GL
8. Record payment in AR Receipts
9. Allocate payment to invoice

### Purchase to Pay Workflow
1. Create Purchase Order (Purchasing → POs → New)
2. Send to supplier
3. Receive goods (Create Goods Receipt)
4. Receive supplier invoice (Create AP Invoice)
5. Match invoice to PO and GR (3-way match)
6. Post invoice to GL
7. Schedule payment
8. Record payment in AP Payments

### Month-End Close
1. Review all draft transactions
2. Post all approved transactions
3. Run Trial Balance report
4. Review P&L and Balance Sheet
5. Make adjusting journal entries
6. Post adjustments
7. Run final reports
8. Archive period

## Reports

### Financial Reports
Access: Reports → Financial Reports

**Trial Balance**
- Shows all account balances
- Verifies debits = credits
- As of specific date

**Profit & Loss**
- Revenue vs Expenses
- Gross profit margin
- Net profit margin
- Period comparison

**Balance Sheet**
- Assets, Liabilities, Equity
- As of specific date
- Financial position snapshot

**Cash Flow**
- Operating, Investing, Financing activities
- Net cash flow
- Period analysis

**Aged Receivables**
- Customer balances by age
- Current, 30, 60, 90+ days
- Collection priority

**Aged Payables**
- Supplier balances by age
- Payment scheduling
- Cash flow planning

### Running Reports
1. Navigate to Reports menu
2. Select report type
3. Choose date range
4. Click "Generate Report"
5. Export to PDF/Excel if needed

## Data Import

### Importing Master Data
Access: Admin → Data Import

**Customers**
1. Download CSV template
2. Fill in customer data
3. Upload CSV file
4. Review import results

**Suppliers**
1. Download CSV template
2. Fill in supplier data
3. Upload CSV file
4. Review import results

**Products**
1. Download CSV template
2. Fill in product data (code, name, prices)
3. Upload CSV file
4. Review import results

### CSV Format Requirements
- UTF-8 encoding
- Comma-separated
- Header row required
- Match template exactly

## Troubleshooting

### Cannot Edit Document
**Issue**: Edit button is disabled
**Solution**: Documents can only be edited in draft status. Approved/posted documents must be reversed or cancelled.

### Cannot Cancel Transaction
**Issue**: Cancel button not available
**Solution**: Only draft and some approved transactions can be cancelled. Posted transactions must be reversed through journal entries.

### Report Shows No Data
**Issue**: Report is empty
**Solution**: 
- Check date range
- Ensure transactions are posted
- Verify you have permission to view data

### Import Failed
**Issue**: CSV import shows errors
**Solution**:
- Check CSV format matches template
- Verify all required fields are filled
- Check for duplicate codes
- Review error messages for specific issues

### Permission Denied
**Issue**: Cannot access module or feature
**Solution**: Contact your system administrator to request appropriate role/permissions.

## Support

For technical support or questions:
- Email: support@vantax.co.za
- Documentation: https://docs.aria-erp.com
- Training videos: https://training.aria-erp.com

## Best Practices

1. **Always save drafts** before finalizing transactions
2. **Review before posting** - posted transactions cannot be easily changed
3. **Regular backups** - System backs up daily, but export important reports
4. **Month-end checklist** - Follow the month-end close procedure
5. **User permissions** - Request only the permissions you need
6. **Data quality** - Keep master data (customers, products) up to date
7. **Audit trail** - All actions are logged for compliance

## Keyboard Shortcuts

- `Ctrl+S` - Save current form
- `Ctrl+N` - New record (where applicable)
- `Esc` - Cancel/Close dialog
- `Ctrl+F` - Search/Filter

---

**Version**: 3.0.0  
**Last Updated**: November 2025  
**System URL**: https://aria.vantax.co.za
