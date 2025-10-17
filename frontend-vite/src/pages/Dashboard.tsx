import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import StatsCards from '@/components/dashboard/StatsCards'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import type { DashboardStats } from '@/types'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 1247,
    processingDocuments: 23,
    completedDocuments: 1198,
    failedDocuments: 26,
    storageUsed: 15.7 * 1024 * 1024 * 1024, // 15.7 GB in bytes
    storageLimit: 50 * 1024 * 1024 * 1024, // 50 GB in bytes
    recentActivity: [
      {
        id: '1',
        type: 'upload',
        description: 'Uploaded invoice_2024_001.pdf',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        user: 'John Doe',
        documentId: 'doc_1',
      },
      {
        id: '2',
        type: 'process',
        description: 'Processed contract_renewal.docx',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        user: 'Jane Smith',
        documentId: 'doc_2',
      },
      {
        id: '3',
        type: 'download',
        description: 'Downloaded quarterly_report.xlsx',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        user: 'Mike Johnson',
        documentId: 'doc_3',
      },
      {
        id: '4',
        type: 'delete',
        description: 'Deleted old_backup_file.zip',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        user: 'Sarah Wilson',
        documentId: 'doc_4',
      },
      {
        id: '5',
        type: 'upload',
        description: 'Uploaded employee_handbook.pdf',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        user: 'David Brown',
        documentId: 'doc_5',
      },
    ],
  })

  const storagePercentage = (stats.storageUsed / stats.storageLimit) * 100

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={stats} />
      
      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Used</span>
                <span className="text-sm font-medium text-gray-900">
                  {(stats.storageUsed / (1024 * 1024 * 1024)).toFixed(1)} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {storagePercentage.toFixed(1)}% of {(stats.storageLimit / (1024 * 1024 * 1024)).toFixed(0)} GB
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="lg:col-span-2"
        >
          <ActivityFeed activities={stats.recentActivity} />
        </motion.div>
      </div>
      
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-sm font-medium text-gray-900">Upload Documents</div>
            <div className="text-xs text-gray-500 mt-1">Add new files to the system</div>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-sm font-medium text-gray-900">Generate Report</div>
            <div className="text-xs text-gray-500 mt-1">Create activity summary</div>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-sm font-medium text-gray-900">System Settings</div>
            <div className="text-xs text-gray-500 mt-1">Configure system preferences</div>
          </button>
        </div>
      </motion.div>
    </div>
  )
}