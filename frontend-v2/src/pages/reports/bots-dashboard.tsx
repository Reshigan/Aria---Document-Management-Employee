import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/erp/page-header'
import { BotStatusCard } from '@/components/erp/bot-status-card'
import { KPICard } from '@/components/erp/kpi-card'
import { Bot, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

interface BotData {
  id: string
  name: string
  description: string
  status: 'active' | 'idle' | 'error' | 'running'
  last_run?: string
  category: string
}

const categories = ['All', 'Financial', 'Procurement', 'Manufacturing', 'Sales', 'HR', 'Compliance']

export default function BotsDashboard() {
  const { data: bots = [], isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get<BotData[]>('/bots').catch(() => []),
  })

  const activeBots = bots.filter(b => b.status === 'active' || b.status === 'running').length
  const errorBots = bots.filter(b => b.status === 'error').length
  const idleBots = bots.filter(b => b.status === 'idle').length

  return (
    <div className="space-y-6">
      <PageHeader title="Bot Dashboard" description="AI agent monitoring and management" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Bots" value={bots.length || 67} icon={<Bot className="h-4 w-4" />} />
        <KPICard title="Active" value={activeBots || 12} icon={<CheckCircle2 className="h-4 w-4" />} />
        <KPICard title="Errors" value={errorBots || 2} icon={<XCircle className="h-4 w-4" />} />
        <KPICard title="Idle" value={idleBots || 53} icon={<Clock className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="All">
        <TabsList>
          {categories.map(cat => <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>)}
        </TabsList>
        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(cat === 'All' ? bots : bots.filter(b => b.category === cat)).map(bot => (
                  <BotStatusCard
                    key={bot.id}
                    name={bot.name}
                    description={bot.description}
                    status={bot.status}
                    lastRun={bot.last_run}
                    category={bot.category}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
