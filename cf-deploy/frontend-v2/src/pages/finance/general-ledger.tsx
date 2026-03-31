import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface GLEntry {
  id: string
  date: string
  account_code: string
  account_name: string
  description: string
  debit: number
  credit: number
  balance: number
  reference: string
  status: string
}

const columns: ColumnDef<GLEntry, unknown>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'account_code', header: 'Account' },
  { accessorKey: 'account_name', header: 'Account Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'reference', header: 'Reference' },
  { accessorKey: 'debit', header: 'Debit', cell: ({ row }) => row.original.debit > 0 ? <AmountDisplay amount={row.original.debit} size="sm" /> : '-' },
  { accessorKey: 'credit', header: 'Credit', cell: ({ row }) => row.original.credit > 0 ? <AmountDisplay amount={row.original.credit} size="sm" /> : '-' },
  { accessorKey: 'balance', header: 'Balance', cell: ({ row }) => <AmountDisplay amount={row.original.balance} size="sm" /> },
]

export default function GeneralLedger() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['general-ledger'],
    queryFn: () => api.getList<GLEntry>('/erp/general-ledger').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="General Ledger" description="View all ledger entries" />
      <DataTable columns={columns} data={data} searchKey="description" searchPlaceholder="Search entries..." loading={isLoading} onRowClick={(row) => navigate(`/finance/general-ledger/${row.id}`)} />
    </div>
  )
}
