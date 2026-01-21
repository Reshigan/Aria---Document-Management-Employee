import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, FileText, Users, Package, ShoppingCart, 
  Truck, Receipt, Star, StarOff, X
} from 'lucide-react';
import './RecentItems.css';

interface RecentItem {
  id: string;
  type: 'invoice' | 'quote' | 'customer' | 'product' | 'po' | 'delivery' | 'receipt';
  title: string;
  subtitle: string;
  path: string;
  timestamp: string;
  isFavorite: boolean;
}

const STORAGE_KEY = 'aria_recent_items';
const FAVORITES_KEY = 'aria_favorites';

const mockRecentItems: RecentItem[] = [
  {
    id: '1',
    type: 'invoice',
    title: 'INV-2026-000089',
    subtitle: 'ABC Company - R 12,500',
    path: '/ar/invoices/INV-2026-000089',
    timestamp: '5 minutes ago',
    isFavorite: false
  },
  {
    id: '2',
    type: 'customer',
    title: 'XYZ Corporation',
    subtitle: 'Customer since 2024',
    path: '/crm/customers/xyz-corp',
    timestamp: '15 minutes ago',
    isFavorite: true
  },
  {
    id: '3',
    type: 'quote',
    title: 'QT-2026-000156',
    subtitle: 'Tech Solutions - R 45,000',
    path: '/quotes/QT-2026-000156',
    timestamp: '1 hour ago',
    isFavorite: false
  },
  {
    id: '4',
    type: 'po',
    title: 'PO-2026-000078',
    subtitle: 'Office Supplies Ltd',
    path: '/procurement/purchase-orders/PO-2026-000078',
    timestamp: '2 hours ago',
    isFavorite: false
  },
  {
    id: '5',
    type: 'product',
    title: 'Widget Pro X',
    subtitle: 'SKU: WPX-001 - 150 in stock',
    path: '/inventory/items/widget-pro-x',
    timestamp: '3 hours ago',
    isFavorite: true
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'invoice':
      return <FileText size={16} />;
    case 'quote':
      return <FileText size={16} />;
    case 'customer':
      return <Users size={16} />;
    case 'product':
      return <Package size={16} />;
    case 'po':
      return <ShoppingCart size={16} />;
    case 'delivery':
      return <Truck size={16} />;
    case 'receipt':
      return <Receipt size={16} />;
    default:
      return <FileText size={16} />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'invoice':
      return '#10b981';
    case 'quote':
      return '#6366f1';
    case 'customer':
      return '#8b5cf6';
    case 'product':
      return '#ec4899';
    case 'po':
      return '#f59e0b';
    case 'delivery':
      return '#06b6d4';
    case 'receipt':
      return '#14b8a6';
    default:
      return '#6b7280';
  }
};

interface RecentItemsProps {
  variant?: 'panel' | 'dropdown';
  showFavoritesOnly?: boolean;
}

export const RecentItems: React.FC<RecentItemsProps> = ({ 
  variant = 'panel',
  showFavoritesOnly = false 
}) => {
  const [items, setItems] = useState<RecentItem[]>(mockRecentItems);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites'>('recent');

  const displayItems = activeTab === 'favorites' 
    ? items.filter(item => item.isFavorite)
    : items;

  const toggleFavorite = (id: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  if (variant === 'dropdown') {
    return (
      <div className="recent-items-dropdown">
        <button 
          className="recent-items-trigger"
          onClick={() => setIsOpen(!isOpen)}
          title="Recent Items"
        >
          <Clock size={18} />
        </button>

        {isOpen && (
          <>
            <div className="recent-items-overlay" onClick={() => setIsOpen(false)} />
            <div className="recent-items-panel">
              <div className="recent-items-header">
                <div className="recent-items-tabs">
                  <button 
                    className={`recent-items-tab ${activeTab === 'recent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recent')}
                  >
                    <Clock size={14} />
                    Recent
                  </button>
                  <button 
                    className={`recent-items-tab ${activeTab === 'favorites' ? 'active' : ''}`}
                    onClick={() => setActiveTab('favorites')}
                  >
                    <Star size={14} />
                    Favorites
                  </button>
                </div>
                <button onClick={() => setIsOpen(false)} className="recent-items-close">
                  <X size={16} />
                </button>
              </div>

              <div className="recent-items-list">
                {displayItems.length === 0 ? (
                  <div className="recent-items-empty">
                    {activeTab === 'favorites' ? (
                      <>
                        <Star size={32} />
                        <p>No favorites yet</p>
                        <span>Star items to add them here</span>
                      </>
                    ) : (
                      <>
                        <Clock size={32} />
                        <p>No recent items</p>
                        <span>Items you view will appear here</span>
                      </>
                    )}
                  </div>
                ) : (
                  displayItems.map((item) => (
                    <div key={item.id} className="recent-item">
                      <Link 
                        to={item.path} 
                        className="recent-item-link"
                        onClick={() => setIsOpen(false)}
                      >
                        <div 
                          className="recent-item-icon"
                          style={{ 
                            backgroundColor: `${getTypeColor(item.type)}15`,
                            color: getTypeColor(item.type)
                          }}
                        >
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="recent-item-content">
                          <span className="recent-item-title">{item.title}</span>
                          <span className="recent-item-subtitle">{item.subtitle}</span>
                        </div>
                      </Link>
                      <div className="recent-item-actions">
                        <button 
                          className={`recent-item-favorite ${item.isFavorite ? 'is-favorite' : ''}`}
                          onClick={() => toggleFavorite(item.id)}
                          title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {item.isFavorite ? <Star size={14} /> : <StarOff size={14} />}
                        </button>
                        <button 
                          className="recent-item-remove"
                          onClick={() => removeItem(item.id)}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="recent-items-widget">
      <div className="recent-items-widget-header">
        <div className="recent-items-tabs">
          <button 
            className={`recent-items-tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <Clock size={14} />
            Recent
          </button>
          <button 
            className={`recent-items-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star size={14} />
            Favorites
          </button>
        </div>
      </div>
      <div className="recent-items-widget-list">
        {displayItems.slice(0, 5).map((item) => (
          <Link key={item.id} to={item.path} className="recent-item-widget-card">
            <div 
              className="recent-item-icon"
              style={{ 
                backgroundColor: `${getTypeColor(item.type)}15`,
                color: getTypeColor(item.type)
              }}
            >
              {getTypeIcon(item.type)}
            </div>
            <div className="recent-item-content">
              <span className="recent-item-title">{item.title}</span>
              <span className="recent-item-subtitle">{item.subtitle}</span>
            </div>
            {item.isFavorite && (
              <Star size={12} className="recent-item-star" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentItems;
