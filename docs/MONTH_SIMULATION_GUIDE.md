# Month-Long ERP Simulation Guide

This guide explains how to run the comprehensive month-long business simulation for ARIA ERP.

## Overview

The month simulation creates realistic business data spanning 30 days, including:
- 20 customers
- 12 suppliers
- 60-100 customer invoices (backdated)
- 40-60 supplier bills (backdated)
- Transactions spread across weekdays only
- All transactions backdated to the previous month for realistic reporting

## Purpose

The simulation is designed to:
1. **Test System Capacity**: Validate the ERP can handle realistic transaction volumes
2. **Generate Reporting Data**: Create data for aged AR/AP, P&L, and other reports
3. **Bot Testing**: Provide data for automation bots to process
4. **Go-Live Readiness**: Demonstrate system stability before production use

## Running the Simulation

### Prerequisites

1. PostgreSQL database running
2. Database credentials configured
3. Sufficient disk space (simulation creates ~500MB of data)

### Option 1: Run Locally

```bash
cd /var/www/aria/backend
source venv/bin/activate
export DATABASE_URL="postgresql://aria_user:AriaSecure2025!@127.0.0.1/aria_erp"
export SIM_TENANT_ID="simulation"
python month_simulation.py
```

### Option 2: Run on Production Server

```bash
ssh -i "Vantax-2.pem" ubuntu@3.8.139.178
cd /var/www/aria/backend
source venv/bin/activate
export DATABASE_URL="postgresql://aria_user:AriaSecure2025!@127.0.0.1/aria_erp"
export SIM_TENANT_ID="simulation"
python month_simulation.py
```

### Option 3: Run via systemd (One-time)

Create a one-time service:

```bash
sudo systemctl start aria-simulation.service
sudo journalctl -u aria-simulation.service -f
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection | Database connection string |
| `SIM_TENANT_ID` | `simulation` | Tenant ID for simulation data |

### Tenant Isolation

The simulation uses a separate tenant ID (`simulation`) to isolate test data from production data. This allows you to:
- Run the simulation multiple times without affecting production
- Easily delete simulation data: `DELETE FROM * WHERE tenant_id = 'simulation'`
- Compare simulation vs production data

## What Gets Created

### Master Data (Day 1)

**20 Customers:**
- ABC Manufacturing (Pty) Ltd
- XYZ Retail Solutions
- Tech Innovations SA
- Green Energy Systems
- Healthcare Plus
- Construction Masters
- Food Services Group
- Logistics Express
- Digital Marketing Pro
- Property Developers Ltd
- Mining Solutions SA
- Automotive Parts Distributors
- Hospitality Group
- Financial Services Corp
- Agriculture Supplies
- Telecommunications SA
- Education Services
- Security Solutions
- Pharmaceutical Distributors
- Engineering Consultants

**12 Suppliers:**
- Raw Materials Supplier (Pty) Ltd
- Office Supplies Co
- IT Equipment Distributors
- Utilities Provider
- Packaging Solutions
- Transport & Logistics
- Marketing Agency
- Professional Services
- Manufacturing Equipment
- Security Services
- Cleaning Services
- Insurance Provider

### Transactions (Days 2-30)

**Daily Activity (Weekdays Only):**
- 2-5 customer invoices per day
- 1-3 supplier bills per day
- Random line items (1-5 per invoice, 1-4 per bill)
- VAT calculated at 15% (South African standard rate)
- Payment terms: 30 or 60 days

**Transaction Backdating:**
All transactions are backdated to start 30 days ago, so:
- Day 1: 30 days ago (master data setup)
- Day 2-30: 29 days ago to today
- This creates realistic aged AR/AP for reporting

## Expected Results

### Summary Statistics

After completion, you should see:

```
============================================================
SIMULATION SUMMARY
============================================================
Customers Created:    20
Suppliers Created:    12
Invoices Created:     60-100 (varies due to randomization)
Bills Created:        40-60 (varies due to randomization)
Payments Created:     0 (not yet implemented)
GL Entries Created:   0 (not yet implemented)
Errors Encountered:   0
============================================================
```

### Data Validation

Verify the simulation data:

```sql
-- Check customer count
SELECT COUNT(*) FROM customers WHERE tenant_id = 'simulation';
-- Expected: 20

