import { useState, useEffect } from 'react';
import { Factory, Layers, Package, TrendingUp, Clock, CheckCircle, AlertTriangle, Play, Settings, BarChart3 } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  inProgress: number;
  completed: number;
  onHold: number;
  totalBOMs: number;
  activeBOMs: number;
  efficiency: number;
  defectRate: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  product_name: string;
  progress: number;
  status: string;
  priority: string;
}

export default function ManufacturingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalOrders: 0, inProgress: 0, completed: 0, onHold: 0, totalBOMs: 0, activeBOMs: 0, efficiency: 0, defectRate: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/manufacturing/dashboard-stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API_BASE}/api/manufacturing/recent-orders`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || data || { totalOrders: 0, inProgress: 0, completed: 0, onHold: 0, totalBOMs: 0, activeBOMs: 0, efficiency: 0, defectRate: 0 });
      } else {
        setStats({ totalOrders: 0, inProgress: 0, completed: 0, onHold: 0, totalBOMs: 0, activeBOMs: 0, efficiency: 0, defectRate: 0 });
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setRecentOrders(Array.isArray(data) ? data : data.data || []);
      } else {
        setRecentOrders([]);
      }
    } catch (err) { 
      console.error('Failed to load dashboard data:', err);
      setStats({ totalOrders: 0, inProgress: 0, completed: 0, onHold: 0, totalBOMs: 0, activeBOMs: 0, efficiency: 0, defectRate: 0 });
      setRecentOrders([]);
    } finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      planned: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      on_hold: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[status] || styles.planned;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      low: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[priority] || styles.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div><p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Manufacturing Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of production and manufacturing operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><Factory className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Play className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p><p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-sm text-gray-500 dark:text-gray-400">Completed</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/30"><AlertTriangle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.onHold}</p><p className="text-sm text-gray-500 dark:text-gray-400">On Hold</p></div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Production Orders</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order #</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Progress</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-amber-600 dark:text-amber-400">{order.order_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{order.product_name}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${order.progress === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${order.progress}%` }}></div></div><span className="text-xs text-gray-500 dark:text-gray-400">{order.progress}%</span></div></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getPriorityBadge(order.priority)}`}>{order.priority}</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadge(order.status)}`}>{order.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">BOMs Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><Layers className="h-5 w-5 text-orange-600 dark:text-orange-400" /></div><span className="text-gray-600 dark:text-gray-400">Total BOMs</span></div><span className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalBOMs}</span></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /></div><span className="text-gray-600 dark:text-gray-400">Active BOMs</span></div><span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.activeBOMs}</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div><div className="flex items-center justify-between mb-2"><span className="text-gray-600 dark:text-gray-400">Efficiency</span><span className="font-semibold text-green-600 dark:text-green-400">{stats.efficiency}%</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${stats.efficiency}%` }}></div></div></div>
                <div><div className="flex items-center justify-between mb-2"><span className="text-gray-600 dark:text-gray-400">Defect Rate</span><span className="font-semibold text-red-600 dark:text-red-400">{stats.defectRate}%</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-gradient-to-r from-red-500 to-rose-500" style={{ width: `${stats.defectRate * 10}%` }}></div></div></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3 mb-3"><BarChart3 className="h-6 w-6" /><h3 className="text-lg font-semibold">Quick Actions</h3></div>
              <div className="space-y-2">
                <a href="/manufacturing/production" className="flex items-center gap-2 p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"><Factory className="h-5 w-5" />View Production Orders</a>
                <a href="/manufacturing/boms" className="flex items-center gap-2 p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"><Layers className="h-5 w-5" />Manage BOMs</a>
                <a href="/manufacturing/work-orders" className="flex items-center gap-2 p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"><Settings className="h-5 w-5" />Work Orders</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
