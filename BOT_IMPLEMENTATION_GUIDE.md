# 🤖 Bot Implementation Guide
## Step-by-Step Process for Implementing Real Bot Logic

**Based on successful General Ledger Bot implementation**

---

## 📋 Overview

This guide shows the exact steps to convert a bot from **mock data** to **real production logic**.

**Example:** We successfully converted the General Ledger Bot from returning hardcoded data to performing real database operations with full double-entry accounting.

**Pattern:** The same approach works for all 61 bots.

---

## 🎯 The 5-Step Process

### Step 1: Identify Business Logic Requirements

**For General Ledger Bot, we identified:**
- Post journal entries with double-entry validation
- Calculate trial balance from actual transactions
- Generate financial statements from real data
- Support period close/open controls
- Maintain audit trail

**For your bot:**
1. List all operations the bot needs to perform
2. Define validation rules
3. Identify data models needed
4. Map out workflows

**Time:** 1-2 hours

---

### Step 2: Create Database Models

**What we created for GL Bot:**

```python
# backend/app/models/journal_entry.py
class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True)
    reference = Column(String(50), unique=True)
    entry_date = Column(Date, nullable=False)
    description = Column(String(500))
    status = Column(Enum(EntryStatus), default=EntryStatus.DRAFT)
    total_debit = Column(Numeric(15, 2))
    total_credit = Column(Numeric(15, 2))
    # ... more fields
    
    lines = relationship("JournalLine", back_populates="entry")

class JournalLine(Base):
    __tablename__ = "journal_lines"
    
    id = Column(Integer, primary_key=True)
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'))
    account_number = Column(String(20))
    debit_amount = Column(Numeric(15, 2))
    credit_amount = Column(Numeric(15, 2))
    # ... more fields
```

**For your bot:**
1. Create models in `backend/app/models/`
2. Define relationships
3. Add indexes for performance
4. Add constraints for data integrity

**Time:** 2-4 hours per model

---

### Step 3: Implement Service Layer

**What we created for GL Bot:**

```python
# backend/app/services/posting_engine.py
class PostingEngine:
    def __init__(self, db: Session):
        self.db = db
    
    def post_journal_entry(self, entry_date, description, lines):
        # 1. Validate balanced entry
        total_debit = sum(line['debit'] for line in lines)
        total_credit = sum(line['credit'] for line in lines)
        if abs(total_debit - total_credit) > 0.01:
            raise ValidationError("Entry not balanced")
        
        # 2. Validate accounts exist
        for line in lines:
            account = self.db.query(Account).filter_by(
                account_number=line['account']
            ).first()
            if not account:
                raise ValidationError(f"Account {line['account']} not found")
        
        # 3. Validate period is open
        period = self._get_period(entry_date)
        if period.status != PeriodStatus.OPEN:
            raise ValidationError("Period is closed")
        
        # 4. Create journal entry
        entry = JournalEntry(
            reference=self._generate_reference(),
            entry_date=entry_date,
            description=description,
            total_debit=total_debit,
            total_credit=total_credit,
            status=EntryStatus.POSTED
        )
        self.db.add(entry)
        
        # 5. Create lines
        for i, line in enumerate(lines):
            journal_line = JournalLine(
                journal_entry_id=entry.id,
                line_number=i + 1,
                account_number=line['account'],
                debit_amount=line['debit'],
                credit_amount=line['credit']
            )
            self.db.add(journal_line)
        
        # 6. Update GL balances
        self._update_gl_balances(entry, lines)
        
        # 7. Commit transaction
        self.db.commit()
        
        return {
            'success': True,
            'reference': entry.reference,
            'entry_id': entry.id
        }
```

**Key principles:**
1. **Separation of concerns:** Service handles business logic, bot handles orchestration
2. **Validation first:** Validate all data before modifying database
3. **Transaction safety:** Use database transactions, rollback on error
4. **Error handling:** Return structured error responses
5. **Audit trail:** Log all operations
6. **Performance:** Use bulk operations where possible

**For your bot:**
1. Create service class in `backend/app/services/`
2. Implement each business operation as a method
3. Add validation for each operation
4. Use database transactions
5. Return structured responses

**Time:** 4-8 hours per service

---

### Step 4: Update Bot to Use Service

**What we changed in GL Bot:**

