# 🚀 ARIA Bot Testing - Quick Reference Card

## 📦 All 67 Bots Overview

### 🏦 Financial (11)
1. Accounts Payable ✅
2. AR Collections ✅
3. Bank Reconciliation ✅
4. Expense Management ✅
5. Financial Close ✅
6. Financial Reporting ✅
7. General Ledger ✅
8. Invoice Reconciliation ✅
9. Payment Processing ✅
10. Tax Compliance (SA) ✅
11. B-BBEE Compliance ✅

### 📦 Procurement (11)
12. Purchase Order ✅
13. Supplier Management ✅
14. Supplier Performance ✅
15. Supplier Risk ✅
16. RFQ Management ✅
17. Procurement Analytics ✅
18. Spend Analysis ✅
19. Source-to-Pay ✅
20. Goods Receipt ✅
21. Inventory Optimization ✅
22. Supplier Onboarding ✅

### 🏭 Manufacturing (11)
23. Production Scheduling ✅
24. Production Reporting ✅
25. Work Order ✅
26. Quality Control ✅
27. Downtime Tracking ✅
28. Machine Monitoring ✅
29. OEE Calculation ✅
30. MES Integration ✅
31. Tool Management ✅
32. Scrap Management ✅
33. Operator Instructions ✅

### 💼 Sales & CRM (7)
34. Sales Order ✅
35. Quote Generation ✅
36. Lead Management ✅
37. Lead Qualification ✅
38. Opportunity Management ✅
39. Sales Analytics ✅
40. Customer Onboarding ✅

### 👥 HR & Payroll (8)
41. Time & Attendance ✅
42. Payroll (SA) ✅
43. Benefits Administration ✅
44. Recruitment ✅
45. Onboarding ✅
46. Performance Management ✅
47. Learning & Development ✅
48. Employee Self-Service ✅

### 📄 Documents (7)
49. Document Classification ✅
50. Document Scanner ✅
51. Data Extraction ✅
52. Data Validation ✅
53. Archive Management ✅
54. Email Processing ✅
55. Category Management ✅

### ⚖️ Governance (5)
56. Contract Management ✅
57. Policy Management ✅
58. Audit Management ✅
59. Risk Management ✅
60. Workflow Automation ✅

### 📦 Operations (7)
61. Delivery Scheduling ✅
62. Reorder Point ✅
63. Customer Service ✅
64. Equipment Maintenance ✅
65. Asset Management ✅
66. Fleet Management ✅
67. Warehouse Management ✅

---

## 🎯 Quick Test Commands

### 1. Run Full Test Suite
```bash
python test_all_67_bots.py
```

### 2. Test Individual Bot (API)
```bash
# Using curl
curl -X POST http://localhost:8000/api/bots/accounts_payable/execute \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"auto_approve_limit": 10000}}'

# Using PowerShell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/bots/accounts_payable/execute -ContentType "application/json" -Body '{"inputs": {"auto_approve_limit": 10000}}'
```

### 3. List All Bots
```bash
# Get all bots
curl http://localhost:8000/api/bots

# PowerShell
Invoke-RestMethod -Uri http://localhost:8000/api/bots
```

### 4. Get Bot Configuration
```bash
curl http://localhost:8000/api/bots/accounts_payable/config
```

---

## ✅ Expected Behaviors

### Financial Bots
- **Accounts Payable**: Auto-approve < R10K, route others
- **AR Collections**: Send reminders for 30+ days overdue
- **Bank Reconciliation**: Match 90%+ transactions
- **Tax Compliance**: Calculate VAT @ 15%, UIF @ 1% (capped)
- **B-BBEE**: Track scorecard, supplier compliance

### Procurement Bots
- **PO Agent**: Auto-approve under limit, route others
- **Supplier Management**: Verify B-BBEE compliance
- **Goods Receipt**: Match to PO, flag variances

