import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number
  previousValue?: number
  format?: 'currency' | 'number' | 'percent'
  currency?: string
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function KPICard({ title, value, previousValue, format = 'number', currency = 'ZAR', icon, className, onClick }: KPICardProps) {
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
  const isPositive = change > 0
  const isNeutral = change === 0

  const formattedValue = format === 'currency'
    ? formatCurrency(value, currency)
    : format === 'percent'
    ? `${value.toFixed(1)}%`
    : formatNumber(value)

  return (
    <Card className={cn('cursor-pointer transition-shadow hover:shadow-md', className)} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold font-mono tabular-nums">{formattedValue}</p>
          {previousValue !== undefined && (
            <span className={cn(
              'flex items-center text-xs font-medium',
              isPositive ? 'text-success' : isNeutral ? 'text-muted-foreground' : 'text-destructive'
            )}>
              {isPositive ? <TrendingUp className="mr-0.5 h-3 w-3" /> : isNeutral ? <Minus className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
