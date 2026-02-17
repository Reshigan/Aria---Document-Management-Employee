import { useState, useEffect } from 'react';
import { Wrench, Plus, Search, Edit, Trash2, MapPin, User, Calendar, Clock, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface WorkOrder {
  id: string;
  order_number: string;
  title: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  location_id?: string;
  location_name?: string;
  location_address?: string;
  technician_id?: string;
  technician_name?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  estimated_duration?: number;
  actual_duration?: number;
  priority: string;
  status: string;
  parts_used?: string;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  customer_signature?: boolean;
  customer_rating?: number;
  notes?: string;
  created_at: string;
}

interface Technician {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
}

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_id: '',
    technician_id: '',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: 1,
    priority: 'medium',
    status: 'draft'
  });

  useEffect(() => {
    loadWorkOrders();
    loadTechnicians();
    loadLocations();
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [filterStatus, filterTechnician]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      let url = '/odoo/field-service/work-orders';
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterTechnician) params.append('technician_id', filterTechnician);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setWorkOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await api.get('/odoo/field-service/technicians');
      const data = response.data.data || response.data || [];
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await api.get('/odoo/field-service/locations');
      const data = response.data.data || response.data || [];
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        location_id: formData.location_id || null,
        technician_id: formData.technician_id || null,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time: formData.scheduled_time || null
      };
      if (editingOrder) {
        await api.put(`/odoo/field-service/work-orders/${editingOrder.id}`, payload);
      } else {
        await api.post('/odoo/field-service/work-orders', payload);
      }
      setShowForm(false);
      setEditingOrder(null);
      resetForm();
      loadWorkOrders();
    } catch (error) {
      console.error('Error saving work order:', error);
      alert('Error saving work order. Please try again.');
    }
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormData({
      title: order.title,
      description: order.description || '',
      location_id: order.location_id || '',
      technician_id: order.technician_id || '',
      scheduled_date: order.scheduled_date || '',
      scheduled_time: order.scheduled_time || '',
      estimated_duration: order.estimated_duration || 1,
      priority: order.priority,
      status: order.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work order?')) return;
    try {
      await api.delete(`/odoo/field-service/work-orders/${id}`);
      loadWorkOrders();
    } catch (error) {
      console.error('Error deleting work order:', error);
      alert('Error deleting work order. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location_id: '',
      technician_id: '',
      scheduled_date: '',
      scheduled_time: '',
      estimated_duration: 1,
      priority: 'medium',
      status: 'draft'
    });
  };

  const filteredOrders = workOrders.filter(o =>
    o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (o.location_name && o.location_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const scheduledToday = workOrders.filter(o => {
    if (!o.scheduled_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return o.scheduled_date === today;
  });

  const totalRevenue = workOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);

  if (loading && workOrders.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading work orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl ">
            <Wrench className="h-7 w-7 text-white" />
          </div>
          Work Orders
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage field service work orders and technician dispatch</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl ">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{workOrders.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{scheduledToday.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled Today</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl ">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{workOrders.filter(o => o.status === 'in_progress').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl ">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">R {Number(totalRevenue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterTechnician}
            onChange={(e) => setFilterTechnician(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          >
            <option value="">All Technicians</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingOrder(null); resetForm(); setShowForm(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            New Work Order
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">#{order.order_number}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{order.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    {order.location_name ? (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">{order.location_name}</div>
                          {order.location_address && (
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">
                              {order.location_address}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {order.technician_name ? (
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900">{order.technician_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {order.scheduled_date ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        <div>
                          <div>{(order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString() : "-")}</div>
                          {order.scheduled_time && (
                            <div className="text-xs text-gray-500">{order.scheduled_time}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[order.priority]}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {order.total_cost ? (
                      <span className="text-sm font-medium text-gray-900">
                        R {Number(order.total_cost ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(order)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || filterStatus || filterTechnician 
                ? 'No work orders found matching your criteria' 
                : 'No work orders yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Wrench className="h-6 w-6" />
                {editingOrder ? 'Edit Work Order' : 'New Work Order'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., AC Repair, Equipment Installation"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Location</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Technician</label>
                  <select
                    value={formData.technician_id}
                    onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Scheduled Time</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Est. Duration (hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              {editingOrder && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </form>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingOrder(null); resetForm(); }}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit as any}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-orange-500/40 transition-all"
              >
                {editingOrder ? 'Update' : 'Create'} Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