### Manufacturing Bots
- **Production Scheduling**: Optimize for throughput/due dates
- **OEE Calculation**: Calculate availability × performance × quality
- **Quality Control**: Auto-pass/fail based on tolerances

### Sales Bots
- **Lead Qualification**: Score leads 0-100
- **Quote Generation**: Apply discounts, calculate margin
- **Order Processing**: Credit check before confirmation

### HR Bots
- **Payroll (SA)**: Calculate PAYE, UIF (R177.12 cap), SDL
- **Time & Attendance**: Track overtime > 40hrs/week
- **Performance Management**: 360° feedback optional

---

## 📊 Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Success Rate | > 95% | ⏳ Testing |
| Response Time | < 2s | ⏳ Testing |
| Data Accuracy | > 98% | ⏳ Testing |
| Error Handling | 100% graceful | ⏳ Testing |

---

## 🔧 Troubleshooting

### Bot Not Found
```
Error: Bot 'xyz' not found
Solution: Check bot ID matches registry
```

### Timeout Errors
```
Error: Request timeout
Solution: Increase timeout in test script (default 10s)
```

### Missing Data
```
Error: No data returned
Solution: Check backend data sources, run migrations
```

### Authentication Errors
```
Error: 401 Unauthorized
Solution: Add Bearer token to request headers
```

---

## 💡 Pro Tips

1. **Test by Category**: Test all financial bots together
2. **Check Logs**: Monitor backend logs during testing
3. **South African Data**: All bots use SA context (Rand, B-BBEE, SARS)
4. **Mock Data**: Bots work with mock data in dev environment
5. **Parallel Testing**: Can run multiple bots simultaneously

---

## 📱 Testing Interfaces

### 1. Frontend UI
```
URL: http://localhost:12001
Path: Agents → Bot Marketplace
Action: Click on bot → View details → Run Bot
```

### 2. Backend API
```
URL: http://localhost:8000
Docs: http://localhost:8000/docs (Swagger)
```

### 3. Cloudflare Workers
```
URL: (Your Cloudflare Workers URL)
Endpoint: POST /run
```

---

## 📝 Test Report Format

```
Bot: Accounts Payable Agent
Status: ✅ PASS
Response Time: 1.2s
Output:
  - invoices_processed: 15
  - approved_count: 12
  - pending_approval: 3
```

---

## 🎉 Quick Wins

### Must Test First (Core 10)
1. ✅ Accounts Payable
2. ✅ AR Collections
3. ✅ Bank Reconciliation
4. ✅ Payroll (SA)
5. ✅ Tax Compliance
6. ✅ Purchase Order
7. ✅ Sales Order
8. ✅ Lead Qualification
9. ✅ Production Scheduling
10. ✅ Document Scanner

### SA-Specific Bots (Critical)
- ✅ Tax Compliance (VAT, PAYE, UIF, SDL)
- ✅ Payroll SA (SARS tax tables)
- ✅ B-BBEE Compliance (Scorecard)

---

## 📞 Get Help

**Documentation**:
- Full Guide: `BOT_TESTING_GUIDE_67_BOTS.md`
- Bot Registry: `workers-api/src/routes/bots.ts`
- Backend: `backend/app/bots/`

**Key Files**:
- Test Script: `test_all_67_bots.py`
- Bot Manager: `backend/app/bots/bot_manager.py`
- API: `backend/minimal_local.py`

---

## ⚡ One-Liner Tests

```bash
# Test Financial Category Only
python -c "from test_all_67_bots import *; run_bot_tests({k:v for k,v in ALL_BOTS.items() if v['category']=='Financial'})"

# Test Top 10 Bots
python test_all_67_bots.py --top-10

# Generate Report Only
python -c "from test_all_67_bots import *; import json; generate_report(json.load(open('bot_test_report_latest.json')))"
```

---

**Happy Testing! 🚀**

For support: Check documentation or review bot implementation files.
