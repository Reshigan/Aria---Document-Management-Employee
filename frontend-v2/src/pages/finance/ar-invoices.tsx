import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  date: string
  due_date: string
  total: number
  balance_due: number
  status: string
}

const columns: ColumnDef<Invoice, unknown>[] = [
  { accessorKey: 'invoice_number', header: 'Invoice #' },
  { accessorKey: 'customer_name', header: 'Customer' },
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

export default function ARInvoices() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['ar-invoices'],
    queryFn: () => api.get<Invoice[]>('/ar/invoices/customer').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="AR Invoices" description="Customer invoices and receivables" action={{ label: 'New Invoice', onClick: () => navigate('/finance/ar-invoices/new') }} />
      <DataTable columns={columns} data={data} searchKey="customer_name" searchPlaceholder="Search invoices..." loading={isLoading} onRowClick={(row) => navigate(`/finance/ar-invoices/${row.id}`)} />
    </div>
  )
}
