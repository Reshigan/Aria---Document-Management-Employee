import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Receipt {
  id: string
  receipt_number: string
  customer_name: string
  date: string
  amount: number
  method: string
  status: string
  allocated_to: string
}

const columns: ColumnDef<Receipt, unknown>[] = [
  { accessorKey: 'receipt_number', header: 'Receipt #' },
  { accessorKey: 'customer_name', header: 'Customer' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <AmountDisplay amount={row.original.amount} size="sm" /> },
  { accessorKey: 'method', header: 'Method', cell: ({ row }) => <Badge variant="outline">{row.original.method}</Badge> },
  { accessorKey: 'allocated_to', header: 'Allocated To' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'allocated' ? 'success' : 'draft'}>{row.original.status}</Badge> },
]

export default function Receipts() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => api.getList<Receipt>('/ar/receipts').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Receipts" description="Incoming payments from customers" action={{ label: 'New Receipt', onClick: () => navigate('/finance/receipts/new') }} />
      <DataTable columns={columns} data={data} searchKey="customer_name" searchPlaceholder="Search receipts..." loading={isLoading} onRowClick={(row) => navigate(`/finance/receipts/${row.id}`)} />
    </div>
  )
}
