'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeOutlined, 
  MessageOutlined, 
  FileTextOutlined, 
  UploadOutlined, 
  DashboardOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const Navigation = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { href: '/dashboard', icon: DashboardOutlined, label: 'Dashboard' },
    { href: '/chat', icon: MessageOutlined, label: 'AI Chat' },
    { href: '/documents', icon: FileTextOutlined, label: 'Documents' },
    { href: '/upload', icon: UploadOutlined, label: 'Upload' },
  ];

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden neon-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '12px', minWidth: 'auto' }}
      >
        {isOpen ? <CloseOutlined /> : <MenuOutlined />}
      </button>

      {/* Navigation Sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full w-80 z-40 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="holo-nav h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold glow-text">ARIA</h1>
                <p className="text-sm text-gray-400">Digital Twin System</p>
              </div>
            </div>
            
            {/* System Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className="status-online">ONLINE</div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`nav-item ${isActive ? 'active' : ''}`}>
                    <div className="flex items-center gap-3">
                      <Icon className="text-lg" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* User Section */}
          {user && (
            <div className="p-4 border-t border-gray-700/50">
              <div className="glass-card p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                    <UserOutlined className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.username}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                
                {/* Neural Activity Indicator */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Neural Activity</span>
                    <span>87%</span>
                  </div>
                  <div className="holo-progress">
                    <div className="holo-progress-bar" style={{ width: '87%' }}></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Link href="/admin">
                  <div className="nav-item">
                    <div className="flex items-center gap-3">
                      <SettingOutlined />
                      <span>Settings</span>
                    </div>
                  </div>
                </Link>
                
                <button 
                  onClick={logout}
                  className="nav-item w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <LogoutOutlined />
                    <span>Logout</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;