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
    </div>
  );
};
