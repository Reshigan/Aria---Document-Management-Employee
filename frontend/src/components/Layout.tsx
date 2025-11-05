import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Building2, FileText, 
  CreditCard, Folder, LogOut, Bot, ShoppingCart, Truck,
  Receipt, Package, Briefcase, PiggyBank, BarChart3,
  Settings, FileSpreadsheet, Wrench, Zap
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface NavSection {
  title: string
  items: NavItem[]
}

interface NavItem {
  name: string
  href: string
  icon: any
}

const navigationSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Sales',
    items: [
      { name: 'Quotes', href: '/quotes', icon: FileText },
      { name: 'Sales Orders', href: '/sales-orders', icon: ShoppingCart },
      { name: 'Deliveries', href: '/deliveries', icon: Truck },
      { name: 'Invoices', href: '/ar/invoices', icon: Receipt },
      { name: 'Customers', href: '/ar/customers', icon: Users },
    ]
  },
  {
    title: 'Purchases',
    items: [
      { name: 'Bills', href: '/ap/bills', icon: FileText },
      { name: 'Purchase Orders', href: '/ap/purchase-orders', icon: ShoppingCart },
      { name: 'Suppliers', href: '/ap/suppliers', icon: Building2 },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Products', href: '/inventory/products', icon: Package },
      { name: 'Stock', href: '/wms-stock', icon: Package },
    ]
  },
  {
    title: 'Accounting',
    items: [
      { name: 'General Ledger', href: '/gl', icon: FileSpreadsheet },
      { name: 'Banking', href: '/banking', icon: PiggyBank },
      { name: 'Payroll', href: '/payroll', icon: Briefcase },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Manufacturing', href: '/manufacturing', icon: Wrench },
      { name: 'CRM', href: '/crm', icon: Users },
      { name: 'Procurement', href: '/procurement', icon: ShoppingCart },
    ]
  },
  {
    title: 'Automation',
    items: [
      { name: 'Bots', href: '/automation/bots', icon: Bot },
      { name: 'Mailroom', href: '/automation/mailroom', icon: Zap },
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ]
  }
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-blue-900 text-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold">ARIA ERP</h1>
            <p className="text-blue-200 text-sm">AI-Native Business Management</p>
          </div>
          <nav className="mt-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {navigationSections.map((section) => (
              <div key={section.title} className="mb-6">
                <h3 className="px-6 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-6 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-800 text-white border-l-4 border-white'
                          : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="absolute bottom-0 w-64 p-6 border-t border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-blue-200">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-blue-800 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
