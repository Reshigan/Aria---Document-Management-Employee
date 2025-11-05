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
import EmployeeDirectory from './pages/HR/EmployeeDirectory';
import CustomerList from './pages/CRM/CustomerList';
import SupplierList from './pages/Procurement/SupplierList';
import ProductCatalog from './pages/Procurement/ProductCatalog';
import RFQManagement from './pages/Procurement/RFQManagement';
import ManufacturingDashboard from './pages/Manufacturing/ManufacturingDashboard';
import BOMManagement from './pages/Manufacturing/BOMManagement';
import WorkOrders from './pages/Manufacturing/WorkOrders';
import AgedReceivablesReport from './pages/Reports/AgedReceivablesReport';
import StockValuationReport from './pages/Reports/StockValuationReport';
import VATSummaryReport from './pages/Reports/VATSummaryReport';
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
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/wms-stock" element={<WMSStock />} />
          
          {/* General Ledger */}
          <Route path="/gl" element={<GeneralLedger />} />
          
          {/* Accounts Payable */}
          <Route path="/ap" element={<InvoiceList />} />
          <Route path="/ap/invoices" element={<InvoiceList />} />
          <Route path="/ap/invoices/new" element={<InvoiceForm />} />
          <Route path="/ap/suppliers" element={<SupplierList />} />
          
          {/* Accounts Receivable */}
          <Route path="/ar" element={<CustomerList />} />
          <Route path="/ar/customers" element={<CustomerList />} />
          <Route path="/ar/invoices" element={<InvoiceList />} />
          
          {/* Banking */}
          <Route path="/banking" element={<div style={{padding: '2rem'}}>Banking Module - Coming Soon</div>} />
          
          {/* Payroll */}
          <Route path="/payroll" element={<EmployeeDirectory />} />
          <Route path="/payroll/employees" element={<EmployeeDirectory />} />
          
          {/* CRM */}
          <Route path="/crm" element={<CustomerList />} />
          <Route path="/crm/customers" element={<Customers />} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<WMSStock />} />
          <Route path="/inventory/products" element={<ProductCatalog />} />
          <Route path="/inventory/stock" element={<WMSStock />} />
          
          {/* Procurement */}
          <Route path="/procurement" element={<SupplierList />} />
          <Route path="/procurement/suppliers" element={<Suppliers />} />
          <Route path="/procurement/rfq" element={<RFQManagement />} />
          <Route path="/procurement/products" element={<ProductCatalog />} />
          
          {/* Manufacturing */}
          <Route path="/manufacturing" element={<ManufacturingDashboard />} />
          <Route path="/manufacturing/bom" element={<BOMManagement />} />
          <Route path="/manufacturing/work-orders" element={<WorkOrders />} />
          
          {/* Bots */}
          <Route path="/bots" element={<BotRegistry />} />
          
          {/* Reports */}
          <Route path="/reports" element={<AgedReceivablesReport />} />
          <Route path="/reports/ar-aging" element={<AgedReceivablesReport />} />
          <Route path="/reports/stock-valuation" element={<StockValuationReport />} />
          <Route path="/reports/vat-summary" element={<VATSummaryReport />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
