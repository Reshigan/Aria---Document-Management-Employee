import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { CompanySwitcher } from '../CompanySwitcher';
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
        <CompanySwitcher />
        
        <button className="topbar-action-btn" title="Notifications">
          <Bell size={20} />
          <span className="topbar-badge">3</span>
        </button>

        <button className="topbar-action-btn" title="Profile">
          <User size={20} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
