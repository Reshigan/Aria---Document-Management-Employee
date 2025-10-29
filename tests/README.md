# 🧪 ARIA Ultimate Test Suite

## Overview

The ARIA Ultimate Test Suite is a comprehensive automated testing framework that simulates a full month of business transactions across all 67 ARIA bots and 8 ERP modules. It generates realistic master data and tests both positive (successful) and negative (error handling) scenarios.

## Features

✅ **Comprehensive Coverage**
- Tests all 67 ARIA automation bots
- Tests all 8 ERP modules
- Tests integrated cross-module workflows
- Supports positive and negative test scenarios

✅ **Realistic Data Generation**
- Generates master data (companies, suppliers, customers, employees, products)
- Simulates realistic business transactions
- Uses South African localization (VAT, BBBEE, banking, etc.)
- Configurable data volumes

✅ **Flexible Execution Modes**
- **Full Mode**: Test everything (ARIA + ERP + Workflows)
- **ARIA Only**: Test only ARIA bots (standalone)
- **ERP Only**: Test only ERP modules (standalone)
- **Quick Mode**: Fast smoke test

✅ **Detailed Reporting**
- JSON and CSV reports
- Summary statistics
- Error logs with stack traces
- Performance metrics
- Master data exports

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Network access to ARIA production server (for online tests)

### Install Dependencies

```bash
cd tests
pip install -r requirements.txt
```

**Required packages:**
- `requests` - HTTP client for API calls
- `faker` - Realistic fake data generation
- `pandas` - Data analysis and CSV exports

**Optional packages:**
- `pytest` - For additional testing capabilities
- `pyyaml` - For configuration file support

## Usage

### Basic Usage

```bash
# Run full test suite (all bots + ERP + workflows)
python ultimate_test_suite.py

# Test only ARIA bots
python ultimate_test_suite.py --mode aria

# Test only ERP modules
python ultimate_test_suite.py --mode erp

# Quick smoke test (1 day simulation)
python ultimate_test_suite.py --quick

# Simulate 7 days instead of 30
python ultimate_test_suite.py --days 7

# Use custom URL
python ultimate_test_suite.py --url https://staging.aria.vantax.co.za
```

### Advanced Usage

```bash
# Full test with custom configuration
python ultimate_test_suite.py \
  --mode full \
  --days 30 \
  --url https://aria.vantax.co.za

# Standalone ARIA testing (no ERP dependency)
python ultimate_test_suite.py --mode aria --days 7

# Standalone ERP testing (no ARIA bots)
python ultimate_test_suite.py --mode erp --days 7
```

### Offline Testing

The test suite can run in offline mode (without API access) for development:

```bash
# Run without requests library (simulates all tests)
python ultimate_test_suite.py --quick
```

## Test Scenarios

### ARIA Bots (67 total)

The suite tests bots across 10 categories:

1. **Communication (5 bots)**
   - Email processing
   - WhatsApp integration
   - Teams integration
   - Slack integration
   - SMS notifications

2. **Compliance (5 bots)**
   - BBBEE compliance
   - Tax compliance
   - Audit management
   - Risk management
   - Policy management

3. **CRM (8 bots)**
   - Lead management
   - Lead qualification
   - Opportunity management
   - Quote generation
   - Customer service
   - Sales analytics
   - Sales order processing
   - Account management

4. **Documents (6 bots)**
   - Document classification
   - Document scanner
   - Data extraction
   - Data validation
   - Archive management
   - Workflow automation

5. **Financial (12 bots)**
   - Accounts payable
   - Accounts receivable
   - Invoice reconciliation
   - Bank reconciliation
   - Payment processing
   - Expense management
   - General ledger
   - Financial reporting
   - Financial close
   - Tax processing
   - Budget management
   - Cash flow forecasting

6. **Healthcare (5 bots)**
   - Patient management
   - Appointment scheduling
   - Claims processing
   - Medical records
   - Compliance tracking

7. **HR (8 bots)**
   - Recruitment
   - Onboarding
   - Payroll (SA-specific)
   - Time & attendance
   - Performance management
   - Learning & development
   - Benefits administration
   - Employee self-service

