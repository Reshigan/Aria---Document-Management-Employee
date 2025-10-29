import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, FileText, DollarSign, Settings, Users, Bot, BarChart3, 
  Workflow, Link as LinkIcon, Menu, X, ChevronDown, ChevronRight,
  MessageSquare, Clock, FileCheck, Building2
} from 'lucide-react';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <Home className="w-5 h-5" />
  },
  {
    name: 'ARIA Voice',
    path: '/aria',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    name: 'Pending Actions',
    path: '/pending-actions',
    icon: <Clock className="w-5 h-5" />
  },
  {
    name: 'Bot Reports',
    path: '/reports',
    icon: <Bot className="w-5 h-5" />,
    children: [
      { name: 'Bot Dashboard', path: '/reports/bot-dashboard', icon: <BarChart3 className="w-4 h-4" /> },
      { name: 'Invoice Reconciliation', path: '/reports/invoice-reconciliation', icon: <FileCheck className="w-4 h-4" /> },
      { name: 'BBBEE Compliance', path: '/reports/bbbee-compliance', icon: <FileCheck className="w-4 h-4" /> },
      { name: 'Payroll Activity', path: '/reports/payroll-activity', icon: <FileCheck className="w-4 h-4" /> },
      { name: 'Expense Management', path: '/reports/expense-management', icon: <FileCheck className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Documents',
    path: '/documents',
    icon: <FileText className="w-5 h-5" />,
    children: [
      { name: 'Templates', path: '/documents/templates', icon: <FileText className="w-4 h-4" /> },
      { name: 'Generate Document', path: '/documents/generate', icon: <FileText className="w-4 h-4" /> },
      { name: 'History', path: '/documents/history', icon: <FileText className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Financial Reports',
    path: '/financial',
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      { name: 'Profit & Loss', path: '/financial/profit-loss', icon: <DollarSign className="w-4 h-4" /> },
      { name: 'Balance Sheet', path: '/financial/balance-sheet', icon: <DollarSign className="w-4 h-4" /> },
      { name: 'Cash Flow', path: '/financial/cash-flow', icon: <DollarSign className="w-4 h-4" /> },
      { name: 'Aged Reports', path: '/financial/aged-reports', icon: <DollarSign className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Workflows',
    path: '/workflows',
    icon: <Workflow className="w-5 h-5" />
  },
  {
    name: 'Integrations',
    path: '/integrations',
    icon: <LinkIcon className="w-5 h-5" />,
    children: [
      { name: 'All Integrations', path: '/integrations', icon: <LinkIcon className="w-4 h-4" /> },
      { name: 'Sync Status', path: '/integrations/sync', icon: <LinkIcon className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Admin',
    path: '/admin',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { name: 'Company Settings', path: '/admin/company-settings', icon: <Building2 className="w-4 h-4" /> },
      { name: 'User Management', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { name: 'Bot Configuration', path: '/admin/bots', icon: <Bot className="w-4 h-4" /> },
      { name: 'System Settings', path: '/admin/system', icon: <Settings className="w-4 h-4" /> }
    ]
  }
];

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const location = useLocation();

  const toggleMenu = (path: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedMenus(newExpanded);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-default)' }}>
      {/* Sidebar - Vanta X Theme: Navy Blue Background */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 flex flex-col`}
        style={{ 
          backgroundColor: 'var(--color-sidebar-bg)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Logo & Toggle */}
        <div className="h-16 flex items-center justify-between px-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.875rem' }}>AR</span>
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>
                ARIA
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ 
              color: 'var(--color-text-inverse)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: isActive(item.path) ? 'var(--color-sidebar-hover)' : 'transparent',
                        color: isActive(item.path) ? 'var(--color-accent)' : 'var(--color-text-inverse)'
                      }}
                      onMouseEnter={(e) => !isActive(item.path) && (e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)')}
                      onMouseLeave={(e) => !isActive(item.path) && (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        {sidebarOpen && <span className="font-medium">{item.name}</span>}
                      </div>
                      {sidebarOpen && (
                        expandedMenus.has(item.path) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      )}
                    </button>
                    {sidebarOpen && expandedMenus.has(item.path) && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: location.pathname === child.path ? 'var(--color-sidebar-hover)' : 'transparent',
                                color: location.pathname === child.path ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.7)'
                              }}
                              onMouseEnter={(e) => location.pathname !== child.path && (e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)')}
                              onMouseLeave={(e) => location.pathname !== child.path && (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {child.icon}
                              <span className="text-sm">{child.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: isActive(item.path) ? 'var(--color-sidebar-hover)' : 'transparent',
                      color: isActive(item.path) ? 'var(--color-accent)' : 'var(--color-text-inverse)'
                    }}
                    onMouseEnter={(e) => !isActive(item.path) && (e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)')}
                    onMouseLeave={(e) => !isActive(item.path) && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {item.icon}
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              ARIA v2.0.0
              <br />
              26 AI Bots Active 🤖
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {menuItems.find(m => isActive(m.path))?.name || 'ARIA'}
            </h1>
            <p className="text-sm text-gray-500">
              Vanta X Pty Ltd - B2B SaaS AI Platform
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">All Bots Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                U
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
