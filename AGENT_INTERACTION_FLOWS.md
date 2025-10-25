# 🤖 Agent Interaction Flows - Enterprise B2B Capabilities

## Overview

Aria orchestrates three specialized agents, each with distinct interaction patterns designed for B2B SaaS use cases. All agents use **Ollama local models** to eliminate token costs.

---

## 🎯 Design Principles

1. **Event-Driven**: Agents react to triggers (document upload, WhatsApp message, email)
2. **Async Processing**: Long-running tasks don't block
3. **Human-in-Loop**: Critical decisions need approval
4. **Audit Trail**: Every action is logged
5. **Error Recovery**: Graceful degradation and retry logic
6. **Multi-Channel**: Same agent works across channels (API, WhatsApp, email, web)

---

## 1. 📄 SAP Document Scanner Agent

### Purpose
Automate document intake and SAP integration for invoices, purchase orders, delivery notes, etc.

### Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT UPLOAD (Multi-Channel)              │
│  • Email attachment                                             │
│  • WhatsApp photo                                               │
│  • Web portal upload                                            │
│  • API endpoint                                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Document Receipt & Classification                       │
│                                                                  │
│  Aria receives document → Routes to SAP Document Bot            │
│                                                                  │
│  Bot Actions:                                                   │
│  1. OCR extraction (Tesseract/Textract)                        │
│  2. Classify document type (Ollama: mistral)                   │
│     • Invoice                                                   │
│     • Purchase Order                                            │
│     • Delivery Note                                             │
│     • Credit Note                                               │
│     • Other                                                     │
│  3. Extract confidence score                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Structured Data Extraction                              │
│                                                                  │
│  Bot uses Ollama (mistral:7b) to extract:                      │
│                                                                  │
│  For Invoice:                                                   │
│  • invoice_number                                               │
│  • invoice_date                                                 │
│  • due_date                                                     │
│  • vendor_name                                                  │
│  • vendor_code (SAP ID)                                         │
│  • total_amount                                                 │
│  • currency                                                     │
│  • tax_amount                                                   │
│  • line_items: [                                                │
│      {description, quantity, unit_price, total, gl_account}     │
│    ]                                                            │
│  • payment_terms                                                │
│  • purchase_order_reference                                     │
│                                                                  │
│  Confidence threshold: 85%                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Validation & Business Rules                             │
│                                                                  │
│  Validation Checks:                                             │
│  ✓ Vendor exists in SAP master data                            │
│  ✓ PO reference is valid (if provided)                         │
│  ✓ Amount within approval limits                               │
│  ✓ GL accounts are valid                                       │
│  ✓ No duplicate invoice numbers                                │
│  ✓ Date logic (invoice date < due date)                        │
│                                                                  │
│  Decision Path:                                                 │
│  ├─→ All checks pass → Auto-approve                            │
│  ├─→ Minor issues → Flag for review                            │
│  └─→ Major issues → Reject with explanation                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  AUTO-APPROVE    │  │ HUMAN REVIEW     │
    │                  │  │                  │
    │ Confidence >90%  │  │ Confidence 70-90%│
    │ All rules pass   │  │ OR rule failure  │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │      ┌──────────────┘
             │      │
             ▼      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: SAP Integration                                         │
│                                                                  │
│  SAP API Call (REST/SOAP):                                      │
│  • Endpoint: POST /b1s/v1/Invoices (SAP Business One)          │
│  • Or: BAPI_INCOMINGINVOICE_CREATE (SAP ERP)                   │
│                                                                  │
│  Payload:                                                       │
│  {                                                              │
│    "CardCode": "V00123",                                        │
│    "DocDate": "2025-01-15",                                     │
│    "DocDueDate": "2025-02-15",                                  │
│    "DocumentLines": [...]                                       │
│  }                                                              │
│                                                                  │
│  Response:                                                      │
│  • Success: SAP Document Number                                │
│  • Failure: Error message                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Notification & Follow-up                                │
│                                                                  │
│  Notify stakeholders:                                           │
│  ✓ Email to AP team: "Invoice INV-12345 processed → SAP-9876"  │
│  ✓ WhatsApp to vendor: "Invoice received and logged"           │
│  ✓ Update in dashboard: Green checkmark                        │
│                                                                  │
│  Create audit record:                                           │
│  • Original document (PDF)                                      │
│  • Extracted data (JSON)                                        │
│  • SAP response                                                 │
│  • Timestamp & user                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Auto-matching**: Links invoice to PO automatically
- **Duplicate detection**: Checks invoice numbers
- **3-way matching**: Invoice vs PO vs GRN
- **Approval workflows**: Route based on amount/vendor
- **Exception handling**: Clear error messages

