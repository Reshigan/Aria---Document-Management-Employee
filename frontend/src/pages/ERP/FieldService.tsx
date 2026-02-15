import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Search, Eye, Send, CheckCircle, Wrench, X, RefreshCw, AlertCircle, Clock, Truck, Calendar, Users } from 'lucide-react';

interface ServiceRequest {
  id: number;
  request_number: string;
  company_id: string;
  customer_name: string;
  request_type: string;
  priority: string;
  status: string;
  description: string;
  reported_date: string;
  assigned_to?: string;
}

interface WorkOrder {
  id: number;
  work_order_number: string;
  company_id: string;
  customer_name: string;
  work_type: string;
  priority: string;
  status: string;
  scheduled_date?: string;
  technician_name?: string;
  total_cost?: number;
}

export default function FieldService() {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'workorders'>('requests');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ServiceRequest | WorkOrder | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    request_type: 'repair',
    work_type: 'installation',
    priority: 'medium',
    description: '',
    scheduled_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'requests') {
        const response = await api.get('/field-service/service-requests', {
          params: { company_id: '00000000-0000-0000-0000-000000000001', status: statusFilter || undefined }
        });
        setServiceRequests(response.data.service_requests || []);
      } else {
        const response = await api.get('/field-service/work-orders', {
          params: { company_id: '00000000-0000-0000-0000-000000000001', status: statusFilter || undefined }
        });
        setWorkOrders(response.data.work_orders || []);
      }
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading field service data:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const dispatchWorkOrder = async (woId: number) => {
    try {
      await api.post(`/field-service/work-orders/${woId}/dispatch`);
      loadData();
    } catch (err: unknown) {
      console.error('Error dispatching work order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to dispatch work order');
    }
  };

  const completeWorkOrder = async (woId: number) => {
    try {
      await api.post(`/field-service/work-orders/${woId}/complete`);
      loadData();
    } catch (err: unknown) {
      console.error('Error completing work order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to complete work order');
    }
  };

  const handleCreate = () => {
    setFormData({
      customer_name: '',
      request_type: 'repair',
      work_type: 'installation',
      priority: 'medium',
      description: '',
      scheduled_date: new Date().toISOString().split('T')[0]
    });
    setSelectedItem(null);
    setShowCreateModal(true);
  };

  const handleViewDetails = (item: ServiceRequest | WorkOrder) => {
    setSelectedItem(item);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name) {
      setError('Please enter a customer name');
      return;
    }
    try {
      const endpoint = activeTab === 'requests' 
        ? '/field-service/service-requests'
        : '/field-service/work-orders';
      const payload = activeTab === 'requests'
        ? { company_id: '00000000-0000-0000-0000-000000000001', customer_name: formData.customer_name, request_type: formData.request_type, priority: formData.priority, description: formData.description }
        : { company_id: '00000000-0000-0000-0000-000000000001', customer_name: formData.customer_name, work_type: formData.work_type, priority: formData.priority, scheduled_date: formData.scheduled_date };
      await api.post(endpoint, payload);
      setShowCreateModal(false);
      loadData();
      setError(null);
    } catch (err: unknown) {
      console.error('Error creating:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to create');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      assigned: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      in_progress: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      dispatched: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    };
    return styles[status] || styles.draft;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
      medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    };
    return styles[priority] || styles.medium;
  };

  const filteredRequests = serviceRequests.filter(sr => {
    const matchesSearch = !searchTerm || 
      sr.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sr.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = !searchTerm || 
      wo.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const requestStats = {
    total: serviceRequests.length,
    new: serviceRequests.filter(sr => sr.status === 'new').length,
    assigned: serviceRequests.filter(sr => sr.status === 'assigned').length,
    in_progress: serviceRequests.filter(sr => sr.status === 'in_progress').length,
    completed: serviceRequests.filter(sr => sr.status === 'completed').length
  };

  const woStats = {
    total: workOrders.length,
    scheduled: workOrders.filter(wo => wo.status === 'scheduled').length,
    dispatched: workOrders.filter(wo => wo.status === 'dispatched').length,
    in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    const isViewMode = selectedItem !== null;
    const title = isViewMode 
      ? (activeTab === 'requests' ? 'Service Request Details' : 'Work Order Details')
      : (activeTab === 'requests' ? 'Create Service Request' : 'Create Work Order');

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Wrench className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <p className="text-white/80 text-sm">{isViewMode ? 'View details' : 'Fill in the details'}</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          {isViewMode ? (
            <div className="p-4 space-y-4">
              {activeTab === 'requests' && selectedItem && 'request_number' in selectedItem && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Request #</p><p className="font-semibold text-gray-900 dark:text-white">{selectedItem.request_number}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Customer</p><p className="font-semibold text-gray-900 dark:text-white">{selectedItem.customer_name}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Type</p><p className="font-semibold text-gray-900 dark:text-white capitalize">{selectedItem.request_type}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Priority</p><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(selectedItem.priority)}`}>{selectedItem.priority}</span></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Status</p><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Reported</p><p className="font-semibold text-gray-900 dark:text-white">{new Date(selectedItem.reported_date).toLocaleDateString()}</p></div>
                  </div>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400">Description</p><p className="text-gray-900 dark:text-white">{selectedItem.description || 'No description'}</p></div>
                </>
              )}
              {activeTab === 'workorders' && selectedItem && 'work_order_number' in selectedItem && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">WO #</p><p className="font-semibold text-gray-900 dark:text-white">{selectedItem.work_order_number}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Customer</p><p className="font-semibold text-gray-900 dark:text-white">{selectedItem.customer_name}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Work Type</p><p className="font-semibold text-gray-900 dark:text-white capitalize">{selectedItem.work_type}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Priority</p><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(selectedItem.priority)}`}>{selectedItem.priority}</span></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Status</p><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Scheduled</p><p className="font-semibold text-gray-900 dark:text-white">{selectedItem.scheduled_date ? new Date(selectedItem.scheduled_date).toLocaleDateString() : '-'}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Technician</p><p className="font-semibold text-gray-900 dark:text-white">{selectedItem.technician_name || 'Unassigned'}</p></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p><p className="font-semibold text-gray-900 dark:text-white">R {(selectedItem.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p></div>
                  </div>
                </>
              )}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all">Close</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name *</label>
                  <input type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="Enter customer name" />
                </div>

                {activeTab === 'requests' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Request Type</label>
                      <select value={formData.request_type} onChange={(e) => setFormData({ ...formData, request_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                        <option value="repair">Repair</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="installation">Installation</option>
                        <option value="inspection">Inspection</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                      <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none" placeholder="Describe the issue..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work Type</label>
                      <select value={formData.work_type} onChange={(e) => setFormData({ ...formData, work_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                        <option value="installation">Installation</option>
                        <option value="repair">Repair</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inspection">Inspection</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scheduled Date</label>
                      <input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all ">Create</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">Field Service</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage service requests and field work orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadData()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all ">
              <Plus className="h-5 w-5" />Create {activeTab === 'requests' ? 'Request' : 'Work Order'}
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

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 font-medium transition-all ${activeTab === 'requests' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>Service Requests</button>
          <button onClick={() => setActiveTab('workorders')} className={`px-4 py-2 font-medium transition-all ${activeTab === 'workorders' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>Work Orders</button>
        </div>

        {activeTab === 'requests' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl "><Wrench className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{requestStats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Requests</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{requestStats.new}</p><p className="text-xs text-gray-500 dark:text-gray-400">New</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{requestStats.assigned}</p><p className="text-xs text-gray-500 dark:text-gray-400">Assigned</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Truck className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{requestStats.in_progress}</p><p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{requestStats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-400">Completed</p></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl "><Wrench className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{woStats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total WOs</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Calendar className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{woStats.scheduled}</p><p className="text-xs text-gray-500 dark:text-gray-400">Scheduled</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Send className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{woStats.dispatched}</p><p className="text-xs text-gray-500 dark:text-gray-400">Dispatched</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Truck className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{woStats.in_progress}</p><p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
                <div><p className="text-xl font-bold text-gray-900 dark:text-white">{woStats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-400">Completed</p></div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder={`Search by ${activeTab === 'requests' ? 'request' : 'work order'} number or customer...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all min-w-[150px]">
                <option value="">All Statuses</option>
                {activeTab === 'requests' ? (
                  <>
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : activeTab === 'requests' ? (
            filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="h-8 w-8 text-gray-400" /></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No service requests found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first service request'}</p>
                {!searchTerm && !statusFilter && (
                  <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all">Create First Request</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Request #</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredRequests.map((sr) => (
                      <tr key={sr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-cyan-600 dark:text-cyan-400">{sr.request_number}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{sr.customer_name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{sr.request_type}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(sr.priority)}`}>{sr.priority}</span></td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(sr.status)}`}>{sr.status}</span></td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(sr.reported_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end">
                            <button onClick={() => handleViewDetails(sr)} className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredWorkOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="h-8 w-8 text-gray-400" /></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No work orders found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first work order'}</p>
                {!searchTerm && !statusFilter && (
                  <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all">Create First Work Order</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">WO #</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Work Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheduled</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredWorkOrders.map((wo) => (
                      <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-cyan-600 dark:text-cyan-400">{wo.work_order_number}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{wo.customer_name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{wo.work_type}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(wo.priority)}`}>{wo.priority}</span></td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(wo.status)}`}>{wo.status}</span></td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {wo.status === 'scheduled' && (
                              <button onClick={() => dispatchWorkOrder(wo.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg text-xs font-medium hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm">
                                <Send className="h-3 w-3" />Dispatch
                              </button>
                            )}
                            {(wo.status === 'dispatched' || wo.status === 'in_progress') && (
                              <button onClick={() => completeWorkOrder(wo.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-xs font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm">
                                <CheckCircle className="h-3 w-3" />Complete
                              </button>
                            )}
                            <button onClick={() => handleViewDetails(wo)} className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {renderCreateModal()}
    </div>
  );
}