**BEFORE:**
```python
class GeneralLedgerBot(FinancialBot):
    def __init__(self):
        super().__init__(
            bot_id="gl_bot_001",
            name="General Ledger Bot"
        )
    
    async def _post_journal_entry(self, journal_entry):
        # MOCK DATA
        doc_number = "JE-" + str(random.randint(1000, 9999))
        return {
            "success": True,
            "doc_number": doc_number,
            "total_debits": 50000,  # HARDCODED!
            "total_credits": 50000
        }
```

**AFTER:**
```python
class GeneralLedgerBot(FinancialBot):
    def __init__(self, db: Session = None):
        super().__init__(
            bot_id="gl_bot_001",
            name="General Ledger Bot"
        )
        self.db = db
        self.gl_service = GeneralLedgerService(db) if db else None
    
    async def _post_journal_entry(self, journal_entry):
        # REAL DATABASE OPERATIONS
        if not self.gl_service:
            return {
                "success": False,
                "error": "Database connection not available"
            }
        
        result = self.gl_service.post_journal_entry(journal_entry)
        
        if result['success']:
            logger.info(f"Posted entry: {result['reference']}")
        
        return result
```

**For your bot:**
1. Add `db: Session` parameter to `__init__`
2. Initialize service in `__init__`
3. Replace mock data returns with service calls
4. Add database connection checks
5. Keep error handling in bot layer

**Time:** 2-4 hours

---

### Step 5: Test, Test, Test!

**What we should test for GL Bot:**

```python
# tests/test_posting_engine.py
class TestPostingEngine:
    def test_post_balanced_entry(self):
        # Arrange
        entry_data = {
            'date': '2025-10-27',
            'description': 'Test entry',
            'lines': [
                {'account': '1100', 'debit': 1000, 'credit': 0},
                {'account': '4000', 'debit': 0, 'credit': 1000}
            ]
        }
        
        # Act
        result = posting_engine.post_journal_entry(**entry_data)
        
        # Assert
        assert result['success'] == True
        assert result['reference'].startswith('JE-')
        
        # Verify in database
        entry = db.query(JournalEntry).filter_by(
            reference=result['reference']
        ).first()
        assert entry is not None
        assert entry.total_debit == 1000
        assert entry.total_credit == 1000
    
    def test_unbalanced_entry_rejected(self):
        entry_data = {
            'date': '2025-10-27',
            'description': 'Unbalanced entry',
            'lines': [
                {'account': '1100', 'debit': 1000, 'credit': 0},
                {'account': '4000', 'debit': 0, 'credit': 900}  # NOT BALANCED!
            ]
        }
        
        result = posting_engine.post_journal_entry(**entry_data)
        
        assert result['success'] == False
        assert 'not balanced' in result['error'].lower()
    
    def test_invalid_account_rejected(self):
        entry_data = {
            'date': '2025-10-27',
            'description': 'Invalid account',
            'lines': [
                {'account': '9999', 'debit': 1000, 'credit': 0},  # DOESN'T EXIST!
                {'account': '4000', 'debit': 0, 'credit': 1000}
            ]
        }
        
        result = posting_engine.post_journal_entry(**entry_data)
        
        assert result['success'] == False
        assert 'not found' in result['error'].lower()
```

**Test types:**
1. **Unit tests:** Test each method in isolation
2. **Integration tests:** Test service + database
3. **End-to-end tests:** Test full bot workflow
4. **Performance tests:** Test with large data volumes
5. **Error handling tests:** Test all error scenarios

**Time:** 4-8 hours per bot

---

## 📚 Example: Accounts Payable Bot

Let's walk through implementing the AP bot:

### Step 1: Requirements
- Process vendor invoices
- Match to purchase orders
- Schedule payments
- Track aging
- Generate 1099 reports

### Step 2: Models

```python
# backend/app/models/vendor_invoice.py
class VendorInvoice(Base):
    __tablename__ = "vendor_invoices"
    
    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(50), unique=True)
    vendor_id = Column(Integer, ForeignKey('vendors.id'))
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    total_amount = Column(Numeric(15, 2))
    status = Column(Enum(InvoiceStatus))  # PENDING, APPROVED, PAID
    payment_terms = Column(String(50))
    
    # Relationships
    vendor = relationship("Vendor")
    lines = relationship("InvoiceLine")
    payments = relationship("Payment")

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey('vendor_invoices.id'))
    description = Column(String(500))
    quantity = Column(Numeric(10, 2))
    unit_price = Column(Numeric(15, 2))
    line_total = Column(Numeric(15, 2))
    gl_account = Column(String(20))  # For posting to GL
```

### Step 3: Service