8. **Manufacturing (5 bots)**
   - Production scheduling
   - Production reporting
   - Machine monitoring
   - Downtime tracking
   - Operator instructions

9. **Procurement (7 bots)**
   - Purchase orders
   - Supplier management
   - RFQ management
   - Goods receipt
   - Supplier performance
   - Supplier risk
   - Spend analysis

10. **Retail (6 bots)**
    - Sales order management
    - Inventory optimization
    - Category management
    - Price management
    - Promotion management
    - Customer analytics

### ERP Modules (8 total)

1. **Finance & Accounting**
   - General ledger
   - Accounts payable
   - Accounts receivable
   - Fixed assets
   - Cash management

2. **Human Resources**
   - Employee master data
   - Payroll processing
   - Benefits administration
   - Performance management
   - Talent management

3. **Procurement**
   - Purchase requisitions
   - Purchase orders
   - Supplier management
   - Contract management
   - Spend analytics

4. **Sales & Distribution**
   - Sales orders
   - Delivery management
   - Billing
   - Customer master data
   - Pricing

5. **Inventory Management**
   - Stock management
   - Warehouse management
   - Stock movements
   - Stock counting
   - Reorder management

6. **Manufacturing**
   - Production planning
   - Work orders
   - Bill of materials
   - Quality control
   - Shop floor tracking

7. **CRM**
   - Contact management
   - Opportunity tracking
   - Campaign management
   - Service tickets
   - Analytics

8. **Reporting & Analytics**
   - Financial reports
   - Operational reports
   - Executive dashboards
   - Custom reports
   - Data exports

### Integrated Workflows

The suite tests end-to-end business processes:

1. **Procure-to-Pay**
   - Requisition → PO → Receipt → Invoice → Payment

2. **Order-to-Cash**
   - Sales Order → Delivery → Invoice → Payment

3. **Hire-to-Retire**
   - Recruitment → Onboarding → Management → Termination

4. **Plan-to-Produce**
   - Planning → Scheduling → Execution → Completion

5. **Record-to-Report**
   - Transaction Capture → Posting → Reconciliation → Reporting

## Master Data Generated

The test suite generates realistic master data:

- **20 Companies** - With CIPC registration, VAT numbers, BBBEE levels
- **50 Suppliers** - With bank details, payment terms, ratings
- **100 Customers** - Retail, wholesale, corporate, government
- **150 Employees** - With SA ID numbers, UIF, PAYE details
- **500 Products** - With SKUs, pricing, inventory levels

All data uses South African formats and includes:
- SA ID numbers (13 digits)
- VAT numbers (ZA + 10 digits)
- SA banking details (FNB, Standard Bank, ABSA, Nedbank, Capitec)
- BBBEE levels (1-8)
- South African addresses and phone numbers

## Transaction Simulation

The suite simulates realistic business transactions over 30 days:

**Daily Transaction Volumes:**
- 50 invoices processed
- 30 purchase orders created
- 75 sales orders processed
- 100 inventory movements
- 1 payroll run (monthly)

**Monthly Total:**
- ~1,500 invoices
- ~900 purchase orders
- ~2,250 sales orders
- ~3,000 inventory movements
- 1 complete payroll cycle

## Output & Reports

### Directory Structure

```
test_output/
├── master_companies.json        # Generated company master data
├── master_suppliers.json        # Generated supplier master data
├── master_customers.json        # Generated customer master data
├── master_employees.json        # Generated employee master data
├── master_products.json         # Generated product master data
├── test_report_YYYYMMDD_HHMMSS.json  # Detailed JSON report
└── test_report_YYYYMMDD_HHMMSS.csv   # CSV report for analysis
```

### Report Contents

