import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  DollarSign, ShoppingCart, Truck, Users, Factory, BarChart3, Settings, Bot,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const modules = [
  { name: 'Finance', icon: DollarSign, color: 'text-module-finance', path: '/finance/general-ledger', health: 98, pending: 12 },
  { name: 'Sales', icon: ShoppingCart, color: 'text-module-sales', path: '/sales/customers', health: 95, pending: 8 },
  { name: 'Procurement', icon: Truck, color: 'text-module-procurement', path: '/procurement/suppliers', health: 92, pending: 5 },
  { name: 'Operations', icon: Factory, color: 'text-module-manufacturing', path: '/operations/products', health: 88, pending: 15 },
  { name: 'People', icon: Users, color: 'text-module-hr', path: '/people/employees', health: 96, pending: 3 },
  { name: 'Reports', icon: BarChart3, color: 'text-module-reports', path: '/reports/financial', health: 100, pending: 0 },
  { name: 'Admin', icon: Settings, color: 'text-module-admin', path: '/admin/company', health: 100, pending: 2 },
  { name: 'ARIA AI', icon: Bot, color: 'text-gold', path: '/ask-aria', health: 94, pending: 4 },
]

export default function ErpDashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">ERP Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <Card key={mod.name} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(mod.path)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', mod.color)} />
                    <span className="font-medium">{mod.name}</span>
                  </div>
                  {mod.pending > 0 && <Badge variant="secondary">{mod.pending}</Badge>}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Health</span>
                    <span>{mod.health}%</span>
                  </div>
                  <Progress value={mod.health} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: 'Invoice INV-2024-0089 posted', time: '2 min ago', module: 'Finance' },
                { action: 'Sales Order SO-2024-0134 confirmed', time: '15 min ago', module: 'Sales' },
                { action: 'PO-2024-0067 approved', time: '1 hour ago', module: 'Procurement' },
                { action: 'Payroll run completed', time: '3 hours ago', module: 'People' },
                { action: 'Stock transfer WH01 → WH02', time: '5 hours ago', module: 'Operations' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p>{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <Badge variant="outline">{item.module}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">System Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { message: '5 invoices overdue > 60 days', severity: 'destructive' as const },
                { message: 'Low stock: 3 products below reorder point', severity: 'warning' as const },
                { message: 'Bank reconciliation pending for March', severity: 'warning' as const },
                { message: 'VAT201 filing due in 5 days', severity: 'default' as const },
              ].map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant={alert.severity} className="shrink-0">!</Badge>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
