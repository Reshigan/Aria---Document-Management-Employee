import React, { useState, useEffect } from 'react';
import { Bot, TrendingUp, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BotDashboardPage() {
  const [stats, setStats] = useState({
    total_actions: 0,
    success_rate: 0,
    time_saved_hours: 0,
    active_bots: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reports/agents/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const chartData = [
    { day: 'Mon', actions: 45 },
    { day: 'Tue', actions: 52 },
    { day: 'Wed', actions: 48 },
    { day: 'Thu', actions: 61 },
    { day: 'Fri', actions: 55 },
    { day: 'Sat', actions: 25 },
    { day: 'Sun', actions: 18 }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
        <Bot className="h-8 w-8" />
        Bot Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="metric-total-actions">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Actions</div>
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_actions}</div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-2">↑ 12% from last month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="metric-success-rate">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</div>
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.success_rate}%</div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-2">↑ 2% from last month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="metric-time-saved">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Saved</div>
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.time_saved_hours}h</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">This month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="metric-cost-saved">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost Saved</div>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">R {(stats.time_saved_hours * 500).toLocaleString()}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Based on R500/hour</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8" data-testid="activity-chart">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Activity Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="actions" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Agent Performance</h3>
          <div className="space-y-4">
            {[
              { name: 'Invoice Reconciliation', success: 95, actions: 234 },
              { name: 'BBBEE Compliance', success: 98, actions: 156 },
              { name: 'Payroll Automation', success: 100, actions: 89 },
              { name: 'Expense Management', success: 92, actions: 178 }
            ].map((agent) => (
              <div key={agent.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-gray-600 dark:text-gray-400">{agent.success}% success</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: `${agent.success}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" data-testid="recent-activities">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Actions</h3>
          <div className="space-y-3">
            {[
              { agent: 'Invoice Agent', action: 'Matched invoice #INV-1234', time: '2 min ago' },
              { agent: 'BBBEE Agent', action: 'Verified supplier certificate', time: '15 min ago' },
              { agent: 'Payroll Agent', action: 'Processed payroll for 45 employees', time: '1 hour ago' },
              { agent: 'Expense Agent', action: 'Auto-coded 12 expense claims', time: '2 hours ago' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{item.agent}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{item.action}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
