import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { KPICard } from '@/components/erp/kpi-card'
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const salesTrend = [
  { month: 'Jan', sales: 320000, orders: 45 },
  { month: 'Feb', sales: 290000, orders: 38 },
  { month: 'Mar', sales: 410000, orders: 52 },
  { month: 'Apr', sales: 380000, orders: 48 },
  { month: 'May', sales: 450000, orders: 56 },
  { month: 'Jun', sales: 520000, orders: 62 },
]

export default function SalesReport() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sales Reports" description="Sales performance and trends" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Sales" value={2370000} previousValue={2100000} format="currency" icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Total Orders" value={301} previousValue={265} icon={<ShoppingCart className="h-4 w-4" />} />
        <KPICard title="New Customers" value={28} previousValue={22} icon={<Users className="h-4 w-4" />} />
        <KPICard title="Avg Order Value" value={7874} previousValue={7924} format="currency" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Sales Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R ${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--module-sales))" strokeWidth={2} dot={{ fill: 'hsl(var(--module-sales))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
