import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_name: string
  date: string
  delivery_date: string
  total: number
  status: string
}

const columns: ColumnDef<PurchaseOrder, unknown>[] = [
  { accessorKey: 'po_number', header: 'PO #' },
  { accessorKey: 'supplier_name', header: 'Supplier' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'delivery_date', header: 'Expected', cell: ({ row }) => new Date(row.original.delivery_date).toLocaleDateString() },
  { accessorKey: 'total', header: 'Total', cell: ({ row }) => <AmountDisplay amount={row.original.total} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'received' ? 'success' : s === 'approved' ? 'posted' : s === 'cancelled' ? 'cancelled' : 'draft'
    return <Badge variant={v as 'success' | 'posted' | 'cancelled' | 'draft'}>{s}</Badge>
  }},
]

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get<PurchaseOrder[]>('/erp/procure-to-pay/purchase-orders').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" description="Manage purchase orders" action={{ label: 'New PO', onClick: () => navigate('/procurement/purchase-orders/new') }} />
      <DataTable columns={columns} data={data} searchKey="supplier_name" searchPlaceholder="Search POs..." loading={isLoading} onRowClick={(row) => navigate(`/procurement/purchase-orders/${row.id}`)} />
    </div>
  )
}
