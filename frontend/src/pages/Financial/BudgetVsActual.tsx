import { useState, useEffect } from 'react';
import api from '../../services/api';

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
  periods: Array<{
    period: number;
    budget: number;
    actual: number;
    variance: number;
  }>;
  by_account: Array<{
    gl_account_id: string;
    gl_account_code: string;
    gl_account_name: string;
    department_name: string | null;
    budget_amount: number;
    actual_amount: number;
    variance_amount: number;
    variance_percent: number;
    is_favorable: boolean;
  }>;
  by_department: Array<{
    department_id: string | null;
    department_name: string | null;
    budget: number;
    actual: number;
    variance: number;
  }>;
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

  useEffect(() => {
    fetchBudgets();
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      fetchReport(selectedBudget);
    }
  }, [selectedBudget]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/xero/budgets');
      const activeBudgets = (response.data.budgets || []).filter((b: Budget) => 
        b.status === 'active' || b.status === 'approved'
      );
      setBudgets(activeBudgets);
      if (activeBudgets.length > 0 && !selectedBudget) {
        setSelectedBudget(activeBudgets[0].id);
      }
    } catch (err) {
      setError('Failed to load budgets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (budgetId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/xero/budgets/${budgetId}/vs-actual`);
      setReport(response.data);
    } catch (err) {
      setError('Failed to load budget vs actual report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/xero/budgets/alerts?threshold=10');
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getVarianceColor = (variance: number, isFavorable: boolean) => {
    if (Math.abs(variance) < 5) return 'text-gray-600';
    return isFavorable ? 'text-green-600' : 'text-red-600';
  };

  const getProgressColor = (percent: number) => {
    if (percent <= 80) return 'bg-green-500';
    if (percent <= 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget vs Actual</h1>
          <p className="text-gray-600">Compare budgeted amounts against actual spending</p>
        </div>
        <div className="flex gap-4 items-center">
          <select
            value={selectedBudget}
            onChange={(e) => setSelectedBudget(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name} ({budget.fiscal_year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Variance Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Variance Alerts ({alerts.length})</h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-yellow-700">
                  {alert.gl_account_code} - {alert.gl_account_name}
                </span>
                <span className={alert.alert_type === 'over_budget' ? 'text-red-600 font-medium' : 'text-blue-600'}>
                  {formatPercent(alert.variance_percent)} ({alert.alert_type === 'over_budget' ? 'Over Budget' : 'Under Budget'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Budget</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(report.total_budget)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Actual</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(report.total_actual)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Variance</div>
              <div className={`text-2xl font-bold ${report.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(report.total_variance)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Variance %</div>
              <div className={`text-2xl font-bold ${report.variance_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(report.variance_percent)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Budget Utilization</span>
              <span>{((report.total_actual / report.total_budget) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${getProgressColor((report.total_actual / report.total_budget) * 100)}`}
                style={{ width: `${Math.min((report.total_actual / report.total_budget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('by_account')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'by_account' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              By Account
            </button>
            <button
              onClick={() => setViewMode('by_department')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'by_department' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              By Department
            </button>
          </div>

          {/* Summary View - Period Chart */}
          {viewMode === 'summary' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
              <div className="grid grid-cols-12 gap-2">
                {report.periods.map((period) => (
                  <div key={period.period} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">M{period.period}</div>
                    <div className="h-32 flex flex-col justify-end">
                      <div
                        className="bg-blue-200 rounded-t"
                        style={{ height: `${(period.budget / Math.max(...report.periods.map(p => p.budget))) * 100}%` }}
                        title={`Budget: ${formatCurrency(period.budget)}`}
                      ></div>
                    </div>
                    <div className="text-xs mt-1">{formatCurrency(period.budget / 1000)}k</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Account View */}
          {viewMode === 'by_account' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.by_account.map((account, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{account.gl_account_code}</div>
                        <div className="text-sm text-gray-500">{account.gl_account_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(account.budget_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(account.actual_amount)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getVarianceColor(account.variance_percent, account.is_favorable)}`}>
                        {formatCurrency(account.variance_amount)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getVarianceColor(account.variance_percent, account.is_favorable)}`}>
                        {formatPercent(account.variance_percent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {account.is_favorable ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            On Track
                          </span>
                        ) : Math.abs(account.variance_percent) > 10 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Over Budget
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Warning
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* By Department View */}
          {viewMode === 'by_department' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.by_department.map((dept, idx) => {
                    const utilization = dept.budget > 0 ? (dept.actual / dept.budget) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {dept.department_name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(dept.budget)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(dept.actual)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${dept.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(dept.variance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getProgressColor(utilization)}`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{utilization.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!report && budgets.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-500 mb-4">No active budgets found</div>
          <a href="/financial/budget-management" className="text-blue-600 hover:underline">
            Create a budget to get started
          </a>
        </div>
      )}
    </div>
  );
}
