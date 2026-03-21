import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface BOM {
  id: string
  bom_number: string
  product_name: string
  version: string
  components_count: number
  status: string
  created_date: string
}

const columns: ColumnDef<BOM, unknown>[] = [
  { accessorKey: 'bom_number', header: 'BOM #' },
  { accessorKey: 'product_name', header: 'Product' },
  { accessorKey: 'version', header: 'Version' },
  { accessorKey: 'components_count', header: 'Components' },
  { accessorKey: 'created_date', header: 'Created', cell: ({ row }) => new Date(row.original.created_date).toLocaleDateString() },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'draft'}>{row.original.status}</Badge> },
]

export default function BOMs() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: () => api.getList<BOM>('/erp/boms').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Bills of Materials" description="Product recipes and component lists" action={{ label: 'New BOM', onClick: () => navigate('/operations/boms/new') }} />
      <DataTable columns={columns} data={data} searchKey="product_name" searchPlaceholder="Search BOMs..." loading={isLoading} onRowClick={(row) => navigate(`/operations/boms/${row.id}`)} />
    </div>
  )
}