```python
# backend/app/services/accounts_payable_service.py
class AccountsPayableService:
    def __init__(self, db: Session):
        self.db = db
        self.gl_service = GeneralLedgerService(db)  # Use GL service!
    
    def process_invoice(self, invoice_data):
        # 1. Validate vendor exists
        vendor = self.db.query(Vendor).filter_by(
            id=invoice_data['vendor_id']
        ).first()
        if not vendor:
            return {'success': False, 'error': 'Vendor not found'}
        
        # 2. Check for duplicates
        existing = self.db.query(VendorInvoice).filter_by(
            vendor_id=vendor.id,
            invoice_number=invoice_data['invoice_number']
        ).first()
        if existing:
            return {'success': False, 'error': 'Duplicate invoice'}
        
        # 3. Create invoice
        invoice = VendorInvoice(
            invoice_number=invoice_data['invoice_number'],
            vendor_id=vendor.id,
            invoice_date=invoice_data['invoice_date'],
            due_date=invoice_data['due_date'],
            total_amount=invoice_data['total_amount'],
            status=InvoiceStatus.PENDING
        )
        self.db.add(invoice)
        
        # 4. Create invoice lines
        for line_data in invoice_data['lines']:
            line = InvoiceLine(
                invoice_id=invoice.id,
                description=line_data['description'],
                quantity=line_data['quantity'],
                unit_price=line_data['unit_price'],
                line_total=line_data['quantity'] * line_data['unit_price'],
                gl_account=line_data['gl_account']
            )
            self.db.add(line)
        
        # 5. Post to GL (DR: Expense, CR: AP)
        journal_entry = {
            'date': invoice_data['invoice_date'],
            'description': f"Invoice {invoice.invoice_number} - {vendor.name}",
            'lines': []
        }
        
        # Debit expense accounts
        for line in invoice_data['lines']:
            journal_entry['lines'].append({
                'account': line['gl_account'],
                'debit': line['quantity'] * line['unit_price'],
                'credit': 0
            })
        
        # Credit AP account
        journal_entry['lines'].append({
            'account': '2100',  # AP account
            'debit': 0,
            'credit': invoice_data['total_amount']
        })
        
        # Post to GL
        gl_result = self.gl_service.post_journal_entry(journal_entry)
        if not gl_result['success']:
            self.db.rollback()
            return {'success': False, 'error': 'GL posting failed'}
        
        # 6. Link GL entry to invoice
        invoice.gl_entry_id = gl_result['entry_id']
        
        # 7. Commit
        self.db.commit()
        
        return {
            'success': True,
            'invoice_id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'gl_reference': gl_result['reference']
        }
    
    def schedule_payment(self, invoice_id, payment_date):
        # Get invoice
        invoice = self.db.query(VendorInvoice).filter_by(id=invoice_id).first()
        if not invoice:
            return {'success': False, 'error': 'Invoice not found'}
        
        # Create payment record
        payment = Payment(
            invoice_id=invoice.id,
            payment_date=payment_date,
            amount=invoice.total_amount,
            status=PaymentStatus.SCHEDULED
        )
        self.db.add(payment)
        self.db.commit()
        
        return {
            'success': True,
            'payment_id': payment.id,
            'scheduled_date': payment_date
        }
    
    def get_aging_report(self, as_of_date):
        # Query unpaid invoices
        invoices = self.db.query(VendorInvoice).filter(
            VendorInvoice.status != InvoiceStatus.PAID
        ).all()
        
        # Categorize by age
        current = []
        days_30 = []
        days_60 = []
        days_90 = []
        over_90 = []
        
        for invoice in invoices:
            days_old = (as_of_date - invoice.due_date).days
            
            if days_old <= 0:
                current.append(invoice)
            elif days_old <= 30:
                days_30.append(invoice)
            elif days_old <= 60:
                days_60.append(invoice)
            elif days_old <= 90:
                days_90.append(invoice)
            else:
                over_90.append(invoice)
        
        return {
            'success': True,
            'as_of_date': as_of_date,
            'aging': {
                'current': {'count': len(current), 'total': sum(i.total_amount for i in current)},
                '30_days': {'count': len(days_30), 'total': sum(i.total_amount for i in days_30)},
                '60_days': {'count': len(days_60), 'total': sum(i.total_amount for i in days_60)},
                '90_days': {'count': len(days_90), 'total': sum(i.total_amount for i in days_90)},
                'over_90': {'count': len(over_90), 'total': sum(i.total_amount for i in over_90)}
            }
        }
```

### Step 4: Update Bot

