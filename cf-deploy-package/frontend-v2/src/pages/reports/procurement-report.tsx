import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { KPICard } from '@/components/erp/kpi-card'
import { DollarSign, Truck, ClipboardList, TrendingDown } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const spendData = [
  { month: 'Jan', spend: 210000, pos: 32 },
  { month: 'Feb', spend: 190000, pos: 28 },
  { month: 'Mar', spend: 280000, pos: 41 },
  { month: 'Apr', spend: 240000, pos: 35 },
  { month: 'May', spend: 310000, pos: 44 },
  { month: 'Jun', spend: 270000, pos: 39 },
]

export default function ProcurementReport() {
  return (
    <div className="space-y-6">
      <PageHeader title="Procurement Reports" description="Purchasing spend and supplier analysis" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Spend" value={1500000} previousValue={1380000} format="currency" icon={<DollarSign className="h-4 w-4" />} />
        <KPICard title="Purchase Orders" value={219} previousValue={195} icon={<ClipboardList className="h-4 w-4" />} />
        <KPICard title="Active Suppliers" value={45} previousValue={42} icon={<Truck className="h-4 w-4" />} />
        <KPICard title="Avg PO Value" value={6849} previousValue={7076} format="currency" icon={<TrendingDown className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Procurement Spend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R ${v.toLocaleString()}`} />
                <Bar dataKey="spend" name="Spend" fill="hsl(var(--module-procurement))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
