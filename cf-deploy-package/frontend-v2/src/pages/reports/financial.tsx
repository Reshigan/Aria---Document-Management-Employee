import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/erp/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AmountDisplay } from '@/components/erp/amount-display'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'

const incomeData = [
  { month: 'Jan', revenue: 420000, cogs: 280000, gross: 140000 },
  { month: 'Feb', revenue: 380000, cogs: 250000, gross: 130000 },
  { month: 'Mar', revenue: 510000, cogs: 330000, gross: 180000 },
  { month: 'Apr', revenue: 470000, cogs: 300000, gross: 170000 },
  { month: 'May', revenue: 540000, cogs: 350000, gross: 190000 },
  { month: 'Jun', revenue: 620000, cogs: 380000, gross: 240000 },
]

const expenseBreakdown = [
  { name: 'Salaries', value: 180000, color: 'hsl(var(--primary))' },
  { name: 'Rent', value: 45000, color: 'hsl(var(--warning))' },
  { name: 'Utilities', value: 12000, color: 'hsl(var(--success))' },
  { name: 'Marketing', value: 35000, color: 'hsl(var(--destructive))' },
  { name: 'Other', value: 28000, color: 'hsl(var(--muted-foreground))' },
]

export default function FinancialReports() {
  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" description="Income statements, balance sheets, and cash flow" />

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <AmountDisplay amount={2940000} size="lg" className="block mt-1" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total COGS</p>
                <AmountDisplay amount={1890000} size="lg" className="block mt-1" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <AmountDisplay amount={1050000} size="lg" className="block mt-1" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Revenue vs COGS</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `R ${v.toLocaleString()}`} />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cogs" name="COGS" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `R ${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="balance" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Balance sheet report coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Cash flow statement coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
