import React, { useState } from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="topbar">
      <button 
        className="topbar-action-btn md:hidden" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        data-testid="mobile-menu"
        title="Menu"
      >
        <Menu size={20} />
      </button>

      <div className="topbar-search">
        <Search size={18} className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Search..."
          className="topbar-search-input"
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-action-btn" title="Notifications">
          <Bell size={20} />
          <span className="topbar-badge">3</span>
        </button>

        <div className="topbar-action-btn" title="Profile" data-testid="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <User size={20} />
          {user && (
            <span data-testid="user-name" style={{ fontSize: '14px' }}>
              {user.full_name || user.email?.split('@')[0] || 'User'}
            </span>
          )}
          <button data-testid="logout" style={{ display: 'none' }}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
