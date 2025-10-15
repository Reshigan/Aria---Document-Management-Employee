import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Button from '../ui/Button'

// Icons (using simple SVG icons for now)
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
    </svg>
  ),
  Documents: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Integrations: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Reports: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

const navigation = [
  { name: 'Dashboard', href: '/enterprise-dashboard', icon: Icons.Dashboard },
  { name: 'Documents', href: '/', icon: Icons.Documents },
  { name: 'Integrations', href: '/integrations', icon: Icons.Integrations },
  { name: 'Reports', href: '/reports', icon: Icons.Reports },
  { name: 'Settings', href: '/settings', icon: Icons.Settings },
]

const AppLayout = ({ children, title, description }) => {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const isCurrentPage = (href) => {
    if (href === '/' && router.pathname === '/') return true
    if (href !== '/' && router.pathname.startsWith(href)) return true
    return false
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden"
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">ARIA</h1>
                    <p className="text-xs text-gray-500">Document Management</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  leftIcon={<Icons.Close />}
                />
              </div>
              <nav className="mt-6 px-3">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const current = isCurrentPage(item.href)
                  return (
                    <Link key={item.name} href={item.href}>
                      <motion.a
                        className={clsx(
                          'group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors',
                          current
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon />
                        <span className="ml-3">{item.name}</span>
                      </motion.a>
                    </Link>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">ARIA</h1>
                <p className="text-xs text-gray-500">Document Management</p>
              </div>
            </div>
          </div>
          <nav className="mt-6 flex-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon
              const current = isCurrentPage(item.href)
              return (
                <Link key={item.name} href={item.href}>
                  <motion.a
                    className={clsx(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors',
                      current
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon />
                    <span className="ml-3">{item.name}</span>
                  </motion.a>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                leftIcon={<Icons.Menu />}
              />
              <div>
                {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
                {description && <p className="text-sm text-gray-500">{description}</p>}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icons.Search />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Icons.Bell />}
              />

              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <Icons.User />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="py-8 px-4 sm:px-6 lg:px-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout