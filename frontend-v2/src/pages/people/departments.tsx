import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

interface Department {
  id: string
  name: string
  manager: string
  employee_count: number
  budget: number
}

export default function Departments() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<Department[]>('/erp/hr/departments').catch(() => []),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Departments" description="Organizational structure" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Organizational structure" action={{ label: 'Add Department', onClick: () => {} }} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((dept) => (
          <Card key={dept.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{dept.name}</p>
                <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{dept.employee_count}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Manager: {dept.manager}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
