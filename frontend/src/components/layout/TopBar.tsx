import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import './TopBar.css';

export const TopBar: React.FC = () => {
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

        <button className="topbar-action-btn" title="Profile" data-testid="user-menu">
          <User size={20} />
        </button>
        <button className="topbar-action-btn" title="Logout" data-testid="logout" style={{ display: 'none' }}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default TopBar;
