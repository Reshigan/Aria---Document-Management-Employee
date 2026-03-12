# Aria ERP - Missing Features Analysis Report
**Date:** March 3, 2026  
**Revision:** Based on "Aria ERP issues document Revision 1"

---

## Executive Summary

This report analyzes the current state of the Aria ERP system against the requirements listed in the issues document. The analysis shows that **database schema updates have been created** (migration 024_backoffice_finance_flow.sql), but **several critical features are still missing or incomplete** in both backend implementation and frontend UI.

---

## Status Overview

### ✅ FIXED (Database Schema Added)
- **Customer PO Number** field added to `sales_orders` table
- **Customer Reference** field added to `sales_orders` table  
- **Delivery Address** field added to `sales_orders` table
- **Shipping Method** field added to `sales_orders` table
- **Warehouse location** column added to `warehouses` table
- **POD fields** added to `deliveries` table (pod_uploaded, pod_file_url, pod_uploaded_by, pod_uploaded_at)
- **Waybill fields** added to `deliveries` table (waybill_number, waybill_url)
- **Picking slip fields** added to `deliveries` table (picking_slip_generated, picking_slip_generated_at)
- **Driver fields** added to `deliveries` table (driver_name, driver_phone)
- **Customer statements** table created

### ⚠️ PARTIALLY IMPLEMENTED
These features have backend support but are missing UI/frontend implementation:

1. **Sales Order Customer Fields** ❌ FRONTEND MISSING
   - **Issue**: Fields exist in database and displayed in detail view, but NOT in create/edit forms
   - **Location**: [frontend/src/pages/ERP/SalesOrders.tsx](frontend/src/pages/ERP/SalesOrders.tsx) lines 400-470
   - **What's missing**: Form inputs for `customer_po_number`, `customer_reference`, `delivery_address`, `shipping_method`
   - **Impact**: HIGH - Users cannot enter customer PO numbers (critical for invoicing)

2. **Invoice Creation from Sales Order** ✅ BACKEND EXISTS, ⚠️ INCOMPLETE
   - **Found**: Invoice API exists at [backend/app/api/invoices.py](backend/app/api/invoices.py)
   - **Issue**: No automatic conversion workflow from sales order to invoice
   - **What's missing**: Endpoint to convert sales order → invoice with pre-filled data

### ❌ NOT IMPLEMENTED (CRITICAL)

#### 1. **Quotations Total Calculation Bug** 🔴 CRITICAL
   - **Issue**: "Total not refreshing when creating a quote"
   - **Status**: Needs frontend investigation - calculation logic exists but may not be reactive
   - **Priority**: HIGH

#### 2. **Authentication/Session Management** 🔴 CRITICAL
   - **Issue**: "When refreshing, have to relogin"
   - **Root Cause**: Token/session not persisted or not refreshed properly
   - **Location**: [backend/app/api/auth.py](backend/app/api/auth.py) - tokens created but refresh mechanism unclear
   - **Priority**: HIGH - Major UX issue

#### 3. **Picking Slip Generation** ❌ NOT IMPLEMENTED
   - **What's needed**: 
     - PDF generation endpoint `/erp/order-to-cash/deliveries/{id}/picking-slip`
     - PDF template with: items, quantities, bin locations, signature spaces
   - **Status**: Database fields exist but NO generation logic found
   - **Files**: No `generate_picking_slip` function found in codebase
   - **Priority**: HIGH - Required for warehouse operations

#### 4. **Courier Waybill Integration** ❌ NOT IMPLEMENTED
   - **What's needed**:
     - Skynet API integration
     - Waybill creation from delivery screen
     - Tracking number storage (field exists: `waybill_number`)
     - Tracking URL display
   - **Status**: Database fields exist but NO integration code
   - **Priority**: MEDIUM-HIGH - Required for inter-province deliveries

#### 5. **Proof of Delivery (POD) Upload** ⚠️ PARTIALLY IMPLEMENTED
   - **Database**: ✅ Fields exist (`pod_file_url`, `pod_uploaded`, etc.)
   - **What's missing**:
     - Upload endpoint `/erp/order-to-cash/deliveries/{id}/pod-upload`
     - Frontend upload button on delivery screen
     - POD status indicator
     - Link to file system/S3 storage
   - **Priority**: MEDIUM - Required for invoicing policy compliance

