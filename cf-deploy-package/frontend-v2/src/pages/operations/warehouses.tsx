import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Warehouse, MapPin } from 'lucide-react'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'

interface WarehouseData {
  id: string
  code: string
  name: string
  location: string
  capacity: number
  utilization: number
  is_active: boolean
}

export default function Warehouses() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.getList<WarehouseData>('/erp/warehouses').catch(() => []),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Warehouses" description="Manage warehouse locations" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" description="Manage warehouse locations" action={{ label: 'Add Warehouse', onClick: () => {} }} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((wh) => (
          <Card key={wh.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/operations/warehouses/${wh.id}`)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-module-manufacturing" />
                  <div>
                    <p className="font-medium">{wh.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{wh.location}</p>
                  </div>
                </div>
                <Badge variant={wh.is_active ? 'success' : 'secondary'}>{wh.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-mono">{wh.utilization}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
