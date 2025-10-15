import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

const COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347'];

const AnalyticsDashboard = ({ data, realTimeData, onRefresh, loading }) => {
  const [activeMetric, setActiveMetric] = useState('documents');
  const [timeRange, setTimeRange] = useState('7d');

  const metrics = [
    {
      id: 'documents',
      title: 'Total Documents',
      value: data?.total_documents || 0,
      change: '+12.5%',
      trend: 'up',
      icon: '📄',
      color: 'text-blue-400'
    },
    {
      id: 'processed',
      title: 'Processed Today',
      value: data?.processed_today || 0,
      change: '+8.2%',
      trend: 'up',
      icon: '⚡',
      color: 'text-green-400'
    },
    {
      id: 'storage',
      title: 'Storage Used',
      value: data?.storage_used || '0 GB',
      change: '+2.1%',
      trend: 'up',
      icon: '💾',
      color: 'text-yellow-400'
    },
    {
      id: 'users',
      title: 'Active Users',
      value: data?.active_users || 0,
      change: '+15.3%',
      trend: 'up',
      icon: '👥',
      color: 'text-purple-400'
    }
  ];

  const chartData = data?.chart_data || [
    { name: 'Mon', documents: 24, processed: 18 },
    { name: 'Tue', documents: 32, processed: 28 },
    { name: 'Wed', documents: 45, processed: 41 },
    { name: 'Thu', documents: 38, processed: 35 },
    { name: 'Fri', documents: 52, processed: 48 },
    { name: 'Sat', documents: 28, processed: 25 },
    { name: 'Sun', documents: 35, processed: 32 }
  ];

  const pieData = data?.category_data || [
    { name: 'Invoices', value: 35, color: '#FFD700' },
    { name: 'Contracts', value: 25, color: '#FFA500' },
    { name: 'Reports', value: 20, color: '#FF8C00' },
    { name: 'Other', value: 20, color: '#FF7F50' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold vx-text-gradient">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-2">Real-time insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onRefresh}
            loading={loading}
            icon="🔄"
          >
            Refresh
          </Button>
          <Button variant="default">
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden cursor-pointer hover:vx-glass-yellow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-white">{metric.value}</p>
                    <div className="flex items-center mt-2">
                      <span className={`text-sm ${metric.color}`}>
                        {metric.trend === 'up' ? '↗' : '↘'} {metric.change}
                      </span>
                    </div>
                  </div>
                  <div className="text-3xl opacity-80">
                    {metric.icon}
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full -mr-10 -mt-10"></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Processing Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Document Processing Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD700" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FFD700" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFA500" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FFA500" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid #FFD700',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="documents" 
                  stroke="#FFD700" 
                  fillOpacity={1} 
                  fill="url(#colorDocuments)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="processed" 
                  stroke="#FFA500" 
                  fillOpacity={1} 
                  fill="url(#colorProcessed)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Document Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🥧 Document Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid #FFD700',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-4">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔴 Real-time Activity
            <div className="vx-status-dot bg-green-400"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {realTimeData?.recent_activities?.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50"
              >
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className="text-white">{activity.message}</p>
                  <p className="text-sm text-gray-400">{activity.timestamp}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${activity.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {activity.status}
                </div>
              </motion.div>
            )) || (
              <div className="text-center py-8 text-gray-400">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;