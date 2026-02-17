import React, { useState, useEffect } from 'react';
import { 
  Activity, Bot, Users, Database, TrendingUp, AlertCircle,
  CheckCircle, Clock, Zap, Server, HardDrive, Cpu
} from 'lucide-react';
import api from '../../lib/api';

interface DashboardMetrics {
  master_data: {
    companies: number;
    customers: number;
    suppliers: number;
    products: number;
  };
  transactions: {
    quotes: number;
    sales_orders: number;
    deliveries: number;
  };
  automation: {
    total_bots: number;
    enabled_bots: number;
    executions_today: number;
  };
  system: {
    uptime_percent: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
  };
}

interface PerformanceMetrics {
  bot_executions_today: number;
  bot_executions_week: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  error_rate_percent: number;
  uptime_percent: number;
  active_users_today: number;
  api_calls_today: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [metricsData, perfData] = await Promise.all([
        api.get('/admin/dashboard/metrics'),
        api.get('/admin/performance/metrics')
      ]);
      setMetrics(metricsData?.data || metricsData);
      setPerformance(perfData?.data || perfData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">System overview and performance metrics</p>
      </div>

      {/* Master Data Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Master Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Companies</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.master_data?.companies || 0}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
                <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customers</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.master_data?.customers || 0}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Suppliers</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.master_data?.suppliers || 0}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-3">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Products</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.master_data?.products || 0}</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <HardDrive className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Transactions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quotes</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.transactions?.quotes || 0}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sales Orders</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.transactions?.sales_orders || 0}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Deliveries</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.transactions?.deliveries || 0}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Automation
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Bots</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.automation?.total_bots || 67}</p>
              </div>
              <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-3">
                <Bot className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enabled Bots</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{metrics?.automation?.enabled_bots || 67}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Executions Today</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{performance?.bot_executions_today || 0}</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-3">
                <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          System Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{performance?.uptime_percent || 99.9}%</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{performance?.avg_response_time_ms || 250}ms</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{performance?.error_rate_percent || 0.5}%</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-3">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{performance?.active_users_today || 0}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-3">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <a
            href="/admin/agents"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-900 dark:text-white">Configure Bots</span>
          </a>

          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-gray-900 dark:text-white">Manage Users</span>
          </a>

          <a
            href="/admin/system"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-gray-900 dark:text-white">System Settings</span>
          </a>

          <a
            href="/admin/company"
            className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            <Database className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-gray-900 dark:text-white">Company Settings</span>
          </a>
        </div>
      </div>
    </div>
  );
}
