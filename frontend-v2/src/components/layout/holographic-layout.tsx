'use client'

import { useState, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Factory,
  BarChart3, 
  Settings, 
  Landmark, 
  Briefcase, 
  X,
  Search,
  Bell,
  HelpCircle,
  User,
  Zap,
  ChevronRight,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AvatarFloatingButton } from '@/components/erp/avatar-bot'

interface Module {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  glowColor: string
  description: string
  route: string
  subRoutes: { name: string; route: string }[]
}

export function HolographicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [notifications] = useState(3)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const modules: Module[] = useMemo(() => [
    {
      id: 'dashboard',
      name: 'Executive Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      color: 'from-blue-500 to-cyan-500',
      glowColor: 'rgba(59, 130, 246, 0.3)',
      description: 'Real-time KPIs & insights',
      route: '/',
      subRoutes: [
        { name: 'Executive Overview', route: '/' },
        { name: 'ERP Dashboard', route: '/erp-dashboard' },
      ]
    },
    {
      id: 'finance',
      name: 'Finance Hub',
      icon: <Landmark className="h-5 w-5" />,
      color: 'from-emerald-500 to-teal-500',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      description: 'Accounting & treasury',
      route: '/finance/general-ledger',
      subRoutes: [
        { name: 'General Ledger', route: '/finance/general-ledger' },
        { name: 'Chart of Accounts', route: '/finance/chart-of-accounts' },
        { name: 'Journal Entries', route: '/finance/journal-entries' },
        { name: 'AR Invoices', route: '/finance/ar-invoices' },
        { name: 'AP Bills', route: '/finance/ap-bills' },
        { name: 'Payments', route: '/finance/payments' },
        { name: 'Receipts', route: '/finance/receipts' },
        { name: 'Bank Accounts', route: '/finance/bank-accounts' },
        { name: 'Reconciliation', route: '/finance/reconciliation' },
      ]
    },
    {
      id: 'sales',
      name: 'Sales Operations',
      icon: <ShoppingCart className="h-5 w-5" />,
      color: 'from-purple-500 to-fuchsia-500',
      glowColor: 'rgba(168, 85, 247, 0.3)',
      description: 'CRM & revenue',
      route: '/sales/customers',
      subRoutes: [
        { name: 'Customers', route: '/sales/customers' },
        { name: 'Quotes', route: '/sales/quotes' },
        { name: 'Sales Orders', route: '/sales/orders' },
        { name: 'Deliveries', route: '/sales/deliveries' },
      ]
    },
    {
      id: 'procurement',
      name: 'Procurement',
      icon: <Briefcase className="h-5 w-5" />,
      color: 'from-amber-500 to-orange-500',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      description: 'Supply chain & vendors',
      route: '/procurement/suppliers',
      subRoutes: [
        { name: 'Suppliers', route: '/procurement/suppliers' },
        { name: 'Purchase Orders', route: '/procurement/purchase-orders' },
        { name: 'Goods Receipts', route: '/procurement/goods-receipts' },
      ]
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: <Factory className="h-5 w-5" />,
      color: 'from-rose-500 to-pink-500',
      glowColor: 'rgba(244, 63, 94, 0.3)',
      description: 'Manufacturing & inventory',
      route: '/operations/products',
      subRoutes: [
        { name: 'Products', route: '/operations/products' },
        { name: 'Warehouses', route: '/operations/warehouses' },
        { name: 'Stock Movements', route: '/operations/stock-movements' },
        { name: 'BOMs', route: '/operations/boms' },
        { name: 'Work Orders', route: '/operations/work-orders' },
        { name: 'Manufacturing', route: '/operations/manufacturing' },
      ]
    },
    {
      id: 'people',
      name: 'People',
      icon: <Users className="h-5 w-5" />,
      color: 'from-indigo-500 to-blue-500',
      glowColor: 'rgba(99, 102, 241, 0.3)',
      description: 'HR & workforce',
      route: '/people/employees',
      subRoutes: [
        { name: 'Employees', route: '/people/employees' },
        { name: 'Departments', route: '/people/departments' },
        { name: 'Leave', route: '/people/leave' },
        { name: 'Payroll', route: '/people/payroll' },
        { name: 'Attendance', route: '/people/attendance' },
      ]
    },
    {
      id: 'reports',
      name: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'from-violet-500 to-purple-500',
      glowColor: 'rgba(139, 92, 246, 0.3)',
      description: 'BI & reporting',
      route: '/reports/financial',
      subRoutes: [
        { name: 'Financial Reports', route: '/reports/financial' },
        { name: 'Sales Report', route: '/reports/sales' },
        { name: 'Procurement Report', route: '/reports/procurement' },
        { name: 'HR Report', route: '/reports/hr' },
        { name: 'Bots Dashboard', route: '/reports/bots' },
      ]
    },
    {
      id: 'admin',
      name: 'System',
      icon: <Settings className="h-5 w-5" />,
      color: 'from-slate-500 to-gray-500',
      glowColor: 'rgba(100, 116, 139, 0.3)',
      description: 'Configuration',
      route: '/admin/company',
      subRoutes: [
        { name: 'Company Settings', route: '/admin/company' },
        { name: 'Users', route: '/admin/users' },
        { name: 'Tax Rates', route: '/admin/tax-rates' },
        { name: 'Compliance', route: '/admin/compliance' },
        { name: 'Bot Config', route: '/admin/bots' },
      ]
    },
    {
      id: 'ask-aria',
      name: 'Ask Aria',
      icon: <MessageSquare className="h-5 w-5" />,
      color: 'from-cyan-500 to-blue-500',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      description: 'AI assistant',
      route: '/ask-aria',
      subRoutes: []
    }
  ], [])

  const isModuleActive = (module: Module) => {
    if (module.route === '/' && location.pathname === '/') return true
    if (module.subRoutes.some(sub => sub.route === location.pathname)) return true
    const prefix = module.route.split('/').slice(0, 2).join('/')
    if (prefix !== '/' && location.pathname.startsWith(prefix)) return true
    return false
  }

  const isSubRouteActive = (route: string) => location.pathname === route

  const handleModuleClick = (module: Module) => {
    if (expandedModule === module.id) {
      navigate(module.route)
    } else {
      setExpandedModule(module.id)
    }
  }

  const handleSubRouteClick = (route: string) => {
    navigate(route)
  }

  const filteredModules = searchQuery
    ? modules.filter(module =>
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.subRoutes.some(sub => sub.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : modules

  const filteredSubRoutes = searchQuery
    ? modules.flatMap(module =>
        module.subRoutes
          .filter(sub => sub.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(sub => ({ ...sub, moduleName: module.name, moduleColor: module.color }))
      )
    : []

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Holographic Sidebar Navigation */}
      <div
        ref={sidebarRef}
        className="relative w-72 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-white/5 overflow-hidden"
      >
        {/* Ambient particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-blue-400/20"
              style={{
                left: `${(i * 7 + 10) % 100}%`,
                top: `${(i * 13 + 5) % 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.1, 0.5, 0.1]
              }}
              transition={{
                duration: 4 + (i % 3) * 2,
                repeat: Infinity,
                delay: (i % 5) * 0.8
              }}
            />
          ))}
        </div>

        {/* Logo */}
        <div className="relative z-10 px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">ARIA ERP</h1>
              <p className="text-[10px] text-blue-400/70 font-medium tracking-wider uppercase">Holographic Interface</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative z-10 px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/30"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Search results for sub-routes */}
          {searchQuery && filteredSubRoutes.length > 0 && (
            <div className="mt-2 rounded-lg bg-white/5 border border-white/10 max-h-40 overflow-y-auto">
              {filteredSubRoutes.map((sub) => (
                <button
                  key={sub.route}
                  onClick={() => {
                    handleSubRouteClick(sub.route)
                    setSearchQuery('')
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="h-3 w-3 text-slate-500" />
                  <span>{sub.name}</span>
                  <span className="ml-auto text-[10px] text-slate-500">{sub.moduleName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Module List */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {filteredModules.map((module) => {
            const active = isModuleActive(module)
            const expanded = expandedModule === module.id

            return (
              <div key={module.id}>
                {/* Module button */}
                <button
                  onClick={() => handleModuleClick(module)}
                  className={cn(
                    'w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative',
                    active
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {/* Active glow */}
                  {active && (
                    <motion.div
                      layoutId="activeModuleGlow"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${module.glowColor}, transparent)`,
                        boxShadow: `0 0 20px ${module.glowColor}`,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className={cn(
                    'relative z-10 p-1.5 rounded-lg bg-gradient-to-br text-white shadow-md transition-transform duration-200',
                    module.color,
                    active ? 'scale-110' : 'group-hover:scale-105'
                  )}>
                    {module.icon}
                  </div>

                  <div className="relative z-10 flex-1 text-left">
                    <p className="font-medium text-sm leading-tight">{module.name}</p>
                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400 leading-tight mt-0.5">
                      {module.description}
                    </p>
                  </div>

                  {module.subRoutes.length > 0 && (
                    <ChevronRight className={cn(
                      'relative z-10 h-3.5 w-3.5 text-slate-500 transition-transform duration-200',
                      expanded && 'rotate-90'
                    )} />
                  )}
                </button>

                {/* Sub-routes */}
                <AnimatePresence>
                  {expanded && module.subRoutes.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-5 pl-4 border-l border-white/10 py-1 space-y-0.5">
                        {module.subRoutes.map((sub) => {
                          const subActive = isSubRouteActive(sub.route)
                          return (
                            <button
                              key={sub.route}
                              onClick={() => handleSubRouteClick(sub.route)}
                              className={cn(
                                'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-150',
                                subActive
                                  ? 'text-white bg-white/10 font-medium'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                              )}
                            >
                              {sub.name}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-20" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Holographic Interface Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-medium">
                    {notifications}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Avatar Bot */}
      <AvatarFloatingButton />
    </div>
  )
}
