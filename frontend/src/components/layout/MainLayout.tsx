import React from 'react';
import MegaMenu from './MegaMenu';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="main-layout-mega">
      <MegaMenu />
      <main className="main-content-mega">
        {children}
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <a href="https://www.vantax.co.za" target="_blank" rel="noopener noreferrer" className="vantax-link">
            <img src="/vantax-logo.png" alt="VantaX Logo" className="vantax-logo" />
          </a>
          <p className="footer-text">© 2025 VantaX Holdings. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