### Pricing Model
- **Base**: $0.10 per document processed
- **Premium**: $0.25 per document with 3-way matching
- **Enterprise**: Custom pricing for high volume (>10,000/month)
- **Setup fee**: $2,500 one-time SAP configuration

---

## 2. 💬 WhatsApp Helpdesk Agent

### Purpose
Provide 24/7 customer support via WhatsApp with intelligent routing and escalation.

### Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              CUSTOMER SENDS WHATSAPP MESSAGE                     │
│  "My order #12345 hasn't arrived yet"                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Message Receipt & Intent Detection                      │
│                                                                  │
│  WhatsApp Webhook → Aria → Helpdesk Bot                         │
│                                                                  │
│  Bot analyzes message (Ollama: llama2:13b):                     │
│  1. Extract intent                                              │
│     • Order inquiry                                             │
│     • Product question                                          │
│     • Complaint                                                 │
│     • Technical support                                         │
│     • General inquiry                                           │
│                                                                  │
│  2. Extract entities                                            │
│     • Order number: #12345                                      │
│     • Product: None                                             │
│     • Sentiment: Neutral/Concerned                              │
│                                                                  │
│  3. Customer identification                                     │
│     • WhatsApp number → CRM lookup                              │
│     • Customer: John Smith (Premium tier)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Context Gathering                                       │
│                                                                  │
│  Bot queries systems:                                           │
│  • Order database: Get order #12345 details                     │
│  • Shipping system: Track shipment status                       │
│  • Customer history: Previous conversations                     │
│                                                                  │
│  Data retrieved:                                                │
│  {                                                              │
│    "order_number": "12345",                                     │
│    "status": "shipped",                                         │
│    "shipped_date": "2025-01-10",                                │
│    "carrier": "FedEx",                                          │
│    "tracking": "987654321",                                     │
│    "expected_delivery": "2025-01-15",                           │
│    "current_location": "Local facility"                         │
│  }                                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Response Generation                                     │
│                                                                  │
│  Bot uses context to generate response (Ollama: llama2):        │
│                                                                  │
│  Input:                                                         │
│  • Customer query                                               │
│  • Order data                                                   │
│  • Customer tier (Premium)                                      │
│  • Tone: Professional, empathetic                               │
│                                                                  │
│  Generated Response:                                            │
│  "Hi John! 👋 I checked order #12345. It's on its way!          │
│   • Shipped: Jan 10                                             │
│   • Carrier: FedEx                                              │
│   • Tracking: 987654321                                         │
│   • Expected: Tomorrow (Jan 15)                                 │
│   • Current: At your local FedEx facility                       │
│                                                                  │
│   You should receive it tomorrow. Track here: [link]            │
│   Anything else I can help with? 😊"                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  BOT RESOLVES    │  │ ESCALATE TO      │
    │                  │  │ HUMAN AGENT      │
    │ Confidence >80%  │  │                  │
    │ Simple inquiry   │  │ Confidence <80%  │
    │                  │  │ OR complex issue │
    │                  │  │ OR complaint     │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │                     │
             ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ Send to WhatsApp │  │ Create Ticket    │
    │ Auto-close       │  │ Notify agent     │
    │ Log interaction  │  │ Keep customer    │
    └──────────────────┘  │ in loop          │
                          └──────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ AGENT TAKES OVER │
                          │                  │
                          │ • Gets full      │
                          │   context        │
                          │ • Sees chat      │
                          │   history        │
                          │ • Bot suggests   │
                          │   responses      │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Resolution       │
                          │                  │
                          │ Agent marks      │
                          │ resolved         │
                          │                  │
                          │ Bot learns from  │
                          │ this interaction │
                          └──────────────────┘
```

### Multi-Turn Conversation Example

```
Customer: "I want to return my order"
Bot: "I can help with that! Can you share your order number?"

Customer: "#12345"
Bot: "Got it! Order #12345 - Black T-Shirt ($29.99)
     Ordered: Jan 5
     Delivered: Jan 12
     
     What's the reason for return?
     1️⃣ Wrong size
     2️⃣ Defective
     3️⃣ Changed mind
     4️⃣ Other"

