import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './components/NotificationSystem';
import ErrorBoundary from './components/ErrorBoundary';
import SessionTimeout from './components/SessionTimeout';
import Login from './pages/auth/Login';
import NotFound from './pages/NotFound';
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
import APPurchaseOrderDetail from './pages/AP/PurchaseOrderDetail';
import APBillDetail from './pages/AP/BillDetail';
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
import HRDashboard from './pages/HR/HRDashboard';
import HREmployees from './pages/HR/Employees';
import Departments from './pages/HR/Departments';
import Attendance from './pages/HR/Attendance';
import LeaveManagement from './pages/HR/LeaveManagement';
import ProjectsDashboard from './pages/Projects/ProjectsDashboard';
import Tasks from './pages/Projects/Tasks';
import Timesheets from './pages/Projects/Timesheets';
import ProjectReports from './pages/Projects/ProjectReports';
import PayrollRuns from './pages/Payroll/PayrollRuns';
import TaxFilings from './pages/Payroll/TaxFilings';
import ServiceOrders from './pages/FieldService/ServiceOrders';
import Technicians from './pages/FieldService/Technicians';
import Scheduling from './pages/FieldService/Scheduling';
import Bills from './pages/AP/Bills';
import Payments from './pages/AP/Payments';
import Receipts from './pages/AR/Receipts';
import CustomerDetail from './pages/AR/CustomerDetail';
import BankAccounts from './pages/Banking/BankAccounts';
import Reconciliation from './pages/Banking/Reconciliation';
import SalesInvoiceReconciliation from './pages/Financial/SalesInvoiceReconciliation';
import Warehouses from './pages/Inventory/Warehouses';
import StockMovements from './pages/Inventory/StockMovements';
import BOMs from './pages/Manufacturing/BOMs';
import Production from './pages/Manufacturing/Production';
import TaxCompliance from './pages/Tax/TaxCompliance';
import LegalCompliance from './pages/Legal/LegalCompliance';
import FixedAssets from './pages/FixedAssets/FixedAssets';
import ComplianceDashboard from './pages/Compliance/ComplianceDashboard';
import QualityDashboard from './pages/Quality/QualityDashboard';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';
import ProductCategories from './pages/ProductHierarchy/ProductCategories';
import ProductTemplates from './pages/ProductHierarchy/ProductTemplates';
import ProductAttributes from './pages/ProductHierarchy/ProductAttributes';
import ProductVariants from './pages/ProductHierarchy/ProductVariants';
import CustomerGroups from './pages/Pricing/CustomerGroups';
import Pricelists from './pages/Pricing/Pricelists';
import PricingRules from './pages/Pricing/PricingRules';
import PriceCalculator from './pages/Pricing/PriceCalculator';
import ServiceProjects from './pages/ServiceFulfillment/Projects';
import ServiceTimesheets from './pages/ServiceFulfillment/Timesheets';
import HelpdeskTeams from './pages/Helpdesk/HelpdeskTeams';
import HelpdeskTickets from './pages/Helpdesk/HelpdeskTickets';
import FieldServiceWorkOrders from './pages/FieldService/WorkOrders';
import ServiceLocations from './pages/FieldService/ServiceLocations';
import Milestones from './pages/ServiceFulfillment/Milestones';
import Deliverables from './pages/ServiceFulfillment/Deliverables';
import MigrationJobs from './pages/Migration/MigrationJobs';
import MigrationValidation from './pages/Migration/MigrationValidation';
// Financial Module Pages
import BudgetManagement from './pages/Financial/BudgetManagement';
import CostCenters from './pages/Financial/CostCenters';
import PaymentBatches from './pages/Financial/PaymentBatches';
import ExpenseClaims from './pages/Financial/ExpenseClaims';
import CreditNotes from './pages/Financial/CreditNotes';
import Collections from './pages/Financial/Collections';
import CashForecast from './pages/Financial/CashForecast';
import BankTransfers from './pages/Financial/BankTransfers';
// Xero Parity Pages
import RecurringInvoices from './pages/Financial/RecurringInvoices';
import CustomerStatements from './pages/Financial/CustomerStatements';
import BudgetVsActual from './pages/Financial/BudgetVsActual';
import BankFeeds from './pages/Financial/BankFeeds';
// Operations Module Pages
import PriceLists from './pages/Operations/PriceLists';
import Discounts from './pages/Operations/Discounts';
import SalesTargets from './pages/Operations/SalesTargets';
import Commissions from './pages/Operations/Commissions';
import StockAdjustments from './pages/Operations/StockAdjustments';
import StockTransfers from './pages/Operations/StockTransfers';
import ReorderPoints from './pages/Operations/ReorderPoints';
import Requisitions from './pages/Operations/Requisitions';
import RFQs from './pages/Operations/RFQs';
import ProductionPlanning from './pages/Operations/ProductionPlanning';
import MachineMaintenance from './pages/Operations/MachineMaintenance';
// People Module Pages
import Positions from './pages/People/Positions';
import SalaryStructures from './pages/People/SalaryStructures';
import Deductions from './pages/People/Deductions';
import PAYEReturns from './pages/People/PAYEReturns';
import UIFReturns from './pages/People/UIFReturns';
import JobPostings from './pages/People/JobPostings';
import Applicants from './pages/People/Applicants';
import OnboardingTasks from './pages/People/OnboardingTasks';
import PerformanceReviews from './pages/People/PerformanceReviews';
import TrainingCourses from './pages/People/TrainingCourses';
import EmployeeSkills from './pages/People/EmployeeSkills';
// Services Module Pages
import RoutePlanning from './pages/Services/RoutePlanning';
import ServiceContracts from './pages/Services/ServiceContracts';
import SupportTickets from './pages/Services/SupportTickets';
import KnowledgeBase from './pages/Services/KnowledgeBase';
import ProjectMilestones from './pages/Services/ProjectMilestones';
// Compliance Module Pages
import VATReturns from './pages/Compliance/VATReturns';
import AssetRegister from './pages/Compliance/AssetRegister';
import BBBEE from './pages/Compliance/BBBEE';
import AuditTrail from './pages/Compliance/AuditTrail';
import RiskRegister from './pages/Compliance/RiskRegister';
import DocumentControl from './pages/Compliance/DocumentControl';
import Policies from './pages/Compliance/Policies';
// Admin Configuration Pages (Xero Parity)
import ChartOfAccounts from './pages/admin/ChartOfAccounts';
import InvoiceTemplates from './pages/admin/InvoiceTemplates';
import LockDates from './pages/admin/LockDates';
import PaymentTerms from './pages/admin/PaymentTerms';
import TaxRates from './pages/admin/TaxRates';
import EmailTemplates from './pages/admin/EmailTemplates';
import TrackingCategories from './pages/admin/TrackingCategories';
import ComingSoon from './pages/ComingSoon';
// CRM Pages
import CRMLeads from './pages/CRM/Leads';
import CRMOpportunities from './pages/CRM/Opportunities';
// Field Service Pages
import FieldServiceEquipment from './pages/FieldService/Equipment';
// Fixed Assets Pages
import FixedAssetsDepreciation from './pages/FixedAssets/Depreciation';
// HR Pages
import HROrgChart from './pages/HR/OrgChart';
import HRRecruitment from './pages/HR/Recruitment';
// Inventory Pages
import InventoryBarcode from './pages/Inventory/Barcode';
// Legal Pages
import LegalContracts from './pages/Legal/Contracts';
// Procurement Pages
import ProcurementContracts from './pages/Procurement/Contracts';
import ProcurementSupplierPortal from './pages/Procurement/SupplierPortal';
// Projects Pages
import ProjectsGantt from './pages/Projects/Gantt';
import ProjectsResources from './pages/Projects/Resources';
// Quality Pages
import QualityInspections from './pages/Quality/Inspections';
// Support Pages
import SupportCustomerPortal from './pages/Support/CustomerPortal';
import SupportEscalations from './pages/Support/Escalations';
import SupportSLA from './pages/Support/SLA';
// Help Pages
import HelpComplianceFAQs from './pages/Help/ComplianceFAQs';
import HelpComplianceMonthEnd from './pages/Help/ComplianceMonthEnd';
import HelpFinancialFAQs from './pages/Help/FinancialFAQs';
import HelpFinancialMonthEnd from './pages/Help/FinancialMonthEnd';
import HelpOperationsFAQs from './pages/Help/OperationsFAQs';
import HelpOperationsMonthEnd from './pages/Help/OperationsMonthEnd';
import HelpPeopleFAQs from './pages/Help/PeopleFAQs';
import HelpPeopleMonthEnd from './pages/Help/PeopleMonthEnd';
import HelpServicesFAQs from './pages/Help/ServicesFAQs';
import HelpServicesMonthEnd from './pages/Help/ServicesMonthEnd';
// Training Pages - Compliance
import TrainingComplianceBasics from './pages/Training/ComplianceBasics';
import TrainingComplianceAdvanced from './pages/Training/ComplianceAdvanced';
import TrainingComplianceCertification from './pages/Training/ComplianceCertification';
import TrainingComplianceRefresher from './pages/Training/ComplianceRefresher';
// Training Pages - Financial
import TrainingFinancialBasics from './pages/Training/FinancialBasics';
import TrainingFinancialAdvanced from './pages/Training/FinancialAdvanced';
import TrainingFinancialCertification from './pages/Training/FinancialCertification';
import TrainingFinancialRefresher from './pages/Training/FinancialRefresher';
// Training Pages - Operations
import TrainingOperationsBasics from './pages/Training/OperationsBasics';
import TrainingOperationsAdvanced from './pages/Training/OperationsAdvanced';
import TrainingOperationsCertification from './pages/Training/OperationsCertification';
import TrainingOperationsRefresher from './pages/Training/OperationsRefresher';
// Training Pages - People
import TrainingPeopleBasics from './pages/Training/PeopleBasics';
import TrainingPeopleAdvanced from './pages/Training/PeopleAdvanced';
import TrainingPeopleCertification from './pages/Training/PeopleCertification';
import TrainingPeopleRefresher from './pages/Training/PeopleRefresher';
// Training Pages - Services
import TrainingServicesBasics from './pages/Training/ServicesBasics';
import TrainingServicesAdvanced from './pages/Training/ServicesAdvanced';
import TrainingServicesCertification from './pages/Training/ServicesCertification';
import TrainingServicesRefresher from './pages/Training/ServicesRefresher';
import SetupWizard from './pages/SetupWizard';
import DataExport from './pages/GoLive/DataExport';
import ScheduledBots from './pages/GoLive/ScheduledBots';
import SecuritySettings from './pages/GoLive/SecuritySettings';
import DataMigration from './pages/GoLive/DataMigration';
import WorkflowManagement from './pages/workflows/WorkflowManagement';
import ERPBankingReconciliation from './pages/ERP/BankingReconciliation';
import ERPProcureToPay from './pages/ERP/ProcureToPay';
import ERPProductionMonitoring from './pages/ERP/ProductionMonitoring';
import ERPSAPIntegration from './pages/ERP/SAPIntegration';
import ERPVATReporting from './pages/ERP/VATReporting';
import ERPComprehensiveReporting from './pages/ERP/ComprehensiveReporting';
import ERPAccountsPayable from './pages/ERP/AccountsPayable';
import ERPInvoiceDetail from './pages/ERP/InvoiceDetail';
import ERPReceiptDetail from './pages/ERP/ReceiptDetail';
import ERPPriceLists from './pages/ERP/PriceLists';
import ERPProducts from './pages/ERP/Products';
import ERPReceipts from './pages/ERP/Receipts';
import DocumentHistory from './pages/documents/DocumentHistory';
import IntegrationSync from './pages/integrations/IntegrationSync';
import InvoiceReconciliationReport from './pages/reports/InvoiceReconciliationReport';
import './styles/design-system.css';
import './styles/dark-mode.css';

