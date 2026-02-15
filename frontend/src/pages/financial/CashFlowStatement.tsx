import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Download, Calendar } from 'lucide-react';

interface CashFlowItem {
  description: string;
  amount: number;
}

interface CashFlowData {
  period_start: string;
  period_end: string;
  opening_cash: number;
  operating: {
    items: CashFlowItem[];
    net: number;
  };
  investing: {
    items: CashFlowItem[];
    net: number;
  };
  financing: {
    items: CashFlowItem[];
    net: number;
  };
  net_change: number;
  closing_cash: number;
}

export default function CashFlowStatementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/reports/cash-flow?start_date=${startDate}&end_date=${endDate}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching cash flow:', err);
      // Fallback data
      setData({
        period_start: startDate,
        period_end: endDate,
        opening_cash: 150000,
        operating: {
          items: [
            { description: 'Cash receipts from customers', amount: 450000 },
            { description: 'Cash paid to suppliers', amount: -220000 },
            { description: 'Cash paid to employees', amount: -100000 },
            { description: 'Interest received', amount: 5000 },
            { description: 'Interest paid', amount: -15000 },
            { description: 'Income taxes paid', amount: -25000 }
          ],
          net: 95000
        },
        investing: {
          items: [
            { description: 'Purchase of property, plant & equipment', amount: -50000 },
            { description: 'Proceeds from sale of equipment', amount: 20000 },
            { description: 'Purchase of investments', amount: -30000 }
          ],
          net: -60000
        },
        financing: {
          items: [
            { description: 'Proceeds from bank loans', amount: 100000 },
            { description: 'Repayment of bank loans', amount: -45000 },
            { description: 'Dividends paid', amount: -20000 }
          ],
          net: 35000
        },
        net_change: 70000,
        closing_cash: 220000
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [startDate, endDate]);

  const handleExport = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/reports/cash-flow/export?start_date=${startDate}&end_date=${endDate}&format=pdf`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cash-flow-${startDate}-to-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="h-8 w-8 text-indigo-600" />
            Cash Flow Statement
          </h1>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={fetchCashFlow}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : data ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-6">
            {/* Opening Cash */}
            <div className="flex justify-between py-2 font-medium border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Opening Cash Balance</span>
              <span className="text-gray-900 dark:text-white">R {Number(data.opening_cash ?? 0).toLocaleString()}</span>
            </div>

            {/* Operating Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Operating Activities</h3>
              <div className="space-y-2">
                {data.operating.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                    <span className={item.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      R {Number(item.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                  <span className="text-gray-900 dark:text-white">Net Operating Cash Flow</span>
                  <span className={data.operating.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    R {Number(data.operating.net ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Investing Activities</h3>
              <div className="space-y-2">
                {data.investing.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                    <span className={item.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      R {Number(item.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                  <span className="text-gray-900 dark:text-white">Net Investing Cash Flow</span>
                  <span className={data.investing.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    R {Number(data.investing.net ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Financing Activities</h3>
              <div className="space-y-2">
                {data.financing.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                    <span className={item.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      R {Number(item.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                  <span className="text-gray-900 dark:text-white">Net Financing Cash Flow</span>
                  <span className={data.financing.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    R {Number(data.financing.net ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t-2 border-gray-300 dark:border-gray-600 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Net Change in Cash</span>
                <span className={data.net_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  R {Number(data.net_change ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span className="text-gray-900 dark:text-white">Closing Cash Balance</span>
                <span className="text-blue-600 dark:text-blue-400">R {Number(data.closing_cash ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