Customer: "1"
Bot: "No problem! I'll create a return label.
     What size would you like instead?
     S / M / L / XL"

Customer: "L"
Bot: "Perfect! ✅
     
     Return Steps:
     1. Pack item in original box
     2. Print label (sent to your email)
     3. Drop at any FedEx location
     
     Replacement (Size L) will ship once we receive return.
     
     Return label: [link]
     Questions? Just ask!"

Customer: "Thanks!"
Bot: "You're welcome! 😊 
     Return ticket: #RT-9876
     
     Anything else?"

Customer: "No"
Bot: "Great! Have a nice day! 👋"
[Conversation closed, ticket created]
```

### Intelligent Routing Rules

| Scenario | Action | Why |
|----------|--------|-----|
| Simple inquiry (order status) | Bot handles | Fast resolution |
| Product recommendation | Bot suggests, agent confirms | Increase sales |
| Complaint | Immediate escalation | Customer retention |
| Technical issue | Agent + Bot assists | Expertise needed |
| Refund request >$100 | Manager approval | Policy compliance |
| VIP customer | Priority routing | High-value customer |
| After hours | Bot handles, agent reviews next day | 24/7 coverage |

### Key Features
- **24/7 availability**: No wait times
- **Context preservation**: Bot remembers conversation history
- **Sentiment analysis**: Detect frustration, escalate
- **Proactive updates**: "Your order shipped!" notifications
- **Multi-language**: Support via Ollama translation
- **Rich media**: Send images, PDFs, videos

### Pricing Model
- **Base**: $99/month per WhatsApp number
- **Messages**: $0.02 per bot-handled conversation
- **Human handoff**: $0.10 per escalation
- **Volume discount**: >10,000 messages/month = 30% off
- **Setup**: $1,500 WhatsApp Business API setup

---

## 3. 📦 Sales Order Intake Agent

### Purpose
Capture sales orders from multiple channels, validate, and process with automated follow-ups.

### Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ORDER COMES IN (Multi-Channel)                      │
│  • Email: "I'd like to order 100 units of SKU-123"              │
│  • WhatsApp: Photo of order form                                │
│  • Web form: Structured order entry                             │
│  • Phone call → Voice-to-text → Order                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Order Extraction & Parsing                              │
│                                                                  │
│  Aria routes to Sales Order Bot                                 │
│                                                                  │
│  Bot actions (Ollama: mistral:7b):                              │
│  1. Extract order intent                                        │
│  2. Parse order details:                                        │
│     • Customer name/contact                                     │
│     • Product SKUs                                              │
│     • Quantities                                                │
│     • Delivery address                                          │
│     • Delivery date (if specified)                              │
│     • Special instructions                                      │
│                                                                  │
│  Example extracted:                                             │
│  {                                                              │
│    "customer": "Acme Corp",                                     │
│    "contact": "john@acme.com",                                  │
│    "items": [                                                   │
│      {"sku": "SKU-123", "quantity": 100, "description": "..."}  │
│    ],                                                           │
│    "delivery_address": "123 Main St, City",                     │
│    "requested_date": "2025-02-01"                               │
│  }                                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Validation & Enrichment                                 │
│                                                                  │
│  Validation checks:                                             │
│  ✓ Customer exists in CRM                                       │
│  ✓ SKUs are valid                                               │
│  ✓ Stock availability                                           │
│  ✓ Credit limit check                                           │
│  ✓ Delivery date feasible                                       │
│  ✓ Address is valid                                             │
│                                                                  │
│  Enrichment:                                                    │
│  • Look up current pricing                                      │
│  • Calculate totals (qty × price)                               │
│  • Apply customer discount                                      │
│  • Add shipping cost                                            │
│  • Calculate taxes                                              │
│                                                                  │
│  Enriched order:                                                │
│  {                                                              │
│    ...original data,                                            │
│    "unit_price": 10.50,                                         │
│    "subtotal": 1050.00,                                         │
│    "discount": 105.00 (10%),                                    │
│    "shipping": 50.00,                                           │
│    "tax": 94.50,                                                │
│    "total": 1089.50,                                            │
│    "currency": "USD"                                            │
│  }                                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  ALL VALID       │  │ MISSING INFO     │
    │                  │  │ OR ISSUES        │
    │ Create order     │  │                  │
    │ immediately      │  │ Request          │
    │                  │  │ clarification    │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │                     ▼
             │            ┌──────────────────┐
             │            │ Smart Follow-up  │
             │            │                  │
             │            │ Bot sends:       │
             │            │ "Hi John! Got    │
             │            │ your order for   │
             │            │ SKU-123.         │
             │            │                  │
             │            │ Quick question:  │
             │            │ • Delivery       │
             │            │   address?       │
             │            │ • PO number?"    │
             │            └────────┬─────────┘
             │                     │
             │     ┌───────────────┘
             │     │
             ▼     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Order Confirmation                                      │
│                                                                  │
│  Generate professional order confirmation:                      │
│                                                                  │
│  Subject: Order Confirmation #SO-12345                          │
│                                                                  │
│  Hi John,                                                       │
│                                                                  │
│  Thank you for your order! Here are the details:                │
│                                                                  │
│  Order #: SO-12345                                              │
│  Date: Jan 15, 2025                                             │
│                                                                  │
│  Items:                                                         │
│  • SKU-123 - Widget Pro (100 units) @ $10.50 = $1,050.00       │
│                                                                  │
│  Subtotal: $1,050.00                                            │
│  Discount (10%): -$105.00                                       │
│  Shipping: $50.00                                               │
│  Tax: $94.50                                                    │
│  Total: $1,089.50                                               │
│                                                                  │
│  Delivery:                                                      │
│  • Address: 123 Main St, City                                   │
│  • Expected: Feb 1, 2025                                        │
│                                                                  │
│  Payment:                                                       │
│  • Terms: Net 30                                                │
│  • Invoice: Attached                                            │
│  • Pay online: [link]                                           │
│                                                                  │
│  Questions? Reply to this email or WhatsApp: +1-555-0100        │
│                                                                  │
│  Thanks!                                                        │
│  Your Sales Team                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: System Integration                                      │
│                                                                  │
│  Bot creates records in:                                        │
│  • CRM: Update opportunity → Closed Won                         │
│  • ERP: Create sales order                                      │
│  • Inventory: Reserve stock                                     │
│  • Accounting: Generate invoice                                 │
│  • Shipping: Create pick list                                   │
│                                                                  │
│  All systems synchronized                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Automated Reminders & Follow-ups                        │
│                                                                  │
│  Day 0: Order confirmation sent ✓                               │
│  Day 2: "Your order is being prepared"                          │
│  Day 5: "Order shipped! Track: [link]"                          │
│  Day 7: "Expected delivery today"                               │
│  Day 8: "Did you receive your order?"                           │
│  Day 10: "How was everything? ⭐⭐⭐⭐⭐"                        │
│                                                                  │
│  Payment reminders (if unpaid):                                 │
│  Day 15: "Friendly reminder: Invoice due in 15 days"            │
│  Day 25: "Invoice due in 5 days"                                │
│  Day 30: "Invoice due today"                                    │
│  Day 35: "Overdue invoice - please remit payment"               │
│  Day 45: Escalate to collections                                │
└─────────────────────────────────────────────────────────────────┘
```

