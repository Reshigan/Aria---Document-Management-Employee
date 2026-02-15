import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileDown, FileUp, Building2, Wallet, Users, Package,
  Bot, FileText, Settings, MessageSquare, FileSpreadsheet, ShoppingCart, Truck,
  ShoppingBag, Factory, Shield, Wrench, ClipboardList, Scale, Briefcase, 
  FolderOpen, TrendingUp, ChevronDown, LogOut, Search, BarChart3, Command,
  HelpCircle, GraduationCap, Video, FileQuestion, BookMarked
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { NotificationsBell } from '../NotificationsBell/NotificationsBell';
import { RecentItems } from '../RecentItems/RecentItems';
import { QuickActions } from '../QuickActions/QuickActions';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import './MegaMenu.css';

const API_BASE_URL = '/api';

interface MenuItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface MegaMenuCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: MenuItem[];
}

const iconMap: Record<string, React.ReactNode> = {
  'BookOpen': <BookOpen size={18} />,
  'FileDown': <FileDown size={18} />,
  'FileUp': <FileUp size={18} />,
  'Building2': <Building2 size={18} />,
  'Users': <Users size={18} />,
  'Package': <Package size={18} />,
  'ShoppingBag': <ShoppingBag size={18} />,
  'Factory': <Factory size={18} />,
  'Wallet': <Wallet size={18} />,
  'Wrench': <Wrench size={18} />,
  'Briefcase': <Briefcase size={18} />,
  'Scale': <Scale size={18} />,
  'HelpCircle': <HelpCircle size={18} />,
  'GraduationCap': <GraduationCap size={18} />,
  'MessageSquare': <MessageSquare size={18} />,
  'Shield': <Shield size={18} />,
};

