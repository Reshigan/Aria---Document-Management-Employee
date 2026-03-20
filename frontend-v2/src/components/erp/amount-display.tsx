import { cn, formatCurrency } from '@/lib/utils'

interface AmountDisplayProps {
  amount: number
  currency?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AmountDisplay({ amount, currency = 'ZAR', className, size = 'md' }: AmountDisplayProps) {
  const isNegative = amount < 0

  return (
    <span
      className={cn(
        'font-mono tabular-nums text-right',
        isNegative ? 'text-destructive' : 'text-foreground',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-lg font-semibold',
        className
      )}
    >
      {formatCurrency(amount, currency)}
    </span>
  )
}
