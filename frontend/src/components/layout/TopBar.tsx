import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const user = useAuthStore(state => state.user);
  
  return (
    <header className="topbar">
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

        <div className="topbar-action-btn" title="Profile" data-testid="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} />
          {user && (
            <span data-testid="user-name" style={{ fontSize: '14px' }}>
              {user.full_name || user.email?.split('@')[0] || 'User'}
            </span>
          )}
        </div>
        <button className="topbar-action-btn" title="Logout" data-testid="logout" style={{ display: 'none' }}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default TopBar;
