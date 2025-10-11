import React, { useState } from 'react';

const VantaXHeader = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="vx-glass" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      padding: '1rem 2rem',
      backdropFilter: 'blur(20px)',
      background: 'rgba(0, 0, 0, 0.8)',
      borderBottom: '1px solid rgba(255, 215, 0, 0.2)'
    }}>
      <div className="vx-flex vx-items-center vx-justify-between" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Logo Section */}
        <div className="vx-flex vx-items-center vx-gap-md">
          <div className="vx-logo">VX</div>
          <div className="vx-flex vx-flex-col">
            <div className="vx-text-gradient vx-font-bold" style={{ fontSize: '1.8rem' }}>
              ARIA
            </div>
            <div className="vx-text-muted" style={{ fontSize: '0.9rem', fontWeight: 300 }}>
              Document Management AI
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="vx-flex vx-gap-lg" style={{ display: window.innerWidth > 768 ? 'flex' : 'none' }}>
          <a href="/dashboard" className="vx-nav-item">Dashboard</a>
          <a href="/documents" className="vx-nav-item">Documents</a>
          <a href="/analytics" className="vx-nav-item">Analytics</a>
          <a href="/settings" className="vx-nav-item">Settings</a>
        </nav>

        {/* User Section */}
        <div className="vx-flex vx-items-center vx-gap-md">
          {/* System Status */}
          <div className="vx-status vx-status-online">
            <div className="vx-status-dot"></div>
            <span>AI Online</span>
          </div>

          {/* User Menu */}
          <div className="vx-flex vx-items-center vx-gap-sm">
            <div className="vx-text-muted" style={{ fontSize: '0.9rem' }}>
              Welcome, {user?.username || 'User'}
            </div>
            <button 
              className="vx-btn vx-btn-ghost"
              onClick={onLogout}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="vx-btn vx-btn-secondary"
          style={{ display: window.innerWidth <= 768 ? 'block' : 'none' }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="vx-glass-yellow vx-animate-slide-up" style={{
          position: 'absolute',
          top: '100%',
          left: '1rem',
          right: '1rem',
          padding: '1rem',
          marginTop: '0.5rem'
        }}>
          <nav className="vx-flex vx-flex-col vx-gap-sm">
            <a href="/dashboard" className="vx-nav-item">Dashboard</a>
            <a href="/documents" className="vx-nav-item">Documents</a>
            <a href="/analytics" className="vx-nav-item">Analytics</a>
            <a href="/settings" className="vx-nav-item">Settings</a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default VantaXHeader;