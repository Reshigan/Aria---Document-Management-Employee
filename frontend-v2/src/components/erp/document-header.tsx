import { ArrowLeft, Printer, Mail, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from './amount-display'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface DocumentHeaderProps {
  docNumber: string
  status: string
  statusVariant?: 'draft' | 'posted' | 'paid' | 'overdue' | 'cancelled' | 'default'
  entity?: string
  total?: number
  currency?: string
  onEdit?: () => void
  onPrint?: () => void
  onEmail?: () => void
  actions?: Array<{ label: string; onClick: () => void }>
}

export function DocumentHeader({
  docNumber, status, statusVariant = 'default', entity, total,
  currency, onEdit, onPrint, onEmail, actions = []
}: DocumentHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{docNumber}</h1>
            <Badge variant={statusVariant}>{status}</Badge>
          </div>
          {entity && <p className="text-sm text-muted-foreground">{entity}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {total !== undefined && <AmountDisplay amount={total} currency={currency} size="lg" />}
        {onEdit && <Button variant="outline" onClick={onEdit}>Edit</Button>}
        {onPrint && <Button variant="ghost" size="icon" onClick={onPrint}><Printer className="h-4 w-4" /></Button>}
        {onEmail && <Button variant="ghost" size="icon" onClick={onEmail}><Mail className="h-4 w-4" /></Button>}
        {actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) => (
                <DropdownMenuItem key={action.label} onClick={action.onClick}>{action.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
