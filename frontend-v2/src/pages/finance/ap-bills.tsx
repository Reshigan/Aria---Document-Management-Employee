import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Bill {
  id: string
  bill_number: string
  supplier_name: string
  date: string
  due_date: string
  total: number
  balance_due: number
  status: string
}

const columns: ColumnDef<Bill, unknown>[] = [
  { accessorKey: 'bill_number', header: 'Bill #' },
  { accessorKey: 'supplier_name', header: 'Supplier' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'due_date', header: 'Due Date', cell: ({ row }) => new Date(row.original.due_date).toLocaleDateString() },
  { accessorKey: 'total', header: 'Total', cell: ({ row }) => <AmountDisplay amount={row.original.total} size="sm" /> },
  { accessorKey: 'balance_due', header: 'Balance Due', cell: ({ row }) => <AmountDisplay amount={row.original.balance_due} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'paid' ? 'paid' : s === 'overdue' ? 'overdue' : s === 'posted' ? 'posted' : 'draft'
    return <Badge variant={v as 'paid' | 'overdue' | 'posted' | 'draft'}>{s}</Badge>
  }},
]

export default function APBills() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['ap-bills'],
    queryFn: () => api.get<Bill[]>('/ap/invoices').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="AP Bills" description="Supplier bills and payables" action={{ label: 'New Bill', onClick: () => navigate('/finance/ap-bills/new') }} />
      <DataTable columns={columns} data={data} searchKey="supplier_name" searchPlaceholder="Search bills..." loading={isLoading} onRowClick={(row) => navigate(`/finance/ap-bills/${row.id}`)} />
    </div>
  )
}
