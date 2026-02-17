import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BarChart3, RefreshCw, AlertCircle, X, DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  fiscal_year: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  total_amount: number;
  start_date: string;
  end_date: string;
}

interface BudgetVsActualReport {
  budget_id: string;
  budget_name: string;
  fiscal_year: number;
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_percent: number;
  periods: Array<{ period: number; budget: number; actual: number; variance: number }>;
  by_account: Array<{ gl_account_id: string; gl_account_code: string; gl_account_name: string; department_name: string | null; budget_amount: number; actual_amount: number; variance_amount: number; variance_percent: number; is_favorable: boolean }>;
  by_department: Array<{ department_id: string | null; department_name: string | null; budget: number; actual: number; variance: number }>;
}

interface VarianceAlert {
  budget_id: string;
  budget_name: string;
  gl_account_code: string;
  gl_account_name: string;
  budget_amount: number;
  actual_amount: number;
  variance_percent: number;
  alert_type: 'over_budget' | 'significantly_under';
}

export default function BudgetVsActual() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [report, setReport] = useState<BudgetVsActualReport | null>(null);
  const [alerts, setAlerts] = useState<VarianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'by_account' | 'by_department'>('summary');

  useEffect(() => { fetchBudgets(); fetchAlerts(); }, []);
  useEffect(() => { if (selectedBudget) fetchReport(selectedBudget); }, [selectedBudget]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/xero/budgets');
      const activeBudgets = (response.data.budgets || []).filter((b: Budget) => b.status === 'active' || b.status === 'approved');
      setBudgets(activeBudgets);
      if (activeBudgets.length > 0 && !selectedBudget) setSelectedBudget(activeBudgets[0].id);
    } catch (err) { setError('Failed to load budgets'); } finally { setLoading(false); }
  };

  const fetchReport = async (budgetId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/xero/budgets/${budgetId}/vs-actual`);
      setReport(response.data);
    } catch (err) { setError('Failed to load budget vs actual report'); } finally { setLoading(false); }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/xero/budgets/alerts?threshold=10');
      setAlerts(response.data.alerts || []);
    } catch (err) { console.error('Failed to load alerts:', err); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${Number(value ?? 0).toFixed(1)}%`;

  const getVarianceColor = (variance: number, isFavorable: boolean) => {
    if (Math.abs(variance) < 5) return 'text-gray-600 dark:text-gray-300';
    return isFavorable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (percent: number) => {
    if (percent <= 80) return 'from-green-500 to-emerald-500';
    if (percent <= 100) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Budget vs Actual</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Compare budgeted amounts against actual spending</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedBudget} onChange={(e) => setSelectedBudget(e.target.value)} className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-white">
              {budgets.map((budget) => (<option key={budget.id} value={budget.id}>{budget.name} ({budget.fiscal_year})</option>))}
            </select>
            <button onClick={() => fetchReport(selectedBudget)} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        {alerts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3"><AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" /><h3 className="font-semibold text-amber-800 dark:text-amber-300">Variance Alerts ({alerts.length})</h3></div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm"><span className="text-amber-700 dark:text-amber-400">{alert.gl_account_code} - {alert.gl_account_name}</span><span className={alert.alert_type === 'over_budget' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400'}>{formatPercent(alert.variance_percent)} ({alert.alert_type === 'over_budget' ? 'Over Budget' : 'Under Budget'})</span></div>
              ))}
            </div>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
                <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl "><BarChart3 className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(report.total_budget)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Budget</p></div></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
                <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(report.total_actual)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Actual</p></div></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
                <div className="flex items-center gap-3"><div className={`p-2 bg-gradient-to-br ${report.total_variance >= 0 ? 'from-green-500 to-emerald-500 shadow-green-500/30' : 'from-red-500 to-rose-500 shadow-red-500/30'} rounded-lg`}>{report.total_variance >= 0 ? <TrendingUp className="h-5 w-5 text-white" /> : <TrendingDown className="h-5 w-5 text-white" />}</div><div><p className={`text-2xl font-bold ${report.total_variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(report.total_variance)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Variance</p></div></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
                <div className="flex items-center gap-3"><div className={`p-2 bg-gradient-to-br ${report.variance_percent >= 0 ? 'from-green-500 to-emerald-500 shadow-green-500/30' : 'from-red-500 to-rose-500 shadow-red-500/30'} rounded-lg`}>{report.variance_percent >= 0 ? <CheckCircle className="h-5 w-5 text-white" /> : <AlertTriangle className="h-5 w-5 text-white" />}</div><div><p className={`text-2xl font-bold ${report.variance_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPercent(report.variance_percent)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Variance %</p></div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-3"><span>Budget Utilization</span><span className="font-semibold">{Number(((report.total_actual / report.total_budget) * 100) || 0).toFixed(1)}%</span></div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden"><div className={`h-4 rounded-full bg-gradient-to-r ${getProgressColor((report.total_actual / report.total_budget) * 100)} transition-all`} style={{ width: `${Math.min((report.total_actual / report.total_budget) * 100, 100)}%` }}></div></div>
            </div>

            <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700 w-fit">
              <button onClick={() => setViewMode('summary')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'summary' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Summary</button>
              <button onClick={() => setViewMode('by_account')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'by_account' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>By Account</button>
              <button onClick={() => setViewMode('by_department')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'by_department' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>By Department</button>
            </div>

            {viewMode === 'summary' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Breakdown</h3>
                <div className="grid grid-cols-12 gap-2">
                  {report.periods.map((period) => (
                    <div key={period.period} className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">M{period.period}</div>
                      <div className="h-32 flex flex-col justify-end"><div className="bg-gradient-to-t from-violet-500 to-purple-400 rounded-t" style={{ height: `${(period.budget / Math.max(...report.periods.map(p => p.budget))) * 100}%` }} title={`Budget: ${formatCurrency(period.budget)}`}></div></div>
                      <div className="text-xs mt-1 text-gray-600 dark:text-gray-300">{formatCurrency(period.budget / 1000)}k</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'by_account' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Budget</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actual</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Variance</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Variance %</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {report.by_account.map((account, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4"><div className="font-semibold text-gray-900 dark:text-white">{account.gl_account_code}</div><div className="text-xs text-gray-500 dark:text-gray-300">{account.gl_account_name}</div></td>
                          <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(account.budget_amount)}</td>
                          <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(account.actual_amount)}</td>
                          <td className={`px-6 py-4 text-right font-semibold ${getVarianceColor(account.variance_percent, account.is_favorable)}`}>{formatCurrency(account.variance_amount)}</td>
                          <td className={`px-6 py-4 text-right font-semibold ${getVarianceColor(account.variance_percent, account.is_favorable)}`}>{formatPercent(account.variance_percent)}</td>
                          <td className="px-6 py-4">{account.is_favorable ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"><CheckCircle className="h-3.5 w-3.5" />On Track</span> : Math.abs(account.variance_percent) > 10 ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"><AlertTriangle className="h-3.5 w-3.5" />Over Budget</span> : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"><AlertCircle className="h-3.5 w-3.5" />Warning</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'by_department' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Budget</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actual</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Variance</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Utilization</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {report.by_department.map((dept, idx) => {
                        const utilization = dept.budget > 0 ? (dept.actual / dept.budget) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{dept.department_name || 'Unassigned'}</td>
                            <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(dept.budget)}</td>
                            <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(dept.actual)}</td>
                            <td className={`px-6 py-4 text-right font-semibold ${dept.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(dept.variance)}</td>
                            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(utilization)}`} style={{ width: `${Math.min(utilization, 100)}%` }}></div></div><span className="text-sm text-gray-600 dark:text-gray-300">{Number(utilization ?? 0).toFixed(0)}%</span></div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!report && budgets.length === 0 && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><BarChart3 className="h-8 w-8 text-gray-300" /></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No active budgets found</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-6">Create a budget to get started</p>
            <a href="/financial/budget-management" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all inline-block">Create Budget</a>
          </div>
        )}

        {loading && !report && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-300">Loading budget data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
