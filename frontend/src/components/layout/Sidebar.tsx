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
  Agent,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  MessageSquare,
  ShoppingBag,
  Factory,
  Shield,
  Wrench,
  Tags,
  DollarSign,
  Briefcase,
  Headphones,
  Database,
  FolderTree,
  Clock,
  MapPin
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
  { label: 'Ask ARIA', icon: <MessageSquare size={20} />, path: '/aria', color: '#ec4899' },
  
  { label: 'General Ledger', icon: <BookOpen size={20} />, path: '/gl', color: '#8b5cf6' },
  { label: 'Accounts Payable', icon: <FileDown size={20} />, path: '/ap', color: '#ef4444' },
  { label: 'Accounts Receivable', icon: <FileUp size={20} />, path: '/ar', color: '#10b981' },
  { label: 'Banking', icon: <Building2 size={20} />, path: '/banking', color: '#06b6d4' },
  
  { label: 'Payroll', icon: <Wallet size={20} />, path: '/payroll', color: '#f59e0b' },
  
  { label: 'CRM', icon: <Users size={20} />, path: '/crm', color: '#6366f1' },
  { label: 'Quotes', icon: <FileSpreadsheet size={20} />, path: '/quotes', color: '#3b82f6' },
  { label: 'Sales Orders', icon: <ShoppingCart size={20} />, path: '/sales-orders', color: '#10b981' },
  { label: 'Deliveries', icon: <Truck size={20} />, path: '/deliveries', color: '#f59e0b' },
  
  { label: 'Products', icon: <FolderTree size={20} />, path: '/products/categories', color: '#8b5cf6' },
  { label: 'Pricing', icon: <DollarSign size={20} />, path: '/pricing', color: '#10b981' },
  { label: 'Inventory', icon: <Package size={20} />, path: '/inventory', color: '#8b5cf6' },
  { label: 'Procurement', icon: <ShoppingBag size={20} />, path: '/procurement', color: '#6366f1' },
  { label: 'Manufacturing', icon: <Factory size={20} />, path: '/manufacturing', color: '#ef4444' },
  
  { label: 'Services', icon: <Briefcase size={20} />, path: '/services', color: '#0ea5e9' },
  { label: 'Helpdesk', icon: <Headphones size={20} />, path: '/helpdesk', color: '#f97316' },
  { label: 'Field Service', icon: <Wrench size={20} />, path: '/field-service', color: '#14b8a6' },
  
  { label: 'Migration', icon: <Database size={20} />, path: '/migration', color: '#a855f7' },
  
  { label: 'Automation Agents', icon: <Agent size={20} />, path: '/agents', color: '#ec4899' },
  { label: 'Reports', icon: <FileText size={20} />, path: '/reports' },
  { label: 'Admin', icon: <Shield size={20} />, path: '/admin/system', color: '#dc2626' },
  { label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} data-testid="sidebar">
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
          <div className="sidebar-user" data-testid="user-menu">
            <div className="sidebar-user-avatar">A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" data-testid="user-name">Admin User</div>
              <div className="sidebar-user-role">System Admin</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
