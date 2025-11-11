import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CompanyProvider } from './lib/company';
import { MainLayout } from './components/layout/MainLayout';
import ExecutiveDashboard from './pages/Dashboard/ExecutiveDashboard';
import Quotes from './pages/ERP/Quotes';
import SalesOrders from './pages/ERP/SalesOrders';
import Deliveries from './pages/ERP/Deliveries';
import WMSStock from './pages/ERP/WMSStock';
import GeneralLedger from './pages/ERP/GeneralLedger';
import ERPDashboard from './pages/ERPDashboard';
import BotRegistry from './pages/BotRegistry';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import InvoiceList from './pages/Financial/InvoiceList';
import InvoiceForm from './pages/Financial/InvoiceForm';
import PayrollDashboard from './pages/HR/PayrollDashboard';
import CRMDashboard from './pages/CRM/CRMDashboard';
import ProcurementDashboard from './pages/Procurement/ProcurementDashboard';
import ProductCatalog from './pages/Procurement/ProductCatalog';
import RFQManagement from './pages/Procurement/RFQManagement';
import ManufacturingDashboard from './pages/Manufacturing/ManufacturingDashboard';
import BOMManagement from './pages/Manufacturing/BOMManagement';
import WorkOrders from './pages/Manufacturing/WorkOrders';
import AgedReceivablesReport from './pages/Reports/AgedReceivablesReport';
import StockValuationReport from './pages/Reports/StockValuationReport';
import VATSummaryReport from './pages/Reports/VATSummaryReport';
import BankingDashboard from './pages/Banking/BankingDashboard';
import ChatInterface from './components/Chat/ChatInterface';
import SystemSettings from './pages/admin/SystemSettings';
import CompanySettings from './pages/admin/CompanySettings';
import BotConfiguration from './pages/admin/BotConfiguration';
import UserManagement from './pages/admin/UserManagement';
import AdminDashboard from './pages/admin/AdminDashboard';
import ERPConfiguration from './pages/admin/ERPConfiguration';
import BotsHub from './pages/Automation/BotsHub';
import Mailroom from './pages/Automation/Mailroom';
import FixedAssetsDashboard from './pages/FixedAssets/FixedAssetsDashboard';
import ProjectsDashboard from './pages/Projects/ProjectsDashboard';
import VATReturns from './pages/Tax/VATReturns';
import PurchaseOrders from './pages/AP/PurchaseOrders';
import AriaChat from './pages/Aria/AriaChat';
import CustomersPage from './pages/AR/Customers';
import SuppliersPage from './pages/AP/Suppliers';
import ProductsPage from './pages/Inventory/Products';
import BankAccounts from './pages/Banking/BankAccounts';
import Bills from './pages/AP/Bills';
import BillDetail from './pages/AP/BillDetail';
import PurchaseOrderDetail from './pages/AP/PurchaseOrderDetail';
import VATReturnsPage from './pages/Tax/VATReturnsPage';
import FinancialReports from './pages/Reports/FinancialReports';
import DocumentUpload from './pages/AskAria/DocumentUpload';
import DocumentTemplates from './pages/ERP/DocumentTemplates';
import ProcureToPay from './pages/ERP/ProcureToPay';
import BankingReconciliation from './pages/ERP/BankingReconciliation';
import VATReporting from './pages/ERP/VATReporting';
import SAPIntegration from './pages/ERP/SAPIntegration';
import ProductionMonitoring from './pages/ERP/ProductionMonitoring';
import ComprehensiveReporting from './pages/ERP/ComprehensiveReporting';
import ERPCustomers from './pages/ERP/Customers';
import ERPProducts from './pages/ERP/Products';
import ERPSuppliers from './pages/ERP/Suppliers';
import ERPReceipts from './pages/ERP/Receipts';
import ERPInvoices from './pages/ERP/Invoices';
import QuoteDetail from './pages/ERP/QuoteDetail';
import SalesOrderDetail from './pages/ERP/SalesOrderDetail';
import DeliveryDetail from './pages/ERP/DeliveryDetail';
import InvoiceDetail from './pages/ERP/InvoiceDetail';
import ReceiptDetail from './pages/ERP/ReceiptDetail';
import PriceLists from './pages/ERP/PriceLists';
import AccountsPayable from './pages/ERP/AccountsPayable';
import AccountsReceivable from './pages/ERP/AccountsReceivable';
import './styles/design-system.css';

