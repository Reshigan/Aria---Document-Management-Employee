import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Search, Eye, Send, CheckCircle, Wrench } from 'lucide-react';

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
          onClick={() => {/* TODO: Open create modal */}}
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
                        onClick={() => {/* TODO: View details */}}
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
    </div>
  );
}
