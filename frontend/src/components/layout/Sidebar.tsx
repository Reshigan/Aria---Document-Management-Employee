import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileDown, 
  FileUp, 
  Building2,
  Wallet,
  Users,
  Package,
  Bot,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Truck,
  Receipt,
  Mail,
  BarChart3,
  Wrench,
  MessageSquare,
  Boxes,
  FolderOpen,
  Calculator,
  TrendingUp
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  color?: string;
}

const navigation: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
  { label: 'Ask Aria', icon: <MessageSquare size={20} />, path: '/aria', color: '#ec4899' },
  { label: 'Quotes', icon: <FileText size={20} />, path: '/quotes', color: '#8b5cf6' },
  { label: 'Sales Orders', icon: <ShoppingCart size={20} />, path: '/sales-orders', color: '#10b981' },
  { label: 'Deliveries', icon: <Truck size={20} />, path: '/deliveries', color: '#06b6d4' },
  { label: 'Invoices', icon: <Receipt size={20} />, path: '/ar/invoices', color: '#f59e0b' },
  { label: 'Customers', icon: <Users size={20} />, path: '/ar/customers', color: '#6366f1' },
  { label: 'Bills', icon: <FileDown size={20} />, path: '/ap/invoices', color: '#ef4444' },
  { label: 'Purchase Orders', icon: <ShoppingCart size={20} />, path: '/ap/purchase-orders', color: '#f97316' },
  { label: 'Suppliers', icon: <Building2 size={20} />, path: '/ap/suppliers', color: '#64748b' },
  { label: 'Products', icon: <Package size={20} />, path: '/inventory/products', color: '#8b5cf6' },
  { label: 'Stock', icon: <Boxes size={20} />, path: '/wms-stock', color: '#06b6d4' },
  { label: 'General Ledger', icon: <BookOpen size={20} />, path: '/gl', color: '#8b5cf6' },
  { label: 'Banking', icon: <Building2 size={20} />, path: '/banking', color: '#06b6d4' },
  { label: 'Fixed Assets', icon: <FolderOpen size={20} />, path: '/fixed-assets', color: '#64748b' },
  { label: 'Payroll', icon: <Wallet size={20} />, path: '/payroll', color: '#f59e0b' },
  { label: 'Projects', icon: <FolderOpen size={20} />, path: '/projects', color: '#6366f1' },
  { label: 'VAT Returns', icon: <Calculator size={20} />, path: '/tax/vat', color: '#ef4444' },
  { label: 'Manufacturing', icon: <Wrench size={20} />, path: '/manufacturing', color: '#f97316' },
  { label: 'CRM', icon: <Users size={20} />, path: '/crm', color: '#6366f1' },
  { label: 'Automation Bots', icon: <Bot size={20} />, path: '/automation/bots', color: '#ec4899' },
  { label: 'Mailroom', icon: <Mail size={20} />, path: '/automation/mailroom', color: '#a855f7' },
  { label: 'Reports', icon: <TrendingUp size={20} />, path: '/reports' },
  { label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <h1 className="sidebar-brand">ARIA ERP</h1>
            <span className="sidebar-version">v2.0</span>
          </div>
        )}
        <button 
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-nav-icon" style={{ color: item.color }}>
                {item.icon}
              </span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Admin User</div>
              <div className="sidebar-user-role">System Admin</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
