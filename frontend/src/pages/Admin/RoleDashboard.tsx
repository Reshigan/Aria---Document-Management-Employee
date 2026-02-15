import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, AlertCircle, Users, FileText } from 'lucide-react';

interface KPI {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

interface DashboardData {
  kpis: KPI[];
  pending_approvals: number;
  recent_transactions: any[];
}

const RoleDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userRole, setUserRole] = useState<string>('Admin');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/dashboard/role-based`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setDashboardData(data);
      setUserRole(data.role || 'Admin');
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultKPIs = (): KPI[] => {
    return [
      {
        label: 'Total Revenue',
        value: 'R 1,245,680',
        change: 12.5,
        trend: 'up',
        icon: <DollarSign size={24} className="text-green-600 dark:text-green-400" />
      },
      {
        label: 'Open Sales Orders',
        value: 24,
        change: -5.2,
        trend: 'down',
        icon: <ShoppingCart size={24} className="text-blue-600 dark:text-blue-400" />
      },
      {
        label: 'Pending Approvals',
        value: 8,
        change: 0,
        trend: 'up',
        icon: <AlertCircle size={24} className="text-orange-600" />
      },
      {
        label: 'Active Customers',
        value: 156,
        change: 8.3,
        trend: 'up',
        icon: <Users size={24} className="text-purple-600 dark:text-purple-400" />
      },
      {
        label: 'Inventory Value',
        value: 'R 845,230',
        change: 3.1,
        trend: 'up',
        icon: <Package size={24} className="text-indigo-600 dark:text-indigo-400" />
      },
      {
        label: 'Outstanding AR',
        value: 'R 324,560',
        change: -2.4,
        trend: 'down',
        icon: <FileText size={24} className="text-red-600 dark:text-red-400" />
      }
    ];
  };

  const kpis = dashboardData?.kpis || getDefaultKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{userRole} Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Key performance indicators and metrics for your role
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-md p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{kpi.value}</p>
              </div>
              <div className="ml-4">{kpi.icon}</div>
            </div>
            
            <div className="flex items-center">
              {kpi.trend === 'up' ? (
                <TrendingUp size={16} className={kpi.change >= 0 ? 'text-green-600' : 'text-red-600'} />
              ) : (
                <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
              )}
              <span className={`ml-1 text-sm font-medium ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-md p-4">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Sales Order SO-{1000 + item}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Created 2 hours ago</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">R 12,450</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-md p-4">
          <h2 className="text-xl font-semibold mb-4">Pending Actions</h2>
          <div className="space-y-3">
            {[
              { type: 'Approval', doc: 'PO-10234', amount: 'R 45,600' },
              { type: 'Review', doc: 'INV-5678', amount: 'R 12,300' },
              { type: 'Approval', doc: 'SO-9012', amount: 'R 23,450' },
              { type: 'Review', doc: 'JE-3456', amount: 'R 8,900' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <AlertCircle size={16} className="text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.type}: {item.doc}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for action</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-md p-4">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Sales Order
          </button>
          <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            New Invoice
          </button>
          <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Add Customer
          </button>
          <button className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleDashboard;
