import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '../ui/Button';

const ModernLayout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const router = useRouter();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/enterprise-dashboard',
      icon: '📊',
      id: 'dashboard',
      description: 'Analytics & insights'
    },
    {
      name: 'Documents',
      href: '/',
      icon: '📄',
      id: 'documents',
      description: 'Document management'
    },
    {
      name: 'Office365',
      href: '/integrations',
      icon: '📧',
      id: 'office365',
      description: 'Email integration'
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: '📈',
      id: 'reports',
      description: 'Business reports'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: '⚙️',
      id: 'settings',
      description: 'System configuration'
    }
  ];

  useEffect(() => {
    const currentPath = router.pathname;
    const activeNav = navigation.find(nav => nav.href === currentPath);
    if (activeNav) {
      setActiveSection(activeNav.id);
    }
  }, [router.pathname]);

  const sidebarVariants = {
    open: { width: '280px', opacity: 1 },
    closed: { width: '80px', opacity: 0.9 }
  };

  const contentVariants = {
    open: { marginLeft: '280px' },
    closed: { marginLeft: '80px' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Floating Background Elements */}
      <div className="vx-floating-orb" style={{ top: '10%', left: '5%' }}></div>
      <div className="vx-floating-orb" style={{ top: '60%', right: '10%' }}></div>
      <div className="vx-floating-orb" style={{ top: '30%', right: '30%' }}></div>

      {/* Sidebar */}
      <motion.div
        className="fixed left-0 top-0 h-full vx-glass z-50 border-r border-gray-700"
        variants={sidebarVariants}
        animate={sidebarOpen ? 'open' : 'closed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="vx-logo">VX</div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col"
                >
                  <span className="text-xl font-bold vx-text-gradient">ARIA</span>
                  <span className="text-xs text-gray-400">Document Management</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link key={item.id} href={item.href}>
                <motion.div
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    activeSection === item.id
                      ? 'vx-glass-yellow text-yellow-400'
                      : 'hover:vx-glass-yellow hover:text-yellow-400 text-gray-300'
                  }`}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-xl">{item.icon}</span>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex flex-col"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs opacity-70">{item.description}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="vx-glass p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex-1"
                    >
                      <p className="text-sm font-medium text-white">
                        {user?.username || 'User'}
                      </p>
                      <p className="text-xs text-gray-400">Administrator</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-3"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      className="w-full text-xs"
                    >
                      Sign Out
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="min-h-screen transition-all duration-300"
        variants={contentVariants}
        animate={sidebarOpen ? 'open' : 'closed'}
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-40 vx-glass border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white"
              >
                {sidebarOpen ? '◀' : '▶'}
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {navigation.find(nav => nav.id === activeSection)?.name || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-400">
                  {navigation.find(nav => nav.id === activeSection)?.description || 'Welcome back'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Real-time Status */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">System Online</span>
              </div>
              
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                🔔
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  3
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernLayout;