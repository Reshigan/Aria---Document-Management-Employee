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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Wrench size={28} className="text-orange-500" />
          Work Orders
        </h1>
        <p className="text-gray-600 mt-1">Manage field service work orders and technician dispatch</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-orange-600">{workOrders.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Scheduled Today</div>
          <div className="text-2xl font-bold text-blue-600">{scheduledToday.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">
            {workOrders.filter(o => o.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">
            R {totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Technicians</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingOrder(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 hover:bg-orange-700"
          >
            <Plus size={16} />
            New Work Order
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">#{order.order_number}</div>
                    <div className="text-sm text-gray-600">{order.title}</div>
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
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {order.technician_name ? (
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900">{order.technician_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {order.scheduled_date ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        <div>
                          <div>{new Date(order.scheduled_date).toLocaleDateString()}</div>
                          {order.scheduled_time && (
                            <div className="text-xs text-gray-500">{order.scheduled_time}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not scheduled</span>
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
                        R {order.total_cost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingOrder ? 'Edit Work Order' : 'New Work Order'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., AC Repair, Equipment Installation"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Location</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                  <select
                    value={formData.technician_id}
                    onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration (hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingOrder(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {editingOrder ? 'Update' : 'Create'} Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
