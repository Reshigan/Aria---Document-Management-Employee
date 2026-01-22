import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Search, Eye, Send, CheckCircle, Wrench, X } from 'lucide-react';

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
    } catch (err: any) {
      console.error('Error loading field service data:', err);
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const dispatchWorkOrder = async (woId: number) => {
    try {
      await api.post(`/field-service/work-orders/${woId}/dispatch`);
      loadData();
    } catch (err: any) {
      console.error('Error dispatching work order:', err);
      setError(err.response?.data?.detail || 'Failed to dispatch work order');
    }
  };

  const completeWorkOrder = async (woId: number) => {
    try {
      await api.post(`/field-service/work-orders/${woId}/complete`);
      loadData();
    } catch (err: any) {
      console.error('Error completing work order:', err);
      setError(err.response?.data?.detail || 'Failed to complete work order');
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
    } catch (err: any) {
      console.error('Error creating:', err);
      setError(err.response?.data?.detail || 'Failed to create');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      dispatched: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
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

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Field Service</h1>
        <p style={{ color: '#6b7280' }}>Manage service requests and field work orders</p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'requests' ? '#2563eb' : 'transparent',
            color: activeTab === 'requests' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'requests' ? '2px solid #2563eb' : 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Service Requests
        </button>
        <button
          onClick={() => setActiveTab('workorders')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'workorders' ? '#2563eb' : 'transparent',
            color: activeTab === 'workorders' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'workorders' ? '2px solid #2563eb' : 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Work Orders
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <input
          type="text"
          placeholder={`Search by ${activeTab === 'requests' ? 'request' : 'work order'} number or customer...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '150px'
          }}
        >
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
        <button
          onClick={handleCreate}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={16} />
          Create {activeTab === 'requests' ? 'Request' : 'Work Order'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      ) : activeTab === 'requests' ? (
        filteredRequests.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ color: '#6b7280' }}>No service requests found</p>
          </div>
        ) : (
          <div style={{ 
            background: 'white', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Request #</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Reported</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((sr) => (
                  <tr key={sr.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{sr.request_number}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{sr.customer_name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{sr.request_type}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }} className={getPriorityColor(sr.priority)}>
                        {sr.priority}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }} className={getStatusColor(sr.status)}>
                        {sr.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {new Date(sr.reported_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDetails(sr)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredWorkOrders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ color: '#6b7280' }}>No work orders found</p>
          </div>
        ) : (
          <div style={{ 
            background: 'white', 
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>WO #</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Work Type</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Scheduled</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.map((wo) => (
                  <tr key={wo.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{wo.work_order_number}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{wo.customer_name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{wo.work_type}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }} className={getPriorityColor(wo.priority)}>
                        {wo.priority}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }} className={getStatusColor(wo.status)}>
                        {wo.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {wo.status === 'scheduled' && (
                          <button
                            onClick={() => dispatchWorkOrder(wo.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Send size={12} />
                            Dispatch
                          </button>
                        )}
                        {(wo.status === 'dispatched' || wo.status === 'in_progress') && (
                          <button
                            onClick={() => completeWorkOrder(wo.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <CheckCircle size={12} />
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem',
        marginTop: '2rem'
      }}>
        {activeTab === 'requests' ? (
          ['new', 'assigned', 'in_progress', 'completed'].map((status) => {
            const count = serviceRequests.filter(sr => sr.status === status).length;
            return (
              <div key={status} style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                  {status.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {count}
                </div>
              </div>
            );
          })
        ) : (
          ['scheduled', 'dispatched', 'in_progress', 'completed'].map((status) => {
            const count = workOrders.filter(wo => wo.status === status).length;
            return (
              <div key={status} style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                  {status.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {count}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/View Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxWidth: '500px',
              width: '95%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                {selectedItem ? 'View Details' : `Create ${activeTab === 'requests' ? 'Service Request' : 'Work Order'}`}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '0.25rem', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            {selectedItem ? (
              <div style={{ padding: '1.5rem' }}>
                {'request_number' in selectedItem ? (
                  <>
                    <p><strong>Request #:</strong> {selectedItem.request_number}</p>
                    <p><strong>Customer:</strong> {selectedItem.customer_name}</p>
                    <p><strong>Type:</strong> {selectedItem.request_type}</p>
                    <p><strong>Priority:</strong> {selectedItem.priority}</p>
                    <p><strong>Status:</strong> {selectedItem.status}</p>
                    <p><strong>Description:</strong> {selectedItem.description}</p>
                    <p><strong>Reported:</strong> {new Date(selectedItem.reported_date).toLocaleDateString()}</p>
                  </>
                ) : (
                  <>
                    <p><strong>WO #:</strong> {selectedItem.work_order_number}</p>
                    <p><strong>Customer:</strong> {selectedItem.customer_name}</p>
                    <p><strong>Work Type:</strong> {selectedItem.work_type}</p>
                    <p><strong>Priority:</strong> {selectedItem.priority}</p>
                    <p><strong>Status:</strong> {selectedItem.status}</p>
                    <p><strong>Scheduled:</strong> {selectedItem.scheduled_date ? new Date(selectedItem.scheduled_date).toLocaleDateString() : '-'}</p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Customer Name *</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  </div>
                  {activeTab === 'requests' ? (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Request Type</label>
                        <select
                          value={formData.request_type}
                          onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        >
                          <option value="repair">Repair</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="installation">Installation</option>
                          <option value="inspection">Inspection</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Work Type</label>
                        <select
                          value={formData.work_type}
                          onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        >
                          <option value="installation">Installation</option>
                          <option value="repair">Repair</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="inspection">Inspection</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Scheduled Date</label>
                        <input
                          type="date"
                          value={formData.scheduled_date}
                          onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        />
                      </div>
                    </>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '0.5rem 1rem', background: '#2563eb', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', color: 'white', cursor: 'pointer' }}
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
