import { formatDate } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface AuditEntry {
  id: string
  user: string
  action: string
  details?: string
  timestamp: string
}

interface AuditTrailProps {
  entries: AuditEntry[]
}

export function AuditTrail({ entries }: AuditTrailProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{getInitials(entry.user)}</AvatarFallback>
            </Avatar>
            {index < entries.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">{entry.user}</p>
              <time className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</time>
            </div>
            <p className="text-sm text-muted-foreground">{entry.action}</p>
            {entry.details && (
              <p className="mt-1 text-xs text-muted-foreground bg-muted rounded px-2 py-1">{entry.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
