import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Search, Play, Check, Factory, X, RefreshCw, AlertCircle, Clock, CheckCircle, Zap, Settings } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  product_id: string;
  product_name: string;
  quantity_to_produce: number;
  quantity_produced: number;
  warehouse_id?: string;
  warehouse_name?: string;
  start_date?: string;
  due_date?: string;
  completion_date?: string;
  status: string;
  priority: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity_to_produce: 1,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'normal',
    notes: ''
  });

  useEffect(() => {
    loadWorkOrders();
    loadProducts();
  }, [searchTerm, statusFilter]);

  const loadProducts = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/products');
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/manufacturing/work-orders', { params });
      const d = response.data;
      setWorkOrders(Array.isArray(d) ? d : d.work_orders || d.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading work orders:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const releaseWorkOrder = async (woId: string) => {
    try {
      await api.post(`/erp/manufacturing/work-orders/${woId}/release`);
      loadWorkOrders();
    } catch (err: unknown) {
      console.error('Error releasing work order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to release work order');
    }
  };

  const startWorkOrder = async (woId: string) => {
    try {
      await api.post(`/erp/manufacturing/work-orders/${woId}/start`);
      loadWorkOrders();
    } catch (err: unknown) {
      console.error('Error starting work order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to start work order');
    }
  };

  const completeWorkOrder = async (woId: string) => {
    try {
      await api.post(`/erp/manufacturing/work-orders/${woId}/complete`);
      loadWorkOrders();
    } catch (err: unknown) {
      console.error('Error completing work order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to complete work order');
    }
  };

  const handleCreate = () => {
    setFormData({
      product_id: '',
      quantity_to_produce: 1,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'normal',
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id) {
      setError('Please select a product');
      return;
    }
    try {
      await api.post('/erp/manufacturing/work-orders', formData);
      setShowCreateModal(false);
      loadWorkOrders();
      setError(null);
    } catch (err: unknown) {
      console.error('Error creating work order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to create work order');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      released: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      in_progress: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      normal: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    };
    return styles[priority] || styles.normal;
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = !searchTerm || 
      wo.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: workOrders.length,
    draft: workOrders.filter(wo => wo.status === 'draft').length,
    released: workOrders.filter(wo => wo.status === 'released').length,
    in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
    totalUnits: workOrders.reduce((sum, wo) => sum + wo.quantity_to_produce, 0),
    producedUnits: workOrders.reduce((sum, wo) => sum + wo.quantity_produced, 0)
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Factory className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">Create Work Order</h2>
                  <p className="text-white/80 text-sm">Schedule production</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product *</label>
                <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all">
                  <option value="">Select a product...</option>
                  {products.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.code})</option>))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity to Produce *</label>
                <input type="number" min="1" value={formData.quantity_to_produce} onChange={(e) => setFormData({ ...formData, quantity_to_produce: parseInt(e.target.value) || 1 })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none" placeholder="Add any notes..." />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all ">Create Work Order</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Work Orders</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage manufacturing work orders and production</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadWorkOrders()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all ">
              <Plus className="h-5 w-5" />Create WO
            </button>
          </div>
        </div>

        {error && !showCreateModal && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Factory className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total WOs</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl "><Clock className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-300">Draft</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Zap className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.released}</p><p className="text-xs text-gray-500 dark:text-gray-300">Released</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl "><Settings className="h-5 w-5 text-white animate-spin" style={{ animationDuration: '3s' }} /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.in_progress}</p><p className="text-xs text-gray-500 dark:text-gray-300">In Progress</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Completed</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input type="text" placeholder="Search by WO number or product..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all min-w-[150px]">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="released">Released</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-300">Loading work orders...</p>
            </div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Factory className="h-8 w-8 text-gray-300" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No work orders found</h3>
              <p className="text-gray-500 dark:text-gray-300 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first work order'}</p>
              {!searchTerm && !statusFilter && (
                <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all">Create First Work Order</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">WO #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">To Produce</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produced</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-amber-600 dark:text-amber-400">{wo.wo_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{wo.product_name}</td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{wo.quantity_to_produce}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{wo.quantity_produced}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(wo.priority)}`}>{wo.priority}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(wo.status)}`}>{wo.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {wo.status === 'draft' && (
                            <button onClick={() => releaseWorkOrder(wo.id)} className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm">Release</button>
                          )}
                          {wo.status === 'released' && (
                            <button onClick={() => startWorkOrder(wo.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-xs font-medium hover:from-amber-700 hover:to-orange-700 transition-all shadow-sm">
                              <Play className="h-3 w-3" />Start
                            </button>
                          )}
                          {wo.status === 'in_progress' && (
                            <button onClick={() => completeWorkOrder(wo.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-xs font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm">
                              <Check className="h-3 w-3" />Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {renderCreateModal()}
    </div>
  );
}
