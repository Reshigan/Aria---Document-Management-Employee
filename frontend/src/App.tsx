import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import BotsHub from './pages/Automation/BotsHub';
import Mailroom from './pages/Automation/Mailroom';
import FixedAssetsDashboard from './pages/FixedAssets/FixedAssetsDashboard';
import ProjectsDashboard from './pages/Projects/ProjectsDashboard';
import VATReturns from './pages/Tax/VATReturns';
import PurchaseOrders from './pages/AP/PurchaseOrders';
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
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/sales-orders/new" element={<SalesOrders />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/deliveries/new" element={<Deliveries />} />
          <Route path="/wms-stock" element={<WMSStock />} />
          
          {/* General Ledger */}
          <Route path="/gl" element={<GeneralLedger />} />
          
          {/* Accounts Payable */}
          <Route path="/ap" element={<InvoiceList />} />
          <Route path="/ap/invoices" element={<InvoiceList />} />
          <Route path="/ap/invoices/new" element={<InvoiceForm />} />
          <Route path="/ap/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/ap/suppliers" element={<Suppliers />} />
          
          {/* Accounts Receivable */}
          <Route path="/ar" element={<CRMDashboard />} />
          <Route path="/ar/customers" element={<CRMDashboard />} />
          <Route path="/ar/invoices" element={<InvoiceList />} />
          <Route path="/ar/invoices/new" element={<InvoiceList />} />
          
          {/* Banking */}
          <Route path="/banking" element={<BankingDashboard />} />
          
          {/* Fixed Assets */}
          <Route path="/fixed-assets" element={<FixedAssetsDashboard />} />
          
          {/* Payroll */}
          <Route path="/payroll" element={<PayrollDashboard />} />
          <Route path="/payroll/employees" element={<PayrollDashboard />} />
          
          {/* Projects */}
          <Route path="/projects" element={<ProjectsDashboard />} />
          
          {/* Tax */}
          <Route path="/tax/vat" element={<VATReturns />} />
          
          {/* CRM */}
          <Route path="/crm" element={<CRMDashboard />} />
          <Route path="/crm/customers" element={<Customers />} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<WMSStock />} />
          <Route path="/inventory/products" element={<ProductCatalog />} />
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
          <Route path="/reports" element={<AgedReceivablesReport />} />
          <Route path="/reports/ar-aging" element={<AgedReceivablesReport />} />
          <Route path="/reports/stock-valuation" element={<StockValuationReport />} />
          <Route path="/reports/vat-summary" element={<VATSummaryReport />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          
          {/* Aria Chat */}
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/aria" element={<ChatInterface />} />
          
          {/* Admin */}
          <Route path="/admin/system" element={<SystemSettings />} />
          <Route path="/admin/company" element={<CompanySettings />} />
          <Route path="/admin/bots" element={<BotConfiguration />} />
          <Route path="/admin/users" element={<UserManagement />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
