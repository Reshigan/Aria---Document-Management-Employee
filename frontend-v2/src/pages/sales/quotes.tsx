import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Quote {
  id: string
  quote_number: string
  customer_name: string
  date: string
  expiry_date: string
  total: number
  status: string
}

const columns: ColumnDef<Quote, unknown>[] = [
  { accessorKey: 'quote_number', header: 'Quote #' },
  { accessorKey: 'customer_name', header: 'Customer' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'expiry_date', header: 'Expires', cell: ({ row }) => new Date(row.original.expiry_date).toLocaleDateString() },
  { accessorKey: 'total', header: 'Total', cell: ({ row }) => <AmountDisplay amount={row.original.total} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'accepted' ? 'success' : s === 'sent' ? 'posted' : s === 'expired' ? 'overdue' : 'draft'
    return <Badge variant={v as 'success' | 'posted' | 'overdue' | 'draft'}>{s}</Badge>
  }},
]

export default function Quotes() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => api.getList<Quote>('/erp/order-to-cash/quotes').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Quotes" description="Sales quotations" action={{ label: 'New Quote', onClick: () => navigate('/sales/quotes/new') }} />
      <DataTable columns={columns} data={data} searchKey="customer_name" searchPlaceholder="Search quotes..." loading={isLoading} onRowClick={(row) => navigate(`/sales/quotes/${row.id}`)} />
    </div>
  )
}
