import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, FileDown, FileUp, Building2, Wallet, Users, Package,
  Bot, FileText, Settings, MessageSquare, FileSpreadsheet, ShoppingCart, Truck,
  ShoppingBag, Factory, Shield, Wrench, ClipboardList, Scale, Briefcase, 
  FolderOpen, TrendingUp, ChevronDown, LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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
        { label: 'AP Aging', path: '/reports/ar-ap/ap-aging' },
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
        { label: 'AR Aging', path: '/reports/ar-ap/ar-aging' },
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
        { label: 'Quotes', path: '/quotes' },
        { label: 'Sales Orders', path: '/sales-orders' },
        { label: 'Deliveries', path: '/deliveries' },
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
        { label: 'Warehouses', path: '/inventory/warehouses' },
        { label: 'Stock Movements', path: '/inventory/stock-movements' },
        { label: 'Valuation', path: '/reports/inventory/valuation' },
      ]
    },
    {
      title: 'Procurement',
      icon: <ShoppingBag size={18} />,
      color: '#f59e0b',
      items: [
        { label: 'Procurement', path: '/procurement' },
        { label: 'Suppliers', path: '/procurement/suppliers' },
        { label: 'Purchase Orders', path: '/procurement/purchase-orders' },
        { label: 'Goods Receipts', path: '/procurement/goods-receipts' },
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
        { label: 'Quality', path: '/quality' },
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
        { label: 'Attendance', path: '/hr/attendance' },
        { label: 'Leave Management', path: '/hr/leave' },
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
        { label: 'Tax Filings', path: '/payroll/tax' },
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
      ]
    },
    {
      title: 'Projects',
      icon: <Briefcase size={18} />,
      color: '#6366f1',
      items: [
        { label: 'Projects', path: '/projects' },
        { label: 'Tasks', path: '/projects/tasks' },
        { label: 'Timesheets', path: '/projects/timesheets' },
        { label: 'Project Reports', path: '/projects/reports' },
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
        { label: 'Legal', path: '/legal' },
        { label: 'Fixed Assets', path: '/fixed-assets' },
        { label: 'Compliance', path: '/admin/compliance' },
      ]
    },
  ],
};

export const MegaMenu: React.FC = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<Record<string, MegaMenuCategory[]>>(fallbackMenuData);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const fetchMenuStructure = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/menu/structure`);
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

  const handleMouseEnter = (menu: string) => {
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="mega-menu-container" data-testid="sidebar">
      <div className="mega-menu-header" data-testid="mobile-menu">
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

          <Link 
            to="/aria" 
            className={`mega-menu-item mega-menu-item-special ${isActive('/aria') ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            <span>Ask ARIA</span>
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
