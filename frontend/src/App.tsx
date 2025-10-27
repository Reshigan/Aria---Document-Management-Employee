import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout Components
import { MainLayout } from './components/layout/MainLayout';

// Public Pages
import { Landing } from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import BotShowcase from './pages/BotShowcase';
import ApiTest from './pages/ApiTest';
import BotsLive from './pages/BotsLive';
import Sandpit from './pages/Sandpit';

// Dashboard
import Dashboard from './pages/Dashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';

// Admin Pages
import CompanySettings from './pages/admin/CompanySettings';
import UserManagement from './pages/admin/UserManagement';
import BotConfiguration from './pages/admin/BotConfiguration';
import SystemSettings from './pages/admin/SystemSettings';

// Bot Reports
import BotDashboard from './pages/reports/BotDashboard';
import InvoiceReconciliationReport from './pages/reports/InvoiceReconciliationReport';
import BbbeeComplianceReport from './pages/reports/BbbeeComplianceReport';
import PayrollActivityReport from './pages/reports/PayrollActivityReport';
import ExpenseManagementReport from './pages/reports/ExpenseManagementReport';

// Document Management
import DocumentTemplates from './pages/documents/DocumentTemplates';
import GenerateDocument from './pages/documents/GenerateDocument';
import DocumentHistory from './pages/documents/DocumentHistory';

// Financial Reports
import ProfitLossStatement from './pages/financial/ProfitLossStatement';
import BalanceSheet from './pages/financial/BalanceSheet';
import CashFlowStatement from './pages/financial/CashFlowStatement';
import AgedReports from './pages/financial/AgedReports';

// Workflows
import WorkflowManagement from './pages/workflows/WorkflowManagement';
import PendingActions from './pages/PendingActions';

// Integrations
import IntegrationsList from './pages/integrations/IntegrationsList';
import IntegrationSync from './pages/integrations/IntegrationSync';

// Manufacturing Module
import ManufacturingDashboard from './pages/Manufacturing/ManufacturingDashboard';
import BOMManagement from './pages/Manufacturing/BOMManagement';
import WorkOrders from './pages/Manufacturing/WorkOrders';

// Quality Management
import QualityDashboard from './pages/Quality/QualityDashboard';
import QualityInspections from './pages/Quality/QualityInspections';

// Maintenance
import AssetManagement from './pages/Maintenance/AssetManagement';

// Procurement
import RFQManagement from './pages/Procurement/RFQManagement';

// Legal Pages
import TermsOfService from './pages/Legal/TermsOfService';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';

// Pricing
import PricingComplete from './pages/PricingComplete';

// ARIA Voice Interface
import { AriaVoiceInterface } from './components/aria/AriaVoiceInterface';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/**
 * Main App Component
 * Complete routing configuration for all 28+ pages
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============================================
            PUBLIC ROUTES (No authentication required)
            ============================================ */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/sandpit" element={<Sandpit />} />
        <Route path="/bots" element={<BotShowcase />} />
        <Route path="/bots-live" element={<BotsLive />} />
        <Route path="/api-test" element={<ApiTest />} />
        <Route path="/pricing" element={<PricingComplete />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* ============================================
            PROTECTED ROUTES (Authentication required)
            ============================================ */}
        
        {/* Main Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Customer Dashboard */}
        <Route path="/customer-dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <CustomerDashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ARIA Voice Interface */}
        <Route path="/app" element={
          <ProtectedRoute>
            <AriaVoiceInterface />
          </ProtectedRoute>
        } />
        <Route path="/aria" element={
          <ProtectedRoute>
            <AriaVoiceInterface />
          </ProtectedRoute>
        } />

        {/* ============================================
            ADMIN ROUTES
            ============================================ */}
        <Route path="/admin/company-settings" element={
          <ProtectedRoute>
            <MainLayout>
              <CompanySettings />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute>
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/bots" element={
          <ProtectedRoute>
            <MainLayout>
              <BotConfiguration />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/system" element={
          <ProtectedRoute>
            <MainLayout>
              <SystemSettings />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            BOT REPORTS ROUTES
            ============================================ */}
        <Route path="/reports/bot-dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <BotDashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/invoice-reconciliation" element={
          <ProtectedRoute>
            <MainLayout>
              <InvoiceReconciliationReport />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/bbbee-compliance" element={
          <ProtectedRoute>
            <MainLayout>
              <BbbeeComplianceReport />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/payroll-activity" element={
          <ProtectedRoute>
            <MainLayout>
              <PayrollActivityReport />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/expense-management" element={
          <ProtectedRoute>
            <MainLayout>
              <ExpenseManagementReport />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            DOCUMENT MANAGEMENT ROUTES
            ============================================ */}
        <Route path="/documents/templates" element={
          <ProtectedRoute>
            <MainLayout>
              <DocumentTemplates />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/documents/generate" element={
          <ProtectedRoute>
            <MainLayout>
              <GenerateDocument />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/documents/history" element={
          <ProtectedRoute>
            <MainLayout>
              <DocumentHistory />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            FINANCIAL REPORTS ROUTES
            ============================================ */}
        <Route path="/financial/profit-loss" element={
          <ProtectedRoute>
            <MainLayout>
              <ProfitLossStatement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/financial/balance-sheet" element={
          <ProtectedRoute>
            <MainLayout>
              <BalanceSheet />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/financial/cash-flow" element={
          <ProtectedRoute>
            <MainLayout>
              <CashFlowStatement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/financial/aged-reports" element={
          <ProtectedRoute>
            <MainLayout>
              <AgedReports />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            WORKFLOW ROUTES
            ============================================ */}
        <Route path="/workflows" element={
          <ProtectedRoute>
            <MainLayout>
              <WorkflowManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/actions" element={
          <ProtectedRoute>
            <MainLayout>
              <PendingActions />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/pending-actions" element={
          <ProtectedRoute>
            <MainLayout>
              <PendingActions />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            INTEGRATION ROUTES
            ============================================ */}
        <Route path="/integrations" element={
          <ProtectedRoute>
            <MainLayout>
              <IntegrationsList />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/integrations/sync" element={
          <ProtectedRoute>
            <MainLayout>
              <IntegrationSync />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            MANUFACTURING MODULE ROUTES
            ============================================ */}
        <Route path="/manufacturing/dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <ManufacturingDashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/manufacturing/bom" element={
          <ProtectedRoute>
            <MainLayout>
              <BOMManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/manufacturing/work-orders" element={
          <ProtectedRoute>
            <MainLayout>
              <WorkOrders />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            QUALITY MANAGEMENT ROUTES
            ============================================ */}
        <Route path="/quality/dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <QualityDashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/quality/inspections" element={
          <ProtectedRoute>
            <MainLayout>
              <QualityInspections />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            MAINTENANCE ROUTES
            ============================================ */}
        <Route path="/maintenance/assets" element={
          <ProtectedRoute>
            <MainLayout>
              <AssetManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            PROCUREMENT ROUTES
            ============================================ */}
        <Route path="/procurement/rfq" element={
          <ProtectedRoute>
            <MainLayout>
              <RFQManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* ============================================
            404 - NOT FOUND
            ============================================ */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
