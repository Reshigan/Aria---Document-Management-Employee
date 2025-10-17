import React, { useState, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoginForm from '@/components/auth/LoginForm'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import useAuthStore from '@/store/auth'
import PerformanceMonitor, { analyzeBundleSize } from '@/utils/performance'

// Lazy load pages for better performance
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Documents = lazy(() => import('@/pages/Documents').then(module => ({ default: module.Documents })))
const Settings = lazy(() => import('@/pages/Settings').then(module => ({ default: module.Settings })))
const AIChat = lazy(() => import('@/pages/AIChat'))

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Mock login for demo
  useEffect(() => {
    const perfMonitor = PerformanceMonitor.getInstance()
    perfMonitor.mark('app-initialization')
    
    if (!isAuthenticated) {
      // Auto-login for demo purposes
      const mockUser = {
        id: '1',
        email: 'admin@aria.com',
        name: 'John Doe',
        role: 'admin' as const,
        department: 'IT',
        lastLogin: new Date(),
      }
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.setState({ isAuthenticated: true, token: 'mock-token' })
    }
    
    perfMonitor.measure('app-initialization')
    
    // Analyze bundle size in development
    if (import.meta.env.DEV) {
      setTimeout(() => analyzeBundleSize(), 1000)
    }
  }, [isAuthenticated])

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard'
      case 'documents':
        return 'Documents'
      case 'settings':
        return 'Settings'
      case 'ai-chat':
        return 'AI Assistant'
      default:
        return 'Aria'
    }
  }

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Overview of your document management system'
      case 'documents':
        return 'Manage and organize your documents'
      case 'settings':
        return 'Configure system preferences'
      case 'ai-chat':
        return 'Intelligent conversation with advanced AI capabilities'
      default:
        return ''
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'documents':
        return <Documents />
      case 'settings':
        return <Settings />
      case 'ai-chat':
        return <AIChat />
      default:
        return <Dashboard />
    }
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                  </div>
                }>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
