# ARIA ERP - UI Architecture & Design System

**Version**: 2.0.0  
**Date**: 2025-11-01  
**Quality Standard**: World-class (Xero/Odoo/SAP level)

---

## 🎨 Design Philosophy

### Principles
1. **Professional** - Enterprise-grade visual design
2. **Efficient** - Minimize clicks, maximize productivity
3. **Intuitive** - Learn once, use everywhere
4. **Accessible** - WCAG 2.1 AA compliant
5. **Responsive** - Desktop-first, tablet-compatible
6. **Fast** - <2s page loads, optimistic UI

### Visual Style
- **Clean & Modern** - Minimalist design, ample whitespace
- **Data-Dense** - Show maximum information without clutter
- **Consistent** - Reusable components, predictable patterns
- **Professional Color Palette** - Blues, grays, accent colors

---

## 🎨 Design System

### Color Palette

#### Primary Colors
```css
--primary-50: #eff6ff;   /* Lightest blue */
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* Main brand blue */
--primary-600: #2563eb;  /* Darker blue */
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;  /* Darkest blue */
```

#### Neutral Colors
```css
--gray-50: #f9fafb;      /* Background */
--gray-100: #f3f4f6;     /* Light background */
--gray-200: #e5e7eb;     /* Border */
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;     /* Secondary text */
--gray-600: #4b5563;
--gray-700: #374151;     /* Main text */
--gray-800: #1f2937;     /* Dark text */
--gray-900: #111827;     /* Darkest */
```

#### Status Colors
```css
--success: #10b981;      /* Green */
--warning: #f59e0b;      /* Amber */
--error: #ef4444;        /* Red */
--info: #3b82f6;         /* Blue */
```

#### Module Colors (Accent)
```css
--gl-color: #8b5cf6;     /* Purple - General Ledger */
--ap-color: #ef4444;     /* Red - Accounts Payable */
--ar-color: #10b981;     /* Green - Accounts Receivable */
--bank-color: #06b6d4;   /* Cyan - Banking */
--payroll-color: #f59e0b;/* Amber - Payroll */
--crm-color: #6366f1;    /* Indigo - CRM */
--inventory-color: #8b5cf6; /* Purple - Inventory */
```

### Typography

#### Font Family
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Fira Code', 'Courier New', monospace;
```

#### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

#### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing
```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
```

### Border Radius
```css
--radius-sm: 0.125rem;  /* 2px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-full: 9999px;  /* Fully rounded */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## 🏗️ Layout Architecture

### App Structure
```
<App>
  <AuthProvider>
    <Router>
      <Layout>                      <!-- Main layout wrapper -->
        <Sidebar />                 <!-- Left navigation -->
        <MainContent>
          <TopBar />                <!-- Top navigation -->
          <ContentArea>
            <Routes>                <!-- Page content -->
              <Dashboard />
              <ModulePage />
              ...
            </Routes>
          </ContentArea>
        </MainContent>
      </Layout>
    </Router>
  </AuthProvider>
</App>
```

### Sidebar (240px fixed width)
- Company logo
- Navigation menu (modules)
- Bot status indicator
- Collapse toggle
- User profile (bottom)

### TopBar (64px fixed height)
- Breadcrumbs
- Search bar
- Notifications
- User menu
- Settings

### Content Area (Fluid)
- Page title
- Action buttons
- Filters/tabs
- Main content
- Footer

---

## 🧩 Component Library

### Core Components

#### 1. Button
**Variants**: Primary, Secondary, Ghost, Danger  
**Sizes**: sm, md, lg  
**States**: Default, Hover, Active, Disabled, Loading

```tsx
<Button variant="primary" size="md" loading={false}>
  Save
</Button>
```

#### 2. Card
**Purpose**: Container for content sections

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardActions>...</CardActions>
  </CardHeader>
  <CardBody>
    Content
  </CardBody>
</Card>
```

#### 3. Table
**Features**: Sorting, filtering, pagination, selection

```tsx
<Table
  columns={columns}
  data={data}
  onSort={handleSort}
  selectable
/>
```

#### 4. Form Components
- Input (text, number, email, etc.)
- Select (dropdown)
- Checkbox
- Radio
- DatePicker
- FileUpload
- FormField (wrapper with label, error)

#### 5. Modal/Dialog
**Sizes**: sm, md, lg, xl, full

```tsx
<Modal open={isOpen} onClose={handleClose} size="md">
  <ModalHeader>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <Button>Cancel</Button>
    <Button variant="primary">Save</Button>
  </ModalFooter>
</Modal>
```

#### 6. Badge
**Purpose**: Status indicators

```tsx
<Badge color="success">Paid</Badge>
<Badge color="warning">Pending</Badge>
<Badge color="error">Overdue</Badge>
```

#### 7. Stat Card
**Purpose**: KPI display

```tsx
<StatCard
  title="Total Revenue"
  value="R 1,250,000"
  change="+12.5%"
  trend="up"
  icon={<DollarIcon />}
