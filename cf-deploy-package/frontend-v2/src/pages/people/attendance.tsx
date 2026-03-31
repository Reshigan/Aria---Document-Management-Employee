import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface AttendanceRecord {
  id: string
  employee_name: string
  date: string
  check_in: string
  check_out: string
  hours_worked: number
  status: string
}

const columns: ColumnDef<AttendanceRecord, unknown>[] = [
  { accessorKey: 'employee_name', header: 'Employee' },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
  { accessorKey: 'check_in', header: 'Check In' },
  { accessorKey: 'check_out', header: 'Check Out' },
  { accessorKey: 'hours_worked', header: 'Hours', cell: ({ row }) => <span className="font-mono">{row.original.hours_worked.toFixed(1)}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status
    const v = s === 'present' ? 'success' : s === 'absent' ? 'destructive' : s === 'late' ? 'warning' : 'secondary'
    return <Badge variant={v as 'success' | 'destructive' | 'warning' | 'secondary'}>{s}</Badge>
  }},
]

export default function Attendance() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.getList<AttendanceRecord>('/erp/hr/attendance').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Employee attendance tracking" />
      <DataTable columns={columns} data={data} searchKey="employee_name" searchPlaceholder="Search attendance..." loading={isLoading} />
    </div>
  )
}
