import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AmountDisplay } from '@/components/erp/amount-display'
import { ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Reconciliation() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bank Reconciliation" description="Match bank transactions with ledger entries" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Bank Balance</p>
            <AmountDisplay amount={1250000} size="lg" className="block mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Ledger Balance</p>
            <AmountDisplay amount={1245000} size="lg" className="block mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Difference</p>
            <AmountDisplay amount={5000} size="lg" className="block mt-1 text-warning" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Unmatched Transactions</CardTitle>
          <Button size="sm" className="gap-1.5"><ArrowLeftRight className="h-3.5 w-3.5" /> Auto-Match</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { desc: 'EFT Payment - ABC Supplies', amount: -12500, date: '2024-03-15', type: 'bank' },
              { desc: 'Customer deposit - XYZ Corp', amount: 45000, date: '2024-03-14', type: 'bank' },
              { desc: 'Bank charges', amount: -350, date: '2024-03-13', type: 'bank' },
              { desc: 'Direct debit - Insurance', amount: -8500, date: '2024-03-12', type: 'bank' },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {tx.amount > 0 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-warning" />}
                  <div>
                    <p className="text-sm font-medium">{tx.desc}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AmountDisplay amount={tx.amount} size="sm" />
                  <Badge variant="outline">{tx.type}</Badge>
                  <Button variant="outline" size="sm">Match</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
