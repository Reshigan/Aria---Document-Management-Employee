import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/main-layout'
import { HolographicLayout } from '@/components/layout/holographic-layout'
import { useAuthStore } from '@/stores/auth-store'
import { Skeleton } from '@/components/ui/skeleton'

// Auth pages
const Login = lazy(() => import('@/pages/auth/login'))
const Register = lazy(() => import('@/pages/auth/register'))
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'))

// Dashboard
const ExecutiveDashboard = lazy(() => import('@/pages/dashboard/executive-dashboard'))
const ErpDashboard = lazy(() => import('@/pages/dashboard/erp-dashboard'))

// Finance
const GeneralLedger = lazy(() => import('@/pages/finance/general-ledger'))
const ChartOfAccounts = lazy(() => import('@/pages/finance/chart-of-accounts'))
const JournalEntries = lazy(() => import('@/pages/finance/journal-entries'))
const ARInvoices = lazy(() => import('@/pages/finance/ar-invoices'))
const APBills = lazy(() => import('@/pages/finance/ap-bills'))
const Payments = lazy(() => import('@/pages/finance/payments'))
const Receipts = lazy(() => import('@/pages/finance/receipts'))
const BankAccounts = lazy(() => import('@/pages/finance/bank-accounts'))
const Reconciliation = lazy(() => import('@/pages/finance/reconciliation'))

// Sales
const Customers = lazy(() => import('@/pages/sales/customers'))
const Quotes = lazy(() => import('@/pages/sales/quotes'))
const SalesOrders = lazy(() => import('@/pages/sales/orders'))
const Deliveries = lazy(() => import('@/pages/sales/deliveries'))

// Procurement
const Suppliers = lazy(() => import('@/pages/procurement/suppliers'))
const PurchaseOrders = lazy(() => import('@/pages/procurement/purchase-orders'))
const GoodsReceipts = lazy(() => import('@/pages/procurement/goods-receipts'))

// Operations
const Products = lazy(() => import('@/pages/operations/products'))
const Warehouses = lazy(() => import('@/pages/operations/warehouses'))
const StockMovements = lazy(() => import('@/pages/operations/stock-movements'))
const BOMs = lazy(() => import('@/pages/operations/boms'))
const WorkOrders = lazy(() => import('@/pages/operations/work-orders'))
const Manufacturing = lazy(() => import('@/pages/operations/manufacturing'))

// People
const Employees = lazy(() => import('@/pages/people/employees'))
const Departments = lazy(() => import('@/pages/people/departments'))
const Leave = lazy(() => import('@/pages/people/leave'))
const Payroll = lazy(() => import('@/pages/people/payroll'))
const Attendance = lazy(() => import('@/pages/people/attendance'))

// Reports
const FinancialReports = lazy(() => import('@/pages/reports/financial'))
const SalesReport = lazy(() => import('@/pages/reports/sales-report'))
const ProcurementReport = lazy(() => import('@/pages/reports/procurement-report'))
const HRReport = lazy(() => import('@/pages/reports/hr-report'))
const BotsDashboard = lazy(() => import('@/pages/reports/bots-dashboard'))

// Financial Planning
const Budgets = lazy(() => import('@/pages/financial-planning/budgets'))
const Assets = lazy(() => import('@/pages/financial-planning/assets'))
const FinancialPlanningDashboard = lazy(() => import('@/pages/financial-planning/dashboard'))

// Admin
const CompanySettings = lazy(() => import('@/pages/admin/company-settings'))
const Users = lazy(() => import('@/pages/admin/users'))
const TaxRates = lazy(() => import('@/pages/admin/tax-rates'))
const Compliance = lazy(() => import('@/pages/admin/compliance'))
const BotConfig = lazy(() => import('@/pages/admin/bot-config'))

// Ask Aria
const AskAria = lazy(() => import('@/pages/ask-aria/ask-aria'))

// Not Found
const NotFound = lazy(() => import('@/pages/not-found'))

// Feature flag for revolutionary UI - NOW ACTIVATED FOR PRODUCTION
const ENABLE_REVOLUTIONARY_UI = true

