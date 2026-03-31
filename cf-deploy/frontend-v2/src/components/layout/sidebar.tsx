import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, DollarSign, ShoppingCart, Truck, Users, Factory,
  BarChart3, Settings, Bot, MessageSquare, ChevronLeft, ChevronRight,
  FileText, CreditCard, Landmark, Wallet, Package, Warehouse,
  ClipboardList, UserCog, CalendarDays, Shield, Receipt, ArrowLeftRight,
  BookOpen, PieChart, Briefcase, HardHat, Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  color: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    label: 'Dashboard',
    color: 'text-primary',
    items: [
      { label: 'Executive', path: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'ERP Overview', path: '/erp-dashboard', icon: <PieChart className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Finance',
    color: 'text-module-finance',
    items: [
      { label: 'General Ledger', path: '/finance/general-ledger', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Chart of Accounts', path: '/finance/chart-of-accounts', icon: <Landmark className="h-4 w-4" /> },
      { label: 'Journal Entries', path: '/finance/journal-entries', icon: <FileText className="h-4 w-4" /> },
      { label: 'AR Invoices', path: '/finance/ar-invoices', icon: <Receipt className="h-4 w-4" /> },
      { label: 'AP Bills', path: '/finance/ap-bills', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Payments', path: '/finance/payments', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Receipts', path: '/finance/receipts', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Bank Accounts', path: '/finance/bank-accounts', icon: <Landmark className="h-4 w-4" /> },
      { label: 'Reconciliation', path: '/finance/reconciliation', icon: <ArrowLeftRight className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Sales',
    color: 'text-module-sales',
    items: [
      { label: 'Customers', path: '/sales/customers', icon: <Users className="h-4 w-4" /> },
      { label: 'Quotes', path: '/sales/quotes', icon: <FileText className="h-4 w-4" /> },
      { label: 'Sales Orders', path: '/sales/orders', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Deliveries', path: '/sales/deliveries', icon: <Truck className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Procurement',
    color: 'text-module-procurement',
    items: [
      { label: 'Suppliers', path: '/procurement/suppliers', icon: <Briefcase className="h-4 w-4" /> },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders', icon: <ClipboardList className="h-4 w-4" /> },
      { label: 'Goods Receipts', path: '/procurement/goods-receipts', icon: <Package className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Operations',
    color: 'text-module-manufacturing',
    items: [
      { label: 'Products', path: '/operations/products', icon: <Package className="h-4 w-4" /> },
      { label: 'Warehouses', path: '/operations/warehouses', icon: <Warehouse className="h-4 w-4" /> },
      { label: 'Stock Movements', path: '/operations/stock-movements', icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: 'BOMs', path: '/operations/boms', icon: <ClipboardList className="h-4 w-4" /> },
      { label: 'Work Orders', path: '/operations/work-orders', icon: <Wrench className="h-4 w-4" /> },
      { label: 'Manufacturing', path: '/operations/manufacturing', icon: <Factory className="h-4 w-4" /> },
    ],
  },
  {
    label: 'People',
    color: 'text-module-hr',
    items: [
      { label: 'Employees', path: '/people/employees', icon: <Users className="h-4 w-4" /> },
      { label: 'Departments', path: '/people/departments', icon: <UserCog className="h-4 w-4" /> },
      { label: 'Leave', path: '/people/leave', icon: <CalendarDays className="h-4 w-4" /> },
      { label: 'Payroll Runs', path: '/people/payroll', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Attendance', path: '/people/attendance', icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Reports',
    color: 'text-module-reports',
    items: [
      { label: 'Financial', path: '/reports/financial', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Sales', path: '/reports/sales', icon: <PieChart className="h-4 w-4" /> },
      { label: 'Procurement', path: '/reports/procurement', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'HR', path: '/reports/hr', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Bot Dashboard', path: '/reports/bots', icon: <Bot className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Admin',
    color: 'text-module-admin',
    items: [
      { label: 'Company Settings', path: '/admin/company', icon: <Settings className="h-4 w-4" /> },
      { label: 'Users & Roles', path: '/admin/users', icon: <Shield className="h-4 w-4" /> },
      { label: 'Tax Rates', path: '/admin/tax-rates', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Compliance', path: '/admin/compliance', icon: <Shield className="h-4 w-4" /> },
      { label: 'Bot Config', path: '/admin/bots', icon: <HardHat className="h-4 w-4" /> },
    ],
  },
]

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore()
  const location = useLocation()

  const content = (
    <div className={cn(
      'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold text-gold-foreground font-bold text-sm">A</div>
            <span className="font-semibold text-lg">ARIA</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-md bg-gold text-gold-foreground font-bold text-sm">A</div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1 px-2">
            {navigation.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-2 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {collapsed && <Separator className="my-2 bg-sidebar-border" />}
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                  const link = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                        collapsed && 'justify-center px-0'
                      )}
                    >
                      <span className={cn(isActive && group.color)}>{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return link
                })}
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom section: Ask Aria + Collapse */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <NavLink
          to="/ask-aria"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors bg-gold/10 text-gold hover:bg-gold/20',
            collapsed && 'justify-center px-0'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          {!collapsed && <span>Ask ARIA</span>}
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className={cn('w-full text-sidebar-foreground/50 hover:text-sidebar-foreground', collapsed && 'px-0')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> <span>Collapse</span></>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0 z-30">
        {content}
      </aside>
      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 md:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  )
}
