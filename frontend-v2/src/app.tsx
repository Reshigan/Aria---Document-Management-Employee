'use client'

import { useState, useEffect } from 'react'
import { HolographicLayout } from '@/components/layout/holographic-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  DollarSign,
  ShoppingCart,
  Package
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Mock data for demonstration
const mockKPIs = [
  { title: "Revenue", value: "$124,560", change: "+12.3%", icon: DollarSign, color: "text-green-500" },
  { title: "Orders", value: "1,243", change: "+8.2%", icon: ShoppingCart, color: "text-blue-500" },
  { title: "Inventory", value: "89%", change: "-2.1%", icon: Package, color: "text-amber-500" },
  { title: "Customers", value: "5,672", change: "+5.7%", icon: Users, color: "text-purple-500" },
]

const mockAlerts = [
  { id: 1, title: "Inventory Low", description: "Product SKU-12345 below threshold", priority: "high", time: "2 min ago" },
  { id: 2, title: "Payment Received", description: "Customer payment of $2,450 processed", priority: "medium", time: "15 min ago" },
  { id: 3, title: "Order Shipped", description: "Order #ORD-7890 dispatched", priority: "low", time: "1 hour ago" },
]

const mockBots = [
  { name: "Finance Analyst", status: "active", tasks: 12 },
  { name: "Inventory Manager", status: "processing", tasks: 8 },
  { name: "Customer Insights", status: "idle", tasks: 0 },
]

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <HolographicLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time overview of business operations • Last updated: {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Zap className="mr-2 h-4 w-4" />
              AI Insights
            </Button>
            <Button>
              <Bot className="mr-2 h-4 w-4" />
              Activate Bots
            </Button>
          </div>
        </div>

        {/* KPI Cards - Revolutionary Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockKPIs.map((kpi, index) => {
            const Icon = kpi.icon
            return (
              <motion.div
                key={kpi.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gradient-to-br from-secondary/50 to-background border-border hover:shadow-lg transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                    <Icon className={cn("h-5 w-5", kpi.color)} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <p className={cn("text-xs", kpi.change.startsWith('+') ? "text-green-500" : "text-red-500")}>
                      {kpi.change} from last month
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                System Alerts
              </CardTitle>
              <CardDescription>Recent notifications and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className={cn(
                      "h-3 w-3 rounded-full mt-1.5",
                      alert.priority === "high" ? "bg-red-500" : 
                      alert.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={alert.priority === "high" ? "destructive" : "secondary"}>
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                    <Button variant="ghost" size="sm">Resolve</Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bot Status Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-500" />
                AI Bot Status
              </CardTitle>
              <CardDescription>Intelligent automation agents monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockBots.map((bot, index) => (
                  <motion.div
                    key={bot.name}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-3 w-3 rounded-full",
                        bot.status === "active" ? "bg-green-500" :
                        bot.status === "processing" ? "bg-blue-500 animate-pulse" : "bg-gray-500"
                      )} />
                      <div>
                        <p className="font-medium text-sm">{bot.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bot.tasks > 0 ? `${bot.tasks} active tasks` : "Standby"}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Manage</Button>
                  </motion.div>
                ))}
                
                <div className="pt-4 border-t border-border">
                  <Button className="w-full">
                    <Bot className="mr-2 h-4 w-4" />
                    Launch New Bot Assistant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Performance Insights
            </CardTitle>
            <CardDescription>AI-powered business intelligence and predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Opportunities
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Q4 sales projection 15% above target</li>
                  <li>• Customer retention rate improving</li>
                  <li>• New market segment showing growth</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Risks
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Inventory levels low for 3 products</li>
                  <li>• Payment delays from 2 major clients</li>
                  <li>• Supplier lead times increasing</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Recommendations
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Increase procurement for high-demand SKUs</li>
                  <li>• Contact delayed payment customers</li>
                  <li>• Review supplier contracts this quarter</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HolographicLayout>
  )
}