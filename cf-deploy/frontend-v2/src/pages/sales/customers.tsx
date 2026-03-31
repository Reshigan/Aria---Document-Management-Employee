import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Customer {
  id: string
  customer_code: string
  name: string
  email: string
  phone: string
  city: string
  outstanding_balance: number
  status: string
}

const columns: ColumnDef<Customer, unknown>[] = [
  { accessorKey: 'customer_code', header: 'Code' },
  { accessorKey: 'name', header: 'Customer Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
  { accessorKey: 'city', header: 'City' },
  { accessorKey: 'outstanding_balance', header: 'Outstanding', cell: ({ row }) => <AmountDisplay amount={row.original.outstanding_balance} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge> },
]

export default function Customers() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getList<Customer>('/erp/master-data/customers').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Manage customer accounts" action={{ label: 'New Customer', onClick: () => navigate('/sales/customers/new') }} />
      <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search customers..." loading={isLoading} onRowClick={(row) => navigate(`/sales/customers/${row.id}`)} />
    </div>
  )
}