const fallbackMenuData: Record<string, MegaMenuCategory[]> = {
  'Financial': [
    {
      title: 'Core Accounting',
      icon: <BookOpen size={18} />,
      color: '#8b5cf6',
      items: [
        { label: 'General Ledger', path: '/gl' },
        { label: 'Chart of Accounts', path: '/gl/chart-of-accounts' },
        { label: 'Journal Entries', path: '/gl/journal-entries' },
        { label: 'Trial Balance', path: '/reports/financial/trial-balance' },
        { label: 'Balance Sheet', path: '/reports/financial/balance-sheet' },
        { label: 'Income Statement', path: '/reports/financial/income-statement' },
        { label: 'Budget Management', path: '/gl/budgets' },
        { label: 'Cost Centers', path: '/gl/cost-centers' },
      ]
    },
    {
      title: 'Payables',
      icon: <FileDown size={18} />,
      color: '#ef4444',
      items: [
        { label: 'Accounts Payable', path: '/ap' },
        { label: 'Vendor Bills', path: '/ap/bills' },
        { label: 'Purchase Orders', path: '/procurement/purchase-orders' },
        { label: 'Payments', path: '/ap/payments' },
        { label: 'Payment Batches', path: '/ap/payment-batches' },
        { label: 'AP Aging', path: '/reports/ar-ap/ap-aging' },
        { label: 'Expense Claims', path: '/ap/expense-claims' },
      ]
    },
    {
      title: 'Receivables',
      icon: <FileUp size={18} />,
      color: '#10b981',
      items: [
        { label: 'Accounts Receivable', path: '/ar' },
        { label: 'Customer Invoices', path: '/ar/invoices' },
        { label: 'Sales Orders', path: '/sales-orders' },
        { label: 'Receipts', path: '/ar/receipts' },
        { label: 'Credit Notes', path: '/ar/credit-notes' },
        { label: 'AR Aging', path: '/reports/ar-ap/ar-aging' },
        { label: 'Collections', path: '/ar/collections' },
      ]
    },
      {
        title: 'Banking & Cash',
        icon: <Building2 size={18} />,
        color: '#06b6d4',
        items: [
          { label: 'Banking', path: '/banking' },
          { label: 'Bank Accounts', path: '/banking/accounts' },
          { label: 'Reconciliation', path: '/banking/reconciliation' },
          { label: 'Cash Flow', path: '/reports/ar-ap/cash-flow' },
          { label: 'Cash Forecast', path: '/banking/cash-forecast' },
          { label: 'Bank Transfers', path: '/banking/transfers' },
        ]
      },
      {
        title: 'Help & Training',
        icon: <HelpCircle size={18} />,
        color: '#3b82f6',
        items: [
          { label: 'Financial Overview', path: '/help/financial' },
          { label: 'GL Training Guide', path: '/training/financial/gl' },
          { label: 'AP/AR Best Practices', path: '/training/financial/ap-ar' },
          { label: 'Bank Reconciliation Tutorial', path: '/training/financial/reconciliation' },
          { label: 'Month-End Close Checklist', path: '/help/financial/month-end' },
          { label: 'Video Tutorials', path: '/training/financial/videos' },
          { label: 'FAQs', path: '/help/financial/faqs' },
        ]
      },
    ],
    'Operations': [
    {
      title: 'Sales & CRM',
      icon: <Users size={18} />,
      color: '#6366f1',
      items: [
        { label: 'CRM Dashboard', path: '/crm' },
        { label: 'Customers', path: '/crm/customers' },
        { label: 'Leads', path: '/crm/leads' },
        { label: 'Opportunities', path: '/crm/opportunities' },
        { label: 'Quotes', path: '/quotes' },
        { label: 'Sales Orders', path: '/sales-orders' },
        { label: 'Deliveries', path: '/deliveries' },
        { label: 'Price Lists', path: '/sales/price-lists' },
        { label: 'Discounts', path: '/sales/discounts' },
        { label: 'Sales Targets', path: '/sales/targets' },
        { label: 'Commissions', path: '/sales/commissions' },
        { label: 'Sales KPIs', path: '/reports/sales-purchase/sales-kpis' },
      ]
    },
    {
      title: 'Inventory',
      icon: <Package size={18} />,
      color: '#8b5cf6',
      items: [
        { label: 'Inventory Dashboard', path: '/inventory' },
        { label: 'Items', path: '/inventory/items' },
        { label: 'Categories', path: '/inventory/categories' },
        { label: 'Warehouses', path: '/inventory/warehouses' },
        { label: 'Stock Movements', path: '/inventory/stock-movements' },
        { label: 'Stock Adjustments', path: '/inventory/adjustments' },
        { label: 'Stock Transfers', path: '/inventory/transfers' },
        { label: 'Reorder Points', path: '/inventory/reorder-points' },
        { label: 'Valuation', path: '/reports/inventory/valuation' },
        { label: 'Barcode Scanner', path: '/inventory/barcode' },
      ]
    },
    {
      title: 'Procurement',
      icon: <ShoppingBag size={18} />,
      color: '#f59e0b',
      items: [
        { label: 'Procurement', path: '/procurement' },
        { label: 'Suppliers', path: '/procurement/suppliers' },
        { label: 'Requisitions', path: '/procurement/requisitions' },
        { label: 'RFQs', path: '/procurement/rfqs' },
        { label: 'Purchase Orders', path: '/procurement/purchase-orders' },
        { label: 'Goods Receipts', path: '/procurement/goods-receipts' },
        { label: 'Contracts', path: '/procurement/contracts' },
        { label: 'Supplier Portal', path: '/procurement/supplier-portal' },
        { label: 'Purchase KPIs', path: '/reports/sales-purchase/purchase-kpis' },
      ]
    },
      {
        title: 'Manufacturing',
        icon: <Factory size={18} />,
        color: '#ef4444',
        items: [
          { label: 'Manufacturing', path: '/manufacturing' },
          { label: 'Work Orders', path: '/manufacturing/work-orders' },
          { label: 'BOMs', path: '/manufacturing/boms' },
          { label: 'Production', path: '/manufacturing/production' },
          { label: 'Production Planning', path: '/manufacturing/planning' },
          { label: 'Machine Maintenance', path: '/manufacturing/maintenance' },
          { label: 'Quality', path: '/quality' },
          { label: 'Quality Inspections', path: '/quality/inspections' },
        ]
      },
      {
        title: 'Help & Training',
        icon: <HelpCircle size={18} />,
        color: '#3b82f6',
        items: [
          { label: 'Operations Overview', path: '/help/operations' },
          { label: 'Sales Process Guide', path: '/training/operations/sales' },
          { label: 'Inventory Management', path: '/training/operations/inventory' },
          { label: 'Procurement Workflow', path: '/training/operations/procurement' },
          { label: 'Manufacturing Setup', path: '/training/operations/manufacturing' },
          { label: 'Video Tutorials', path: '/training/operations/videos' },
          { label: 'FAQs', path: '/help/operations/faqs' },
        ]
      },
    ],
    'People': [
    {
      title: 'Human Resources',
      icon: <Users size={18} />,
      color: '#f59e0b',
      items: [
        { label: 'HR Dashboard', path: '/hr' },
        { label: 'Employees', path: '/hr/employees' },
        { label: 'Departments', path: '/hr/departments' },
        { label: 'Positions', path: '/hr/positions' },
        { label: 'Org Chart', path: '/hr/org-chart' },
        { label: 'Attendance', path: '/hr/attendance' },
        { label: 'Leave Management', path: '/hr/leave' },
        { label: 'Leave Calendar', path: '/hr/leave-calendar' },
      ]
    },
    {
      title: 'Payroll',
      icon: <Wallet size={18} />,
      color: '#10b981',
      items: [
        { label: 'Payroll Dashboard', path: '/payroll' },
        { label: 'Payroll Runs', path: '/payroll/runs' },
        { label: 'Payslips', path: '/payroll/payslips' },
        { label: 'Salary Structures', path: '/payroll/salary-structures' },
        { label: 'Deductions', path: '/payroll/deductions' },
        { label: 'Tax Filings', path: '/payroll/tax' },
        { label: 'PAYE Returns', path: '/payroll/paye' },
        { label: 'UIF Returns', path: '/payroll/uif' },
      ]
    },
      {
        title: 'Talent',
        icon: <Briefcase size={18} />,
        color: '#8b5cf6',
        items: [
          { label: 'Recruitment', path: '/hr/recruitment' },
          { label: 'Job Postings', path: '/hr/job-postings' },
          { label: 'Applicants', path: '/hr/applicants' },
          { label: 'Onboarding', path: '/hr/onboarding' },
          { label: 'Performance Reviews', path: '/hr/performance' },
          { label: 'Training', path: '/hr/training' },
          { label: 'Skills Matrix', path: '/hr/skills' },
        ]
      },
      {
        title: 'Help & Training',
        icon: <HelpCircle size={18} />,
        color: '#3b82f6',
        items: [
          { label: 'HR Overview', path: '/help/people' },
          { label: 'Employee Management Guide', path: '/training/people/employees' },
          { label: 'Payroll Processing', path: '/training/people/payroll' },
          { label: 'Leave Management', path: '/training/people/leave' },
          { label: 'SA Labour Law Compliance', path: '/training/people/labour-law' },
          { label: 'Video Tutorials', path: '/training/people/videos' },
          { label: 'FAQs', path: '/help/people/faqs' },
        ]
      },
    ],
    'Services': [
    {
      title: 'Field Service',
      icon: <Wrench size={18} />,
      color: '#14b8a6',
      items: [
        { label: 'Field Service', path: '/field-service' },
        { label: 'Service Orders', path: '/field-service/orders' },
        { label: 'Technicians', path: '/field-service/technicians' },
        { label: 'Scheduling', path: '/field-service/scheduling' },
        { label: 'Route Planning', path: '/field-service/routes' },
        { label: 'Service Contracts', path: '/field-service/contracts' },
        { label: 'Equipment', path: '/field-service/equipment' },
      ]
    },
    {
      title: 'Projects',
      icon: <Briefcase size={18} />,
      color: '#6366f1',
      items: [
        { label: 'Projects', path: '/projects' },
        { label: 'Tasks', path: '/projects/tasks' },
        { label: 'Milestones', path: '/projects/milestones' },
        { label: 'Timesheets', path: '/projects/timesheets' },
        { label: 'Resource Planning', path: '/projects/resources' },
        { label: 'Gantt Chart', path: '/projects/gantt' },
        { label: 'Project Reports', path: '/projects/reports' },
      ]
    },
      {
        title: 'Support',
        icon: <MessageSquare size={18} />,
        color: '#ec4899',
        items: [
          { label: 'Support Tickets', path: '/support/tickets' },
          { label: 'Knowledge Base', path: '/support/knowledge-base' },
          { label: 'Customer Portal', path: '/support/customer-portal' },
          { label: 'SLA Management', path: '/support/sla' },
          { label: 'Escalations', path: '/support/escalations' },
        ]
      },
      {
        title: 'Help & Training',
        icon: <HelpCircle size={18} />,
        color: '#3b82f6',
        items: [
          { label: 'Services Overview', path: '/help/services' },
          { label: 'Field Service Guide', path: '/training/services/field-service' },
          { label: 'Project Management', path: '/training/services/projects' },
          { label: 'Timesheet Entry', path: '/training/services/timesheets' },
          { label: 'Support Ticket Handling', path: '/training/services/support' },
          { label: 'Video Tutorials', path: '/training/services/videos' },
          { label: 'FAQs', path: '/help/services/faqs' },
        ]
      },
    ],
    'Compliance': [
    {
      title: 'Tax & Legal',
      icon: <Scale size={18} />,
      color: '#dc2626',
      items: [
        { label: 'Tax Management', path: '/tax' },
        { label: 'VAT Returns', path: '/tax/vat' },
        { label: 'Legal', path: '/legal' },
        { label: 'Contracts', path: '/legal/contracts' },
        { label: 'Fixed Assets', path: '/fixed-assets' },
        { label: 'Asset Register', path: '/fixed-assets/register' },
        { label: 'Depreciation', path: '/fixed-assets/depreciation' },
      ]
    },
    {
      title: 'Governance',
      icon: <Shield size={18} />,
      color: '#7c3aed',
      items: [
        { label: 'Compliance', path: '/admin/compliance' },
        { label: 'B-BBEE', path: '/compliance/b-bbee' },
        { label: 'Audit Trail', path: '/admin/audit-trail' },
        { label: 'Document Control', path: '/compliance/documents' },
        { label: 'Risk Register', path: '/compliance/risks' },
        { label: 'Policies', path: '/compliance/policies' },
      ]
    },
    {
      title: 'Help & Training',
      icon: <HelpCircle size={18} />,
      color: '#3b82f6',
      items: [
        { label: 'Compliance Overview', path: '/help/compliance' },
        { label: 'SA Tax Guide (VAT/PAYE)', path: '/training/compliance/tax' },
        { label: 'B-BBEE Compliance', path: '/training/compliance/b-bbee' },
        { label: 'Fixed Assets Management', path: '/training/compliance/assets' },
        { label: 'Audit Preparation', path: '/training/compliance/audit' },
        { label: 'Video Tutorials', path: '/training/compliance/videos' },
        { label: 'FAQs', path: '/help/compliance/faqs' },
      ]
    },
  ],
  'Admin': [
    {
      title: 'System Configuration',
      icon: <Settings size={18} />,
      color: '#6366f1',
      items: [
        { label: 'System Settings', path: '/admin/system' },
        { label: 'Company Settings', path: '/admin/company' },
        { label: 'User Management', path: '/admin/users' },
        { label: 'Role Management', path: '/admin/rbac' },
        { label: 'Data Import', path: '/admin/data-import' },
        { label: 'Integrations', path: '/integrations' },
      ]
    },
    {
      title: 'Financial Configuration',
      icon: <BookOpen size={18} />,
      color: '#8b5cf6',
      items: [
        { label: 'Chart of Accounts', path: '/admin/chart-of-accounts' },
        { label: 'Tax Rates', path: '/admin/tax-rates' },
        { label: 'Payment Terms', path: '/admin/payment-terms' },
        { label: 'Lock Dates', path: '/admin/lock-dates' },
        { label: 'Tracking Categories', path: '/admin/tracking-categories' },
      ]
    },
    {
      title: 'Document Templates',
      icon: <FileText size={18} />,
      color: '#ec4899',
      items: [
        { label: 'Invoice Templates', path: '/admin/invoice-templates' },
        { label: 'Email Templates', path: '/admin/email-templates' },
        { label: 'Document Templates', path: '/documents/templates' },
      ]
    },
    {
      title: 'Automation',
      icon: <Bot size={18} />,
      color: '#10b981',
      items: [
        { label: 'Bot Configuration', path: '/admin/agents' },
        { label: 'Agent Registry', path: '/agents' },
      ]
    },
  ],
};

