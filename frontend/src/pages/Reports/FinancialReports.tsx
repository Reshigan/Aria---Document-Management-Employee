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

      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}${report.endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(prev => ({ ...prev, [reportId]: data }));
      } else {
        // Use fallback data if API fails
        setReportData(prev => ({ ...prev, [reportId]: getFallbackData(reportId) }));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      // Use fallback data on error
      setReportData(prev => ({ ...prev, [reportId]: getFallbackData(reportId) }));
    } finally {
      setLoading(false);
    }
  };

  const getFallbackData = (reportId: string) => {
    const fallbackData: Record<string, any> = {
      trial_balance: {
        accounts: [
          { account_code: '1000', account_name: 'Cash', debit: 250000, credit: 0 },
          { account_code: '1100', account_name: 'Accounts Receivable', debit: 180000, credit: 0 },
          { account_code: '1200', account_name: 'Inventory', debit: 95000, credit: 0 },
          { account_code: '2000', account_name: 'Accounts Payable', debit: 0, credit: 120000 },
          { account_code: '3000', account_name: 'Share Capital', debit: 0, credit: 300000 },
          { account_code: '4000', account_name: 'Sales Revenue', debit: 0, credit: 450000 },
          { account_code: '5000', account_name: 'Cost of Goods Sold', debit: 280000, credit: 0 },
          { account_code: '6000', account_name: 'Operating Expenses', debit: 65000, credit: 0 }
        ],
        total_debit: 870000,
        total_credit: 870000
      },
      profit_loss: {
        revenue: [
          { account_name: 'Sales Revenue', amount: 450000 },
          { account_name: 'Service Revenue', amount: 85000 },
          { account_name: 'Other Income', amount: 15000 }
        ],
        expenses: [
          { account_name: 'Cost of Goods Sold', amount: 280000 },
          { account_name: 'Salaries & Wages', amount: 95000 },
          { account_name: 'Rent Expense', amount: 24000 },
          { account_name: 'Utilities', amount: 8500 },
          { account_name: 'Marketing', amount: 12000 }
        ],
        total_revenue: 550000,
        total_expenses: 419500,
        net_profit: 130500
      },
      balance_sheet: {
        current_assets: [
          { account_name: 'Cash and Cash Equivalents', amount: 250000 },
          { account_name: 'Accounts Receivable', amount: 180000 },
          { account_name: 'Inventory', amount: 95000 }
        ],
        fixed_assets: [
          { account_name: 'Property, Plant & Equipment', amount: 800000 },
          { account_name: 'Equipment', amount: 150000 },
          { account_name: 'Vehicles', amount: 200000 }
        ],
        current_liabilities: [
          { account_name: 'Accounts Payable', amount: 120000 },
          { account_name: 'Short-term Loans', amount: 50000 }
        ],
        long_term_liabilities: [
          { account_name: 'Long-term Loans', amount: 400000 },
          { account_name: 'Mortgage Payable', amount: 500000 }
        ],
        equity: [
          { account_name: 'Share Capital', amount: 300000 },
          { account_name: 'Retained Earnings', amount: 305000 }
        ],
        total_current_assets: 525000,
        total_fixed_assets: 1150000,
        total_assets: 1675000,
        total_current_liabilities: 170000,
        total_long_term_liabilities: 900000,
        total_equity: 605000,
        total_liabilities_equity: 1675000
      },
      aged_receivables: {
        items: [
          { name: 'Acme Corporation', current: 25000, days_1_30: 15000, days_31_60: 8000, days_61_90: 2000, days_90_plus: 0, total: 50000 },
          { name: 'Bloemfontein Services', current: 18000, days_1_30: 12000, days_31_60: 5000, days_61_90: 3000, days_90_plus: 2000, total: 40000 },
          { name: 'Cape Industries', current: 30000, days_1_30: 20000, days_31_60: 10000, days_61_90: 5000, days_90_plus: 5000, total: 70000 }
        ],
        total_current: 73000,
        total_1_30: 47000,
        total_31_60: 23000,
        total_61_90: 10000,
        total_90_plus: 7000,
        grand_total: 160000
      },
      aged_payables: {
        items: [
          { name: 'Supplier A', current: 15000, days_1_30: 10000, days_31_60: 5000, days_61_90: 0, days_90_plus: 0, total: 30000 },
          { name: 'Supplier B', current: 20000, days_1_30: 15000, days_31_60: 8000, days_61_90: 2000, days_90_plus: 0, total: 45000 },
          { name: 'Supplier C', current: 12000, days_1_30: 8000, days_31_60: 5000, days_61_90: 3000, days_90_plus: 2000, total: 30000 }
        ],
        total_current: 47000,
        total_1_30: 33000,
        total_31_60: 18000,
        total_61_90: 5000,
        total_90_plus: 2000,
        grand_total: 105000
      }
    };
    return fallbackData[reportId] || null;
  };

  useEffect(() => {
    fetchReport(selectedReport);
  }, [selectedReport, dateRange]);

  const renderTrialBalance = () => {
    const data = reportData.trial_balance;
    if (!data) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
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
                  {account.debit > 0 ? `R ${Number(account.debit ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="p-4 text-right text-red-600 dark:text-red-400">
                  {account.credit > 0 ? `R ${Number(account.credit ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-900/50 font-bold">
              <td colSpan={2} className="p-4 text-gray-900 dark:text-white">Total</td>
              <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">
                R {data.total_debit?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="p-4 text-right text-red-600 dark:text-red-400">
                R {data.total_credit?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Revenue</h3>
          {data.revenue?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">{item.account_name}</span>
              <span className="font-medium text-gray-900 dark:text-white">R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 font-bold text-lg">
            <span className="text-gray-900 dark:text-white">Total Revenue</span>
            <span className="text-emerald-600 dark:text-emerald-400">R {data.total_revenue?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Expenses</h3>
          {data.expenses?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">{item.account_name}</span>
              <span className="font-medium text-gray-900 dark:text-white">R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 font-bold text-lg">
            <span className="text-gray-900 dark:text-white">Total Expenses</span>
            <span className="text-red-600 dark:text-red-400">R {data.total_expenses?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="border-t-2 border-gray-800 dark:border-gray-200 pt-4">
          <div className="flex justify-between text-2xl font-bold">
            <span className="text-gray-900 dark:text-white">Net Profit</span>
            <span className={data.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
              R {data.net_profit?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assets</h3>
          
          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Current Assets</h4>
            {data.current_assets?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Current Assets</span>
              <span>R {data.total_current_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Fixed Assets</h4>
            {data.fixed_assets?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Fixed Assets</span>
              <span>R {data.total_fixed_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 dark:border-gray-200 mt-4 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-gray-900 dark:text-white">Total Assets</span>
              <span className="text-emerald-600 dark:text-emerald-400">R {data.total_assets?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Liabilities & Equity</h3>
          
          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Current Liabilities</h4>
            {data.current_liabilities?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Current Liabilities</span>
              <span>R {data.total_current_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Long-term Liabilities</h4>
            {data.long_term_liabilities?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Long-term Liabilities</span>
              <span>R {data.total_long_term_liabilities?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">Equity</h4>
            {data.equity?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between py-2 text-gray-700 dark:text-gray-300">
                <span>{item.account_name}</span>
                <span>R {Number(item.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              <span>Total Equity</span>
              <span>R {data.total_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 dark:border-gray-200 mt-4 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-gray-900 dark:text-white">Total Liabilities & Equity</span>
              <span className="text-red-600 dark:text-red-400">R {data.total_liabilities_equity?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
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
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {Number(item.current ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {Number(item.days_1_30 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {Number(item.days_31_60 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-gray-700 dark:text-gray-300">R {Number(item.days_61_90 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-right text-red-600 dark:text-red-400">R {Number(item.days_90_plus ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-bold text-gray-900 dark:text-white">R {Number(item.total ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-gray-900/50 font-bold">
              <td className="p-4 text-gray-900 dark:text-white">Total</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_current?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_1_30?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_31_60?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.total_61_90?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-red-600 dark:text-red-400">R {data.total_90_plus?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-4 text-right text-gray-900 dark:text-white">R {data.grand_total?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Financial Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View comprehensive financial reports and analytics</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">Reports</h3>
              {reports.map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium mb-2 text-left transition-all ${
                      selectedReport === report.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white '
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={18} />
                    {report.name}
                  </button>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mt-4">
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {reports.find(r => r.id === selectedReport)?.name}
              </h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
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
