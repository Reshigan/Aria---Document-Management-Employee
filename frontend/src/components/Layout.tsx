import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Building2, FileText, 
  CreditCard, Folder, LogOut, Agent 
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Building2 },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Accounts', href: '/accounts', icon: Folder },
  { name: 'AI Agents', href: '/agents', icon: Agent },
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
          <nav className="mt-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-800 text-white border-l-4 border-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
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
