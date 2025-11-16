import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Users, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './FieldService.css';

interface DashboardStats {
  total_work_orders: number;
  open_work_orders: number;
  in_progress_work_orders: number;
  completed_today: number;
  active_technicians: number;
  scheduled_today: number;
}

export const FieldServiceDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_work_orders: 0,
    open_work_orders: 0,
    in_progress_work_orders: 0,
    completed_today: 0,
    active_technicians: 0,
    scheduled_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/field-service/dashboard/stats?company_id=${user?.company_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Work Orders',
      value: stats.total_work_orders,
      icon: <Wrench size={24} />,
      color: '#6366f1',
      link: '/field-service/orders',
    },
    {
      title: 'Open Orders',
      value: stats.open_work_orders,
      icon: <AlertCircle size={24} />,
      color: '#f59e0b',
      link: '/field-service/orders?status=open',
    },
    {
      title: 'In Progress',
      value: stats.in_progress_work_orders,
      icon: <Clock size={24} />,
      color: '#3b82f6',
      link: '/field-service/orders?status=in_progress',
    },
    {
      title: 'Completed Today',
      value: stats.completed_today,
      icon: <CheckCircle size={24} />,
      color: '#10b981',
      link: '/field-service/orders?status=completed',
    },
    {
      title: 'Active Technicians',
      value: stats.active_technicians,
      icon: <Users size={24} />,
      color: '#8b5cf6',
      link: '/field-service/technicians',
    },
    {
      title: 'Scheduled Today',
      value: stats.scheduled_today,
      icon: <Calendar size={24} />,
      color: '#14b8a6',
      link: '/field-service/scheduling',
    },
  ];

  if (loading) {
    return (
      <div className="field-service-dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="field-service-dashboard">
      <div className="dashboard-header">
        <h1>Field Service Dashboard</h1>
        <p>Manage work orders, technicians, and service scheduling</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <Link key={index} to={card.link} className="stat-card" style={{ borderLeftColor: card.color }}>
            <div className="stat-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <h3>{card.title}</h3>
              <p className="stat-value">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/field-service/orders/new" className="action-button primary">
            <Wrench size={20} />
            <span>Create Work Order</span>
          </Link>
          <Link to="/field-service/technicians/new" className="action-button secondary">
            <Users size={20} />
            <span>Add Technician</span>
          </Link>
          <Link to="/field-service/scheduling" className="action-button secondary">
            <Calendar size={20} />
            <span>View Schedule</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FieldServiceDashboard;
