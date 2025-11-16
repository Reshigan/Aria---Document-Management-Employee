import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
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
import ReportsDashboard from './pages/Reports/ReportsDashboard';
import FinancialReports from './pages/Reports/FinancialReports';
import SalesKPIsReport from './pages/Reports/SalesKPIsReport';
import PurchaseKPIsReport from './pages/Reports/PurchaseKPIsReport';
import PayrollActivityReport from './pages/reports/PayrollActivityReport';
import ExpenseManagementReport from './pages/reports/ExpenseManagementReport';
import BbbeeComplianceReport from './pages/reports/BbbeeComplianceReport';
import BankingDashboard from './pages/Banking/BankingDashboard';
import ChatInterface from './components/Chat/ChatInterface';
import AskAriaChat from './pages/AskAria/AskAriaChat';
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
import { FieldServiceDashboard, WorkOrdersList, WorkOrderDetail, TechniciansList, Scheduling } from './pages/FieldService';
import './styles/design-system.css';

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/inventory/products" element={<ProductCatalog />} />
          <Route path="/inventory/stock" element={<WMSStock />} />
          
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
          <Route path="/field-service" element={<FieldServiceDashboard />} />
          <Route path="/field-service/orders" element={<WorkOrdersList />} />
          <Route path="/field-service/orders/:id" element={<WorkOrderDetail />} />
          <Route path="/field-service/technicians" element={<TechniciansList />} />
          <Route path="/field-service/scheduling" element={<Scheduling />} />
          
          {/* Bots */}
          <Route path="/bots" element={<BotRegistry />} />
          
          {/* Reports */}
          <Route path="/reports" element={<ReportsDashboard />} />
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
          <Route path="/reports/sales-purchase/sales-kpis" element={<SalesKPIsReport />} />
          <Route path="/reports/sales-purchase/purchase-kpis" element={<PurchaseKPIsReport />} />
          <Route path="/reports/payroll/activity" element={<PayrollActivityReport />} />
          <Route path="/reports/expense/management" element={<ExpenseManagementReport />} />
          <Route path="/reports/compliance/bbbee" element={<BbbeeComplianceReport />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          
          {/* Aria Chat */}
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/aria" element={<AskAriaChat />} />
          <Route path="/ask-aria" element={<AskAriaChat />} />
          
          {/* Admin */}
          <Route path="/admin/system" element={<SystemSettings />} />
          <Route path="/admin/company" element={<CompanySettings />} />
          <Route path="/admin/bots" element={<BotConfiguration />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/data-import" element={<DataImport />} />
          <Route path="/admin/dashboard" element={<RoleDashboard />} />
          <Route path="/admin/rbac" element={<RBACManagement />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