function PageLoader() {
  return (
    <div className="space-y-4 p-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64 mt-6" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  // Use revolutionary holographic layout when enabled
  const LayoutComponent = ENABLE_REVOLUTIONARY_UI ? HolographicLayout : MainLayout
  
  return (
    <LayoutComponent>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </LayoutComponent>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Dashboard */}
        <Route path="/" element={<AppLayout><ExecutiveDashboard /></AppLayout>} />
        <Route path="/erp-dashboard" element={<AppLayout><ErpDashboard /></AppLayout>} />

        {/* Finance */}
        <Route path="/finance/general-ledger" element={<AppLayout><GeneralLedger /></AppLayout>} />
        <Route path="/finance/chart-of-accounts" element={<AppLayout><ChartOfAccounts /></AppLayout>} />
        <Route path="/finance/journal-entries" element={<AppLayout><JournalEntries /></AppLayout>} />
        <Route path="/finance/ar-invoices" element={<AppLayout><ARInvoices /></AppLayout>} />
        <Route path="/finance/ap-bills" element={<AppLayout><APBills /></AppLayout>} />
        <Route path="/finance/payments" element={<AppLayout><Payments /></AppLayout>} />
        <Route path="/finance/receipts" element={<AppLayout><Receipts /></AppLayout>} />
        <Route path="/finance/bank-accounts" element={<AppLayout><BankAccounts /></AppLayout>} />
        <Route path="/finance/reconciliation" element={<AppLayout><Reconciliation /></AppLayout>} />

        {/* Sales */}
        <Route path="/sales/customers" element={<AppLayout><Customers /></AppLayout>} />
        <Route path="/sales/quotes" element={<AppLayout><Quotes /></AppLayout>} />
        <Route path="/sales/orders" element={<AppLayout><SalesOrders /></AppLayout>} />
        <Route path="/sales/deliveries" element={<AppLayout><Deliveries /></AppLayout>} />

        {/* Procurement */}
        <Route path="/procurement/suppliers" element={<AppLayout><Suppliers /></AppLayout>} />
        <Route path="/procurement/purchase-orders" element={<AppLayout><PurchaseOrders /></AppLayout>} />
        <Route path="/procurement/goods-receipts" element={<AppLayout><GoodsReceipts /></AppLayout>} />

        {/* Operations */}
        <Route path="/operations/products" element={<AppLayout><Products /></AppLayout>} />
        <Route path="/operations/warehouses" element={<AppLayout><Warehouses /></AppLayout>} />
        <Route path="/operations/stock-movements" element={<AppLayout><StockMovements /></AppLayout>} />
        <Route path="/operations/boms" element={<AppLayout><BOMs /></AppLayout>} />
        <Route path="/operations/work-orders" element={<AppLayout><WorkOrders /></AppLayout>} />
        <Route path="/operations/manufacturing" element={<AppLayout><Manufacturing /></AppLayout>} />

        {/* People */}
        <Route path="/people/employees" element={<AppLayout><Employees /></AppLayout>} />
        <Route path="/people/departments" element={<AppLayout><Departments /></AppLayout>} />
        <Route path="/people/leave" element={<AppLayout><Leave /></AppLayout>} />
        <Route path="/people/payroll" element={<AppLayout><Payroll /></AppLayout>} />
        <Route path="/people/attendance" element={<AppLayout><Attendance /></AppLayout>} />

        {/* Reports */}
        <Route path="/reports/financial" element={<AppLayout><FinancialReports /></AppLayout>} />
        <Route path="/reports/sales" element={<AppLayout><SalesReport /></AppLayout>} />
        <Route path="/reports/procurement" element={<AppLayout><ProcurementReport /></AppLayout>} />
        <Route path="/reports/hr" element={<AppLayout><HRReport /></AppLayout>} />
        <Route path="/reports/bots" element={<AppLayout><BotsDashboard /></AppLayout>} />

        {/* Financial Planning */}
        <Route path="/financial-planning" element={<AppLayout><FinancialPlanningDashboard /></AppLayout>} />
        <Route path="/financial-planning/budgets" element={<AppLayout><Budgets /></AppLayout>} />
        <Route path="/financial-planning/assets" element={<AppLayout><Assets /></AppLayout>} />

        {/* Admin */}
        <Route path="/admin/company" element={<AppLayout><CompanySettings /></AppLayout>} />
        <Route path="/admin/users" element={<AppLayout><Users /></AppLayout>} />
        <Route path="/admin/tax-rates" element={<AppLayout><TaxRates /></AppLayout>} />
        <Route path="/admin/compliance" element={<AppLayout><Compliance /></AppLayout>} />
        <Route path="/admin/bots" element={<AppLayout><BotConfig /></AppLayout>} />

        {/* Ask Aria */}
        <Route path="/ask-aria" element={<AppLayout><AskAria /></AppLayout>} />

        {/* Catch-all */}
        <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
      </Routes>
    </Suspense>
  )
}