function App() {
  return (
    <ThemeProvider>
    <ErrorBoundary>
    <NotificationProvider>
    <BrowserRouter>
      <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/setup" element={<SetupWizard />} />
        
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
          
                    {/* ERP Module Routes (aliases for navigation) */}
                    <Route path="/erp/quotes" element={<Quotes />} />
                    <Route path="/erp/quotes/:id" element={<QuoteDetail />} />
                    <Route path="/erp/sales-orders" element={<SalesOrders />} />
                    <Route path="/erp/sales-orders/:id" element={<SalesOrderDetail />} />
                    <Route path="/erp/deliveries" element={<Deliveries />} />
                    <Route path="/erp/deliveries/:id" element={<DeliveryDetail />} />
                    <Route path="/erp/invoices" element={<InvoiceList />} />
                    <Route path="/erp/invoices/:id" element={<InvoiceForm />} />
                                        <Route path="/erp/customers" element={<Customers />} />
                                        <Route path="/erp/customers/:id" element={<CustomerDetail />} />
          
                    {/* General Ledger */}
                    <Route path="/gl" element={<GeneralLedger />} />
                    <Route path="/general-ledger" element={<GeneralLedger />} />
                    <Route path="/gl/journal-entries" element={<GeneralLedger />} />
                    <Route path="/gl/chart-of-accounts" element={<GeneralLedger />} />
                    <Route path="/financial/general-ledger" element={<GeneralLedger />} />
                    <Route path="/financial/invoices" element={<InvoiceList />} />
                    <Route path="/financial/invoices/:id" element={<InvoiceForm />} />
          
                    {/* Accounts Payable */}
                    <Route path="/ap" element={<InvoiceList />} />
                    <Route path="/ap/invoices" element={<InvoiceList />} />
                    <Route path="/ap/invoices/new" element={<InvoiceForm />} />
                    <Route path="/ap/bills" element={<Bills />} />
                    <Route path="/ap/bills/new" element={<APBillDetail />} />
                    <Route path="/ap/bills/:id" element={<APBillDetail />} />
                    <Route path="/ap/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/ap/purchase-orders/new" element={<APPurchaseOrderDetail />} />
                    <Route path="/ap/purchase-orders/:id" element={<APPurchaseOrderDetail />} />
                    <Route path="/ap/payments" element={<Payments />} />
                    <Route path="/ap/suppliers" element={<Suppliers />} />
          
                                        {/* Accounts Receivable */}
                                        <Route path="/ar" element={<AccountsReceivable />} />
                                        <Route path="/ar/customers" element={<Customers />} />
                                        <Route path="/ar/customers/:id" element={<CustomerDetail />} />
                                        <Route path="/ar/invoices" element={<InvoiceList />} />
                                        <Route path="/ar/invoices/new" element={<InvoiceForm />} />
                                        <Route path="/ar/receipts" element={<Receipts />} />
          
          {/* Banking */}
          <Route path="/banking" element={<BankingDashboard />} />
          <Route path="/banking/accounts" element={<BankAccounts />} />
          <Route path="/banking/reconciliation" element={<Reconciliation />} />
          <Route path="/financial/sales-reconciliation" element={<SalesInvoiceReconciliation />} />
          
          {/* HR */}
          <Route path="/hr" element={<HRDashboard />} />
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/employees" element={<HREmployees />} />
          <Route path="/hr/departments" element={<Departments />} />
          <Route path="/hr/attendance" element={<Attendance />} />
          <Route path="/hr/leave" element={<LeaveManagement />} />
          
          {/* Payroll */}
          <Route path="/payroll" element={<PayrollDashboard />} />
          <Route path="/payroll/employees" element={<Employees />} />
          <Route path="/payroll/payslips" element={<PayrollDashboard />} />
          <Route path="/payroll/runs" element={<PayrollRuns />} />
          <Route path="/payroll/tax" element={<TaxFilings />} />
          
          {/* CRM */}
          <Route path="/crm" element={<CRMDashboard />} />
          <Route path="/crm/customers" element={<Customers />} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<WMSStock />} />
          <Route path="/inventory/products" element={<Products />} />
          <Route path="/inventory/stock" element={<WMSStock />} />
          <Route path="/inventory/items" element={<ProductCatalog />} />
          <Route path="/inventory/warehouses" element={<Warehouses />} />
          <Route path="/inventory/stock-movements" element={<StockMovements />} />
          
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
          
                    {/* ERP Procure-to-Pay Routes (alias for menu links) */}
                    <Route path="/erp/procure-to-pay/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/erp/procure-to-pay/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                    <Route path="/erp/procure-to-pay/goods-receipts" element={<GoodsReceipts />} />
                    <Route path="/erp/procure-to-pay/goods-receipts/:id" element={<GoodsReceiptDetail />} />
                    <Route path="/erp/procure-to-pay/suppliers" element={<Suppliers />} />
                    <Route path="/erp/procure-to-pay/rfqs" element={<RFQs />} />
          
          {/* Manufacturing */}
          <Route path="/manufacturing" element={<WorkOrdersERP />} />
          <Route path="/manufacturing/work-orders" element={<WorkOrdersERP />} />
          <Route path="/manufacturing/bom" element={<BOMManagement />} />
          <Route path="/manufacturing/boms" element={<BOMs />} />
          <Route path="/manufacturing/production" element={<Production />} />
          <Route path="/manufacturing/dashboard" element={<ManufacturingDashboard />} />
          
                    {/* Field Service */}
                    <Route path="/field-service" element={<FieldService />} />
                    <Route path="/field-service/requests" element={<FieldService />} />
                    <Route path="/field-service/work-orders" element={<FieldServiceWorkOrders />} />
                    <Route path="/field-service/orders" element={<ServiceOrders />} />
                    <Route path="/field-service/technicians" element={<Technicians />} />
                    <Route path="/field-service/scheduling" element={<Scheduling />} />
          
                    {/* Product Hierarchy (Odoo Parity) */}
                    <Route path="/products/categories" element={<ProductCategories />} />
                    <Route path="/products/templates" element={<ProductTemplates />} />
                    <Route path="/products/attributes" element={<ProductAttributes />} />
                    <Route path="/products/variants" element={<ProductVariants />} />
          
                    {/* Pricing Engine (Odoo Parity) */}
                    <Route path="/pricing" element={<Pricelists />} />
                    <Route path="/pricing/customer-groups" element={<CustomerGroups />} />
                    <Route path="/pricing/pricelists" element={<Pricelists />} />
                    <Route path="/pricing/rules" element={<PricingRules />} />
                    <Route path="/pricing/calculator" element={<PriceCalculator />} />
          
                    {/* Service Fulfillment (Odoo Parity) */}
                    <Route path="/services" element={<ServiceProjects />} />
                    <Route path="/services/projects" element={<ServiceProjects />} />
                    <Route path="/services/timesheets" element={<ServiceTimesheets />} />
          
                                        {/* Helpdesk (Odoo Parity) */}
                                        <Route path="/helpdesk" element={<HelpdeskTickets />} />
                                        <Route path="/helpdesk/teams" element={<HelpdeskTeams />} />
                                        <Route path="/helpdesk/tickets" element={<HelpdeskTickets />} />
          
                                        {/* Service Fulfillment Extended (Odoo Parity) */}
                                        <Route path="/services/milestones" element={<Milestones />} />
                                        <Route path="/services/deliverables" element={<Deliverables />} />
          
                                        {/* Field Service Extended (Odoo Parity) */}
                                        <Route path="/field-service/locations" element={<ServiceLocations />} />
          
                                        {/* Migration (Odoo Parity) */}
                                        <Route path="/migration" element={<MigrationJobs />} />
                                        <Route path="/migration/jobs" element={<MigrationJobs />} />
                                        <Route path="/migration/validation" element={<MigrationValidation />} />
          
          {/* Projects */}
          <Route path="/projects" element={<ProjectsDashboard />} />
          <Route path="/projects/dashboard" element={<ProjectsDashboard />} />
          <Route path="/projects/tasks" element={<Tasks />} />
          <Route path="/projects/timesheets" element={<Timesheets />} />
          <Route path="/projects/reports" element={<ProjectReports />} />
          
                    {/* Compliance */}
                    <Route path="/compliance" element={<ComplianceDashboard />} />
                    <Route path="/compliance/vat-returns" element={<VATReturns />} />
                    <Route path="/compliance/asset-register" element={<AssetRegister />} />
                    <Route path="/compliance/bbbee" element={<BBBEE />} />
                    <Route path="/compliance/audit-trail" element={<AuditTrail />} />
                    <Route path="/compliance/risk-register" element={<RiskRegister />} />
                    <Route path="/compliance/document-control" element={<DocumentControl />} />
                    <Route path="/compliance/policies" element={<Policies />} />
                    <Route path="/workflows" element={<WorkflowManagement />} />
                    <Route path="/compliance/workflows" element={<WorkflowManagement />} />
                    <Route path="/tax" element={<TaxCompliance />} />
                    <Route path="/tax/vat-returns" element={<VATReturns />} />
                    <Route path="/legal" element={<LegalCompliance />} />
                    <Route path="/fixed-assets" element={<FixedAssets />} />
                    <Route path="/fixed-assets/register" element={<AssetRegister />} />
          
                    {/* Financial Module - New Pages */}
                    <Route path="/financial/budgets" element={<BudgetManagement />} />
                    <Route path="/financial/cost-centers" element={<CostCenters />} />
                    <Route path="/financial/payment-batches" element={<PaymentBatches />} />
                    <Route path="/financial/expense-claims" element={<ExpenseClaims />} />
                    <Route path="/financial/credit-notes" element={<CreditNotes />} />
                    <Route path="/financial/collections" element={<Collections />} />
                    <Route path="/financial/cash-forecast" element={<CashForecast />} />
                    <Route path="/financial/bank-transfers" element={<BankTransfers />} />
                    <Route path="/gl/budgets" element={<BudgetManagement />} />
                    <Route path="/gl/cost-centers" element={<CostCenters />} />
                    <Route path="/ap/payment-batches" element={<PaymentBatches />} />
                    <Route path="/ap/expense-claims" element={<ExpenseClaims />} />
                    <Route path="/ar/credit-notes" element={<CreditNotes />} />
                    <Route path="/ar/collections" element={<Collections />} />
                                        <Route path="/banking/cash-forecast" element={<CashForecast />} />
                                        <Route path="/banking/transfers" element={<BankTransfers />} />
                    
                                        {/* Xero Parity Features */}
                                        <Route path="/financial/recurring-invoices" element={<RecurringInvoices />} />
                                        <Route path="/financial/customer-statements" element={<CustomerStatements />} />
                                        <Route path="/financial/budget-vs-actual" element={<BudgetVsActual />} />
                                        <Route path="/financial/bank-feeds" element={<BankFeeds />} />
                                        <Route path="/ar/recurring-invoices" element={<RecurringInvoices />} />
                                        <Route path="/ar/statements" element={<CustomerStatements />} />
                                        <Route path="/banking/feeds" element={<BankFeeds />} />
                                        <Route path="/reports/budget-vs-actual" element={<BudgetVsActual />} />
          
                                        {/* Operations Module - New Pages */}
                    <Route path="/operations/price-lists" element={<PriceLists />} />
                    <Route path="/operations/discounts" element={<Discounts />} />
                    <Route path="/operations/sales-targets" element={<SalesTargets />} />
                    <Route path="/operations/commissions" element={<Commissions />} />
                    <Route path="/operations/stock-adjustments" element={<StockAdjustments />} />
                    <Route path="/operations/stock-transfers" element={<StockTransfers />} />
                    <Route path="/operations/reorder-points" element={<ReorderPoints />} />
                    <Route path="/operations/requisitions" element={<Requisitions />} />
                    <Route path="/operations/rfqs" element={<RFQs />} />
                    <Route path="/operations/production-planning" element={<ProductionPlanning />} />
                    <Route path="/operations/machine-maintenance" element={<MachineMaintenance />} />
                    <Route path="/sales/price-lists" element={<PriceLists />} />
                    <Route path="/sales/discounts" element={<Discounts />} />
                    <Route path="/sales/targets" element={<SalesTargets />} />
                    <Route path="/sales/commissions" element={<Commissions />} />
                    <Route path="/inventory/stock-adjustments" element={<StockAdjustments />} />
                    <Route path="/inventory/stock-transfers" element={<StockTransfers />} />
                    <Route path="/inventory/reorder-points" element={<ReorderPoints />} />
                    <Route path="/procurement/requisitions" element={<Requisitions />} />
                    <Route path="/procurement/rfqs" element={<RFQs />} />
                    <Route path="/manufacturing/planning" element={<ProductionPlanning />} />
                    <Route path="/manufacturing/maintenance" element={<MachineMaintenance />} />
          
                    {/* People Module - New Pages */}
                    <Route path="/people/positions" element={<Positions />} />
                    <Route path="/people/salary-structures" element={<SalaryStructures />} />
                    <Route path="/people/deductions" element={<Deductions />} />
                    <Route path="/people/paye-returns" element={<PAYEReturns />} />
                    <Route path="/people/uif-returns" element={<UIFReturns />} />
                    <Route path="/people/job-postings" element={<JobPostings />} />
                    <Route path="/people/applicants" element={<Applicants />} />
                    <Route path="/people/onboarding" element={<OnboardingTasks />} />
                    <Route path="/people/performance-reviews" element={<PerformanceReviews />} />
                    <Route path="/people/training-courses" element={<TrainingCourses />} />
                    <Route path="/people/employee-skills" element={<EmployeeSkills />} />
                    <Route path="/hr/positions" element={<Positions />} />
                    <Route path="/hr/performance-reviews" element={<PerformanceReviews />} />
                    <Route path="/hr/training" element={<TrainingCourses />} />
                    <Route path="/hr/skills-matrix" element={<EmployeeSkills />} />
                    <Route path="/payroll/salary-structures" element={<SalaryStructures />} />
                    <Route path="/payroll/deductions" element={<Deductions />} />
                    <Route path="/payroll/paye-returns" element={<PAYEReturns />} />
                    <Route path="/payroll/uif-returns" element={<UIFReturns />} />
                    <Route path="/recruitment/job-postings" element={<JobPostings />} />
                    <Route path="/recruitment/applicants" element={<Applicants />} />
                    <Route path="/recruitment/onboarding" element={<OnboardingTasks />} />
          
                    {/* Services Module - New Pages */}
                    <Route path="/services/route-planning" element={<RoutePlanning />} />
                    <Route path="/services/service-contracts" element={<ServiceContracts />} />
                    <Route path="/services/support-tickets" element={<SupportTickets />} />
                    <Route path="/services/knowledge-base" element={<KnowledgeBase />} />
                    <Route path="/services/project-milestones" element={<ProjectMilestones />} />
                    <Route path="/field-service/route-planning" element={<RoutePlanning />} />
                    <Route path="/field-service/service-contracts" element={<ServiceContracts />} />
                    <Route path="/support/tickets" element={<SupportTickets />} />
                    <Route path="/support/knowledge-base" element={<KnowledgeBase />} />
                    <Route path="/projects/milestones" element={<ProjectMilestones />} />
          
                    {/* Quality */}
          <Route path="/quality" element={<QualityDashboard />} />
          
          {/* Agents */}
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentSettings />} />
          
                    {/* Analytics / BI */}
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                    <Route path="/bi" element={<AnalyticsDashboard />} />
          
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
          
                    {/* Admin Configuration (Xero Parity) */}
                    <Route path="/admin/chart-of-accounts" element={<ChartOfAccounts />} />
                    <Route path="/admin/invoice-templates" element={<InvoiceTemplates />} />
                    <Route path="/admin/lock-dates" element={<LockDates />} />
                    <Route path="/admin/payment-terms" element={<PaymentTerms />} />
                    <Route path="/admin/tax-rates" element={<TaxRates />} />
                    <Route path="/admin/email-templates" element={<EmailTemplates />} />
                    <Route path="/admin/tracking-categories" element={<TrackingCategories />} />
          
                              {/* Mobile */}
                    <Route path="/mobile" element={<MobileManagement />} />
          
                    {/* Missing Routes - Admin */}
                    <Route path="/admin/audit-trail" element={<AuditTrail />} />
                    <Route path="/admin/compliance" element={<ComplianceDashboard />} />
          
                    {/* Missing Routes - Compliance */}
                    <Route path="/compliance/b-bbee" element={<BBBEE />} />
                    <Route path="/compliance/documents" element={<DocumentControl />} />
                    <Route path="/compliance/risks" element={<RiskRegister />} />
          
                                        {/* Missing Routes - CRM */}
                                        <Route path="/crm/leads" element={<CRMLeads />} />
                                        <Route path="/crm/opportunities" element={<CRMOpportunities />} />
          
                    {/* Missing Routes - Field Service */}
                    <Route path="/field-service/contracts" element={<ServiceContracts />} />
                    <Route path="/field-service/equipment" element={<FieldServiceEquipment />} />
                    <Route path="/field-service/routes" element={<RoutePlanning />} />
          
                                        {/* Missing Routes - Fixed Assets */}
                                        <Route path="/fixed-assets/depreciation" element={<FixedAssetsDepreciation />} />
          
                                        {/* Missing Routes - Help */}
                                        <Route path="/help/compliance" element={<HelpComplianceMonthEnd />} />
                                        <Route path="/help/compliance/faqs" element={<HelpComplianceFAQs />} />
                                        <Route path="/help/financial" element={<HelpFinancialMonthEnd />} />
                                        <Route path="/help/financial/faqs" element={<HelpFinancialFAQs />} />
                                        <Route path="/help/financial/month-end" element={<HelpFinancialMonthEnd />} />
                                        <Route path="/help/operations" element={<HelpOperationsMonthEnd />} />
                                        <Route path="/help/operations/faqs" element={<HelpOperationsFAQs />} />
                                        <Route path="/help/people" element={<HelpPeopleMonthEnd />} />
                                        <Route path="/help/people/faqs" element={<HelpPeopleFAQs />} />
                                        <Route path="/help/services" element={<HelpServicesMonthEnd />} />
                                        <Route path="/help/services/faqs" element={<HelpServicesFAQs />} />
          
                    {/* Missing Routes - HR */}
                    <Route path="/hr/applicants" element={<Applicants />} />
                    <Route path="/hr/job-postings" element={<JobPostings />} />
                    <Route path="/hr/leave-calendar" element={<LeaveManagement />} />
                    <Route path="/hr/onboarding" element={<OnboardingTasks />} />
                    <Route path="/hr/org-chart" element={<HROrgChart />} />
                    <Route path="/hr/performance" element={<PerformanceReviews />} />
                    <Route path="/hr/recruitment" element={<HRRecruitment />} />
                    <Route path="/hr/skills" element={<EmployeeSkills />} />
          
                    {/* Missing Routes - Inventory */}
                    <Route path="/inventory/adjustments" element={<StockAdjustments />} />
                    <Route path="/inventory/barcode" element={<InventoryBarcode />} />
                    <Route path="/inventory/categories" element={<ProductCategories />} />
                    <Route path="/inventory/transfers" element={<StockTransfers />} />
          
                                        {/* Missing Routes - Legal */}
                                        <Route path="/legal/contracts" element={<LegalContracts />} />
          
                    {/* Missing Routes - Payroll */}
                    <Route path="/payroll/paye" element={<PAYEReturns />} />
                    <Route path="/payroll/uif" element={<UIFReturns />} />
          
                                        {/* Missing Routes - Procurement */}
                                        <Route path="/procurement/contracts" element={<ProcurementContracts />} />
                                        <Route path="/procurement/supplier-portal" element={<ProcurementSupplierPortal />} />
          
                                        {/* Missing Routes - Projects */}
                                        <Route path="/projects/gantt" element={<ProjectsGantt />} />
                                        <Route path="/projects/resources" element={<ProjectsResources />} />
          
                                        {/* Missing Routes - Quality */}
                                        <Route path="/quality/inspections" element={<QualityInspections />} />
          
                                        {/* Missing Routes - Support */}
                                        <Route path="/support/customer-portal" element={<SupportCustomerPortal />} />
                                        <Route path="/support/escalations" element={<SupportEscalations />} />
                                        <Route path="/support/sla" element={<SupportSLA />} />
          
                    {/* Missing Routes - Tax */}
                    <Route path="/tax/vat" element={<VATReturns />} />
          
                                        {/* Missing Routes - Training */}
                                        <Route path="/training/compliance/assets" element={<TrainingComplianceBasics />} />
                                        <Route path="/training/compliance/audit" element={<TrainingComplianceAdvanced />} />
                                        <Route path="/training/compliance/b-bbee" element={<TrainingComplianceCertification />} />
                                        <Route path="/training/compliance/tax" element={<TrainingComplianceRefresher />} />
                                        <Route path="/training/compliance/videos" element={<TrainingComplianceBasics />} />
                                        <Route path="/training/financial/ap-ar" element={<TrainingFinancialBasics />} />
                                        <Route path="/training/financial/gl" element={<TrainingFinancialAdvanced />} />
                                        <Route path="/training/financial/reconciliation" element={<TrainingFinancialCertification />} />
                                        <Route path="/training/financial/videos" element={<TrainingFinancialRefresher />} />
                                        <Route path="/training/operations/inventory" element={<TrainingOperationsBasics />} />
                                        <Route path="/training/operations/manufacturing" element={<TrainingOperationsAdvanced />} />
                                        <Route path="/training/operations/procurement" element={<TrainingOperationsCertification />} />
                                        <Route path="/training/operations/sales" element={<TrainingOperationsRefresher />} />
                                        <Route path="/training/operations/videos" element={<TrainingOperationsBasics />} />
                                        <Route path="/training/people/employees" element={<TrainingPeopleBasics />} />
                                        <Route path="/training/people/labour-law" element={<TrainingPeopleAdvanced />} />
                                        <Route path="/training/people/leave" element={<TrainingPeopleCertification />} />
                                        <Route path="/training/people/payroll" element={<TrainingPeopleRefresher />} />
                                        <Route path="/training/people/videos" element={<TrainingPeopleBasics />} />
                                        <Route path="/training/services/field-service" element={<TrainingServicesBasics />} />
                                        <Route path="/training/services/projects" element={<TrainingServicesAdvanced />} />
                                        <Route path="/training/services/support" element={<TrainingServicesCertification />} />
                                        <Route path="/training/services/timesheets" element={<TrainingServicesRefresher />} />
                                        <Route path="/training/services/videos" element={<TrainingServicesBasics />} />
          
                    {/* ERP Advanced Modules */}
                    <Route path="/erp/banking-reconciliation" element={<ERPBankingReconciliation />} />
                    <Route path="/erp/procure-to-pay" element={<ERPProcureToPay />} />
                    <Route path="/erp/production-monitoring" element={<ERPProductionMonitoring />} />
                    <Route path="/erp/sap-integration" element={<ERPSAPIntegration />} />
                    <Route path="/erp/vat-reporting" element={<ERPVATReporting />} />
                    <Route path="/erp/comprehensive-reporting" element={<ERPComprehensiveReporting />} />
                    <Route path="/erp/accounts-payable" element={<ERPAccountsPayable />} />
                    <Route path="/erp/invoice/:id" element={<ERPInvoiceDetail />} />
                    <Route path="/erp/receipt/:id" element={<ERPReceiptDetail />} />
                    <Route path="/erp/price-lists" element={<ERPPriceLists />} />
                    <Route path="/erp/products" element={<ERPProducts />} />
                    <Route path="/erp/receipts" element={<ERPReceipts />} />

                    {/* Documents */}
                    <Route path="/documents/history" element={<DocumentHistory />} />

                    {/* Integrations */}
                    <Route path="/integrations/sync" element={<IntegrationSync />} />

                    {/* Reports Extended */}
                    <Route path="/reports/invoice-reconciliation" element={<InvoiceReconciliationReport />} />

                    {/* Go-Live Features */}
                    <Route path="/admin/data-export" element={<DataExport />} />
                    <Route path="/admin/scheduled-bots" element={<ScheduledBots />} />
                    <Route path="/admin/security" element={<SecuritySettings />} />
                    <Route path="/admin/data-migration" element={<DataMigration />} />
                    <Route path="/settings/security" element={<SecuritySettings />} />
                    <Route path="/settings/export" element={<DataExport />} />
                    <Route path="/settings/migration" element={<DataMigration />} />
                    <Route path="/settings/scheduled-bots" element={<ScheduledBots />} />

                    {/* Catch-all: 404 Not Found page */}
                    <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
            <SessionTimeout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
    </NotificationProvider>
    </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
