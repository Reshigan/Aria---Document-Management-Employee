import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import MainLayout from '../components/layout/MainLayout';

// Dashboard
import ModernDashboard from '../components/Dashboard/ModernDashboard';

// Financial
import InvoiceList from '../pages/Financial/InvoiceList';
import InvoiceForm from '../pages/Financial/InvoiceForm';

// CRM
import CustomerList from '../pages/CRM/CustomerList';

// Procurement
import SupplierList from '../pages/Procurement/SupplierList';
import ProductCatalog from '../pages/Procurement/ProductCatalog';

// HR
import EmployeeDirectory from '../pages/HR/EmployeeDirectory';

// Reports
import AgedReceivablesReport from '../pages/Reports/AgedReceivablesReport';
import VATSummaryReport from '../pages/Reports/VATSummaryReport';
import StockValuationReport from '../pages/Reports/StockValuationReport';

// Agents
import BotTestingDashboard from '../pages/Agents/BotTestingDashboard';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ModernDashboard />} />

        {/* Financial Module */}
        <Route path="financial">
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
        </Route>

        {/* CRM Module */}
        <Route path="crm">
          <Route path="customers" element={<CustomerList />} />
        </Route>

        {/* Procurement Module */}
        <Route path="procurement">
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="products" element={<ProductCatalog />} />
        </Route>

        {/* HR Module */}
        <Route path="hr">
          <Route path="employees" element={<EmployeeDirectory />} />
        </Route>

        {/* Reports Module */}
        <Route path="reports">
          <Route path="aged-receivables" element={<AgedReceivablesReport />} />
          <Route path="vat-summary" element={<VATSummaryReport />} />
          <Route path="stock-valuation" element={<StockValuationReport />} />
        </Route>

        {/* Agents Module */}
        <Route path="agents">
          <Route path="testing" element={<BotTestingDashboard />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
