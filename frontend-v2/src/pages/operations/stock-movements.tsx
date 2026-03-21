import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface StockMovement {
  id: string
  movement_number: string
  product_name: string
  from_warehouse: string
  to_warehouse: string
  quantity: number
  date: string
  type: string
  status: string
}

const columns: ColumnDef<StockMovement, unknown>[] = [
  { accessorKey: 'movement_number', header: 'Movement #' },
  { accessorKey: 'product_name', header: 'Product' },
  { accessorKey: 'from_warehouse', header: 'From' },
  { accessorKey: 'to_warehouse', header: 'To' },
  { accessorKey: 'quantity', header: 'Qty' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'completed' ? 'success' : 'draft'}>{row.original.status}</Badge> },
]

export default function StockMovements() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => api.getList<StockMovement>('/erp/stock-movements').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movements" description="Track inventory transfers and adjustments" action={{ label: 'New Transfer', onClick: () => {} }} />
      <DataTable columns={columns} data={data} searchKey="product_name" searchPlaceholder="Search movements..." loading={isLoading} />
    </div>
  )
}
