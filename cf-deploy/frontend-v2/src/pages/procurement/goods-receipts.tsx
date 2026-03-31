import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface GoodsReceipt {
  id: string
  receipt_number: string
  po_number: string
  supplier_name: string
  date: string
  warehouse: string
  items_count: number
  status: string
}

const columns: ColumnDef<GoodsReceipt, unknown>[] = [
  { accessorKey: 'receipt_number', header: 'GR #' },
  { accessorKey: 'po_number', header: 'PO #' },
  { accessorKey: 'supplier_name', header: 'Supplier' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'warehouse', header: 'Warehouse' },
  { accessorKey: 'items_count', header: 'Items' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'posted' ? 'posted' : 'draft'}>{row.original.status}</Badge> },
]

export default function GoodsReceipts() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: () => api.getList<GoodsReceipt>('/erp/procure-to-pay/goods-receipts').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Goods Receipts" description="Inbound goods from suppliers" action={{ label: 'New Receipt', onClick: () => navigate('/procurement/goods-receipts/new') }} />
      <DataTable columns={columns} data={data} searchKey="supplier_name" searchPlaceholder="Search receipts..." loading={isLoading} onRowClick={(row) => navigate(`/procurement/goods-receipts/${row.id}`)} />
    </div>
  )
}
