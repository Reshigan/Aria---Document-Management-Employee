import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Compliance() {
  return (
    <div className="space-y-6">
      <PageHeader title="Compliance" description="SARS, BBBEE, and regulatory compliance" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'VAT201 Filing', status: 'due_soon', due: '2024-03-25', icon: FileText },
          { title: 'EMP201 Filing', status: 'completed', due: '2024-02-28', icon: FileText },
          { title: 'BBBEE Certificate', status: 'valid', due: '2025-06-30', icon: Shield },
          { title: 'Annual Returns', status: 'pending', due: '2024-06-30', icon: FileText },
          { title: 'Tax Clearance', status: 'valid', due: '2025-01-15', icon: Shield },
          { title: 'COIDA', status: 'completed', due: '2024-03-31', icon: Shield },
        ].map((item) => {
          const Icon = item.icon
          const statusConfig: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
            completed: { variant: 'success', label: 'Completed' },
            valid: { variant: 'success', label: 'Valid' },
            due_soon: { variant: 'warning', label: 'Due Soon' },
            pending: { variant: 'secondary', label: 'Pending' },
            overdue: { variant: 'destructive', label: 'Overdue' },
          }
          const config = statusConfig[item.status] || statusConfig.pending

          return (
            <Card key={item.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-module-admin" />
                    <p className="font-medium">{item.title}</p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Due: {new Date(item.due).toLocaleDateString()}</p>
                {item.status === 'due_soon' && (
                  <Button size="sm" className="mt-2 w-full">File Now</Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
