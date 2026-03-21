import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AmountDisplay } from '@/components/erp/amount-display'
import { Landmark } from 'lucide-react'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  account_type: string
  currency: string
  balance: number
  is_active: boolean
}

export default function BankAccounts() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get<BankAccount[]>('/banking/accounts').catch(() => []),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bank Accounts" description="Manage company bank accounts" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bank Accounts" description="Manage company bank accounts" action={{ label: 'Add Account', onClick: () => {} }} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((account) => (
          <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/finance/bank-accounts/${account.id}`)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-module-finance" />
                  <div>
                    <p className="font-medium">{account.bank_name}</p>
                    <p className="text-xs text-muted-foreground">{account.account_number}</p>
                  </div>
                </div>
                <Badge variant={account.is_active ? 'success' : 'secondary'}>
                  {account.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{account.account_type}</Badge>
                <AmountDisplay amount={account.balance} currency={account.currency} size="lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
