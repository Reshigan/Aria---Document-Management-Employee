import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, LogOut, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/erp/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { useSidebarStore } from '@/stores/sidebar-store'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'

const commandItems = [
  { label: 'Executive Dashboard', path: '/', group: 'Navigate' },
  { label: 'Customers', path: '/sales/customers', group: 'Navigate' },
  { label: 'Suppliers', path: '/procurement/suppliers', group: 'Navigate' },
  { label: 'Quotes', path: '/sales/quotes', group: 'Navigate' },
  { label: 'Sales Orders', path: '/sales/orders', group: 'Navigate' },
  { label: 'Purchase Orders', path: '/procurement/purchase-orders', group: 'Navigate' },
  { label: 'Invoices', path: '/finance/ar-invoices', group: 'Navigate' },
  { label: 'General Ledger', path: '/finance/general-ledger', group: 'Navigate' },
  { label: 'Products', path: '/operations/products', group: 'Navigate' },
  { label: 'Employees', path: '/people/employees', group: 'Navigate' },
  { label: 'Ask ARIA', path: '/ask-aria', group: 'AI' },
  { label: 'Bot Dashboard', path: '/reports/bots', group: 'AI' },
  { label: 'Company Settings', path: '/admin/company', group: 'Admin' },
  { label: 'Users & Roles', path: '/admin/users', group: 'Admin' },
]

function getBreadcrumbs(pathname: string): Array<{ label: string; path: string }> {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: Array<{ label: string; path: string }> = [{ label: 'Home', path: '/' }]
  let currentPath = ''
  for (const part of parts) {
    currentPath += `/${part}`
    crumbs.push({
      label: part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      path: currentPath,
    })
  }
  return crumbs
}

export function TopBar() {
  const [commandOpen, setCommandOpen] = useState(false)
  const { setMobileOpen } = useSidebarStore()
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const breadcrumbs = getBreadcrumbs(location.pathname)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <button
                  onClick={() => navigate(crumb.path)}
                  className={i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground'}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-muted-foreground h-8 w-56" onClick={() => setCommandOpen(true)}>
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]" variant="destructive">3</Badge>
          </Button>

          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || 'user@company.com'}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/company')}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {['Navigate', 'AI', 'Admin'].map((group) => (
            <CommandGroup key={group} heading={group}>
              {commandItems.filter(i => i.group === group).map((item) => (
                <CommandItem key={item.path} onSelect={() => { navigate(item.path); setCommandOpen(false) }}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
