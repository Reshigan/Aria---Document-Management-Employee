import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Command, FileText, Users, Package, ShoppingCart, 
  Truck, DollarSign, BarChart3, Settings, Bot, MessageSquare,
  Building2, Briefcase, Calculator, ClipboardList, Factory,
  Wrench, FolderKanban, Shield, Scale, Box, CreditCard,
  ArrowRight, Clock, Star
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Navigation - Dashboard
    { id: 'nav-dashboard', title: 'Go to Dashboard', description: 'Executive overview', icon: <BarChart3 className="h-4 w-4" />, action: () => navigate('/dashboard'), category: 'Navigation', keywords: ['home', 'overview'] },
    { id: 'nav-analytics', title: 'Go to Analytics', description: 'Business intelligence & reports', icon: <BarChart3 className="h-4 w-4" />, action: () => navigate('/analytics'), category: 'Navigation', keywords: ['bi', 'reports', 'charts'] },
    
    // Navigation - Order to Cash
    { id: 'nav-quotes', title: 'Go to Quotes', description: 'Sales quotations', icon: <FileText className="h-4 w-4" />, action: () => navigate('/quotes'), category: 'Order to Cash', keywords: ['quotation', 'proposal'] },
    { id: 'nav-sales-orders', title: 'Go to Sales Orders', description: 'Customer orders', icon: <ShoppingCart className="h-4 w-4" />, action: () => navigate('/sales-orders'), category: 'Order to Cash', keywords: ['so', 'order'] },
    { id: 'nav-deliveries', title: 'Go to Deliveries', description: 'Shipments & deliveries', icon: <Truck className="h-4 w-4" />, action: () => navigate('/deliveries'), category: 'Order to Cash', keywords: ['ship', 'dispatch'] },
    { id: 'nav-ar', title: 'Go to Accounts Receivable', description: 'Customer invoices & receipts', icon: <DollarSign className="h-4 w-4" />, action: () => navigate('/ar'), category: 'Order to Cash', keywords: ['invoice', 'receipt', 'customer'] },
    
    // Navigation - Procure to Pay
    { id: 'nav-procurement', title: 'Go to Procurement', description: 'Purchase orders', icon: <Package className="h-4 w-4" />, action: () => navigate('/procurement'), category: 'Procure to Pay', keywords: ['po', 'purchase', 'buy'] },
    { id: 'nav-suppliers', title: 'Go to Suppliers', description: 'Vendor management', icon: <Building2 className="h-4 w-4" />, action: () => navigate('/suppliers'), category: 'Procure to Pay', keywords: ['vendor', 'supplier'] },
    { id: 'nav-ap', title: 'Go to Accounts Payable', description: 'Supplier invoices & payments', icon: <CreditCard className="h-4 w-4" />, action: () => navigate('/ap'), category: 'Procure to Pay', keywords: ['bill', 'payment', 'vendor'] },
    
    // Navigation - Master Data
    { id: 'nav-customers', title: 'Go to Customers', description: 'Customer master data', icon: <Users className="h-4 w-4" />, action: () => navigate('/customers'), category: 'Master Data', keywords: ['client', 'account'] },
    { id: 'nav-products', title: 'Go to Products', description: 'Product catalog', icon: <Box className="h-4 w-4" />, action: () => navigate('/inventory/products'), category: 'Master Data', keywords: ['item', 'sku', 'inventory'] },
    
    // Navigation - Finance
    { id: 'nav-gl', title: 'Go to General Ledger', description: 'Chart of accounts & journals', icon: <Calculator className="h-4 w-4" />, action: () => navigate('/gl'), category: 'Finance', keywords: ['accounting', 'journal', 'coa'] },
    { id: 'nav-banking', title: 'Go to Banking', description: 'Bank accounts & reconciliation', icon: <CreditCard className="h-4 w-4" />, action: () => navigate('/banking'), category: 'Finance', keywords: ['bank', 'reconcile'] },
    
    // Navigation - HR & Payroll
    { id: 'nav-hr', title: 'Go to HR', description: 'Human resources', icon: <Users className="h-4 w-4" />, action: () => navigate('/hr'), category: 'HR & Payroll', keywords: ['employee', 'staff'] },
    { id: 'nav-payroll', title: 'Go to Payroll', description: 'Payroll processing', icon: <DollarSign className="h-4 w-4" />, action: () => navigate('/payroll'), category: 'HR & Payroll', keywords: ['salary', 'wage'] },
    
    // Navigation - Operations
    { id: 'nav-inventory', title: 'Go to Inventory', description: 'Stock management', icon: <Package className="h-4 w-4" />, action: () => navigate('/inventory'), category: 'Operations', keywords: ['stock', 'warehouse'] },
    { id: 'nav-manufacturing', title: 'Go to Manufacturing', description: 'Production & work orders', icon: <Factory className="h-4 w-4" />, action: () => navigate('/manufacturing'), category: 'Operations', keywords: ['production', 'bom', 'work order'] },
    { id: 'nav-field-service', title: 'Go to Field Service', description: 'Service orders & technicians', icon: <Wrench className="h-4 w-4" />, action: () => navigate('/field-service'), category: 'Operations', keywords: ['service', 'technician', 'repair'] },
    { id: 'nav-projects', title: 'Go to Projects', description: 'Project management', icon: <FolderKanban className="h-4 w-4" />, action: () => navigate('/projects'), category: 'Operations', keywords: ['task', 'timesheet'] },
    
    // Navigation - Compliance
    { id: 'nav-compliance', title: 'Go to Compliance', description: 'Regulatory compliance', icon: <Shield className="h-4 w-4" />, action: () => navigate('/compliance'), category: 'Compliance', keywords: ['audit', 'regulation'] },
    { id: 'nav-tax', title: 'Go to Tax', description: 'Tax compliance', icon: <Scale className="h-4 w-4" />, action: () => navigate('/tax'), category: 'Compliance', keywords: ['vat', 'gst', 'tax'] },
    
    // Navigation - AI & Automation
    { id: 'nav-aria', title: 'Ask ARIA', description: 'AI assistant', icon: <MessageSquare className="h-4 w-4" />, action: () => navigate('/ask-aria'), category: 'AI & Automation', keywords: ['chat', 'ai', 'help'] },
    { id: 'nav-agents', title: 'Go to Agents', description: 'Bot automation', icon: <Bot className="h-4 w-4" />, action: () => navigate('/agents'), category: 'AI & Automation', keywords: ['bot', 'automation', 'rpa'] },
    
    // Navigation - Reports
    { id: 'nav-reports', title: 'Go to Reports', description: 'All reports', icon: <ClipboardList className="h-4 w-4" />, action: () => navigate('/reports'), category: 'Reports', keywords: ['report', 'analysis'] },
    { id: 'nav-pl', title: 'Profit & Loss Report', description: 'Income statement', icon: <BarChart3 className="h-4 w-4" />, action: () => navigate('/reports/profit-loss'), category: 'Reports', keywords: ['income', 'expense', 'profit'] },
    { id: 'nav-bs', title: 'Balance Sheet Report', description: 'Financial position', icon: <BarChart3 className="h-4 w-4" />, action: () => navigate('/reports/balance-sheet'), category: 'Reports', keywords: ['asset', 'liability', 'equity'] },
    { id: 'nav-ar-aging', title: 'AR Aging Report', description: 'Receivables aging', icon: <BarChart3 className="h-4 w-4" />, action: () => navigate('/analytics'), category: 'Reports', keywords: ['receivable', 'overdue', 'collection'] },
    
    // Navigation - Admin
    { id: 'nav-settings', title: 'Go to Settings', description: 'System settings', icon: <Settings className="h-4 w-4" />, action: () => navigate('/settings'), category: 'Admin', keywords: ['config', 'preference'] },
    { id: 'nav-users', title: 'User Management', description: 'Manage users', icon: <Users className="h-4 w-4" />, action: () => navigate('/admin/users'), category: 'Admin', keywords: ['user', 'permission', 'role'] },
    
    // Quick Actions
    { id: 'action-new-quote', title: 'Create New Quote', description: 'Start a new quotation', icon: <FileText className="h-4 w-4" />, action: () => navigate('/quotes?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'quote'] },
    { id: 'action-new-so', title: 'Create Sales Order', description: 'Start a new sales order', icon: <ShoppingCart className="h-4 w-4" />, action: () => navigate('/sales-orders?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'order'] },
    { id: 'action-new-po', title: 'Create Purchase Order', description: 'Start a new purchase order', icon: <Package className="h-4 w-4" />, action: () => navigate('/procurement?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'purchase'] },
    { id: 'action-new-invoice', title: 'Create Invoice', description: 'Start a new invoice', icon: <DollarSign className="h-4 w-4" />, action: () => navigate('/ar/invoices?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'invoice', 'bill'] },
    { id: 'action-new-customer', title: 'Add Customer', description: 'Create new customer', icon: <Users className="h-4 w-4" />, action: () => navigate('/customers?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'customer', 'client'] },
    { id: 'action-new-supplier', title: 'Add Supplier', description: 'Create new supplier', icon: <Building2 className="h-4 w-4" />, action: () => navigate('/suppliers?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'supplier', 'vendor'] },
    { id: 'action-new-product', title: 'Add Product', description: 'Create new product', icon: <Box className="h-4 w-4" />, action: () => navigate('/inventory/products?action=new'), category: 'Quick Actions', keywords: ['new', 'create', 'product', 'item'] },
  ];

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter(cmd => {
        const searchStr = `${cmd.title} ${cmd.description || ''} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
      })
    : commands;

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Flatten for keyboard navigation
  const flatCommands = Object.values(groupedCommands).flat();

  // Load recent commands from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('aria-recent-commands');
    if (stored) {
      setRecentCommands(JSON.parse(stored));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          executeCommand(flatCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, flatCommands, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const executeCommand = (cmd: CommandItem) => {
    // Save to recent commands
    const newRecent = [cmd.id, ...recentCommands.filter(id => id !== cmd.id)].slice(0, 5);
    setRecentCommands(newRecent);
    localStorage.setItem('aria-recent-commands', JSON.stringify(newRecent));
    
    cmd.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b">
            <Search className="h-5 w-5 text-gray-300 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 text-lg outline-none placeholder-gray-400"
            />
            <div className="flex items-center gap-1 text-xs text-gray-300">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Command List */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
            {Object.entries(groupedCommands).length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No commands found for "{query}"
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                    {category}
                  </div>
                  {items.map((cmd) => {
                    const globalIndex = flatCommands.findIndex(c => c.id === cmd.id);
                    const isSelected = globalIndex === selectedIndex;
                    const isRecent = recentCommands.includes(cmd.id);
                    
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIndex}
                        onClick={() => executeCommand(cmd)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{cmd.title}</span>
                            {isRecent && (
                              <Clock className="h-3 w-3 text-gray-300" />
                            )}
                          </div>
                          {cmd.description && (
                            <p className="text-sm text-gray-500 truncate">{cmd.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-xs text-gray-300">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border rounded">↓</kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border rounded">Enter</kbd>
                <span>to select</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-white border rounded">K</kbd>
              <span>to open</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to use command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}
