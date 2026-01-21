import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, FileText, Users, ShoppingCart, Package, Truck, 
  Receipt, CreditCard, UserPlus, ClipboardList, X, Zap
} from 'lucide-react';
import './QuickActions.css';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'new-invoice',
    label: 'New Invoice',
    description: 'Create a customer invoice',
    icon: <FileText size={20} />,
    path: '/ar/invoices/new',
    color: '#10b981'
  },
  {
    id: 'new-quote',
    label: 'New Quote',
    description: 'Create a sales quotation',
    icon: <ClipboardList size={20} />,
    path: '/quotes/new',
    color: '#6366f1'
  },
  {
    id: 'new-customer',
    label: 'Add Customer',
    description: 'Register a new customer',
    icon: <UserPlus size={20} />,
    path: '/crm/customers/new',
    color: '#8b5cf6'
  },
  {
    id: 'new-po',
    label: 'New Purchase Order',
    description: 'Create a purchase order',
    icon: <ShoppingCart size={20} />,
    path: '/procurement/purchase-orders/new',
    color: '#f59e0b'
  },
  {
    id: 'new-product',
    label: 'Add Product',
    description: 'Add a new inventory item',
    icon: <Package size={20} />,
    path: '/inventory/items/new',
    color: '#ec4899'
  },
  {
    id: 'record-payment',
    label: 'Record Payment',
    description: 'Record a customer payment',
    icon: <CreditCard size={20} />,
    path: '/ar/receipts/new',
    color: '#14b8a6'
  },
  {
    id: 'new-delivery',
    label: 'New Delivery',
    description: 'Create a delivery note',
    icon: <Truck size={20} />,
    path: '/deliveries/new',
    color: '#06b6d4'
  },
  {
    id: 'new-expense',
    label: 'New Expense',
    description: 'Record an expense claim',
    icon: <Receipt size={20} />,
    path: '/ap/expense-claims/new',
    color: '#ef4444'
  },
];

interface QuickActionsProps {
  variant?: 'panel' | 'dropdown';
}

export const QuickActions: React.FC<QuickActionsProps> = ({ variant = 'panel' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'dropdown') {
    return (
      <div className="quick-actions-dropdown">
        <button 
          className="quick-actions-trigger"
          onClick={() => setIsOpen(!isOpen)}
          title="Quick Actions"
        >
          <Zap size={18} />
          <span>Quick Actions</span>
        </button>
        
        {isOpen && (
          <>
            <div className="quick-actions-overlay" onClick={() => setIsOpen(false)} />
            <div className="quick-actions-menu">
              <div className="quick-actions-menu-header">
                <h3>Quick Actions</h3>
                <button onClick={() => setIsOpen(false)} className="quick-actions-close">
                  <X size={16} />
                </button>
              </div>
              <div className="quick-actions-menu-grid">
                {quickActions.map((action) => (
                  <Link
                    key={action.id}
                    to={action.path}
                    className="quick-action-menu-item"
                    onClick={() => setIsOpen(false)}
                  >
                    <div 
                      className="quick-action-menu-icon"
                      style={{ backgroundColor: `${action.color}15`, color: action.color }}
                    >
                      {action.icon}
                    </div>
                    <div className="quick-action-menu-text">
                      <span className="quick-action-menu-label">{action.label}</span>
                      <span className="quick-action-menu-desc">{action.description}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="quick-actions-panel">
      <div className="quick-actions-header">
        <Zap size={20} className="quick-actions-icon" />
        <h3>Quick Actions</h3>
      </div>
      <div className="quick-actions-grid">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            to={action.path}
            className="quick-action-card"
          >
            <div 
              className="quick-action-icon"
              style={{ backgroundColor: `${action.color}15`, color: action.color }}
            >
              {action.icon}
            </div>
            <div className="quick-action-content">
              <span className="quick-action-label">{action.label}</span>
              <span className="quick-action-description">{action.description}</span>
            </div>
            <Plus size={16} className="quick-action-plus" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
