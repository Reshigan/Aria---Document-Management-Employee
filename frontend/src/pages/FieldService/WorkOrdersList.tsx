import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './FieldService.css';

interface WorkOrder {
  id: string;
  request_number: string;
  customer_name: string;
  description: string;
  status: string;
  priority: string;
  technician_name: string;
  scheduled_date: string;
  created_at: string;
}

export const WorkOrdersList: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, priorityFilter]);

  const fetchWorkOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `/api/field-service/work-orders?company_id=${user?.company_id}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.work_orders || []);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work order?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/work-orders/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchWorkOrders();
      }
    } catch (error) {
      console.error('Error deleting work order:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading work orders...</div>;
  }

  return (
    <div className="work-orders-list">
      <div className="page-header">
        <h1>Work Orders</h1>
        <div className="header-actions">
          <Link to="/field-service/orders/new" className="btn btn-primary">
            <Plus size={20} />
            <span>New Work Order</span>
          </Link>
        </div>
      </div>

      <div className="filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="data-table">
        {workOrders.length === 0 ? (
          <div className="empty-state">
            <p>No work orders found</p>
            <Link to="/field-service/orders/new" className="btn btn-primary">
              Create your first work order
            </Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Description</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Technician</th>
                <th>Scheduled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/field-service/orders/${order.id}`} className="link">
                      {order.request_number}
                    </Link>
                  </td>
                  <td>{order.customer_name || '-'}</td>
                  <td>{order.description?.substring(0, 50)}...</td>
                  <td>
                    <span className={`status-badge ${order.status}`}>
                      {order.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge ${order.priority}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td>{order.technician_name || 'Unassigned'}</td>
                  <td>{order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/field-service/orders/${order.id}`} className="btn-icon" title="View">
                        <Eye size={18} />
                      </Link>
                      <Link to={`/field-service/orders/${order.id}/edit`} className="btn-icon" title="Edit">
                        <Edit size={18} />
                      </Link>
                      <button onClick={() => handleDelete(order.id)} className="btn-icon" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersList;
