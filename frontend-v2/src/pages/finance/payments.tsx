import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Payment {
  id: string
  payment_number: string
  supplier_name: string
  date: string
  amount: number
  method: string
  status: string
  reference: string
}

const columns: ColumnDef<Payment, unknown>[] = [
  { accessorKey: 'payment_number', header: 'Payment #' },
  { accessorKey: 'supplier_name', header: 'Supplier' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <AmountDisplay amount={row.original.amount} size="sm" /> },
  { accessorKey: 'method', header: 'Method', cell: ({ row }) => <Badge variant="outline">{row.original.method}</Badge> },
  { accessorKey: 'reference', header: 'Reference' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'completed' ? 'success' : 'draft'}>{row.original.status}</Badge> },
]

export default function Payments() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get<Payment[]>('/ap/payments').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Outgoing payments to suppliers" action={{ label: 'New Payment', onClick: () => navigate('/finance/payments/new') }} />
      <DataTable columns={columns} data={data} searchKey="supplier_name" searchPlaceholder="Search payments..." loading={isLoading} onRowClick={(row) => navigate(`/finance/payments/${row.id}`)} />
    </div>
  )
}
