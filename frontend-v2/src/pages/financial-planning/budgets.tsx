import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

interface Budget {
  id: string
  name: string
  fiscal_year: number
  budget_type: string
  status: string
  total_amount: number
  start_date: string
  end_date: string
  created_at: string
}

const columns: ColumnDef<Budget, unknown>[] = [
  { accessorKey: 'name', header: 'Budget Name' },
  { accessorKey: 'fiscal_year', header: 'Fiscal Year' },
  { accessorKey: 'budget_type', header: 'Type' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={getStatusVariant(row.original.status)}>{row.original.status}</Badge> },
  { accessorKey: 'total_amount', header: 'Total Amount', cell: ({ row }) => <AmountDisplay amount={row.original.total_amount} size="sm" /> },
  { accessorKey: 'start_date', header: 'Start Date', cell: ({ row }) => new Date(row.original.start_date).toLocaleDateString() },
  { accessorKey: 'end_date', header: 'End Date', cell: ({ row }) => new Date(row.original.end_date).toLocaleDateString() },
]

function getStatusVariant(status: string) {
  switch (status) {
    case 'draft': return 'secondary'
    case 'approved': return 'default'
    case 'active': return 'success'
    case 'closed': return 'destructive'
    default: return 'secondary'
  }
}

export default function Budgets() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const { data = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get<{ budgets: Budget[] }>('/new-pages/budgets').then(res => res.budgets || []),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/new-pages/budgets', {
      name: `FY${new Date().getFullYear()} Budget`,
      fiscal_year: new Date().getFullYear(),
      budget_type: 'annual',
      start_date: `${new Date().getFullYear()}-01-01`,
      end_date: `${new Date().getFullYear()}-12-31`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget created successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to create budget: ${error.message || 'Unknown error'}`)
    }
  })

  const handleCreateBudget = () => {
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Budget Management" 
        description="Create and manage financial budgets"
        action={{ 
          label: 'New Budget', 
          onClick: handleCreateBudget,
          icon: createMutation.isPending ? undefined : <Plus className="h-4 w-4" />
        }} 
      />
      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="name" 
        searchPlaceholder="Search budgets..." 
        loading={isLoading} 
        onRowClick={(row) => navigate(`/financial-planning/budgets/${row.id}`)} 
      />
    </div>
  )
}