/>
```

#### 8. Chart Components (Recharts)
- LineChart (trends)
- BarChart (comparisons)
- PieChart (proportions)
- AreaChart (cumulative)

---

## 📱 Page Templates

### Dashboard Template
```
┌─────────────────────────────────────────────────────────┐
│ Page Title                             [Action Buttons]  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Stat 1  │ │ Stat 2  │ │ Stat 3  │ │ Stat 4  │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │                     │ │                     │        │
│ │     Chart 1         │ │     Chart 2         │        │
│ │                     │ │                     │        │
│ └─────────────────────┘ └─────────────────────┘        │
├─────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐          │
│ │          Data Table                        │          │
│ └────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### List Page Template (AP/AR Invoices, etc.)
```
┌─────────────────────────────────────────────────────────┐
│ Page Title                          [+ New] [Actions]   │
├─────────────────────────────────────────────────────────┤
│ [Search] [Filter] [Sort] [Export]                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐    │
│ │ [✓] Invoice #   Customer   Date     Amount Status│    │
│ │ [ ] INV-001    Acme Corp   Jan 15   R 10,000  ● │    │
│ │ [ ] INV-002    XYZ Ltd     Jan 16   R 5,000   ● │    │
│ └─────────────────────────────────────────────────┘    │
│ Showing 1-10 of 50                      [< 1 2 3 >]    │
└─────────────────────────────────────────────────────────┘
```

### Form Page Template (Create/Edit)
```
┌─────────────────────────────────────────────────────────┐
│ ← Back   Create Invoice                    [Save] [✕]   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐    │
│ │ Customer *        [Select Customer        ▼]    │    │
│ │ Invoice Date *    [Jan 15, 2025           📅]   │    │
│ │ Due Date *        [Feb 15, 2025           📅]   │    │
│ │                                                   │    │
│ │ Line Items                            [+ Add Row]│    │
│ │ ┌──────────────────────────────────────────────┐│    │
│ │ │ Item    Description    Qty  Price   Amount   ││    │
│ │ │ [...]   [...]         [1]  [100]   R 100     ││    │
│ │ └──────────────────────────────────────────────┘│    │
│ │                                                   │    │
│ │ Subtotal                            R 100.00     │    │
│ │ VAT (15%)                           R 15.00      │    │
│ │ Total                               R 115.00     │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 🗺️ Navigation Structure

### Sidebar Menu

**Main Navigation**:
```
📊 Dashboard
   ├─ Executive (CFO)
   ├─ Finance Manager
   └─ My Dashboard

📚 General Ledger
   ├─ Chart of Accounts
   ├─ Journal Entries
   ├─ Trial Balance
   └─ Financial Reports

📥 Accounts Payable
   ├─ Invoices
   ├─ Payments
   ├─ Suppliers
   └─ Aging Report

📤 Accounts Receivable
   ├─ Invoices
   ├─ Payments
   ├─ Customers
   └─ Aging Report

🏦 Banking
   ├─ Bank Accounts
   ├─ Transactions
   ├─ Reconciliation
   └─ Transfers

💰 Payroll
   ├─ Employees
   ├─ Process Payroll
   ├─ Payslips
   └─ Tax Reports

🎯 CRM
   ├─ Leads
   ├─ Opportunities
   ├─ Customers
   └─ Pipeline

📦 Inventory
   ├─ Items
   ├─ Stock Levels
   ├─ Movements
   └─ Valuation

🤖 Automation Bots
   ├─ Bot Dashboard
   ├─ Bot Logs
   └─ Configuration

📊 Reports
   ├─ Financial Reports
   ├─ Operational Reports
   └─ Custom Reports

⚙️ Settings
   ├─ Company
   ├─ Users & Roles
   ├─ Integrations
   └─ Preferences
