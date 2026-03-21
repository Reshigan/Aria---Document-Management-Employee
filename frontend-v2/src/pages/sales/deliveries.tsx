import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Delivery {
  id: string
  delivery_number: string
  order_number: string
  customer_name: string
  date: string
  status: string
  items_count: number
}

const columns: ColumnDef<Delivery, unknown>[] = [
  { accessorKey: 'delivery_number', header: 'Delivery #' },
  { accessorKey: 'order_number', header: 'Order #' },
  { accessorKey: 'customer_name', header: 'Customer' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'items_count', header: 'Items' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'delivered' ? 'success' : s === 'shipped' ? 'posted' : s === 'cancelled' ? 'cancelled' : 'draft'
    return <Badge variant={v as 'success' | 'posted' | 'cancelled' | 'draft'}>{s}</Badge>
  }},
]

export default function Deliveries() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => api.getList<Delivery>('/erp/order-to-cash/deliveries').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Deliveries" description="Outbound deliveries" action={{ label: 'New Delivery', onClick: () => navigate('/sales/deliveries/new') }} />
      <DataTable columns={columns} data={data} searchKey="customer_name" searchPlaceholder="Search deliveries..." loading={isLoading} onRowClick={(row) => navigate(`/sales/deliveries/${row.id}`)} />
    </div>
  )
}
