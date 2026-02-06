import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Plus, Search, Filter, Download, Upload, 
  CheckCircle, XCircle, Clock, AlertCircle, TrendingUp,
  Activity, Calendar, FileText, Target, Zap
} from 'lucide-react';

interface KPI {
  id: string;
  kpi_name: string;
  kpi_category: string;
  calculation_method: string;
  target_value: number;
  unit: string;
  is_active: boolean;
  current_value?: number;
  variance?: number;
}

interface Dashboard {
  id: string;
  dashboard_name: string;
  dashboard_type: string;
  layout_config: any;
  is_default: boolean;
  is_active: boolean;
}

interface ScheduledReport {
  id: string;
  report_name: string;
  report_type: string;
  schedule_cron: string;
  recipients: string[];
  last_run_at?: string;
  next_run_at?: string;
  is_active: boolean;
}

interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  profit: number;
  profit_margin: number;
  outstanding_ar: number;
  outstanding_ap: number;
}

type TabType = 'kpis' | 'dashboards' | 'scheduled-reports' | 'analytics';

const ComprehensiveReporting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('kpis');
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const companyId = localStorage.getItem('selectedCompanyId') || '';

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      switch (activeTab) {
        case 'kpis':
          const API_BASE_KPIS = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
          const kpisRes = await fetch(`${API_BASE_KPIS}/api/erp/reporting/kpis?company_id=${companyId}`, { headers });
          if (kpisRes.ok) {
            const data = await kpisRes.json();
            setKpis(data.kpis || []);
          }
          break;
        case 'dashboards':
          const API_BASE_DASH = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
          const dashboardsRes = await fetch(`${API_BASE_DASH}/api/erp/reporting/dashboards?company_id=${companyId}`, { headers });
          if (dashboardsRes.ok) {
            const data = await dashboardsRes.json();
            setDashboards(data.dashboards || []);
          }
          break;
        case 'scheduled-reports':
          const API_BASE_REPORTS = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
          const reportsRes = await fetch(`${API_BASE_REPORTS}/api/erp/reporting/scheduled-reports?company_id=${companyId}`, { headers });
          if (reportsRes.ok) {
            const data = await reportsRes.json();
            setScheduledReports(data.scheduled_reports || []);
          }
          break;
        case 'analytics':
          const API_BASE_ANALYTICS = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          const analyticsRes = await fetch(
            `${API_BASE_ANALYTICS}/api/erp/reporting/analytics/financial-summary?company_id=${companyId}&period_start=${firstDay.toISOString().split('T')[0]}&period_end=${lastDay.toISOString().split('T')[0]}`,
            { headers }
          );
          if (analyticsRes.ok) {
            const data = await analyticsRes.json();
            setFinancialSummary(data);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      active: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
      inactive: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100', icon: <XCircle className="w-3 h-3" /> },
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', icon: <Clock className="w-3 h-3" /> }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      financial: 'bg-blue-100 text-blue-800',
      operational: 'bg-green-100 text-green-800',
      sales: 'bg-purple-100 text-purple-800',
      inventory: 'bg-orange-100 text-orange-800',
      hr: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const renderKPIs = () => {
    const filteredKpis = kpis.filter(kpi => {
      const matchesSearch = kpi.kpi_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || kpi.kpi_category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="hr">HR</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New KPI
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKpis.map((kpi) => (
            <div key={kpi.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{kpi.kpi_name}</h4>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${getCategoryColor(kpi.kpi_category)}`}>
                    {kpi.kpi_category}
                  </span>
                </div>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Target:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {kpi.target_value?.toLocaleString()} {kpi.unit}
                  </span>
                </div>
                {kpi.current_value !== undefined && (
                  <>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Current:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {kpi.current_value.toLocaleString()} {kpi.unit}
                      </span>
                    </div>
                    {kpi.variance !== undefined && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Variance:</span>
                        <span className={`text-sm font-medium ${kpi.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {kpi.variance >= 0 ? '+' : ''}{kpi.variance.toLocaleString()} {kpi.unit}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                <button className="flex-1 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:bg-blue-900/30">
                  Calculate
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700">
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredKpis.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No KPIs found</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
              Create Your First KPI
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDashboards = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dashboards</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((dashboard) => (
          <div key={dashboard.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{dashboard.dashboard_name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{dashboard.dashboard_type}</p>
                </div>
              </div>
              {dashboard.is_default && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">Default</span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Layout:</span>
                <span className="font-medium">
                  {dashboard.layout_config?.columns || 3} × {dashboard.layout_config?.rows || 3}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                {getStatusBadge(dashboard.is_active ? 'active' : 'inactive')}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-100 dark:bg-purple-900/30">
                View Dashboard
              </button>
              <button className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {dashboards.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No dashboards configured</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
            Create Your First Dashboard
          </button>
        </div>
      )}
    </div>
  );

  const renderScheduledReports = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scheduled Reports</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Scheduled Report
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Report Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recipients</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Run</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Run</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {scheduledReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{report.report_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{report.report_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{report.schedule_cron}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{report.recipients.length} recipient(s)</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {report.last_run_at ? new Date(report.last_run_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {report.next_run_at ? new Date(report.next_run_at).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(report.is_active ? 'active' : 'inactive')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-3">Run Now</button>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if (!financialSummary) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Financial Analytics</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  R {financialSummary.total_revenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  R {financialSummary.total_expenses.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Activity className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  R {financialSummary.profit.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Margin: {financialSummary.profit_margin.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding AR</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  R {financialSummary.outstanding_ar.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding AP</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  R {financialSummary.outstanding_ap.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Working Capital</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  R {(financialSummary.outstanding_ar - financialSummary.outstanding_ap).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Analytics Insights</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Your profit margin is {financialSummary.profit_margin.toFixed(1)}%. 
                {financialSummary.profit_margin < 20 && ' Consider reviewing expenses to improve profitability.'}
                {financialSummary.profit_margin >= 20 && financialSummary.profit_margin < 40 && ' You have a healthy profit margin.'}
                {financialSummary.profit_margin >= 40 && ' Excellent profit margin! Keep up the good work.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Please select a company to view reporting data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Comprehensive Reporting</h1>
          <p className="text-gray-600 dark:text-gray-400">KPIs, dashboards, scheduled reports, and analytics</p>
        </div>
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`${
              activeTab === 'kpis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Target className="w-4 h-4" />
            KPIs
          </button>
          <button
            onClick={() => setActiveTab('dashboards')}
            className={`${
              activeTab === 'dashboards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboards
          </button>
          <button
            onClick={() => setActiveTab('scheduled-reports')}
            className={`${
              activeTab === 'scheduled-reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Calendar className="w-4 h-4" />
            Scheduled Reports
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Activity className="w-4 h-4" />
            Analytics
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'kpis' && renderKPIs()}
          {activeTab === 'dashboards' && renderDashboards()}
          {activeTab === 'scheduled-reports' && renderScheduledReports()}
          {activeTab === 'analytics' && renderAnalytics()}
        </>
      )}
    </div>
  );
};

export default ComprehensiveReporting;