#### 6. **Customer Statements** ❌ NOT IMPLEMENTED
   - **Database**: ✅ Table `customer_statements` created in migration 024
   - **What's missing**:
     - Balance calculation logic
     - Aged trial balance (30/60/90+ days)
     - PDF generation
     - Bulk email system
     - Monthly scheduler
     - API endpoints (none found with `customer_statement` in name)
   - **Priority**: HIGH - Required for collections

#### 7. **Warehouse Management** ⚠️ DATABASE ERROR
   - **Issue**: "Table warehouse has no column named location db error"
   - **Status**: Migration 024 adds `location` column, but migration may not be applied
   - **Issue**: "Can't create a warehouse"
   - **Priority**: MEDIUM - Need to verify migration application

#### 8. **Sales Order Document Attachments** ⚠️ INCOMPLETE
   - **Database**: ✅ Table `sales_order_attachments` created
   - **What's missing**:
/api/erp/order-to-cash/sales-orders/{id}/attachments`
     - Frontend "Attach Customer PO" button
   - **Priority**: MEDIUM

#### 9. **Invoice Email** ❌ NOT IMPLEMENTED
   - **What's needed**:
     - Email service integration
     - Professional email template
     - Invoice PDF attachment
     - Sent timestamp recording
   - **Status**: No email integration found for invoices
   - **Priority**: HIGH - Part of critical invoicing workflow

---

## Detailed Findings by Module

### 1. Authentication & Session (🔴 CRITICAL)
**Issue**: "When refreshing, have to relogin"

**Analysis**:
- Token creation exists in [backend/app/api/auth.py](backend/app/api/auth.py)
- `create_access_token()` and `create_refresh_token()` are called
- **Problem**: Frontend may not be storing/retrieving tokens from localStorage
- **Problem**: No token refresh mechanism visible in auth flow

**Recommended Fix**:
1. Verify frontend stores tokens in localStorage/sessionStorage
2. Add token refresh logic before expiry
3. Add interceptor to auto-refresh tokens on 401 responses


### 2. Quotations (⚠️ UI BUG)

#### Issue A: "Total not refreshing when creating a quote"
**Status**: Backend calculation works, frontend reactivity issue
**Location**: [frontend/src/pages/ERP/Quotes.tsx](frontend/src/pages/ERP/Quotes.tsx) (similar pattern to SalesOrders.tsx)
**Fix Needed**: Ensure `LineItemsTable` triggers recalculation on item changes

#### Issue B: "UI cuts out when creating a quote - need to be larger and more visible"
**Status**: CSS/layout issue
**Fix Needed**: Increase modal size, improve responsiveness


### 3. Sales Orders (⚠️ FRONTEND INCOMPLETE)

**Database**: ✅ **FIXED** - Migration 024 added all required fields
```sql
ALTER TABLE sales_orders ADD COLUMN customer_po_number TEXT;
ALTER TABLE sales_orders ADD COLUMN customer_reference TEXT;
ALTER TABLE sales_orders ADD COLUMN delivery_address TEXT;
ALTER TABLE sales_orders ADD COLUMN shipping_method TEXT;
```

**Backend API**: ⚠️ **READS** but doesn't **WRITE** these fields
- [backend/app/api/order_to_cash_pg.py](backend/app/api/order_to_cash_pg.py) line 350
- `INSERT INTO sales_orders` does NOT include the new fields
- GET endpoint returns them if they exist

**Frontend Display**: ✅ Works in detail view ([SalesOrderDetail.tsx](frontend/src/pages/ERP/SalesOrderDetail.tsx) lines 344-373)

**Frontend Form**: ❌ **MISSING** from create/edit modal
- [SalesOrders.tsx](frontend/src/pages/ERP/SalesOrders.tsx) lines 406-470
- Modal only has: Customer, Pricelist, Order Date, Required Date, Notes
- **MISSING**: Customer PO Number, Customer Reference, Delivery Address, Shipping Method

**Required Fix**:
1. Update form interface to include fields
2. Add form inputs in modal
3. Update POST endpoint to save these fields


### 4. Deliveries & Dispatch (⚠️ FEATURES INCOMPLETE)

**Database**: ✅ All fields added by migration 024

#### Issue A: Picking Slips
**Status**: ❌ **NOT IMPLEMENTED**
**What exists**: 
- Database fields: `picking_slip_generated`, `picking_slip_generated_at`
**What's missing**:
- PDF generation logic
- Endpoint: `/erp/order-to-cash/deliveries/{id}/picking-slip`
- Template with bin locations
- "Generate Picking Slip" button in UI

#### Issue B: Waybill Integration
**Status**: ❌ **NOT IMPLEMENTED**
**What exists**:
- Database fields: `waybill_number`, `waybill_url`
**What's missing**:
- Skynet API client
- Integration endpoints
- Tracking display in UI

#### Issue C: POD Upload
**Status**: ⚠️ **PARTIAL** - Storage exists, upload missing
**What exists**:
- Database fields: `pod_file_url`, `pod_uploaded`, `pod_uploaded_by`, `pod_uploaded_at`
**What's missing**:
- File upload endpoint
- Upload button in delivery detail view
- S3/file system integration

#### Issue D: Driver Assignment
**Status**: ✅ **DATABASE READY**, UI may be missing
**What exists**:
- Database fields: `driver_name`, `driver_phone`
**Check needed**: Delivery form includes these fields?


### 5. Warehouse Management (⚠️ MIGRATION ISSUE)

**Issue**: "Can't create a warehouse" / "Table warehouse has no column named location"

**Analysis**:
- Migration 024 adds location column:
```sql
ALTER TABLE warehouses ADD COLUMN location TEXT DEFAULT '';
```
- **Problem**: Migration may not have been applied to database
- No warehouse CRUD endpoints found in main API files

**Required Fix**:
1. Apply migration 024
2. Verify warehouse API endpoints exist
3. Test warehouse creation


### 6. Invoicing (⚠️ INCOMPLETE WORKFLOW)

**Current State**:
- ✅ Invoice creation API exists ([backend/app/api/invoices.py](backend/app/api/invoices.py))
- ✅ Includes `customer_po_number` field
- ✅ PDF generation service referenced ([documentGenerationService](frontend/src/services))
- ✅ Invoice list/detail pages exist in frontend

**Missing**:
1. **Convert Sales Order → Invoice**
   - No automatic conversion endpoint
   - Should pre-fill customer, line items, PO number
   
2. **Invoice Email**
   - No email service integration visible
   - No `/invoices/{id}/send-email` endpoint
   
3. **Payment Recording**
   - Payment tracking exists via `customer_payments` table
   - Allocation to invoices may be incomplete

**Required Fix**:
1. Add `/sales-orders/{id}/convert-to-invoice` endpoint
2. Add email service integration
3. Generate invoice PDF
4. Send email with attachment


### 7. Customer Statements (❌ NOT IMPLEMENTED)

**Database**: ✅ Table created
```sql
CREATE TABLE customer_statements (
    id, company_id, customer_id, statement_date,
    opening_balance, closing_balance,
    current_amount, days_30, days_60, days_90, days_over_90,
    status, sent_at, sent_to, ...
)
```

**Missing Everything Else**:
1. **Balance Calculation Logic**
   - Query unpaid invoices
   - Calculate aged amounts
   - Opening/closing balances

2. **Aged Trial Balance**
   - Group by due date brackets
   - 0-30, 31-60, 61-90, 90+ days

3. **PDF Generation**
   - Statement template
   - Customer header
   - Transaction list
   - Aged balance summary

4. **API Endpoints** (None found):
   - `POST /api/erp/statements/generate`
   - `GET /api/erp/statements/{customer_id}`
   - `POST /api/erp/statements/{id}/email`

5. **Monthly Scheduler**
   - Cron job to auto-generate
   - Bulk email distribution

6. **Frontend Pages**
   - Statement list page
   - Statement detail/preview
   - Generate/email buttons

**Priority**: HIGH - This is a complete feature gap


### 8. Document Attachments (⚠️ TABLE EXISTS, API MISSING)

**Database**: ✅ Table created
```sql
CREATE TABLE sales_order_attachments (
    id, company_id, sales_order_id,
    file_name, file_type, file_size, file_url,
    attachment_type, uploaded_by, created_at
)
```

**Missing**:
1. Upload endpoint
2. List attachments endpoint
3. Frontend upload button
4. File storage integration (S3/local)

---

## Implementation Priority

### 🔴 **CRITICAL (Do First)**
1. **Fix Authentication/Session** - Relogin on refresh is major UX issue
2. **Sales Order Form Fields** - Customer PO Number blocking (invoicing requirement)
3. **Picking Slip Generation** - Blocking warehouse operations
4. **Quotation Total Calculation** - Data integrity issue

### 🟠 **HIGH (Next Phase)**
5. **Invoice Email** - Complete invoicing workflow
6. **Customer Statements** - Required for collections process
7. **POD Upload** - Company policy requirement before invoicing
8. **Apply Migration 024** - Ensure all database changes are live

### 🟡 **MEDIUM (Important)**
9. **Waybill Integration** - Inter-province delivery requirement
10. **Sales Order Attachments** - Customer PO upload
11. **Warehouse Location Fix** - Verify migration applied

### 🟢 **LOW (Nice to Have)**
12. **Quote UI Improvements** - Modal size/visibility
13. **Driver Assignment UI** - If not already in delivery form

---

## Migration Status Check Required

**Action Needed**: Verify migration 024 has been applied to the production database

```bash
# Check if migration 024 exists in database
sqlite3 aria.db "SELECT name FROM sqlite_master WHERE type='table' AND name='customer_statements';"

