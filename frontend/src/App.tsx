import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Login from './pages/auth/Login';
import ExecutiveDashboard from './pages/Dashboard/ExecutiveDashboard';
import Quotes from './pages/ERP/Quotes';
import SalesOrders from './pages/ERP/SalesOrders';
import Deliveries from './pages/ERP/Deliveries';
import WMSStock from './pages/ERP/WMSStock';
import GeneralLedger from './pages/ERP/GeneralLedger';
import PurchaseOrders from './pages/ERP/PurchaseOrders';
import GoodsReceipts from './pages/ERP/GoodsReceipts';
import WorkOrdersERP from './pages/ERP/WorkOrders';
import Employees from './pages/ERP/Employees';
import FieldService from './pages/ERP/FieldService';
import ERPDashboard from './pages/ERPDashboard';
import BotRegistry from './pages/BotRegistry';
import Agents from './pages/Agents';
import AgentSettings from './pages/AgentSettings';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import InvoiceList from './pages/Financial/InvoiceList';
import InvoiceForm from './pages/Financial/InvoiceForm';
import PayrollDashboard from './pages/HR/PayrollDashboard';
import CRMDashboard from './pages/CRM/CRMDashboard';
import ProcurementDashboard from './pages/Procurement/ProcurementDashboard';
import ProductCatalog from './pages/Procurement/ProductCatalog';
import Products from './pages/Inventory/Products';
import RFQManagement from './pages/Procurement/RFQManagement';
import ManufacturingDashboard from './pages/Manufacturing/ManufacturingDashboard';
import BOMManagement from './pages/Manufacturing/BOMManagement';
import WorkOrders from './pages/Manufacturing/WorkOrders';
import AgedReceivablesReport from './pages/Reports/AgedReceivablesReport';
import StockValuationReport from './pages/Reports/StockValuationReport';
import VATSummaryReport from './pages/Reports/VATSummaryReport';
import ReportsDashboard from './pages/Reports/ReportsDashboard';
import FinancialReports from './pages/Reports/FinancialReports';
import PayrollActivityReport from './pages/reports/PayrollActivityReport';
import ExpenseManagementReport from './pages/reports/ExpenseManagementReport';
import BbbeeComplianceReport from './pages/reports/BbbeeComplianceReport';
import BotDashboard from './pages/reports/BotDashboard';
import BankingDashboard from './pages/Banking/BankingDashboard';
import ChatInterface from './components/Chat/ChatInterface';
import AskAriaChat from './pages/AskAria/AskAriaChat';
import DocumentClassification from './pages/AskAria/DocumentClassification';
import SystemSettings from './pages/admin/SystemSettings';
import CompanySettings from './pages/admin/CompanySettings';
import BotConfiguration from './pages/admin/BotConfiguration';
import UserManagement from './pages/admin/UserManagement';
import AccountsReceivable from './pages/ERP/AccountsReceivable';
import QuoteDetail from './pages/ERP/Detail/QuoteDetail';
import SalesOrderDetail from './pages/ERP/Detail/SalesOrderDetail';
import DeliveryDetail from './pages/ERP/Detail/DeliveryDetail';
import PurchaseOrderDetail from './pages/ERP/Detail/PurchaseOrderDetail';
import GoodsReceiptDetail from './pages/ERP/Detail/GoodsReceiptDetail';
import DataImport from './pages/Admin/DataImport';
import RoleDashboard from './pages/Admin/RoleDashboard';
import RBACManagement from './pages/Admin/RBACManagement';
import MobileManagement from './pages/mobile/MobileManagement';
import ProfitLossStatement from './pages/financial/ProfitLossStatement';
import BalanceSheet from './pages/financial/BalanceSheet';
import PendingActions from './pages/PendingActions';
import IntegrationsList from './pages/integrations/IntegrationsList';
import DocumentTemplates from './pages/documents/DocumentTemplates';
import GenerateDocument from './pages/documents/GenerateDocument';
import './styles/design-system.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<ExecutiveDashboard />} />
                <Route path="/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/erp-dashboard" element={<ERPDashboard />} />
          
          {/* Order-to-Cash */}
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/sales-orders/:id" element={<SalesOrderDetail />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/deliveries/:id" element={<DeliveryDetail />} />
          <Route path="/wms-stock" element={<WMSStock />} />
          
          {/* General Ledger */}
          <Route path="/gl" element={<GeneralLedger />} />
          <Route path="/general-ledger" element={<GeneralLedger />} />
          <Route path="/gl/journal-entries" element={<GeneralLedger />} />
          <Route path="/gl/chart-of-accounts" element={<GeneralLedger />} />
          
          {/* Accounts Payable */}
          <Route path="/ap" element={<InvoiceList />} />
          <Route path="/ap/invoices" element={<InvoiceList />} />
          <Route path="/ap/invoices/new" element={<InvoiceForm />} />
          <Route path="/ap/suppliers" element={<Suppliers />} />
          
          {/* Accounts Receivable */}
          <Route path="/ar" element={<AccountsReceivable />} />
          <Route path="/ar/customers" element={<Customers />} />
          <Route path="/ar/invoices" element={<InvoiceList />} />
          
          {/* Banking */}
          <Route path="/banking" element={<BankingDashboard />} />
          
          {/* Payroll */}
          <Route path="/payroll" element={<PayrollDashboard />} />
          <Route path="/payroll/employees" element={<Employees />} />
          <Route path="/payroll/payslips" element={<PayrollDashboard />} />
          
          {/* CRM */}
          <Route path="/crm" element={<CRMDashboard />} />
          <Route path="/crm/customers" element={<Customers />} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<WMSStock />} />
          <Route path="/inventory/products" element={<Products />} />
          <Route path="/inventory/stock" element={<WMSStock />} />
          <Route path="/inventory/items" element={<ProductCatalog />} />
          
          {/* Master Data */}
          <Route path="/master-data" element={<ProductCatalog />} />
          <Route path="/master-data/customers" element={<Customers />} />
          <Route path="/master-data/suppliers" element={<Suppliers />} />
          <Route path="/master-data/products" element={<ProductCatalog />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          
          {/* Procurement */}
          <Route path="/procurement" element={<PurchaseOrders />} />
          <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/procurement/purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="/procurement/goods-receipts" element={<GoodsReceipts />} />
          <Route path="/procurement/goods-receipts/:id" element={<GoodsReceiptDetail />} />
          <Route path="/procurement/suppliers" element={<ProcurementDashboard />} />
          <Route path="/procurement/rfq" element={<ProcurementDashboard />} />
          <Route path="/procurement/products" element={<ProductCatalog />} />
          
          {/* Manufacturing */}
          <Route path="/manufacturing" element={<WorkOrdersERP />} />
          <Route path="/manufacturing/work-orders" element={<WorkOrdersERP />} />
          <Route path="/manufacturing/bom" element={<BOMManagement />} />
          <Route path="/manufacturing/dashboard" element={<ManufacturingDashboard />} />
          
          {/* Field Service */}
          <Route path="/field-service" element={<FieldService />} />
          <Route path="/field-service/requests" element={<FieldService />} />
          <Route path="/field-service/work-orders" element={<FieldService />} />
          
          {/* Agents */}
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentSettings />} />
          
          {/* Reports */}
          <Route path="/reports" element={<ReportsDashboard />} />
          <Route path="/reports/bot-dashboard" element={<BotDashboard />} />
          <Route path="/reports/profit-loss" element={<ProfitLossStatement />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
          <Route path="/reports/ar-aging" element={<AgedReceivablesReport />} />
          <Route path="/reports/ar-ap/ar-aging" element={<AgedReceivablesReport />} />
          <Route path="/reports/ar-ap/ap-aging" element={<AgedReceivablesReport />} />
          <Route path="/reports/ar-ap/cash-flow" element={<FinancialReports />} />
          <Route path="/reports/stock-valuation" element={<StockValuationReport />} />
          <Route path="/reports/inventory/valuation" element={<StockValuationReport />} />
          <Route path="/reports/vat-summary" element={<VATSummaryReport />} />
          <Route path="/reports/financial/trial-balance" element={<FinancialReports />} />
          <Route path="/reports/financial/balance-sheet" element={<FinancialReports />} />
          <Route path="/reports/financial/income-statement" element={<FinancialReports />} />
          <Route path="/reports/sales-purchase/sales-kpis" element={<FinancialReports />} />
          <Route path="/reports/sales-purchase/purchase-kpis" element={<FinancialReports />} />
          <Route path="/reports/payroll/activity" element={<PayrollActivityReport />} />
          <Route path="/reports/expense/management" element={<ExpenseManagementReport />} />
          <Route path="/reports/compliance/bbbee" element={<BbbeeComplianceReport />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          
          {/* Aria Chat */}
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/aria" element={<AskAriaChat />} />
          <Route path="/ask-aria" element={<AskAriaChat />} />
          <Route path="/ask-aria/classify" element={<DocumentClassification />} />
          <Route path="/document-classification" element={<DocumentClassification />} />
          <Route path="/documents" element={<DocumentClassification />} />
          
          {/* Document Management */}
          <Route path="/documents/templates" element={<DocumentTemplates />} />
          <Route path="/documents/generate" element={<GenerateDocument />} />
          
          {/* Pending Actions */}
          <Route path="/actions" element={<PendingActions />} />
          
          {/* Integrations */}
          <Route path="/integrations" element={<IntegrationsList />} />
          
          {/* Admin */}
          <Route path="/admin/system" element={<SystemSettings />} />
          <Route path="/admin/company" element={<CompanySettings />} />
          <Route path="/admin/company-settings" element={<CompanySettings />} />
          <Route path="/admin/agents" element={<BotConfiguration />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/data-import" element={<DataImport />} />
          <Route path="/admin/dashboard" element={<RoleDashboard />} />
          <Route path="/admin/rbac" element={<RBACManagement />} />
          
          {/* Mobile */}
          <Route path="/mobile" element={<MobileManagement />} />
          
          {/* Catch-all: redirect to dashboard for 404 pages */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
