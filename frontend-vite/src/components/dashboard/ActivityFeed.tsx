import React from 'react'
import { motion } from 'framer-motion'
import { Upload, Download, Trash2, FileText, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Activity } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'

interface ActivityFeedProps {
  activities: Activity[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'upload':
        return Upload
      case 'download':
        return Download
      case 'delete':
        return Trash2
      case 'process':
        return FileText
      default:
        return FileText
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'upload':
        return 'text-green-600 bg-green-50'
      case 'download':
        return 'text-blue-600 bg-blue-50'
      case 'delete':
        return 'text-red-600 bg-red-50'
      case 'process':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.type)
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Avatar className="w-4 h-4">
                          <AvatarFallback className="text-xs bg-gray-200">
                            {getInitials(activity.user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500">
                          {activity.user}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}