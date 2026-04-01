import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Asset {
  id: string
  asset_code: string
  asset_name: string
  category: string
  purchase_date: string
  purchase_price: number
  current_value: number
  depreciation_method: string
  useful_life_years: number
  location: string
  status: string
}

const columns: ColumnDef<Asset, unknown>[] = [
  { accessorKey: 'asset_code', header: 'Asset Code' },
  { accessorKey: 'asset_name', header: 'Asset Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'purchase_date', header: 'Purchase Date', cell: ({ row }) => new Date(row.original.purchase_date).toLocaleDateString() },
  { accessorKey: 'purchase_price', header: 'Purchase Price', cell: ({ row }) => <AmountDisplay amount={row.original.purchase_price} size="sm" /> },
  { accessorKey: 'current_value', header: 'Current Value', cell: ({ row }) => <AmountDisplay amount={row.original.current_value} size="sm" /> },
  { accessorKey: 'depreciation_method', header: 'Depreciation Method' },
  { accessorKey: 'useful_life_years', header: 'Useful Life (Yrs)' },
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={getStatusVariant(row.original.status)}>{row.original.status}</Badge> },
]

function getStatusVariant(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'disposed': return 'destructive'
    case 'fully_depreciated': return 'secondary'
    default: return 'default'
  }
}

export default function Assets() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get<{ assets: Asset[] }>('/new-pages/assets').then(res => res.assets || []),
  })

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fixed Assets" 
        description="Manage company fixed assets and depreciation"
        action={{ label: 'New Asset', onClick: () => {}, disabled: true }} 
      />
      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="asset_name" 
        searchPlaceholder="Search assets..." 
        loading={isLoading} 
        onRowClick={(row) => navigate(`/financial-planning/assets/${row.id}`)} 
      />
    </div>
  )
}