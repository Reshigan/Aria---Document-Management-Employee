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
      const m = metricsRes.data || {};
      setMetrics({
        total_employees: m.total_employees ?? 0,
        active_employees: m.active_employees ?? m.total_employees ?? 0,
        departments: m.departments ?? m.total_departments ?? 0,
        avg_tenure_months: m.avg_tenure_months ?? 0,
        pending_leave_requests: m.pending_leave_requests ?? 0,
        attendance_rate: m.attendance_rate ?? 0,
        turnover_rate: m.turnover_rate ?? 0,
        open_positions: m.open_positions ?? 0
      });
      const actData = activityRes.data;
      setRecentActivity(Array.isArray(actData) ? actData : actData?.activities || actData?.data || []);
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
      case 'hire': return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'termination': return <UserX className="h-4 w-4 text-red-500" />;
      case 'leave': return <Calendar className="h-4 w-4 text-amber-500" />;
      case 'promotion': return <Award className="h-4 w-4 text-purple-500" />;
      default: return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8" data-testid="hr-dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
            <Users className="h-7 w-7 text-white" />
          </div>
          Human Resources Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage employees, departments, attendance, and leave requests
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link to="/hr/employees" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl  w-fit mb-4">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Employees</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Manage employee records</div>
          </div>
        </Link>
        <Link to="/hr/departments" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl  w-fit mb-4">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Departments</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Manage departments</div>
          </div>
        </Link>
        <Link to="/hr/attendance" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl  w-fit mb-4">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Attendance</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Track attendance</div>
          </div>
        </Link>
        <Link to="/hr/leave" className="group">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl  w-fit mb-4">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Leave Management</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Manage leave requests</div>
          </div>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.active_employees}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Employees</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{metrics.total_employees} total (incl. inactive)</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.departments}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Departments</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Active departments</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{Number(metrics.attendance_rate ?? 0).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Attendance Rate</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Last 30 days</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.pending_leave_requests}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending Leave</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Requests awaiting approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl ">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Math.floor(metrics.avg_tenure_months / 12)}y {metrics.avg_tenure_months % 12}m
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Average Tenure</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${metrics.turnover_rate > 15 ? 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30' : 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/30'}`}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-xl font-bold ${metrics.turnover_rate > 15 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {Number(metrics.turnover_rate ?? 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Turnover Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl ">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.open_positions}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Open Positions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No recent activity</div>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {activity.employee_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {activity.description}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
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