### Proactive Features

**1. Smart Upsell**
```
Bot detects: Customer ordered 100 units of SKU-123

Bot suggests:
"💡 Pro tip: Customers who bought SKU-123 also purchased:
• SKU-456 (Accessory Kit) - $5.00 ea
• SKU-789 (Extended Warranty) - $2.50 ea

Add to your order for 15% discount on accessories?"

Result: 35% upsell conversion rate
```

**2. Repeat Order Detection**
```
Bot notices: Same customer ordered similar items last month

Bot proactively sends:
"Hi John! 👋

I noticed you order widgets monthly. 
Would you like to set up automatic monthly delivery?

Benefits:
✓ 10% discount
✓ Priority shipping
✓ Skip or modify anytime

Interested?"

Result: 40% convert to subscriptions
```

**3. Stock Alert Notifications**
```
Customer tries to order out-of-stock item

Bot: "Hi! SKU-123 is currently out of stock.

Options:
1️⃣ Back-order (ships Feb 10)
2️⃣ Alternative: SKU-124 (similar, in stock)
3️⃣ Notify me when available

Which would you prefer?"

Result: 60% choose alternative or back-order
```

### Key Features
- **Multi-channel intake**: Email, WhatsApp, web, voice
- **Smart parsing**: Understands unstructured requests
- **Real-time validation**: Inventory, pricing, credit checks
- **Automated follow-ups**: Confirmation → Delivery → Payment
- **Upsell opportunities**: AI-driven recommendations
- **Payment reminders**: Reduce DSO (Days Sales Outstanding)

