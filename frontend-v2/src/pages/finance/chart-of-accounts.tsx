import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: string
  balance: number
  is_active: boolean
}

const columns: ColumnDef<Account, unknown>[] = [
  { accessorKey: 'account_code', header: 'Code' },
  { accessorKey: 'account_name', header: 'Account Name' },
  { accessorKey: 'account_type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.account_type}</Badge> },
  { accessorKey: 'balance', header: 'Balance', cell: ({ row }) => <AmountDisplay amount={row.original.balance} size="sm" /> },
  { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
]

export default function ChartOfAccounts() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => api.getList<Account>('/erp/chart-of-accounts').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Chart of Accounts" description="Manage your account structure" action={{ label: 'New Account', onClick: () => {} }} />
      <DataTable columns={columns} data={data} searchKey="account_name" searchPlaceholder="Search accounts..." loading={isLoading} />
    </div>
  )
}