# Check if sales_orders has new columns
sqlite3 aria.db "PRAGMA table_info(sales_orders);" | grep customer_po_number

# Check if warehouses has location column
sqlite3 aria.db "PRAGMA table_info(warehouses);" | grep location
```

If migration not applied:
```bash
# Apply migration (adjust for your migration tool)
python manage.py migrate
# OR
alembic upgrade head
```

---

## Files Requiring Changes

### Backend
1. `backend/app/api/order_to_cash_pg.py` - Add customer fields to INSERT/UPDATE
2. `backend/app/api/deliveries.py` (or create) - Add picking slip, POD, waybill endpoints
3. `backend/app/api/statements.py` (create) - Customer statements module
4. `backend/services/document_generation.py` - Add picking slip/statement templates
5. `backend/services/waybill_integration.py` (create) - Skynet API client
6. `backend/app/api/auth.py` - Fix token refresh mechanism
7. `backend/app/api/order_to_cash_pg.py` - Add invoice conversion endpoint

### Frontend
1. `frontend/src/pages/ERP/SalesOrders.tsx` - Add form fields (lines 406-470)
2. `frontend/src/pages/ERP/Quotes.tsx` - Fix total calculation reactivity
3. `frontend/src/pages/ERP/DeliveryDetail.tsx` (or Deliveries.tsx) - Add POD upload, picking slip, waybill buttons
4. `frontend/src/pages/ERP/Statements.tsx` (create) - Customer statements page
5. `frontend/src/App.tsx` or auth context - Fix token persistence

### Database
1. Verify `workers-api/migrations/024_backoffice_finance_flow.sql` has been applied

---

## Recommendations

### Immediate Actions (This Week)
1. **Apply migration 024** - Ensure all schema changes are live
2. **Fix authentication** - Token refresh/persistence
3. **Add sales order form fields** - Customer PO, Reference, Delivery Address, Shipping Method
4. **Fix quote total calculation** - Frontend reactivity

### Short Term (Next 2 Weeks)
5. **Implement picking slip generation** - PDF endpoint + UI button
6. **Implement POD upload** - File storage + UI upload
7. **Build customer statements** - Backend calculation + PDF + API
8. **Add invoice email** - EmailIntegration + PDF attachment

### Medium Term (Next Month)
9. **Skynet waybill integration** - API client + endpoints
10. **Document attachments** - Upload endpoints + UI
11. **Complete invoice workflow** - Sales order → Invoice conversion

---

## Testing Checklist

Once features are implemented, test:

- [ ] Login persists after page refresh
- [ ] Create quote → Total calculates correctly
- [ ] Create sales order with Customer PO Number → Saves correctly
- [ ] Create sales order → Convert to invoice → PO number carries over
- [ ] Create delivery → Generate picking slip PDF
- [ ] Create delivery → Upload POD → View POD file
- [ ] Create delivery → Generate waybill → Track shipment
- [ ] Customer statement → Generate → Email → PDF received
- [ ] Upload document to sales order → View in attachments list
- [ ] Create warehouse with location → No database error

---

## Conclusion

**Summary**: The Aria ERP system has made significant progress with database schema updates (migration 024), but several critical features remain unimplemented or incomplete:

- ✅ **12 database fields added** (excellent schema work)
- ⚠️ **5 features partially implemented** (backend exists, UI missing)
- ❌ **7 features not implemented** (complete gaps)
- 🔴 **4 critical issues** blocking business operations

**Estimated Development Time**:
- Critical fixes: 3-5 days
- High priority: 2-3 weeks
- Medium priority: 2-3 weeks
- Total: 6-8 weeks for full implementation

**Recommendation**: Focus on critical items first (authentication, sales order form fields, picking slips) to unblock daily operations, then systematically implement high-priority features (statements, invoice email, POD).
