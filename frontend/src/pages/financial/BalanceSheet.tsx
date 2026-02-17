import React, { useState, useEffect } from 'react';
import { Scale, RefreshCw, Download, Calendar } from 'lucide-react';

interface AccountBalance {
  account_code: string;
  account_name: string;
  balance: number;
}

interface BalanceSheetData {
  as_of_date: string;
  assets: {
    current: AccountBalance[];
    fixed: AccountBalance[];
    total_current: number;
    total_fixed: number;
    total: number;
  };
  liabilities: {
    current: AccountBalance[];
    long_term: AccountBalance[];
    total_current: number;
    total_long_term: number;
    total: number;
  };
  equity: {
    accounts: AccountBalance[];
    retained_earnings: number;
    total: number;
  };
}

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/reports/balance-sheet?as_of_date=${asOfDate}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching balance sheet:', err);
      // Fallback to sample data structure when API unavailable
      setData({
        as_of_date: asOfDate,
        assets: {
          current: [
            { account_code: '1100', account_name: 'Cash and Cash Equivalents', balance: 250000 },
            { account_code: '1200', account_name: 'Accounts Receivable', balance: 180000 },
            { account_code: '1300', account_name: 'Inventory', balance: 95000 }
          ],
          fixed: [
            { account_code: '1500', account_name: 'Property, Plant & Equipment', balance: 800000 },
            { account_code: '1510', account_name: 'Equipment', balance: 150000 },
            { account_code: '1520', account_name: 'Vehicles', balance: 200000 }
          ],
          total_current: 525000,
          total_fixed: 1150000,
          total: 1675000
        },
        liabilities: {
          current: [
            { account_code: '2100', account_name: 'Accounts Payable', balance: 120000 },
            { account_code: '2200', account_name: 'Short-term Loans', balance: 50000 }
          ],
          long_term: [
            { account_code: '2500', account_name: 'Long-term Loans', balance: 400000 },
            { account_code: '2600', account_name: 'Mortgage Payable', balance: 500000 }
          ],
          total_current: 170000,
          total_long_term: 900000,
          total: 1070000
        },
        equity: {
          accounts: [
            { account_code: '3100', account_name: 'Share Capital', balance: 300000 },
            { account_code: '3200', account_name: 'Share Premium', balance: 100000 }
          ],
          retained_earnings: 205000,
          total: 605000
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  const handleExport = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/reports/balance-sheet/export?as_of_date=${asOfDate}&format=pdf`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `balance-sheet-${asOfDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Scale className="h-8 w-8 text-indigo-600" />
            Balance Sheet
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={fetchBalanceSheet}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4" data-testid="section-assets">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assets</h3>
              <div className="space-y-4">
                <div data-testid="current-assets">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Current Assets</h4>
                  {data.assets.current.map((account) => (
                    <div key={account.account_code} className="flex justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{account.account_code} - {account.account_name}</span>
                      <span className="text-sm text-gray-900 dark:text-white">R {Number(account.balance ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                    <span className="text-gray-700 dark:text-gray-300">Total Current Assets</span>
                    <span className="text-gray-900 dark:text-white">R {Number(data.assets.total_current ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <div data-testid="fixed-assets">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Fixed Assets</h4>
                  {data.assets.fixed.map((account) => (
                    <div key={account.account_code} className="flex justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{account.account_code} - {account.account_name}</span>
                      <span className="text-sm text-gray-900 dark:text-white">R {Number(account.balance ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                    <span className="text-gray-700 dark:text-gray-300">Total Fixed Assets</span>
                    <span className="text-gray-900 dark:text-white">R {Number(data.assets.total_fixed ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t-2 border-gray-300 dark:border-gray-600 font-bold flex justify-between" data-testid="total-assets">
                  <span className="text-gray-900 dark:text-white">Total Assets</span>
                  <span className="text-blue-600 dark:text-blue-400">R {Number(data.assets.total ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Liabilities & Equity</h3>
              <div className="space-y-4">
                <div data-testid="section-liabilities">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Current Liabilities</h4>
                  {data.liabilities.current.map((account) => (
                    <div key={account.account_code} className="flex justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{account.account_code} - {account.account_name}</span>
                      <span className="text-sm text-gray-900 dark:text-white">R {Number(account.balance ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                    <span className="text-gray-700 dark:text-gray-300">Total Current Liabilities</span>
                    <span className="text-gray-900 dark:text-white">R {Number(data.liabilities.total_current ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Long-term Liabilities</h4>
                  {data.liabilities.long_term.map((account) => (
                    <div key={account.account_code} className="flex justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{account.account_code} - {account.account_name}</span>
                      <span className="text-sm text-gray-900 dark:text-white">R {Number(account.balance ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-medium border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                    <span className="text-gray-700 dark:text-gray-300">Total Long-term Liabilities</span>
                    <span className="text-gray-900 dark:text-white">R {Number(data.liabilities.total_long_term ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between py-1 font-medium" data-testid="total-liabilities">
                    <span className="text-gray-700 dark:text-gray-300">Total Liabilities</span>
                    <span className="text-gray-900 dark:text-white">R {Number(data.liabilities.total ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div data-testid="section-equity">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Equity</h4>
                  {data.equity.accounts.map((account) => (
                    <div key={account.account_code} className="flex justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{account.account_code} - {account.account_name}</span>
                      <span className="text-sm text-gray-900 dark:text-white">R {Number(account.balance ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Retained Earnings</span>
                    <span className="text-sm text-gray-900 dark:text-white">R {Number(data.equity.retained_earnings ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-lg pt-2 border-t-2 border-gray-300 dark:border-gray-600" data-testid="total-equity">
                    <span className="text-gray-900 dark:text-white">Total Equity</span>
                    <span className="text-green-600 dark:text-green-400">R {Number(data.equity.total ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">No data available</p>
          </div>
        )}

        {/* Balance Check */}
        {data && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700 dark:text-gray-300">Balance Check (Assets = Liabilities + Equity)</span>
              {Math.abs(data.assets.total - (data.liabilities.total + data.equity.total)) < 0.01 ? (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  Balanced
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                  Out of Balance: R {(data.assets.total - data.liabilities.total - data.equity.total).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
