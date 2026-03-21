import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface PayrollRun {
  id: string
  run_number: string
  period: string
  employees_count: number
  gross_total: number
  net_total: number
  deductions: number
  status: string
  run_date: string
}

const columns: ColumnDef<PayrollRun, unknown>[] = [
  { accessorKey: 'run_number', header: 'Run #' },
  { accessorKey: 'period', header: 'Period' },
  { accessorKey: 'run_date', header: 'Run Date', cell: ({ row }) => new Date(row.original.run_date).toLocaleDateString() },
  { accessorKey: 'employees_count', header: 'Employees' },
  { accessorKey: 'gross_total', header: 'Gross', cell: ({ row }) => <AmountDisplay amount={row.original.gross_total} size="sm" /> },
  { accessorKey: 'deductions', header: 'Deductions', cell: ({ row }) => <AmountDisplay amount={row.original.deductions} size="sm" /> },
  { accessorKey: 'net_total', header: 'Net', cell: ({ row }) => <AmountDisplay amount={row.original.net_total} size="sm" /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'completed' ? 'success' : s === 'processing' ? 'warning' : 'draft'
    return <Badge variant={v as 'success' | 'warning' | 'draft'}>{s}</Badge>
  }},
]

export default function Payroll() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => api.getList<PayrollRun>('/erp/payroll/runs').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Runs" description="Monthly payroll processing" action={{ label: 'New Run', onClick: () => navigate('/people/payroll/new') }} />
      <DataTable columns={columns} data={data} searchKey="period" searchPlaceholder="Search runs..." loading={isLoading} onRowClick={(row) => navigate(`/people/payroll/${row.id}`)} />
    </div>
  )
}
