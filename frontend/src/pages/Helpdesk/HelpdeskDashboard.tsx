import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Users, Clock, AlertCircle, CheckCircle, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import api from '../../lib/api';

interface DashboardData {
  total_tickets: number;
  open_tickets: number;
  unassigned_tickets: number;
  overdue_tickets: number;
  avg_response_time_hours: number;
  avg_resolution_time_hours: number;
  sla_achievement_rate: number;
  by_priority: Record<string, number>;
  by_stage: Record<string, number>;
}

export default function HelpdeskDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
    loadRecentTickets();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/dashboard');
      const d = response.data.data || response.data || {};
      setData({
        total_tickets: d.total_tickets || 0,
        open_tickets: d.open_tickets || 0,
        unassigned_tickets: d.unassigned_tickets || 0,
        overdue_tickets: d.overdue_tickets || 0,
        avg_response_time_hours: d.avg_response_time_hours || 0,
        avg_resolution_time_hours: d.avg_resolution_time_hours || 0,
        sla_achievement_rate: d.sla_achievement_rate || 0,
        by_priority: d.by_priority || {},
        by_stage: d.by_stage || {},
      });
    } catch {
      setData({
        total_tickets: 0, open_tickets: 0, unassigned_tickets: 0, overdue_tickets: 0,
        avg_response_time_hours: 0, avg_resolution_time_hours: 0, sla_achievement_rate: 0,
        by_priority: {}, by_stage: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTickets = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/tickets?limit=5');
      const d = response.data.data || response.data;
      const tickets = d.tickets || d || [];
      setRecentTickets(Array.isArray(tickets) ? tickets : []);
    } catch {
      setRecentTickets([]);
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-300">Loading helpdesk dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Tickets', value: data?.total_tickets || 0, icon: Ticket, color: 'from-blue-500 to-indigo-500', textColor: 'text-blue-600' },
    { label: 'Open Tickets', value: data?.open_tickets || 0, icon: Clock, color: 'from-orange-500 to-amber-500', textColor: 'text-orange-600' },
    { label: 'Unassigned', value: data?.unassigned_tickets || 0, icon: Users, color: 'from-purple-500 to-violet-500', textColor: 'text-purple-600' },
    { label: 'SLA Breached', value: data?.overdue_tickets || 0, icon: AlertCircle, color: 'from-red-500 to-rose-500', textColor: 'text-red-600' },
  ];

  const kpis = [
    { label: 'Avg Response Time', value: `${(data?.avg_response_time_hours || 0).toFixed(1)}h`, icon: Clock, color: 'text-blue-500' },
    { label: 'Avg Resolution Time', value: `${(data?.avg_resolution_time_hours || 0).toFixed(1)}h`, icon: CheckCircle, color: 'text-green-500' },
    { label: 'SLA Achievement', value: `${(data?.sla_achievement_rate || 0).toFixed(0)}%`, icon: TrendingUp, color: 'text-indigo-500' },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
            <Ticket className="h-7 w-7 text-white" />
          </div>
          Helpdesk Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-300 mt-1">Overview of support operations and SLA performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-gradient-to-br ${stat.color} rounded-xl`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <BarChart3 size={16} /> Tickets by Priority
          </h3>
          <div className="space-y-2">
            {Object.entries(data?.by_priority || {}).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[priority] || 'bg-gray-100 text-gray-800'}`}>
                  {priority}
                </span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((count as number) / Math.max(data?.total_tickets || 1, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count as number}</span>
              </div>
            ))}
            {Object.keys(data?.by_priority || {}).length === 0 && (
              <p className="text-sm text-gray-400">No ticket data yet</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <BarChart3 size={16} /> Tickets by Stage
          </h3>
          <div className="space-y-2">
            {Object.entries(data?.by_stage || {}).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300 w-28 truncate">{stage}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, ((count as number) / Math.max(data?.total_tickets || 1, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count as number}</span>
              </div>
            ))}
            {Object.keys(data?.by_stage || {}).length === 0 && (
              <p className="text-sm text-gray-400">No stage data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Tickets</h3>
          <button
            onClick={() => navigate('/helpdesk/tickets')}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Ticket</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Subject</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Priority</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentTickets.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => navigate('/helpdesk/tickets')}>
                  <td className="px-4 py-2 text-sm font-semibold text-blue-600">#{t.ticket_number}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{t.subject}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[t.priority] || 'bg-gray-100 text-gray-800'}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {t.stage_name || 'New'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {recentTickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No tickets yet. Create your first support ticket!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <button onClick={() => navigate('/helpdesk/tickets')} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all text-left">
          <Ticket className="h-8 w-8 text-blue-500 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Tickets</h3>
          <p className="text-xs text-gray-500 dark:text-gray-300">Create and manage support tickets</p>
        </button>
        <button onClick={() => navigate('/helpdesk/teams')} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all text-left">
          <Users className="h-8 w-8 text-purple-500 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Teams</h3>
          <p className="text-xs text-gray-500 dark:text-gray-300">Organize support teams and agents</p>
        </button>
        <button onClick={() => navigate('/helpdesk/knowledge-base')} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all text-left">
          <BarChart3 className="h-8 w-8 text-green-500 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Knowledge Base</h3>
          <p className="text-xs text-gray-500 dark:text-gray-300">Articles and self-service resources</p>
        </button>
      </div>
    </div>
  );
}
