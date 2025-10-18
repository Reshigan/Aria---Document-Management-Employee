import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import {
  HomeIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  UsersIcon,
  ChartBarIcon,
  BellIcon,
  XMarkIcon,
  SparklesIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/outline'
import VantaXHeader from './VantaXHeader'
import VantaXFooter from './VantaXFooter'

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        try {
          setUser(JSON.parse(userData))
        } catch (error) {
          console.error('Error parsing user data:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/')
        }
      } else if (router.pathname !== '/') {
        router.push('/')
      }
      setLoading(false)
    }
  }, [router])

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const menuItems = [
    {
      key: 'dashboard',
      icon: HomeIcon,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      key: 'modern-dashboard',
      icon: PresentationChartBarIcon,
      label: 'Analytics Dashboard',
      path: '/modern-dashboard'
    },
    {
      key: 'ai-bot',
      icon: SparklesIcon,
      label: 'AI Assistant',
      path: '/ai-bot'
    },
    {
      key: 'documents',
      icon: DocumentIcon,
      label: 'Documents',
      path: '/documents'
    },
    {
      key: 'upload',
      icon: CloudArrowUpIcon,
      label: 'Upload',
      path: '/upload'
    },
    {
      key: 'search',
      icon: MagnifyingGlassIcon,
      label: 'Search',
      path: '/search'
    }
  ]

  const adminMenuItems = [
    {
      key: 'admin',
      icon: UsersIcon,
      label: 'Admin Panel',
      path: '/admin'
    },
    {
      key: 'analytics',
      icon: ChartBarIcon,
      label: 'Analytics',
      path: '/analytics'
    }
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: UserIcon,
      label: 'Profile',
      path: '/profile'
    },
    {
      key: 'settings',
      icon: CogIcon,
      label: 'Settings',
      path: '/settings'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="vx-glass p-8 rounded-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="text-white mt-4 text-center">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user && router.pathname !== '/') {
    return null
  }

  if (router.pathname === '/') {
    return children
  }

  const isAdmin = user?.role === 'admin'
  const currentPath = router.pathname

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 vx-glass border-r border-gray-700`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center">
              <div className="vx-logo">
                VX
              </div>
              {!collapsed && (
                <div className="ml-3">
                  <h1 className="text-xl font-bold vx-text-gradient">ARIA</h1>
                  <p className="text-xs text-gray-400">Document Management</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.path
                
                return (
                  <button
                    key={item.key}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'vx-glass-yellow text-yellow-400' 
                        : 'text-gray-300 hover:vx-glass-yellow hover:text-yellow-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">{item.label}</span>}
                  </button>
                )
              })}
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <div className="mt-8">
                {!collapsed && (
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Administration
                  </h3>
                )}
                <div className="space-y-2">
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = currentPath === item.path
                    
                    return (
                      <button
                        key={item.key}
                        onClick={() => router.push(item.path)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'vx-glass-yellow text-yellow-400' 
                            : 'text-gray-300 hover:vx-glass-yellow hover:text-yellow-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {!collapsed && <span className="ml-3">{item.label}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* User Section */}
            <div className="mt-8">
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Account
                </h3>
              )}
              <div className="space-y-2">
                {userMenuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPath === item.path
                  
                  return (
                    <button
                      key={item.key}
                      onClick={() => router.push(item.path)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'vx-glass-yellow text-yellow-400' 
                          : 'text-gray-300 hover:vx-glass-yellow hover:text-yellow-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {!collapsed && <span className="ml-3">{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-gray-700">
            <Menu as="div" className="relative">
              <Menu.Button className="w-full flex items-center px-3 py-2 rounded-lg text-gray-300 hover:vx-glass-yellow hover:text-yellow-400 transition-all duration-200">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <div className="ml-3 text-left">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                  </div>
                )}
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute bottom-full left-0 w-full mb-2 vx-glass rounded-lg shadow-lg">
                  <div className="p-2">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            active ? 'vx-glass-yellow text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="vx-glass border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 rounded-lg text-gray-300 hover:vx-glass-yellow hover:text-yellow-400 transition-all duration-200"
              >
                {collapsed ? (
                  <Bars3Icon className="h-5 w-5" />
                ) : (
                  <XMarkIcon className="h-5 w-5" />
                )}
              </button>
              <h2 className="ml-4 text-xl font-semibold text-white capitalize">
                {currentPath.replace('/', '') || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-lg text-gray-300 hover:vx-glass-yellow hover:text-yellow-400 transition-all duration-200">
                <BellIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="vx-animate-fade-in">
            {children}
          </div>
        </main>

        {/* Footer */}
        <VantaXFooter />
      </div>
    </div>
  )
}

export default Layout