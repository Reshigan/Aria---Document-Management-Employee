import { PageHeader } from '@/components/erp/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Settings } from 'lucide-react'

const botGroups = [
  {
    category: 'Financial',
    bots: [
      { name: 'Invoice Reconciliation', enabled: true, autoApprove: 5000 },
      { name: 'Expense Coding', enabled: true, autoApprove: 2000 },
      { name: 'AR Collections', enabled: false, autoApprove: 0 },
      { name: 'Bank Reconciliation', enabled: true, autoApprove: 10000 },
    ],
  },
  {
    category: 'Procurement',
    bots: [
      { name: 'PO Auto-Approval', enabled: true, autoApprove: 25000 },
      { name: 'Vendor Invoice Match', enabled: true, autoApprove: 5000 },
      { name: 'Stock Reorder', enabled: false, autoApprove: 0 },
    ],
  },
  {
    category: 'HR',
    bots: [
      { name: 'Leave Approval', enabled: true, autoApprove: 0 },
      { name: 'Payroll Processing', enabled: false, autoApprove: 0 },
      { name: 'Attendance Tracking', enabled: true, autoApprove: 0 },
    ],
  },
]

export default function BotConfig() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bot Configuration" description="Configure AI agent settings and auto-approval limits" />

      {botGroups.map((group) => (
        <Card key={group.category}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-gold" />
              {group.category} Bots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {group.bots.map((bot) => (
                <div key={bot.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Switch defaultChecked={bot.enabled} />
                    <div>
                      <p className="text-sm font-medium">{bot.name}</p>
                      <Badge variant={bot.enabled ? 'success' : 'secondary'} className="text-[10px]">
                        {bot.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Auto-approve up to:</Label>
                    <Input type="number" defaultValue={bot.autoApprove} className="w-28 h-8 text-right" />
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button>Save Configuration</Button>
      </div>
    </div>
  )
}
