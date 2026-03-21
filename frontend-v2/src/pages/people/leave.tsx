import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface LeaveRequest {
  id: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string
  status: string
}

const columns: ColumnDef<LeaveRequest, unknown>[] = [
  { accessorKey: 'employee_name', header: 'Employee' },
  { accessorKey: 'leave_type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.leave_type}</Badge> },
  { accessorKey: 'start_date', header: 'Start', cell: ({ row }) => new Date(row.original.start_date).toLocaleDateString() },
  { accessorKey: 'end_date', header: 'End', cell: ({ row }) => new Date(row.original.end_date).toLocaleDateString() },
  { accessorKey: 'days', header: 'Days' },
  { accessorKey: 'reason', header: 'Reason' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'approved' ? 'success' : s === 'rejected' ? 'destructive' : 'warning'
    return <Badge variant={v as 'success' | 'destructive' | 'warning'}>{s}</Badge>
  }},
]

export default function Leave() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => api.get<LeaveRequest[]>('/erp/hr/leave-requests').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" description="Employee leave requests and approvals" action={{ label: 'New Request', onClick: () => {} }} />
      <DataTable columns={columns} data={data} searchKey="employee_name" searchPlaceholder="Search requests..." loading={isLoading} />
    </div>
  )
}