```python
# backend/app/bots/accounts_payable_bot.py
class AccountsPayableBot(FinancialBot):
    def __init__(self, db: Session = None):
        super().__init__(
            bot_id="ap_bot_001",
            name="Accounts Payable Bot"
        )
        self.db = db
        self.ap_service = AccountsPayableService(db) if db else None
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action")
        
        if action == "process_invoice":
            return await self._process_invoice(input_data["invoice"])
        elif action == "schedule_payment":
            return await self._schedule_payment(input_data)
        elif action == "aging_report":
            return await self._aging_report(input_data)
        else:
            raise ValueError(f"Unknown action: {action}")
    
    async def _process_invoice(self, invoice_data):
        if not self.ap_service:
            return {'success': False, 'error': 'Database not available'}
        
        result = self.ap_service.process_invoice(invoice_data)
        
        if result['success']:
            logger.info(f"Processed invoice: {result['invoice_number']}")
        
        return result
    
    async def _schedule_payment(self, payment_data):
        if not self.ap_service:
            return {'success': False, 'error': 'Database not available'}
        
        result = self.ap_service.schedule_payment(
            payment_data['invoice_id'],
            payment_data['payment_date']
        )
        
        return result
    
    async def _aging_report(self, params):
        if not self.ap_service:
            return {'success': False, 'error': 'Database not available'}
        
        as_of_date = datetime.strptime(params['as_of_date'], '%Y-%m-%d').date()
        result = self.ap_service.get_aging_report(as_of_date)
        
        return result
```

### Step 5: Test

```python
# tests/test_accounts_payable.py
def test_process_invoice():
    invoice_data = {
        'vendor_id': 1,
        'invoice_number': 'INV-001',
        'invoice_date': '2025-10-27',
        'due_date': '2025-11-27',
        'total_amount': 5000,
        'lines': [
            {
                'description': 'Office supplies',
                'quantity': 10,
                'unit_price': 500,
                'gl_account': '6300'
            }
        ]
    }
    
    result = ap_service.process_invoice(invoice_data)
    
    assert result['success'] == True
    assert result['invoice_number'] == 'INV-001'
    
    # Verify invoice created
    invoice = db.query(VendorInvoice).filter_by(
        invoice_number='INV-001'
    ).first()
    assert invoice is not None
    assert invoice.total_amount == 5000
    
    # Verify GL entry created
    gl_entry = db.query(JournalEntry).filter_by(
        id=invoice.gl_entry_id
    ).first()
    assert gl_entry is not None
    assert gl_entry.total_debit == 5000
    assert gl_entry.total_credit == 5000
```

---

## ⏱️ Time Estimates

Per bot (average):
- **Requirements analysis:** 1-2 hours
- **Database models:** 2-4 hours
- **Service implementation:** 4-8 hours
- **Bot update:** 2-4 hours
- **Testing:** 4-8 hours
- **Total:** 13-26 hours (2-3 days)

With 3 developers working in parallel:
- **10 finance bots:** 6-8 weeks
- **61 total bots:** 6-9 months

---

## 📋 Checklist Template

Use this checklist for each bot:

```
Bot: ___________________
Developer: _____________
Start Date: ____________

[ ] Step 1: Requirements Analysis
    [ ] List all operations
    [ ] Define validation rules
    [ ] Identify data models
    [ ] Map workflows
    [ ] Review with team

[ ] Step 2: Database Models
    [ ] Create model files
    [ ] Define relationships
    [ ] Add indexes
    [ ] Add constraints
    [ ] Create Alembic migration
    [ ] Test migration

[ ] Step 3: Service Layer
    [ ] Create service class
    [ ] Implement each operation
    [ ] Add validation
    [ ] Add error handling
    [ ] Add logging
    [ ] Code review

[ ] Step 4: Update Bot
    [ ] Add database parameter
    [ ] Initialize service
    [ ] Replace mock data
    [ ] Update error handling
    [ ] Test integration

[ ] Step 5: Testing
    [ ] Write unit tests
    [ ] Write integration tests
    [ ] Write e2e tests
    [ ] Test error scenarios
    [ ] Performance testing
    [ ] Code coverage > 80%

[ ] Step 6: Documentation
    [ ] Update API docs
    [ ] Add code comments
    [ ] Create user guide
    [ ] Update deployment guide

[ ] Step 7: Deployment
    [ ] Deploy to staging
    [ ] Run full test suite
    [ ] User acceptance testing
    [ ] Deploy to production
    [ ] Monitor for issues

Completion Date: _______
Issues Found: _________
