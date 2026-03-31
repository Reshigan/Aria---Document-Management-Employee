import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BotStatusCardProps {
  name: string
  description: string
  status: 'active' | 'idle' | 'error' | 'running'
  lastRun?: string
  category?: string
  onClick?: () => void
}

const statusConfig = {
  active: { icon: CheckCircle2, color: 'text-success', label: 'Active', badge: 'success' as const },
  idle: { icon: Clock, color: 'text-muted-foreground', label: 'Idle', badge: 'secondary' as const },
  error: { icon: XCircle, color: 'text-destructive', label: 'Error', badge: 'destructive' as const },
  running: { icon: AlertCircle, color: 'text-warning', label: 'Running', badge: 'warning' as const },
}

export function BotStatusCard({ name, description, status, lastRun, category, onClick }: BotStatusCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className={cn('cursor-pointer transition-all hover:shadow-md', onClick && 'hover:border-primary/30')} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-gold/10 p-2">
              <Bot className="h-4 w-4 text-gold" />
            </div>
            <div>
              <p className="text-sm font-medium">{name}</p>
              {category && <p className="text-xs text-muted-foreground">{category}</p>}
            </div>
          </div>
          <Badge variant={config.badge} className="gap-1">
            <StatusIcon className={cn('h-3 w-3', config.color)} />
            {config.label}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{description}</p>
        {lastRun && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last run: {lastRun}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
