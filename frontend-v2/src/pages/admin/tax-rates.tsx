import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface TaxRate {
  id: string
  name: string
  code: string
  rate: number
  type: string
  is_active: boolean
}

const columns: ColumnDef<TaxRate, unknown>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Tax Name' },
  { accessorKey: 'rate', header: 'Rate', cell: ({ row }) => <span className="font-mono">{row.original.rate}%</span> },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge> },
  { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
]

export default function TaxRates() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: () => api.get<TaxRate[]>('/erp/tax-rates').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Tax Rates" description="Manage VAT and other tax configurations" action={{ label: 'Add Tax Rate', onClick: () => {} }} />
      <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search tax rates..." loading={isLoading} />
    </div>
  )
}
