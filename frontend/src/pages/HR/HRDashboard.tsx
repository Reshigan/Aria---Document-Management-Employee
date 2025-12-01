import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Users, Briefcase, Calendar, TrendingUp, UserCheck, UserX, Clock, Award } from 'lucide-react';

interface HRMetrics {
  total_employees: number;
  active_employees: number;
  departments: number;
  avg_tenure_months: number;
  pending_leave_requests: number;
  attendance_rate: number;
  turnover_rate: number;
  open_positions: number;
}

interface RecentActivity {
  id: number;
  type: 'hire' | 'termination' | 'leave' | 'promotion';
  employee_name: string;
  description: string;
  date: string;
}

const HRDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HRMetrics>({
    total_employees: 0,
    active_employees: 0,
    departments: 0,
    avg_tenure_months: 0,
    pending_leave_requests: 0,
    attendance_rate: 0,
    turnover_rate: 0,
    open_positions: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, activityRes] = await Promise.all([
        api.get('/hr/metrics'),
        api.get('/hr/recent-activity')
      ]);
      setMetrics(metricsRes.data);
      setRecentActivity(activityRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load HR dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'hire': return <UserCheck size={16} style={{ color: '#10b981' }} />;
      case 'termination': return <UserX size={16} style={{ color: '#ef4444' }} />;
      case 'leave': return <Calendar size={16} style={{ color: '#f59e0b' }} />;
      case 'promotion': return <Award size={16} style={{ color: '#8b5cf6' }} />;
      default: return <Users size={16} />;
    }
  };

  return (
    <div style={{ padding: '24px' }} data-testid="hr-dashboard">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          Human Resources Dashboard
        </h1>
        <p style={{ color: '#6b7280' }}>
          Manage employees, departments, attendance, and leave requests
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Link to="/hr/employees" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}>
            <Users size={24} style={{ color: '#2563eb', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Employees</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Manage employee records</div>
          </div>
        </Link>
        <Link to="/hr/departments" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}>
            <Briefcase size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Departments</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Manage departments</div>
          </div>
        </Link>
        <Link to="/hr/attendance" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}>
            <Clock size={24} style={{ color: '#f59e0b', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Attendance</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Track attendance</div>
          </div>
        </Link>
        <Link to="/hr/leave" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}>
            <Calendar size={24} style={{ color: '#8b5cf6', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Leave Management</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Manage leave requests</div>
          </div>
        </Link>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Employees</div>
            <Users size={20} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{metrics.active_employees}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {metrics.total_employees} total (incl. inactive)
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Departments</div>
            <Briefcase size={20} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{metrics.departments}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Active departments
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Attendance Rate</div>
            <TrendingUp size={20} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {metrics.attendance_rate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Last 30 days
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending Leave</div>
            <Calendar size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {metrics.pending_leave_requests}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Requests awaiting approval
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Average Tenure</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            {Math.floor(metrics.avg_tenure_months / 12)} years {metrics.avg_tenure_months % 12} months
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Turnover Rate</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: metrics.turnover_rate > 15 ? '#ef4444' : '#111827' }}>
            {metrics.turnover_rate.toFixed(1)}%
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Open Positions</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            {metrics.open_positions}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
          Recent Activity
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
        ) : recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No recent activity</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px'
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {activity.employee_name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {activity.description}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                  {formatDate(activity.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
