import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface JournalEntry {
  id: string
  entry_number: string
  date: string
  description: string
  total_debit: number
  total_credit: number
  status: string
  created_by: string
}

const columns: ColumnDef<JournalEntry, unknown>[] = [
  { accessorKey: 'entry_number', header: 'Entry #' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'total_debit', header: 'Debit', cell: ({ row }) => <AmountDisplay amount={row.original.total_debit} size="sm" /> },
  { accessorKey: 'total_credit', header: 'Credit', cell: ({ row }) => <AmountDisplay amount={row.original.total_credit} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const v = row.original.status === 'posted' ? 'posted' : row.original.status === 'draft' ? 'draft' : 'default'
    return <Badge variant={v as 'posted' | 'draft' | 'default'}>{row.original.status}</Badge>
  }},
  { accessorKey: 'created_by', header: 'Created By' },
]

export default function JournalEntries() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => api.get<JournalEntry[]>('/erp/journal-entries').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Journal Entries" description="Manual journal entries and adjustments" action={{ label: 'New Entry', onClick: () => navigate('/finance/journal-entries/new') }} />
      <DataTable columns={columns} data={data} searchKey="description" searchPlaceholder="Search entries..." loading={isLoading} onRowClick={(row) => navigate(`/finance/journal-entries/${row.id}`)} />
    </div>
  )
}
