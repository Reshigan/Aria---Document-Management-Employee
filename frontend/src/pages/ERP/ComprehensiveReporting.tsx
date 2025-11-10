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
          const kpisRes = await fetch(`/api/erp/reporting/kpis?company_id=${companyId}`, { headers });
          if (kpisRes.ok) {
            const data = await kpisRes.json();
            setKpis(data.kpis || []);
          }
          break;
        case 'dashboards':
          const dashboardsRes = await fetch(`/api/erp/reporting/dashboards?company_id=${companyId}`, { headers });
          if (dashboardsRes.ok) {
            const data = await dashboardsRes.json();
            setDashboards(data.dashboards || []);
          }
          break;
        case 'scheduled-reports':
          const reportsRes = await fetch(`/api/erp/reporting/scheduled-reports?company_id=${companyId}`, { headers });
          if (reportsRes.ok) {
            const data = await reportsRes.json();
            setScheduledReports(data.scheduled_reports || []);
          }
          break;
        case 'analytics':
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          const analyticsRes = await fetch(
            `/api/erp/reporting/analytics/financial-summary?company_id=${companyId}&period_start=${firstDay.toISOString().split('T')[0]}&period_end=${lastDay.toISOString().split('T')[0]}`,
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
      active: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="w-3 h-3" /> },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> }
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="hr">HR</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New KPI
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKpis.map((kpi) => (
            <div key={kpi.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{kpi.kpi_name}</h4>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${getCategoryColor(kpi.kpi_category)}`}>
                    {kpi.kpi_category}
                  </span>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">Target:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {kpi.target_value?.toLocaleString()} {kpi.unit}
                  </span>
                </div>
                {kpi.current_value !== undefined && (
                  <>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-500">Current:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {kpi.current_value.toLocaleString()} {kpi.unit}
                      </span>
                    </div>
                    {kpi.variance !== undefined && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">Variance:</span>
                        <span className={`text-sm font-medium ${kpi.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {kpi.variance >= 0 ? '+' : ''}{kpi.variance.toLocaleString()} {kpi.unit}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                  Calculate
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredKpis.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No KPIs found</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((dashboard) => (
          <div key={dashboard.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{dashboard.dashboard_name}</h4>
                  <p className="text-sm text-gray-500">{dashboard.dashboard_type}</p>
                </div>
              </div>
              {dashboard.is_default && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Default</span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Layout:</span>
                <span className="font-medium">
                  {dashboard.layout_config?.columns || 3} × {dashboard.layout_config?.rows || 3}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status:</span>
                {getStatusBadge(dashboard.is_active ? 'active' : 'inactive')}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100">
                View Dashboard
              </button>
              <button className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {dashboards.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No dashboards configured</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Scheduled Report
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scheduledReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.report_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.report_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{report.schedule_cron}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{report.recipients.length} recipient(s)</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.last_run_at ? new Date(report.last_run_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.next_run_at ? new Date(report.next_run_at).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(report.is_active ? 'active' : 'inactive')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Run Now</button>
                  <button className="text-blue-600 hover:text-blue-900">Edit</button>
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Financial Analytics</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  R {financialSummary.total_revenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  R {financialSummary.total_expenses.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Profit</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  R {financialSummary.profit.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Margin: {financialSummary.profit_margin.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding AR</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  R {financialSummary.outstanding_ar.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding AP</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  R {financialSummary.outstanding_ap.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Working Capital</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  R {(financialSummary.outstanding_ar - financialSummary.outstanding_ap).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Analytics Insights</h4>
              <p className="text-sm text-blue-800 mt-1">
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
          <p className="text-gray-600">Please select a company to view reporting data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprehensive Reporting</h1>
          <p className="text-gray-600">KPIs, dashboards, scheduled reports, and analytics</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
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
