import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Factory, Wrench, Package, Clock } from 'lucide-react'
import { KPICard } from '@/components/erp/kpi-card'

export default function Manufacturing() {
  return (
    <div className="space-y-6">
      <PageHeader title="Manufacturing" description="Production overview and scheduling" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Work Orders" value={12} icon={<Wrench className="h-4 w-4" />} />
        <KPICard title="Products in Progress" value={8} icon={<Factory className="h-4 w-4" />} />
        <KPICard title="Completed Today" value={5} icon={<Package className="h-4 w-4" />} />
        <KPICard title="Avg Lead Time" value={3.2} format="number" icon={<Clock className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Production Runs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { product: 'Widget A', wo: 'WO-2024-0045', progress: 75, status: 'in_progress' },
              { product: 'Assembly B', wo: 'WO-2024-0046', progress: 45, status: 'in_progress' },
              { product: 'Component C', wo: 'WO-2024-0047', progress: 90, status: 'in_progress' },
              { product: 'Module D', wo: 'WO-2024-0048', progress: 20, status: 'in_progress' },
            ].map((run) => (
              <div key={run.wo} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{run.product}</p>
                    <Badge variant="outline">{run.wo}</Badge>
                  </div>
                  <Progress value={run.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{run.progress}% complete</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
