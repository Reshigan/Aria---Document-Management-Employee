import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, X, AlertCircle, CheckCircle, Clock, FileText, 
  Users, Package, CreditCard, Bot, AlertTriangle, Info
} from 'lucide-react';
import './NotificationsBell.css';

interface SystemNotification {
  id: string;
  type: 'alert' | 'success' | 'warning' | 'info' | 'bot';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  category: 'invoice' | 'payment' | 'inventory' | 'bot' | 'approval' | 'system';
}

const mockNotifications: SystemNotification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Overdue Invoice',
    message: 'Invoice INV-2026-000045 is 15 days overdue (R 12,500)',
    timestamp: '10 minutes ago',
    read: false,
    link: '/ar/invoices/INV-2026-000045',
    category: 'invoice'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Widget A is below reorder point (5 units remaining)',
    timestamp: '1 hour ago',
    read: false,
    link: '/inventory/items',
    category: 'inventory'
  },
  {
    id: '3',
    type: 'bot',
    title: 'Bot Execution Complete',
    message: 'AR Collections Bot processed 12 invoices, sent 5 reminders',
    timestamp: '2 hours ago',
    read: false,
    link: '/agents',
    category: 'bot'
  },
  {
    id: '4',
    type: 'success',
    title: 'Payment Received',
    message: 'Payment of R 8,750 received from ABC Company',
    timestamp: '3 hours ago',
    read: true,
    link: '/ar/receipts',
    category: 'payment'
  },
  {
    id: '5',
    type: 'info',
    title: 'Approval Required',
    message: 'Purchase Order PO-2026-000089 requires your approval',
    timestamp: '4 hours ago',
    read: true,
    link: '/procurement/purchase-orders/PO-2026-000089',
    category: 'approval'
  },
];

export const NotificationsBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(mockNotifications);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle size={16} />;
      case 'success':
        return <CheckCircle size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'bot':
        return <Bot size={16} />;
      case 'info':
      default:
        return <Info size={16} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'invoice':
        return <FileText size={14} />;
      case 'payment':
        return <CreditCard size={14} />;
      case 'inventory':
        return <Package size={14} />;
      case 'bot':
        return <Bot size={14} />;
      case 'approval':
        return <Clock size={14} />;
      default:
        return <Info size={14} />;
    }
  };

  return (
    <div className="notifications-bell">
      <button 
        className={`notifications-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notifications-overlay" onClick={() => setIsOpen(false)} />
          <div className="notifications-panel">
            <div className="notifications-header">
              <h3>Notifications</h3>
              <div className="notifications-header-actions">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-read">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="notifications-close">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="notifications-empty">
                  <Bell size={32} />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'} type-${notification.type}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={`notification-icon type-${notification.type}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-meta">
                        <span className="notification-category">
                          {getCategoryIcon(notification.category)}
                          {notification.category}
                        </span>
                        <span className="notification-time">{notification.timestamp}</span>
                      </div>
                    </div>
                    <button 
                      className="notification-dismiss"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="notifications-footer">
              <Link to="/notifications" onClick={() => setIsOpen(false)}>
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsBell;