function App() {
  return (
    <BrowserRouter>
      <CompanyProvider>
        <MainLayout>
          <Routes>
          {/* Dashboard */}
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/erp-dashboard" element={<ERPDashboard />} />
          
          {/* Order-to-Cash */}
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/erp/quotes" element={<Quotes />} />
          <Route path="/erp/quotes/:id" element={<QuoteDetail />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/sales-orders/:id" element={<SalesOrderDetail />} />
          <Route path="/sales-orders/new" element={<SalesOrders />} />
          <Route path="/erp/sales-orders" element={<SalesOrders />} />
          <Route path="/erp/sales-orders/:id" element={<SalesOrderDetail />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/deliveries/:id" element={<DeliveryDetail />} />
          <Route path="/deliveries/new" element={<DeliveryDetail />} />
          <Route path="/erp/deliveries" element={<Deliveries />} />
          <Route path="/erp/deliveries/:id" element={<DeliveryDetail />} />
          <Route path="/wms-stock" element={<WMSStock />} />
          
          {/* ERP Master Data */}
          <Route path="/erp/customers" element={<ERPCustomers />} />
          <Route path="/erp/products" element={<ERPProducts />} />
          <Route path="/erp/suppliers" element={<ERPSuppliers />} />
          <Route path="/erp/receipts" element={<ERPReceipts />} />
          <Route path="/ar/receipts" element={<ERPReceipts />} />
          <Route path="/erp/price-lists" element={<PriceLists />} />
          <Route path="/pricing/price-lists" element={<PriceLists />} />
          
          {/* General Ledger */}
          <Route path="/gl" element={<GeneralLedger />} />
          
          {/* Accounts Payable */}
          <Route path="/erp/accounts-payable" element={<AccountsPayable />} />
          <Route path="/erp/ap" element={<AccountsPayable />} />
          
          {/* Accounts Receivable */}
          <Route path="/erp/accounts-receivable" element={<AccountsReceivable />} />
          <Route path="/erp/ar" element={<AccountsReceivable />} />
          
          {/* Invoices */}
          <Route path="/erp/invoices" element={<ERPInvoices />} />
          <Route path="/erp/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices" element={<ERPInvoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          
          {/* Document Templates */}
          <Route path="/documents/templates" element={<DocumentTemplates />} />
          
          {/* Procure-to-Pay (Priority 6) */}
          <Route path="/procure-to-pay" element={<ProcureToPay />} />
          <Route path="/procurement/procure-to-pay" element={<ProcureToPay />} />
          
          {/* Banking Reconciliation (Priority 7) */}
          <Route path="/banking/reconciliation" element={<BankingReconciliation />} />
          
          {/* VAT Reporting (Priority 8) */}
          <Route path="/vat-reporting" element={<VATReporting />} />
          <Route path="/tax/vat-reporting" element={<VATReporting />} />
          
          {/* SAP Integration (Priority 10) */}
          <Route path="/sap-integration" element={<SAPIntegration />} />
          <Route path="/integration/sap" element={<SAPIntegration />} />
          
          {/* Production Monitoring (Priority 12) */}
          <Route path="/production-monitoring" element={<ProductionMonitoring />} />
          <Route path="/admin/monitoring" element={<ProductionMonitoring />} />
          
          {/* Comprehensive Reporting (Priority 11) */}
          <Route path="/comprehensive-reporting" element={<ComprehensiveReporting />} />
          <Route path="/reports/comprehensive" element={<ComprehensiveReporting />} />
          
          {/* Accounts Payable */}
          <Route path="/ap" element={<Bills />} />
          <Route path="/ap/bills" element={<Bills />} />
          <Route path="/ap/bills/:id" element={<BillDetail />} />
          <Route path="/ap/invoices" element={<InvoiceList />} />
          <Route path="/ap/invoices/new" element={<InvoiceForm />} />
          <Route path="/ap/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/ap/purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="/ap/suppliers" element={<SuppliersPage />} />
          
          {/* Accounts Receivable */}
          <Route path="/ar" element={<CRMDashboard />} />
          <Route path="/ar/customers" element={<CustomersPage />} />
          <Route path="/ar/invoices" element={<InvoiceList />} />
          <Route path="/ar/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/ar/invoices/new" element={<InvoiceDetail />} />
          <Route path="/ar/receipts/:id" element={<ReceiptDetail />} />
          <Route path="/ar/receipts/new" element={<ReceiptDetail />} />
          
          {/* Banking */}
          <Route path="/banking" element={<BankingDashboard />} />
          <Route path="/banking/accounts" element={<BankAccounts />} />
          
          {/* Fixed Assets */}
          <Route path="/fixed-assets" element={<FixedAssetsDashboard />} />
          
          {/* Payroll */}
          <Route path="/payroll" element={<PayrollDashboard />} />
          <Route path="/payroll/employees" element={<PayrollDashboard />} />
          
          {/* Projects */}
          <Route path="/projects" element={<ProjectsDashboard />} />
          
          {/* Tax */}
          <Route path="/tax/vat" element={<VATReturns />} />
          <Route path="/tax/vat-returns" element={<VATReturnsPage />} />
          
          {/* CRM */}
          <Route path="/crm" element={<CRMDashboard />} />
          <Route path="/crm/customers" element={<Customers />} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<WMSStock />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/stock" element={<WMSStock />} />
          
          {/* Procurement */}
          <Route path="/procurement" element={<ProcurementDashboard />} />
          <Route path="/procurement/suppliers" element={<ProcurementDashboard />} />
          <Route path="/procurement/rfq" element={<ProcurementDashboard />} />
          <Route path="/procurement/products" element={<ProductCatalog />} />
          
          {/* Manufacturing */}
          <Route path="/manufacturing" element={<ManufacturingDashboard />} />
          <Route path="/manufacturing/bom" element={<BOMManagement />} />
          <Route path="/manufacturing/work-orders" element={<WorkOrders />} />
          
          {/* Automation */}
          <Route path="/bots" element={<BotRegistry />} />
          <Route path="/automation/bots" element={<BotsHub />} />
          <Route path="/automation/mailroom" element={<Mailroom />} />
          
          {/* Reports */}
          <Route path="/reports" element={<FinancialReports />} />
          <Route path="/reports/financial" element={<FinancialReports />} />
          <Route path="/reports/ar-aging" element={<AgedReceivablesReport />} />
          <Route path="/reports/stock-valuation" element={<StockValuationReport />} />
          <Route path="/reports/vat-summary" element={<VATSummaryReport />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          
          {/* Aria Chat */}
          <Route path="/chat" element={<AriaChat />} />
          <Route path="/aria" element={<AriaChat />} />
          <Route path="/ask-aria" element={<DocumentUpload />} />
          <Route path="/aria/upload" element={<DocumentUpload />} />
          
          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/system" element={<SystemSettings />} />
          <Route path="/admin/company" element={<CompanySettings />} />
          <Route path="/admin/bots" element={<BotConfiguration />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/erp" element={<ERPConfiguration />} />
        </Routes>
        </MainLayout>
      </CompanyProvider>
    </BrowserRouter>
  );
}

export default App;
