import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StatusPipelineProps {
  stages: string[]
  currentStage: string
  className?: string
  onStageClick?: (stage: string) => void
}

export function StatusPipeline({ stages, currentStage, className, onStageClick }: StatusPipelineProps) {
  const currentIndex = stages.indexOf(currentStage)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = index > currentIndex

        return (
          <div key={stage} className="flex items-center gap-1 flex-1">
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                isCompleted && 'bg-success/10 text-success',
                isCurrent && 'bg-primary/10 text-primary ring-1 ring-primary/30',
                isFuture && 'bg-muted text-muted-foreground',
                onStageClick && 'cursor-pointer hover:opacity-80'
              )}
              onClick={() => onStageClick?.(stage)}
            >
              {isCompleted && <Check className="h-3 w-3" />}
              {stage}
            </button>
            {index < stages.length - 1 && (
              <div className={cn(
                'h-px flex-1 min-w-4',
                index < currentIndex ? 'bg-success' : 'bg-border'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