-- Check supplier count
SELECT COUNT(*) FROM suppliers WHERE tenant_id = 'simulation';
-- Expected: 12

-- Check invoice count
SELECT COUNT(*) FROM invoices WHERE tenant_id = 'simulation';
-- Expected: 60-100

-- Check bill count
SELECT COUNT(*) FROM bills WHERE tenant_id = 'simulation';
-- Expected: 40-60

-- Check date distribution
SELECT DATE(invoice_date) as date, COUNT(*) as count
FROM invoices
WHERE tenant_id = 'simulation'
GROUP BY DATE(invoice_date)
ORDER BY date;
-- Should show transactions spread across ~20 weekdays
```

## Bot Testing After Simulation

Once simulation data is created, test the automation bots:

### 1. Accounts Receivable Bot
```bash
# Test AR aging report
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "accounts_receivable", "data": {"tenant_id": "simulation"}}'
```

### 2. Accounts Payable Bot
```bash
# Test AP aging report
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "accounts_payable", "data": {"tenant_id": "simulation"}}'
```

### 3. Financial Reporting Bot
```bash
# Generate financial reports
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "financial_reporting", "data": {"tenant_id": "simulation"}}'
```

## Reporting Validation

### Aged Receivables Report

Expected output:
- Current (0-30 days): R 500,000 - R 800,000
- 31-60 days: R 0 (all invoices are < 30 days old)
- 61-90 days: R 0
- 90+ days: R 0

### Aged Payables Report

Expected output:
- Current (0-30 days): R 300,000 - R 500,000
- 31-60 days: R 0
- 61-90 days: R 0
- 90+ days: R 0

## Cleanup

To remove simulation data:

```sql
-- Delete all simulation data
DELETE FROM invoice_lines WHERE tenant_id = 'simulation';
DELETE FROM invoices WHERE tenant_id = 'simulation';
DELETE FROM bill_lines WHERE tenant_id = 'simulation';
DELETE FROM bills WHERE tenant_id = 'simulation';
DELETE FROM customers WHERE tenant_id = 'simulation';
DELETE FROM suppliers WHERE tenant_id = 'simulation';
```

Or use a cleanup script:

```bash
cd /var/www/aria/backend
python cleanup_simulation.py
```

## Troubleshooting

### Database Connection Errors

```
Error: could not connect to server
```

**Solution**: Verify DATABASE_URL is correct and PostgreSQL is running:
```bash
sudo systemctl status postgresql
psql -U aria_user -d aria_erp -c "SELECT 1"
```

### Duplicate Key Errors

```
Error: duplicate key value violates unique constraint
```

**Solution**: Simulation data already exists. Either:
1. Use a different tenant ID: `export SIM_TENANT_ID="simulation2"`
2. Clean up existing data (see Cleanup section)

### Out of Memory

```
Error: out of memory
```

**Solution**: Reduce transaction volume by editing `month_simulation.py`:
- Reduce customers from 20 to 10
- Reduce daily invoices from 2-5 to 1-2
- Reduce daily bills from 1-3 to 1

## Performance Benchmarks

Expected execution time:
- Master data creation: 2-5 seconds
- Daily transactions (30 days): 30-60 seconds
- Total: ~1 minute

Expected database size increase:
- Customers: ~20 KB
- Suppliers: ~15 KB
- Invoices + lines: ~300 KB
- Bills + lines: ~200 KB
- Total: ~500 KB

## Next Steps

After running the simulation:
1. Verify data in the database
2. Test automation bots with simulation data
3. Generate and review financial reports
4. Test email integration by sending test emails
5. Run the simulation again with production tenant ID for go-live data

## Support

For issues or questions:
1. Check the simulation output for error messages
2. Verify database connectivity
3. Check disk space: `df -h`
4. Review PostgreSQL logs: `sudo journalctl -u postgresql -f`
5. Contact support with error details
