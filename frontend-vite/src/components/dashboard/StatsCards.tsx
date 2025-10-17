import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments.toLocaleString(),
      icon: FileText,
      color: 'blue',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Processing',
      value: stats.processingDocuments.toLocaleString(),
      icon: Clock,
      color: 'yellow',
      change: '-5%',
      changeType: 'negative' as const,
    },
    {
      title: 'Completed',
      value: stats.completedDocuments.toLocaleString(),
      icon: CheckCircle,
      color: 'green',
      change: '+18%',
      changeType: 'positive' as const,
    },
    {
      title: 'Failed',
      value: stats.failedDocuments.toLocaleString(),
      icon: AlertCircle,
      color: 'red',
      change: '-2%',
      changeType: 'positive' as const,
    },
  ]

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200',
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      border: 'border-yellow-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      border: 'border-red-200',
    },
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        const colors = colorClasses[card.color as keyof typeof colorClasses]
        
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="card-hover border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                  <Icon className={`w-4 h-4 ${colors.icon}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </div>
                <div className="flex items-center text-xs">
                  <TrendingUp className={`w-3 h-3 mr-1 ${
                    card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <span className={
                    card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }>
                    {card.change}
                  </span>
                  <span className="text-gray-500 ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}