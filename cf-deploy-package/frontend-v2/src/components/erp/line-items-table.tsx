import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { AmountDisplay } from './amount-display'

export interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

interface LineItemsTableProps {
  items: LineItem[]
  onAdd?: () => void
  onRemove?: (id: string) => void
  onChange?: (id: string, field: keyof LineItem, value: string | number) => void
  readOnly?: boolean
  currency?: string
}

export function LineItemsTable({ items, onAdd, onRemove, onChange, readOnly = false, currency = 'ZAR' }: LineItemsTableProps) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0)
  const grandTotal = subtotal + taxTotal

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="text-right w-[12%]">Qty</TableHead>
            <TableHead className="text-right w-[15%]">Unit Price</TableHead>
            <TableHead className="text-right w-[10%]">Tax %</TableHead>
            <TableHead className="text-right w-[15%]">Total</TableHead>
            {!readOnly && <TableHead className="w-[8%]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {readOnly ? item.description : (
                  <Input value={item.description} onChange={(e) => onChange?.(item.id, 'description', e.target.value)} className="h-8" />
                )}
              </TableCell>
              <TableCell className="text-right">
                {readOnly ? item.quantity : (
                  <Input type="number" value={item.quantity} onChange={(e) => onChange?.(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 text-right" />
                )}
              </TableCell>
              <TableCell className="text-right">
                {readOnly ? <AmountDisplay amount={item.unitPrice} currency={currency} size="sm" /> : (
                  <Input type="number" value={item.unitPrice} onChange={(e) => onChange?.(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-right" step="0.01" />
                )}
              </TableCell>
              <TableCell className="text-right">
                {readOnly ? `${item.taxRate}%` : (
                  <Input type="number" value={item.taxRate} onChange={(e) => onChange?.(item.id, 'taxRate', parseFloat(e.target.value) || 0)} className="h-8 text-right" />
                )}
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay amount={item.quantity * item.unitPrice * (1 + item.taxRate / 100)} currency={currency} size="sm" />
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove?.(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={readOnly ? 3 : 3}>Subtotal</TableCell>
            <TableCell className="text-right" colSpan={readOnly ? 2 : 3}>
              <AmountDisplay amount={subtotal} currency={currency} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={readOnly ? 3 : 3}>Tax</TableCell>
            <TableCell className="text-right" colSpan={readOnly ? 2 : 3}>
              <AmountDisplay amount={taxTotal} currency={currency} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={readOnly ? 3 : 3} className="font-semibold">Total</TableCell>
            <TableCell className="text-right" colSpan={readOnly ? 2 : 3}>
              <AmountDisplay amount={grandTotal} currency={currency} size="lg" />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      {!readOnly && onAdd && (
        <Button variant="outline" size="sm" onClick={onAdd} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Line
        </Button>
      )}
    </div>
  )
}