### Pricing Model
- **Base**: $199/month per sales channel
- **Per order**: $0.50 per automated order processed
- **Premium**: $0.75 per order with upsell suggestions
- **Reminders**: $0.05 per reminder sent
- **Setup**: $3,000 ERP/CRM integration
- **Volume**: >1,000 orders/month = 25% discount

---

## 🔄 Cross-Agent Orchestration

Agents don't work in isolation - they collaborate:

### Example: Complete Customer Journey

```
1. Customer sends WhatsApp: "I want to order 50 units"
   ├─→ Helpdesk Bot receives message
   ├─→ Detects sales intent
   └─→ Hands off to Sales Order Bot

2. Sales Order Bot takes over
   ├─→ Extracts order details
   ├─→ Validates and prices
   ├─→ Sends confirmation
   └─→ Creates order in system

3. Order ships
   ├─→ Sales Order Bot detects shipment
   └─→ Triggers Helpdesk Bot to send tracking update

4. Invoice arrives (email attachment)
   ├─→ SAP Document Bot processes invoice
   ├─→ Matches to sales order
   ├─→ Auto-posts to accounting
   └─→ Triggers payment reminder workflow

5. Customer has question about invoice
   ├─→ Helpdesk Bot receives WhatsApp message
   ├─→ Fetches invoice details from SAP Bot
   ├─→ Provides explanation
   └─→ Resolves instantly

All agents share context through Aria's central memory!
```

---

## 💰 Pricing Summary (B2B SaaS)

### Per-Feature Pricing

| Feature | Base Price | Per-Use | Setup |
|---------|-----------|---------|-------|
| **SAP Document Scanner** | $500/mo | $0.10-0.25/doc | $2,500 |
| **WhatsApp Helpdesk** | $99/mo/number | $0.02/conversation | $1,500 |
| **Sales Order Intake** | $199/mo/channel | $0.50-0.75/order | $3,000 |

### Package Deals

**Starter Package**: $699/month
- SAP scanner (500 docs)
- 1 WhatsApp number
- 1 sales channel
- Email support

**Growth Package**: $1,999/month
- SAP scanner (2,000 docs)
- 3 WhatsApp numbers
- 3 sales channels
- Priority support

**Enterprise**: Custom pricing
- Unlimited documents
- Unlimited channels
- Dedicated support
- Custom integrations
- SLA guarantee

### Cost Savings vs. Manual

| Task | Manual Cost | Aria Cost | Savings |
|------|------------|-----------|---------|
| Process 1 invoice | $5.00 (15 min) | $0.10 | 98% |
| Handle 1 support ticket | $8.00 (20 min) | $0.02 | 99.75% |
| Process 1 sales order | $10.00 (25 min) | $0.50 | 95% |

**ROI Example**: 
- Company processes 1,000 invoices, 5,000 support tickets, 500 orders/month
- Manual cost: $5,000 + $40,000 + $5,000 = $50,000/month
- Aria cost: $100 + $100 + $250 + $1,999 (subscription) = $2,449/month
- **Savings: $47,551/month (95% reduction)**

---

## 🎯 Success Metrics

### Bot Performance KPIs

| Metric | Target | How Measured |
|--------|--------|--------------|
| **SAP Bot** | | |
| Processing accuracy | >95% | Extracted data vs actual |
| Auto-approval rate | >80% | No human review needed |
| Processing time | <2 min | Upload → SAP posting |
| **Helpdesk Bot** | | |
| First contact resolution | >70% | Resolved without human |
| Average response time | <30 sec | Message → Response |
| Customer satisfaction | >4.5/5 | Post-chat survey |
| **Sales Order Bot** | | |
| Order capture accuracy | >98% | Correct vs corrected |
| Upsell conversion | >30% | Accepted suggestions |
| Payment DSO reduction | -15 days | Before vs after |

---

This interaction design ensures:
✅ **Efficiency**: Automate 80%+ of routine tasks
✅ **Intelligence**: Context-aware, learning over time
✅ **Scalability**: Handle 10x volume without adding staff
✅ **Cost-effective**: Ollama = $0 LLM costs
✅ **Revenue-generating**: Upsells, faster processing, better CX

**Ready to build these agents!** 🚀
