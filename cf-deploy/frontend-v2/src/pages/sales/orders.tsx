import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface SalesOrder {
  id: string
  order_number: string
  customer_name: string
  date: string
  delivery_date: string
  total: number
  status: string
}

const columns: ColumnDef<SalesOrder, unknown>[] = [
  { accessorKey: 'order_number', header: 'Order #' },
  { accessorKey: 'customer_name', header: 'Customer' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'delivery_date', header: 'Delivery Date', cell: ({ row }) => new Date(row.original.delivery_date).toLocaleDateString() },
  { accessorKey: 'total', header: 'Total', cell: ({ row }) => <AmountDisplay amount={row.original.total} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'delivered' ? 'success' : s === 'confirmed' ? 'posted' : s === 'cancelled' ? 'cancelled' : 'draft'
    return <Badge variant={v as 'success' | 'posted' | 'cancelled' | 'draft'}>{s}</Badge>
  }},
]

export default function SalesOrders() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: () => api.getList<SalesOrder>('/erp/order-to-cash/sales-orders').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Orders" description="Manage sales orders" action={{ label: 'New Order', onClick: () => navigate('/sales/orders/new') }} />
      <DataTable columns={columns} data={data} searchKey="customer_name" searchPlaceholder="Search orders..." loading={isLoading} onRowClick={(row) => navigate(`/sales/orders/${row.id}`)} />
    </div>
  )
}
