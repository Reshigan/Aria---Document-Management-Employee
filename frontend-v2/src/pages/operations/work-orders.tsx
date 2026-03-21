import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface WorkOrder {
  id: string
  wo_number: string
  product_name: string
  quantity: number
  start_date: string
  due_date: string
  progress: number
  status: string
}

const columns: ColumnDef<WorkOrder, unknown>[] = [
  { accessorKey: 'wo_number', header: 'WO #' },
  { accessorKey: 'product_name', header: 'Product' },
  { accessorKey: 'quantity', header: 'Qty' },
  { accessorKey: 'start_date', header: 'Start', cell: ({ row }) => new Date(row.original.start_date).toLocaleDateString() },
  { accessorKey: 'due_date', header: 'Due', cell: ({ row }) => new Date(row.original.due_date).toLocaleDateString() },
  { accessorKey: 'progress', header: 'Progress', cell: ({ row }) => <span className="font-mono">{row.original.progress}%</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'completed' ? 'success' : s === 'in_progress' ? 'posted' : s === 'cancelled' ? 'cancelled' : 'draft'
    return <Badge variant={v as 'success' | 'posted' | 'cancelled' | 'draft'}>{s}</Badge>
  }},
]

export default function WorkOrders() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => api.getList<WorkOrder>('/erp/work-orders').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Work Orders" description="Manufacturing work orders" action={{ label: 'New Work Order', onClick: () => navigate('/operations/work-orders/new') }} />
      <DataTable columns={columns} data={data} searchKey="product_name" searchPlaceholder="Search work orders..." loading={isLoading} onRowClick={(row) => navigate(`/operations/work-orders/${row.id}`)} />
    </div>
  )
}
