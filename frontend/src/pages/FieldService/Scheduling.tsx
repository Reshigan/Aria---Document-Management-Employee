import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './FieldService.css';

interface ScheduledOrder {
  id: string;
  request_number: string;
  customer_name: string;
  description: string;
  technician_name: string;
  scheduled_date: string;
  status: string;
  priority: string;
}

export const Scheduling: React.FC = () => {
  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchScheduledOrders();
  }, [selectedDate]);

  const fetchScheduledOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/field-service/work-orders?company_id=${user?.company_id}&status=scheduled&date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScheduledOrders(data.work_orders || []);
      }
    } catch (error) {
      console.error('Error fetching scheduled orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByTechnician = () => {
    const grouped: { [key: string]: ScheduledOrder[] } = {};
    scheduledOrders.forEach((order) => {
      const tech = order.technician_name || 'Unassigned';
      if (!grouped[tech]) grouped[tech] = [];
      grouped[tech].push(order);
    });
    return grouped;
  };

  const groupedOrders = groupByTechnician();

  if (loading) {
    return <div className="loading">Loading schedule...</div>;
  }

  return (
    <div className="work-orders-list">
      <div className="page-header">
        <h1>Service Scheduling</h1>
        <div className="header-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        </div>
      </div>

      <div className="scheduling-view">
        {Object.keys(groupedOrders).length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>No scheduled work orders for {new Date(selectedDate).toLocaleDateString()}</p>
            <Link to="/field-service/orders/new" className="btn btn-primary">
              Create Work Order
            </Link>
          </div>
        ) : (
          <div className="technician-schedules">
            {Object.entries(groupedOrders).map(([techName, orders]) => (
              <div key={techName} className="technician-schedule-card">
                <div className="schedule-header">
                  <User size={20} />
                  <h3>{techName}</h3>
                  <span className="order-count">{orders.length} orders</span>
                </div>
                <div className="schedule-orders">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/field-service/orders/${order.id}`}
                      className="schedule-order-card"
                    >
                      <div className="order-time">
                        <Clock size={16} />
                        <span>{new Date(order.scheduled_date).toLocaleTimeString()}</span>
                      </div>
                      <div className="order-info">
                        <h4>{order.request_number}</h4>
                        <p>{order.customer_name}</p>
                        <p className="order-description">{order.description?.substring(0, 60)}...</p>
                      </div>
                      <div className="order-badges">
                        <span className={`status-badge ${order.status}`}>
                          {order.status?.replace('_', ' ')}
                        </span>
                        <span className={`priority-badge ${order.priority}`}>
                          {order.priority}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduling;
