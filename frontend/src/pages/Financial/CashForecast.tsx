import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, AlertCircle, X, DollarSign, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

interface ForecastPeriod {
  period: string;
  opening_balance: number;
  expected_inflows: number;
  expected_outflows: number;
  net_change: number;
  closing_balance: number;
}

export default function CashForecast() {
  const [forecast, setForecast] = useState<ForecastPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => { fetchForecast(); }, [period]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/financial/cash-forecast?period=${period}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setForecast(data.forecast || []); }
      setError(null);
    } catch (err) { setError('Failed to load cash forecast'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const stats = {
        totalInflows: forecast.reduce((sum, f) => sum + (f.expected_inflows || 0), 0),
        totalOutflows: forecast.reduce((sum, f) => sum + (f.expected_outflows || 0), 0),
        netChange: forecast.reduce((sum, f) => sum + (f.net_change || 0), 0),
    endingBalance: forecast.length > 0 ? forecast[forecast.length - 1].closing_balance : 0,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Cash Forecast</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Project future cash positions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
              <button onClick={() => setPeriod('weekly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'weekly' ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Weekly</button>
              <button onClick={() => setPeriod('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'monthly' ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Monthly</button>
            </div>
            <button onClick={fetchForecast} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><ArrowUpRight className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalInflows)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Expected Inflows</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><ArrowDownRight className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalOutflows)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Expected Outflows</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className={`text-2xl font-bold ${stats.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(stats.netChange)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Net Change</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.endingBalance)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Ending Balance</p></div></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading forecast...</p></div>
          ) : forecast.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><TrendingUp className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No forecast data</h3><p className="text-gray-500 dark:text-gray-300">Cash forecast will appear here based on your transactions</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Opening Balance</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expected Inflows</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expected Outflows</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Net Change</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Closing Balance</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {forecast.map((f, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-2"><Calendar className="h-4 w-4" />{f.period}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(f.opening_balance)}</td>
                      <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(f.expected_inflows)}</td>
                      <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">{formatCurrency(f.expected_outflows)}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${f.net_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(f.net_change)}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(f.closing_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