```

---

## 📊 Page Inventory

### Priority 0 (MVP) - Must Build First

#### Dashboards
1. **Executive Dashboard** (CFO/Finance Director)
2. **Finance Manager Dashboard**
3. **AP Clerk Dashboard**
4. **AR Clerk Dashboard**

#### General Ledger
5. **Chart of Accounts** (list)
6. **Journal Entry** (create/edit)
7. **Trial Balance** (report)
8. **Financial Reports** (BS, P&L)

#### Accounts Payable
9. **AP Invoice List** (with filters)
10. **AP Invoice Create/Edit** (with OCR upload)
11. **AP Aging Report**
12. **Supplier List**
13. **Supplier Detail**
14. **Payment Processing**

#### Accounts Receivable
15. **AR Invoice List**
16. **AR Invoice Create/Edit**
17. **AR Aging Report**
18. **Customer List**
19. **Customer Detail**
20. **Payment Allocation**

#### Bots
21. **Bot Dashboard** (all 15 bots)
22. **Bot Logs** (execution history)

#### Authentication
23. **Login Page**
24. **User Profile**

### Priority 1 (Phase 2)

#### Banking
25. **Bank Account List**
26. **Bank Reconciliation**
27. **Transaction List**

#### Payroll
28. **Employee List**
29. **Process Payroll**
30. **Payslip View**

#### CRM
31. **Lead List** (with AI scores)
32. **Lead Detail**
33. **Sales Pipeline** (Kanban)

#### Inventory
34. **Item List**
35. **Stock Levels**
36. **Stock Movements**

#### Reports
37. **Report Builder**
38. **Saved Reports**

---

## 🎯 Component Structure

### Directory Layout
```
frontend/src/
├── components/           # Reusable components
│   ├── ui/              # Core UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   ├── layout/          # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── Layout.tsx
│   │   └── PageHeader.tsx
│   ├── charts/          # Chart components
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   └── PieChart.tsx
│   └── modules/         # Module-specific components
│       ├── ap/
│       ├── ar/
│       ├── gl/
│       └── ...
├── pages/               # Page components
│   ├── Dashboard/
│   │   ├── ExecutiveDashboard.tsx
│   │   ├── FinanceManagerDashboard.tsx
│   │   └── ClerkDashboard.tsx
│   ├── GL/
│   │   ├── ChartOfAccounts.tsx
│   │   ├── JournalEntry.tsx
│   │   └── TrialBalance.tsx
│   ├── AP/
│   │   ├── InvoiceList.tsx
│   │   ├── InvoiceForm.tsx
│   │   ├── AgingReport.tsx
│   │   └── SupplierList.tsx
│   ├── AR/
│   │   ├── InvoiceList.tsx
│   │   ├── InvoiceForm.tsx
│   │   ├── AgingReport.tsx
│   │   └── CustomerList.tsx
│   ├── Bots/
│   │   ├── BotDashboard.tsx
│   │   └── BotLogs.tsx
│   └── Auth/
│       ├── Login.tsx
│       └── Profile.tsx
├── services/            # API services
│   ├── api.ts
│   ├── gl.service.ts
│   ├── ap.service.ts
│   ├── ar.service.ts
│   └── bot.service.ts
├── store/               # State management (Zustand)
│   ├── authStore.ts
│   ├── appStore.ts
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── ...
├── utils/               # Utility functions
│   ├── formatters.ts    # Currency, date formatting
│   ├── validators.ts
│   └── constants.ts
└── types/               # TypeScript types
    ├── api.types.ts
    ├── module.types.ts
    └── ...
```

---

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Install additional dependencies
2. ✅ Set up design system (CSS variables)
3. ✅ Build core UI components (Button, Card, Table, etc.)
4. ✅ Build layout components (Sidebar, TopBar, Layout)
5. ✅ Set up routing structure
6. ✅ Create API service layer
7. ✅ Set up state management

### Phase 2: Dashboards & GL (Week 2)
8. ✅ Executive Dashboard
9. ✅ Finance Manager Dashboard
10. ✅ GL pages (Chart of Accounts, Journal Entry, Trial Balance)
11. ✅ Financial Reports

### Phase 3: AP & AR (Week 3)
12. ✅ AP module pages (Invoice List, Form, Aging, Suppliers)
13. ✅ AR module pages (Invoice List, Form, Aging, Customers)
14. ✅ Bot integration in AP/AR

### Phase 4: Bots & Reports (Week 4)
15. ✅ Bot Dashboard
16. ✅ Bot Logs
17. ✅ Bot integration across modules
18. ✅ Reports section
19. ✅ Data visualization

### Phase 5: Other Modules (Week 5-6)
20. Banking, Payroll, CRM, Inventory pages
21. Settings and configuration
22. Testing and refinement

---

## 📏 Quality Standards

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- Component documentation
- Unit tests (>80% coverage)

### Performance
- Code splitting
- Lazy loading
- Memoization
- Virtual scrolling for large lists

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Color contrast

### Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 🎨 Design Inspiration

**References** (World-class ERP UIs):
- Xero - Clean, modern, data-dense
- Odoo - Comprehensive, modular
- QuickBooks Online - Intuitive, friendly
- SAP Fiori - Enterprise, sophisticated
- NetSuite - Professional, feature-rich

**Key Takeaways**:
- Sidebar navigation (consistent across all)
- Card-based layouts
- Data tables with inline actions
- Contextual action buttons
- Status badges and icons
- Charts and visualizations
- Clean, professional aesthetics

---

**Next Steps**: Begin implementation with core UI components and layout

**Estimated Timeline**: 4-6 weeks for complete world-class UI

**Quality Bar**: Match or exceed Xero/Odoo standards
