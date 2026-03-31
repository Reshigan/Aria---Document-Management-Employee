import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { DataTable } from '@/components/erp/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import api from '@/lib/api'
import type { ColumnDef } from '@tanstack/react-table'

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  last_login: string
  status: string
}

const columns: ColumnDef<User, unknown>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(row.original.name)}</AvatarFallback></Avatar>
      <div>
        <p className="text-sm font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    </div>
  )},
  { accessorKey: 'role', header: 'Role', cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge> },
  { accessorKey: 'department', header: 'Department' },
  { accessorKey: 'last_login', header: 'Last Login', cell: ({ row }) => row.original.last_login ? new Date(row.original.last_login).toLocaleDateString() : 'Never' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge> },
]

export default function Users() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getList<User>('/admin/users').catch(() => []),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Manage user accounts and permissions" action={{ label: 'Invite User', onClick: () => {} }} />
      <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search users..." loading={isLoading} />
    </div>
  )
}
