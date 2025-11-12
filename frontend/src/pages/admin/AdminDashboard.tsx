import React, { useState, useEffect } from 'react';
import { 
  Activity, Bot, Users, Database, TrendingUp, AlertCircle,
  CheckCircle, Clock, Zap, Server, HardDrive, Cpu
} from 'lucide-react';

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
      const [metricsRes, perfRes] = await Promise.all([
        fetch('/api/admin/dashboard/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/admin/performance/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
      ]);

      if (metricsRes.ok && perfRes.ok) {
        const metricsData = await metricsRes.json();
        const perfData = await perfRes.json();
        setMetrics(metricsData);
        setPerformance(perfData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600" />
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-2">System overview and performance metrics</p>
      </div>

      {/* Master Data Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Master Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Companies</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.master_data.companies || 0}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.master_data.customers || 0}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suppliers</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.master_data.suppliers || 0}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.master_data.products || 0}</p>
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
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Transactions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Quotes</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.transactions.quotes || 0}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sales Orders</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.transactions.sales_orders || 0}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Deliveries</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.transactions.deliveries || 0}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Automation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bots</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.automation.total_bots || 67}</p>
              </div>
              <div className="bg-indigo-100 rounded-full p-3">
                <Bot className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enabled Bots</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.automation.enabled_bots || 67}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Executions Today</p>
                <p className="text-3xl font-bold text-gray-900">{performance?.bot_executions_today || 0}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <Zap className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          System Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-3xl font-bold text-green-600">{performance?.uptime_percent || 99.9}%</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-3xl font-bold text-blue-600">{performance?.avg_response_time_ms || 250}ms</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-3xl font-bold text-yellow-600">{performance?.error_rate_percent || 0.5}%</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-purple-600">{performance?.active_users_today || 0}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/admin/bots"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bot className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Configure Bots</span>
          </a>

          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-5 w-5 text-green-600" />
            <span className="font-medium text-gray-900">Manage Users</span>
          </a>

          <a
            href="/admin/system"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Server className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-gray-900">System Settings</span>
          </a>

          <a
            href="/admin/company"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Database className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-gray-900">Company Settings</span>
          </a>
        </div>
      </div>
    </div>
  );
}
