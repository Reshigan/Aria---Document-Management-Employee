import { useState, useEffect } from 'react';
import { Factory, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, Play, Pause, Settings } from 'lucide-react';

interface ProductionOrder {
  id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  completed_quantity: number;
  start_date: string;
  end_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function Production() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ product_name: '', quantity: 0, start_date: '', end_date: '', priority: 'medium' as const });

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setOrders([
        { id: '1', order_number: 'PRD-2026-001', product_name: 'Widget A', quantity: 1000, completed_quantity: 750, start_date: '2026-01-10', end_date: '2026-01-20', status: 'in_progress', priority: 'high' },
        { id: '2', order_number: 'PRD-2026-002', product_name: 'Widget B', quantity: 500, completed_quantity: 500, start_date: '2026-01-05', end_date: '2026-01-15', status: 'completed', priority: 'medium' },
        { id: '3', order_number: 'PRD-2026-003', product_name: 'Component X', quantity: 2000, completed_quantity: 0, start_date: '2026-01-25', end_date: '2026-02-05', status: 'planned', priority: 'low' },
      ]);
    } catch (err) { setError('Failed to load production orders'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      alert('Production order created successfully');
      setShowForm(false);
      setFormData({ product_name: '', quantity: 0, start_date: '', end_date: '', priority: 'medium' });
      await fetchOrders();
    } catch (err) { setError('Failed to create production order'); }
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

  const stats = {
    total: orders.length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    planned: orders.filter(o => o.status === 'planned').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Production Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage manufacturing production orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchOrders} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-yellow-700 transition-all shadow-lg shadow-amber-500/30"><Plus className="h-5 w-5" />New Order</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-lg shadow-amber-500/30"><Factory className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Play className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p><p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-sm text-gray-500 dark:text-gray-400">Completed</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl shadow-lg shadow-gray-500/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.planned}</p><p className="text-sm text-gray-500 dark:text-gray-400">Planned</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Factory className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Production Order</h2><p className="text-white/80 text-sm">Create a new manufacturing order</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name *</label><input type="text" required value={formData.product_name} onChange={(e) => setFormData({ ...formData, product_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity *</label><input type="number" required min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority *</label><select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label><input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date *</label><input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-yellow-700 transition-all shadow-lg shadow-amber-500/30">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading production orders...</p></div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Factory className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No production orders</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Create your first production order</p><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-yellow-700 transition-all">New Order</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">End Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-amber-600 dark:text-amber-400">{order.order_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{order.product_name}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${order.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${(order.completed_quantity / order.quantity) * 100}%` }}></div></div><span className="text-sm text-gray-600 dark:text-gray-400">{order.completed_quantity}/{order.quantity}</span></div></td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.start_date}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.end_date}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getPriorityBadge(order.priority)}`}>{order.priority}</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(order.status)}`}>{order.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : order.status === 'in_progress' ? <Play className="h-3.5 w-3.5" /> : order.status === 'on_hold' ? <Pause className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{order.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
