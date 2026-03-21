import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit_price: number
  stock_on_hand: number
  reorder_point: number
  status: string
}

const columns: ColumnDef<Product, unknown>[] = [
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'name', header: 'Product Name' },
  { accessorKey: 'category', header: 'Category', cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge> },
  { accessorKey: 'unit_price', header: 'Price', cell: ({ row }) => <AmountDisplay amount={row.original.unit_price} size="sm" /> },
  { accessorKey: 'stock_on_hand', header: 'Stock', cell: ({ row }) => {
    const low = row.original.stock_on_hand <= row.original.reorder_point
    return <span className={low ? 'text-destructive font-medium' : ''}>{row.original.stock_on_hand}</span>
  }},
  { accessorKey: 'reorder_point', header: 'Reorder Pt' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge> },
]

export default function Products() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getList<Product>('/erp/order-to-cash/products').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Product catalog management" action={{ label: 'New Product', onClick: () => navigate('/operations/products/new') }} />
      <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search products..." loading={isLoading} onRowClick={(row) => navigate(`/operations/products/${row.id}`)} />
    </div>
  )
}
