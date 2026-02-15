import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList, X, Edit, Trash2, Play, Pause, CheckCircle, XCircle, AlertTriangle, Clock, Package, Layers, BarChart3, Calendar, ArrowRight, Search } from 'lucide-react';

interface WorkOrder {
  order_id: string;
  product_id: string;
  product_name: string;
  bom_id?: string;
  bom_version?: string;
  quantity: number;
  quantity_completed: number;
  status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  due_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  assigned_to?: string;
  notes: string;
  estimated_hours?: number;
  actual_hours?: number;
}

interface FormData {
  product_name: string;
  bom_id: string;
  quantity: number;
  priority: string;
  start_date: string;
  due_date: string;
  assigned_to: string;
  estimated_hours: number;
  notes: string;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planned: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  return colors[status] || colors.planned;
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600'
  };
  return colors[priority] || colors.medium;
};

const WorkOrders: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [formData, setFormData] = useState<FormData>({
    product_name: '',
    bom_id: '',
    quantity: 1,
    priority: 'medium',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    assigned_to: '',
    estimated_hours: 0,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/erp/manufacturing/work-orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setOrders(data.work_orders || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      bom_id: '',
      quantity: 1,
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      assigned_to: '',
      estimated_hours: 0,
      notes: ''
    });
    setEditingOrder(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormData({
      product_name: order.product_name,
      bom_id: order.bom_id || '',
      quantity: order.quantity,
      priority: order.priority || 'medium',
      start_date: order.start_date?.split('T')[0] || '',
      due_date: order.due_date?.split('T')[0] || '',
      assigned_to: order.assigned_to || '',
      estimated_hours: order.estimated_hours || 0,
      notes: order.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this work order?')) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('Work order deleted successfully');
      fetchOrders();
    } catch (error) {
      setError('Failed to delete work order');
    }
  };

  // Business Logic: Start Work Order (planned -> in_progress)
  const handleStart = async (order: WorkOrder) => {
    if (order.status !== 'planned') {
      setError('Only planned work orders can be started');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          ...order, 
          status: 'in_progress',
          actual_start_date: new Date().toISOString()
        })
      });
      setSuccess('Work order started');
      fetchOrders();
    } catch (error) {
      setError('Failed to start work order');
    }
  };

  // Business Logic: Put Work Order on Hold
  const handleHold = async (order: WorkOrder) => {
    if (order.status !== 'in_progress') {
      setError('Only in-progress work orders can be put on hold');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...order, status: 'on_hold' })
      });
      setSuccess('Work order put on hold');
      fetchOrders();
    } catch (error) {
      setError('Failed to update work order');
    }
  };

  // Business Logic: Resume Work Order (on_hold -> in_progress)
  const handleResume = async (order: WorkOrder) => {
    if (order.status !== 'on_hold') {
      setError('Only on-hold work orders can be resumed');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...order, status: 'in_progress' })
      });
      setSuccess('Work order resumed');
      fetchOrders();
    } catch (error) {
      setError('Failed to resume work order');
    }
  };

  // Business Logic: Complete Work Order
  const handleComplete = async (order: WorkOrder) => {
    if (order.status !== 'in_progress') {
      setError('Only in-progress work orders can be completed');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          ...order, 
          status: 'completed',
          quantity_completed: order.quantity,
          actual_end_date: new Date().toISOString()
        })
      });
      setSuccess('Work order completed');
      fetchOrders();
    } catch (error) {
      setError('Failed to complete work order');
    }
  };

  // Business Logic: Cancel Work Order
  const handleCancel = async (order: WorkOrder) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      setError('Cannot cancel completed or already cancelled work orders');
      return;
    }
    if (!confirm('Are you sure you want to cancel this work order?')) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...order, status: 'cancelled' })
      });
      setSuccess('Work order cancelled');
      fetchOrders();
    } catch (error) {
      setError('Failed to cancel work order');
    }
  };

  // Business Logic: Update Progress
  const handleUpdateProgress = async (order: WorkOrder, completedQty: number) => {
    if (completedQty > order.quantity) {
      setError('Completed quantity cannot exceed planned quantity');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/manufacturing/work-orders/${order.order_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...order, quantity_completed: completedQty })
      });
      setSuccess('Progress updated');
      fetchOrders();
    } catch (error) {
      setError('Failed to update progress');
    }
  };

  // Business Logic: Create Quality Inspection
  const handleCreateInspection = async (order: WorkOrder) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/erp/quality/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          work_order_id: order.order_id,
          product_name: order.product_name,
          quantity: order.quantity_completed || order.quantity,
          status: 'pending',
          inspection_type: 'production'
        })
      });
      setSuccess('Quality inspection created');
    } catch (error) {
      setError('Failed to create quality inspection');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!formData.product_name.trim()) {
      setError('Product name is required');
      return;
    }
    if (formData.quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const url = editingOrder 
        ? `${API_BASE}/api/erp/manufacturing/work-orders/${editingOrder.order_id}`
        : `${API_BASE}/api/erp/manufacturing/work-orders`;
      const method = editingOrder ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          ...formData,
          status: editingOrder?.status || 'planned',
          quantity_completed: editingOrder?.quantity_completed || 0
        })
      });
      
      setShowModal(false);
      resetForm();
      setSuccess(editingOrder ? 'Work order updated' : 'Work order created');
      fetchOrders();
    } catch (error) {
      setError('Failed to save work order');
    }
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    planned: orders.filter(o => o.status === 'planned').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    on_hold: orders.filter(o => o.status === 'on_hold').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Filter and search orders
  const filteredOrders = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => 
      searchTerm === '' || 
      o.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Calculate progress percentage
  const getProgress = (order: WorkOrder) => {
    if (!order.quantity || order.quantity === 0) return 0;
    return Math.round(((order.quantity_completed || 0) / order.quantity) * 100);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Work Orders</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage production work orders</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 w-64"
              />
            </div>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700  transition-all"
            >
              <Plus size={20} />
              Create Work Order
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} />
              {success}
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">&times;</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <button onClick={() => setFilter('all')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'all' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Layers className="text-blue-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('planned')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'planned' ? 'border-gray-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Planned</p>
                <p className="text-2xl font-bold text-gray-600">{stats.planned}</p>
              </div>
              <Calendar className="text-gray-400" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('in_progress')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'in_progress' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>
              <Play className="text-blue-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('on_hold')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'on_hold' ? 'border-amber-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">On Hold</p>
                <p className="text-2xl font-bold text-amber-600">{stats.on_hold}</p>
              </div>
              <Pause className="text-amber-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('completed')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'completed' ? 'border-emerald-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
              </div>
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
          </button>
          <button onClick={() => setFilter('cancelled')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'cancelled' ? 'border-red-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="text-red-500" size={20} />
            </div>
          </button>
        </div>

        {/* Work Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Order ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Priority</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Due Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    No work orders found {filter !== 'all' && `with status "${filter.replace('_', ' ')}"`}
                  </td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono">{order.order_id?.slice(0, 8) || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-medium">{order.product_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${getProgress(order) === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${getProgress(order)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{order.quantity_completed || 0}/{order.quantity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {order.due_date ? new Date(order.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(order)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          {order.status === 'planned' && (
                            <button onClick={() => handleStart(order)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Start">
                              <Play size={16} />
                            </button>
                          )}
                          {order.status === 'in_progress' && (
                            <>
                              <button onClick={() => handleHold(order)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Put on Hold">
                                <Pause size={16} />
                              </button>
                              <button onClick={() => handleComplete(order)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Complete">
                                <CheckCircle size={16} />
                              </button>
                              <button onClick={() => handleCreateInspection(order)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Create Quality Inspection">
                                <Search size={16} />
                              </button>
                            </>
                          )}
                          {order.status === 'on_hold' && (
                            <button onClick={() => handleResume(order)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Resume">
                              <Play size={16} />
                            </button>
                          )}
                          {(order.status === 'planned' || order.status === 'in_progress' || order.status === 'on_hold') && (
                            <button onClick={() => handleCancel(order)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                              <XCircle size={16} />
                            </button>
                          )}
                          {order.status === 'planned' && (
                            <button onClick={() => handleDelete(order.order_id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingOrder ? 'Edit Work Order' : 'Create Work Order'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingOrder ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
