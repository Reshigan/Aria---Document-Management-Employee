import { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, BarChart3, Download, Calendar } from 'lucide-react';

interface ReportData {
  trial_balance?: any;
  profit_loss?: any;
  balance_sheet?: any;
  cash_flow?: any;
  aged_receivables?: any;
  aged_payables?: any;
}

export default function FinancialReports() {
  const [selectedReport, setSelectedReport] = useState<string>('trial_balance');
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const reports = [
    { id: 'trial_balance', name: 'Trial Balance', icon: BarChart3, endpoint: '/api/reports/trial-balance' },
    { id: 'profit_loss', name: 'Profit & Loss', icon: TrendingUp, endpoint: '/api/reports/profit-and-loss' },
    { id: 'balance_sheet', name: 'Balance Sheet', icon: FileText, endpoint: '/api/reports/balance-sheet' },
    { id: 'cash_flow', name: 'Cash Flow', icon: DollarSign, endpoint: '/api/reports/cash-flow' },
    { id: 'aged_receivables', name: 'Aged Receivables', icon: FileText, endpoint: '/api/reports/aged-receivables' },
    { id: 'aged_payables', name: 'Aged Payables', icon: FileText, endpoint: '/api/reports/aged-payables' }
  ];

  const fetchReport = async (reportId: string) => {
    setLoading(true);
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      });

      const response = await fetch(`${report.endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(prev => ({ ...prev, [reportId]: data }));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport, dateRange]);

  const renderTrialBalance = () => {
    const data = reportData.trial_balance;
    if (!data) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Account Code</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Account Name</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Debit</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.accounts?.map((account: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="p-4 text-gray-500 dark:text-gray-400">{account.account_code}</td>
                <td className="p-4 font-medium text-gray-900 dark:text-white">{account.account_name}</td>
                <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">
                  {account.debit > 0 ? `R ${account.debit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="p-4 text-right text-red-600 dark:text-red-400">
                  {account.credit > 0 ? `R ${account.credit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '-'}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-900/50 font-bold">
              <td colSpan={2} className="p-4 text-gray-900 dark:text-white">Total</td>
              <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">
                R {data.total_debit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
              <td className="p-4 text-right text-red-600 dark:text-red-400">
                R {data.total_credit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfitLoss = () => {
    const data = reportData.profit_loss;
    if (!data) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Revenue</h3>
          {data.revenue?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">{item.account_name}</span>
              <span className="font-medium text-gray-900 dark:text-white">R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 font-bold text-lg">
            <span className="text-gray-900 dark:text-white">Total Revenue</span>
            <span className="text-emerald-600 dark:text-emerald-400">R {data.total_revenue?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Expenses</h3>
          {data.expenses?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">{item.account_name}</span>
              <span className="font-medium text-gray-900 dark:text-white">R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 font-bold text-lg">
            <span className="text-gray-900 dark:text-white">Total Expenses</span>
            <span className="text-red-600 dark:text-red-400">R {data.total_expenses?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="border-t-2 border-gray-800 dark:border-gray-200 pt-4">
          <div className="flex justify-between text-2xl font-bold">
            <span className="text-gray-900 dark:text-white">Net Profit</span>
            <span className={data.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
              R {data.net_profit?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    const data = reportData.balance_sheet;
    if (!data) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assets</h3>
          
          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Current Assets</h4>
            {data.current_assets?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Current Assets</span>
              <span>R {data.total_current_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Fixed Assets</h4>
            {data.fixed_assets?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Fixed Assets</span>
              <span>R {data.total_fixed_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 dark:border-gray-200 mt-4 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-gray-900 dark:text-white">Total Assets</span>
              <span className="text-emerald-600 dark:text-emerald-400">R {data.total_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Liabilities & Equity</h3>
          
          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Current Liabilities</h4>
            {data.current_liabilities?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Current Liabilities</span>
              <span>R {data.total_current_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Long-term Liabilities</h4>
            {data.long_term_liabilities?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Long-term Liabilities</span>
              <span>R {data.total_long_term_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Equity</h4>
            {data.equity?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Equity</span>
              <span>R {data.total_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 dark:border-gray-200 mt-4 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-gray-900 dark:text-white">Total Liabilities & Equity</span>
              <span className="text-red-600 dark:text-red-400">R {data.total_liabilities_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgedReport = (type: 'receivables' | 'payables') => {
    const data = type === 'receivables' ? reportData.aged_receivables : reportData.aged_payables;
    if (!data) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                {type === 'receivables' ? 'Customer' : 'Supplier'}
              </th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Current</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">1-30 Days</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">31-60 Days</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">61-90 Days</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">90+ Days</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.items?.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="p-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {item.current.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {item.days_1_30.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {item.days_31_60.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {item.days_61_90.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-red-600 dark:text-red-400">R {item.days_90_plus.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-bold text-gray-900 dark:text-white">R {item.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-900/50 font-bold">
              <td className="p-4 text-gray-900 dark:text-white">Total</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_current?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_1_30?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_31_60?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_61_90?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-red-600 dark:text-red-400">R {data.total_90_plus?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.grand_total?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) {
      return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading report...</div>;
    }

    switch (selectedReport) {
      case 'trial_balance':
        return renderTrialBalance();
      case 'profit_loss':
        return renderProfitLoss();
      case 'balance_sheet':
        return renderBalanceSheet();
      case 'aged_receivables':
        return renderAgedReport('receivables');
      case 'aged_payables':
        return renderAgedReport('payables');
      default:
        return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Select a report to view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Financial Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View comprehensive financial reports and analytics</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">Reports</h3>
              {reports.map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium mb-2 text-left transition-all ${
                      selectedReport === report.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={18} />
                    {report.name}
                  </button>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mt-4">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Calendar size={18} />
                Date Range
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {reports.find(r => r.id === selectedReport)?.name}
              </h2>
              <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                <Download size={18} />
                Export PDF
              </button>
            </div>

            {renderReport()}
          </div>
        </div>
      </div>
    </div>
  );
}
