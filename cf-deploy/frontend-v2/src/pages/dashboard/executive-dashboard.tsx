import { useQuery } from '@tanstack/react-query'
import { KPICard } from '@/components/erp/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, Users, ShoppingCart, CreditCard, Package, AlertCircle, Bot } from 'lucide-react'
import api from '@/lib/api'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'

const revenueData = [
  { month: 'Jan', revenue: 420000, expenses: 310000 },
  { month: 'Feb', revenue: 380000, expenses: 290000 },
  { month: 'Mar', revenue: 510000, expenses: 340000 },
  { month: 'Apr', revenue: 470000, expenses: 320000 },
  { month: 'May', revenue: 540000, expenses: 350000 },
  { month: 'Jun', revenue: 620000, expenses: 380000 },
]

const agingData = [
  { bucket: '0-30', ar: 245000, ap: 180000 },
  { bucket: '31-60', ar: 120000, ap: 90000 },
  { bucket: '61-90', ar: 45000, ap: 30000 },
  { bucket: '90+', ar: 18000, ap: 12000 },
]

export default function ExecutiveDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<Record<string, number>>('/dashboard/stats').catch(() => ({
      revenue: 620000, expenses: 380000, customers: 145, orders: 89,
      outstanding_ar: 428000, outstanding_ap: 312000, products: 234, bots_active: 12,
      prev_revenue: 540000, prev_expenses: 350000, prev_customers: 132, prev_orders: 76,
    })),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  const s = stats || {} as Record<string, number>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Revenue (MTD)" value={s.revenue || 0} previousValue={s.prev_revenue} format="currency" icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Expenses (MTD)" value={s.expenses || 0} previousValue={s.prev_expenses} format="currency" icon={<CreditCard className="h-4 w-4" />} />
        <KPICard title="Active Customers" value={s.customers || 0} previousValue={s.prev_customers} icon={<Users className="h-4 w-4" />} />
        <KPICard title="Open Orders" value={s.orders || 0} previousValue={s.prev_orders} icon={<ShoppingCart className="h-4 w-4" />} />
        <KPICard title="Outstanding AR" value={s.outstanding_ar || 0} format="currency" icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard title="Outstanding AP" value={s.outstanding_ap || 0} format="currency" icon={<AlertCircle className="h-4 w-4" />} />
        <KPICard title="Products" value={s.products || 0} icon={<Package className="h-4 w-4" />} />
        <KPICard title="Active Bots" value={s.bots_active || 0} icon={<Bot className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `R ${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">AR / AP Aging</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="bucket" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `R ${v.toLocaleString()}`} />
                  <Bar dataKey="ar" name="AR" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ap" name="AP" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
