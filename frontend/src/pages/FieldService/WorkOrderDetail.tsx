import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './FieldService.css';

interface WorkOrder {
  id: string;
  request_number: string;
  customer_id: string;
  customer_name: string;
  description: string;
  status: string;
  priority: string;
  assigned_technician_id: string;
  technician_name: string;
  scheduled_date: string;
  completed_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface TimeEntry {
  id: string;
  technician_name: string;
  start_time: string;
  end_time: string;
  hours: number;
  description: string;
}

interface PartsUsed {
  id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export const WorkOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [partsUsed, setPartsUsed] = useState<PartsUsed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrder();
    fetchTimeEntries();
    fetchPartsUsed();
  }, [id]);

  const fetchWorkOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/work-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkOrder(data);
      }
    } catch (error) {
      console.error('Error fetching work order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/work-orders/${id}/time-entries`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data.time_entries || []);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchPartsUsed = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/work-orders/${id}/parts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPartsUsed(data.parts || []);
      }
    } catch (error) {
      console.error('Error fetching parts used:', error);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this work order as completed?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/work-orders/${id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchWorkOrder();
      }
    } catch (error) {
      console.error('Error completing work order:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this work order?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/work-orders/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });

      if (response.ok) {
        fetchWorkOrder();
      }
    } catch (error) {
      console.error('Error cancelling work order:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading work order...</div>;
  }

  if (!workOrder) {
    return <div className="empty-state">Work order not found</div>;
  }

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalPartsCost = partsUsed.reduce((sum, part) => sum + part.total_cost, 0);

  return (
    <div className="work-order-detail">
      <div className="page-header">
        <div>
          <Link to="/field-service/orders" className="back-link">
            <ArrowLeft size={20} />
            <span>Back to Work Orders</span>
          </Link>
          <h1>Work Order {workOrder.request_number}</h1>
        </div>
        <div className="header-actions">
          {workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
            <>
              <button onClick={handleComplete} className="btn btn-success">
                <CheckCircle size={20} />
                <span>Complete</span>
              </button>
              <button onClick={handleCancel} className="btn btn-danger">
                <XCircle size={20} />
                <span>Cancel</span>
              </button>
              <Link to={`/field-service/orders/${id}/edit`} className="btn btn-primary">
                <Edit size={20} />
                <span>Edit</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h2>Work Order Details</h2>
          <div className="detail-row">
            <label>Order Number</label>
            <span>{workOrder.request_number}</span>
          </div>
          <div className="detail-row">
            <label>Customer</label>
            <span>{workOrder.customer_name || '-'}</span>
          </div>
          <div className="detail-row">
            <label>Status</label>
            <span className={`status-badge ${workOrder.status}`}>
              {workOrder.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="detail-row">
            <label>Priority</label>
            <span className={`priority-badge ${workOrder.priority}`}>
              {workOrder.priority}
            </span>
          </div>
          <div className="detail-row">
            <label>Assigned Technician</label>
            <span>{workOrder.technician_name || 'Unassigned'}</span>
          </div>
          <div className="detail-row">
            <label>Scheduled Date</label>
            <span>{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleString() : '-'}</span>
          </div>
          {workOrder.completed_date && (
            <div className="detail-row">
              <label>Completed Date</label>
              <span>{new Date(workOrder.completed_date).toLocaleString()}</span>
            </div>
          )}
          <div className="detail-row">
            <label>Description</label>
            <span>{workOrder.description}</span>
          </div>
          {workOrder.notes && (
            <div className="detail-row">
              <label>Notes</label>
              <span>{workOrder.notes}</span>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h2>Summary</h2>
          <div className="summary-stats">
            <div className="summary-stat">
              <Clock size={24} />
              <div>
                <p className="stat-value">{totalHours.toFixed(2)}</p>
                <p className="stat-label">Total Hours</p>
              </div>
            </div>
            <div className="summary-stat">
              <User size={24} />
              <div>
                <p className="stat-value">{timeEntries.length}</p>
                <p className="stat-label">Time Entries</p>
              </div>
            </div>
            <div className="summary-stat">
              <Calendar size={24} />
              <div>
                <p className="stat-value">${totalPartsCost.toFixed(2)}</p>
                <p className="stat-label">Parts Cost</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-sections">
        <div className="detail-section">
          <div className="section-header">
            <h2>Time Entries</h2>
            <button className="btn btn-secondary btn-sm">Add Time Entry</button>
          </div>
          {timeEntries.length === 0 ? (
            <p className="empty-message">No time entries recorded</p>
          ) : (
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Hours</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.technician_name}</td>
                    <td>{new Date(entry.start_time).toLocaleString()}</td>
                    <td>{new Date(entry.end_time).toLocaleString()}</td>
                    <td>{entry.hours.toFixed(2)}</td>
                    <td>{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="detail-section">
          <div className="section-header">
            <h2>Parts Used</h2>
            <button className="btn btn-secondary btn-sm">Add Parts</button>
          </div>
          {partsUsed.length === 0 ? (
            <p className="empty-message">No parts used</p>
          ) : (
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {partsUsed.map((part) => (
                  <tr key={part.id}>
                    <td>{part.item_name}</td>
                    <td>{part.quantity}</td>
                    <td>${part.unit_cost.toFixed(2)}</td>
                    <td>${part.total_cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkOrderDetail;
