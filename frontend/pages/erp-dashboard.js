import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ERPDashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashBalance: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    inventory: 0,
    employees: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
      
      const activityResponse = await axios.get('/api/dashboard/recent-activity');
      setRecentActivity(activityResponse.data.activities || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const modules = [
    { id: 'gl', name: 'General Ledger', icon: '📊', path: '/erp-general-ledger', color: 'from-blue-500 to-blue-600' },
    { id: 'ap', name: 'Accounts Payable', icon: '💰', path: '/erp-accounts-payable', color: 'from-red-500 to-red-600' },
    { id: 'ar', name: 'Accounts Receivable', icon: '💵', path: '/erp-accounts-receivable', color: 'from-green-500 to-green-600' },
    { id: 'inventory', name: 'Inventory', icon: '📦', path: '/erp-inventory', color: 'from-purple-500 to-purple-600' },
    { id: 'payroll', name: 'Payroll', icon: '👥', path: '/erp-payroll', color: 'from-indigo-500 to-indigo-600' },
    { id: 'banking', name: 'Banking', icon: '🏦', path: '/erp-banking', color: 'from-cyan-500 to-cyan-600' },
    { id: 'reports', name: 'Financial Reports', icon: '📈', path: '/erp-reports', color: 'from-orange-500 to-orange-600' },
    { id: 'bots', name: 'Automation Bots', icon: '🤖', path: '/erp-bots', color: 'from-pink-500 to-pink-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading ERP Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">ARIA ERP</h1>
              <p className="text-white/70 mt-1">Enterprise Resource Planning System</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                Settings
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition">
                New Transaction
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Net Profit</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(stats.netProfit)}</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Cash Balance</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.cashBalance)}</p>
              </div>
              <div className="text-4xl">🏦</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Accounts Receivable</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.accountsReceivable)}</p>
              </div>
              <div className="text-4xl">💵</div>
            </div>
          </div>
        </div>

        {/* ERP Modules */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">ERP Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => (
              <a
                key={module.id}
                href={module.path}
                className="group bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition hover:scale-105 transform cursor-pointer"
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition`}>
                  {module.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{module.name}</h3>
                <p className="text-white/70 text-sm">Manage {module.name.toLowerCase()}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {activity.type?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{activity.description || 'Activity'}</p>
                      <p className="text-white/70 text-sm">{activity.timestamp || 'Just now'}</p>
                    </div>
                  </div>
                  <span className="text-white/70 text-sm">{activity.amount || ''}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-white/70">No recent activity</p>
                <p className="text-white/50 text-sm mt-2">Start by creating your first transaction</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Accounts Payable</h3>
            <p className="text-3xl font-bold text-red-400">{formatCurrency(stats.accountsPayable)}</p>
            <p className="text-white/70 text-sm mt-2">Outstanding vendor invoices</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Inventory Value</h3>
            <p className="text-3xl font-bold text-purple-400">{formatCurrency(stats.inventory)}</p>
            <p className="text-white/70 text-sm mt-2">Total inventory on hand</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Employees</h3>
            <p className="text-3xl font-bold text-indigo-400">{stats.employees || 0}</p>
            <p className="text-white/70 text-sm mt-2">Active employees</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ERPDashboard;
