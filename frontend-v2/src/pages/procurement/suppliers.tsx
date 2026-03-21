import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Supplier {
  id: string
  supplier_code: string
  name: string
  email: string
  phone: string
  city: string
  bbbee_level: number
  outstanding_balance: number
  status: string
}

const columns: ColumnDef<Supplier, unknown>[] = [
  { accessorKey: 'supplier_code', header: 'Code' },
  { accessorKey: 'name', header: 'Supplier Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
  { accessorKey: 'city', header: 'City' },
  { accessorKey: 'bbbee_level', header: 'BBBEE', cell: ({ row }) => row.original.bbbee_level ? <Badge variant="gold">Level {row.original.bbbee_level}</Badge> : '-' },
  { accessorKey: 'outstanding_balance', header: 'Outstanding', cell: ({ row }) => <AmountDisplay amount={row.original.outstanding_balance} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge> },
]

export default function Suppliers() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<Supplier[]>('/erp/master-data/suppliers').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage supplier accounts" action={{ label: 'New Supplier', onClick: () => navigate('/procurement/suppliers/new') }} />
      <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search suppliers..." loading={isLoading} onRowClick={(row) => navigate(`/procurement/suppliers/${row.id}`)} />
    </div>
  )
}