interface MegaMenuProps {
  onSearchClick?: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ onSearchClick }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<Record<string, MegaMenuCategory[]>>(fallbackMenuData);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const fetchMenuStructure = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/menu/structure`);
        if (response.ok) {
          const data = await response.json();
          
          const transformedData: Record<string, MegaMenuCategory[]> = {};
          Object.entries(data).forEach(([menuName, categories]: [string, any]) => {
            transformedData[menuName] = categories.map((category: any) => ({
              ...category,
              icon: iconMap[category.icon] || <Package size={18} />
            }));
          });
          
          setMenuData(transformedData);
        } else {
          console.warn('Failed to fetch menu structure, using fallback');
        }
      } catch (error) {
        console.warn('Error fetching menu structure, using fallback:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuStructure();
  }, []);

const leaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (menu: string) => {
    // Cancel any pending close timeout when entering a menu
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    // Add a delay to prevent accidental closing when moving to submenu
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="mega-menu-container">
      <div className="mega-menu-header">
        <div className="mega-menu-logo">
          <Link to="/dashboard">
            <div className="mega-menu-brand">ARIA</div>
            <span className="mega-menu-tagline">by VantaX</span>
          </Link>
        </div>

        <nav className="mega-menu-nav">
          <Link 
            to="/dashboard" 
            className={`mega-menu-item ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

                    {/* Command Palette Search Button */}
                    <button 
                      onClick={onSearchClick}
                      className="mega-menu-item mega-menu-search"
                      title="Search (Ctrl+K)"
                    >
                      <Search size={18} />
                      <span>Search</span>
                      <kbd className="mega-menu-kbd">Ctrl+K</kbd>
                    </button>

                    <Link 
                      to="/aria" 
                      className={`mega-menu-item mega-menu-item-special ${isActive('/aria') ? 'active' : ''}`}
                    >
                      <MessageSquare size={18} />
                      <span>Ask ARIA</span>
                    </Link>

                    <Link 
                      to="/analytics" 
                      className={`mega-menu-item ${isActive('/analytics') ? 'active' : ''}`}
                    >
                      <BarChart3 size={18} />
                      <span>Analytics</span>
                    </Link>

                    {Object.entries(menuData).map(([menuName, categories]) => (
            <div
              key={menuName}
              className="mega-menu-dropdown"
              onMouseEnter={() => handleMouseEnter(menuName)}
              onMouseLeave={handleMouseLeave}
            >
              <button className={`mega-menu-item ${activeDropdown === menuName ? 'active' : ''}`}>
                <span>{menuName}</span>
                <ChevronDown size={16} />
              </button>

              {activeDropdown === menuName && (
                <div className="mega-menu-panel">
                  <div className="mega-menu-panel-content">
                    {categories.map((category) => (
                      <div key={category.title} className="mega-menu-category">
                        <div className="mega-menu-category-header" style={{ color: category.color }}>
                          {category.icon}
                          <h3>{category.title}</h3>
                        </div>
                        <ul className="mega-menu-category-items">
                          {category.items.map((item) => (
                            <li key={item.path}>
                              <Link
                                to={item.path}
                                className={`mega-menu-link ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => setActiveDropdown(null)}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <Link 
            to="/reports" 
            className={`mega-menu-item ${isActive('/reports') ? 'active' : ''}`}
          >
            <FileText size={18} />
            <span>Reports</span>
          </Link>

          <Link 
            to="/agents" 
            className={`mega-menu-item ${isActive('/agents') ? 'active' : ''}`}
          >
            <Bot size={18} />
            <span>Agents</span>
          </Link>

          <Link 
            to="/admin/system" 
            className={`mega-menu-item ${isActive('/admin') ? 'active' : ''}`}
          >
            <Shield size={18} />
            <span>Admin</span>
          </Link>
        </nav>

                <div className="mega-menu-user" data-testid="user-menu">
                  <QuickActions variant="dropdown" />
                  <RecentItems variant="dropdown" />
                  <NotificationsBell />
                  <ThemeToggle variant="icon" />
                  <LanguageSwitcher variant="icon" />
                  <div className="mega-menu-user-info">
                    <span className="mega-menu-user-name" data-testid="user-name">{user?.full_name || 'User'}</span>
                    <span className="mega-menu-user-role">{user?.email}</span>
                  </div>
                  <button onClick={logout} className="mega-menu-logout" title="Logout" data-testid="logout">
                    <LogOut size={18} />
                  </button>
                </div>
      </div>
    </div>
  );
};

export default MegaMenu;
