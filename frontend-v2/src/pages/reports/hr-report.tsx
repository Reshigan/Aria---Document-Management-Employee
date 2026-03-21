import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { KPICard } from '@/components/erp/kpi-card'
import { Users, UserMinus, CalendarDays, DollarSign } from 'lucide-react'

export default function HRReport() {
  return (
    <div className="space-y-6">
      <PageHeader title="HR Reports" description="Workforce analytics and insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Employees" value={156} previousValue={148} icon={<Users className="h-4 w-4" />} />
        <KPICard title="Turnover Rate" value={4.2} previousValue={5.1} format="percent" icon={<UserMinus className="h-4 w-4" />} />
        <KPICard title="Avg Leave Days" value={12.5} format="number" icon={<CalendarDays className="h-4 w-4" />} />
        <KPICard title="Payroll Cost" value={2800000} previousValue={2650000} format="currency" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Department Headcount</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { dept: 'Engineering', count: 42, pct: 27 },
                { dept: 'Sales', count: 28, pct: 18 },
                { dept: 'Operations', count: 24, pct: 15 },
                { dept: 'Finance', count: 18, pct: 12 },
                { dept: 'HR', count: 12, pct: 8 },
                { dept: 'Marketing', count: 15, pct: 10 },
                { dept: 'Admin', count: 17, pct: 11 },
              ].map((item) => (
                <div key={item.dept} className="flex items-center justify-between">
                  <span className="text-sm">{item.dept}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-module-hr" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-sm font-mono w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Hires</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Sarah Johnson', dept: 'Engineering', date: '2024-03-10' },
                { name: 'Michael Chen', dept: 'Sales', date: '2024-03-05' },
                { name: 'Priya Patel', dept: 'Operations', date: '2024-02-28' },
                { name: 'James Wilson', dept: 'Finance', date: '2024-02-20' },
              ].map((hire) => (
                <div key={hire.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{hire.name}</p>
                    <p className="text-xs text-muted-foreground">{hire.dept}</p>
                  </div>
                  <span className="text-muted-foreground">{new Date(hire.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
