import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface Employee {
  id: string
  employee_number: string
  name: string
  email: string
  department: string
  position: string
  hire_date: string
  status: string
}

const columns: ColumnDef<Employee, unknown>[] = [
  { accessorKey: 'employee_number', header: 'Emp #' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'department', header: 'Department', cell: ({ row }) => <Badge variant="outline">{row.original.department}</Badge> },
  { accessorKey: 'position', header: 'Position' },
  { accessorKey: 'hire_date', header: 'Hire Date', cell: ({ row }) => new Date(row.original.hire_date).toLocaleDateString() },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge> },
]

export default function Employees() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/erp/hr/employees').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage employee records" action={{ label: 'New Employee', onClick: () => navigate('/people/employees/new') }} />
      <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search employees..." loading={isLoading} onRowClick={(row) => navigate(`/people/employees/${row.id}`)} />
    </div>
  )
}