**JSON Report:**
```json
{
  "summary": {
    "total_tests": 80,
    "passed": 76,
    "failed": 2,
    "errors": 2,
    "duration": 245.67,
    "start_time": "2025-10-29T10:00:00",
    "end_time": "2025-10-29T10:04:05"
  },
  "results": [
    {
      "module": "ARIA",
      "test_name": "Invoice Processing Bot",
      "status": "PASS",
      "duration": 1.23,
      "timestamp": "2025-10-29T10:00:05",
      "details": {
        "bot_id": "invoice_processing",
        "category": "financial"
      }
    }
  ]
}
```

**CSV Report:**
- Easy to import into Excel/Sheets
- Sortable by module, status, duration
- Filterable for error analysis

## Configuration

### Environment Variables

```bash
export ARIA_BASE_URL="https://aria.vantax.co.za"
export ARIA_ADMIN_EMAIL="admin@vantax.co.za"
export ARIA_ADMIN_PASSWORD="admin123"
```

### Configuration File

Edit `config.yaml` to customize:
- Master data sizes
- Transaction volumes
- Test scenarios
- Performance thresholds
- Reporting options

## Standalone Mode

### ARIA Standalone (Without ERP)

Test only ARIA bots independently:

```bash
python ultimate_test_suite.py --mode aria
```

**Use Cases:**
- ARIA-only deployments
- Document management focus
- Automation bot testing
- Integration development

### ERP Standalone (Without ARIA)

Test only ERP modules independently:

```bash
python ultimate_test_suite.py --mode erp
```

**Use Cases:**
- ERP-only deployments
- Core business process testing
- Legacy system replacement
- Module-specific testing

## Performance Testing

The suite measures and reports:
- Response times per bot/module
- Throughput (transactions per second)
- Success rates
- Error rates
- Resource utilization

**Performance Thresholds:**
- Max response time: 5 seconds
- Min success rate: 95%
- Max error rate: 5%

## Negative Testing

The suite automatically tests error scenarios:
- Invalid data formats
- Missing required fields
- Duplicate records
- Invalid foreign key references
- Permission denied errors
- Network timeouts
- Data validation failures

**Error Rate:** 10% of transactions are negative tests

## Best Practices

1. **Run Before Deployment**
   ```bash
   python ultimate_test_suite.py --quick
   ```
   Catch issues before they reach production

2. **Run After Deployment**
   ```bash
   python ultimate_test_suite.py --mode full
   ```
   Verify everything works in production

3. **Regular Regression Testing**
   ```bash
   # Daily
   python ultimate_test_suite.py --quick
   
   # Weekly
   python ultimate_test_suite.py --mode full
   ```

4. **Performance Baseline**
   ```bash
   python ultimate_test_suite.py --days 30
   ```
   Establish baseline metrics for comparison

5. **Standalone Component Testing**
   ```bash
   # Test ARIA independently
   python ultimate_test_suite.py --mode aria
   
   # Test ERP independently
   python ultimate_test_suite.py --mode erp
   ```

## Troubleshooting

### Issue: "requests module not found"

```bash
pip install requests
```

### Issue: "faker module not found"

```bash
pip install faker
```

### Issue: "Authentication failed"

Check credentials:
```bash
python -c "import requests; r = requests.post('https://aria.vantax.co.za/api/auth/login', json={'email': 'admin@vantax.co.za', 'password': 'admin123'}); print(r.status_code, r.json())"
```

### Issue: "Cannot connect to server"

Check network and URL:
```bash
curl https://aria.vantax.co.za/api/bots
```

### Issue: "Tests timing out"

Increase timeout in code or reduce transaction volume:
```bash
python ultimate_test_suite.py --quick
```

## CI/CD Integration

### GitHub Actions

```yaml
name: ARIA Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd tests
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd tests
          python ultimate_test_suite.py --quick
```

### GitLab CI

```yaml
test:
  image: python:3.9
  script:
    - cd tests
    - pip install -r requirements.txt
    - python ultimate_test_suite.py --quick
```

## Support

For issues or questions:
- Check the main DEPLOYMENT_README.md
- Review PRODUCTION_CONFIG.md
- Check test output logs in `test_output/`

## License

Part of the ARIA Document Management & ERP System
© 2025 Vanta X Pty Ltd
