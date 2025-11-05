import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ERPReports = () => {
  const [activeReport, setActiveReport] = useState('trial-balance');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReport();
  }, [activeReport]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let response;
      if (activeReport === 'trial-balance') {
        response = await axios.get('/api/erp/reports/trial-balance');
      } else if (activeReport === 'balance-sheet') {
        response = await axios.get('/api/erp/reports/balance-sheet');
      } else if (activeReport === 'income-statement') {
        response = await axios.get('/api/erp/reports/income-statement');
      }
      setReportData(response?.data || null);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount || 0);
  };

  const reports = [
    { id: 'trial-balance', name: 'Trial Balance', icon: '⚖️', description: 'List of all GL accounts with debit and credit balances' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: '📊', description: 'Statement of financial position' },
    { id: 'income-statement', name: 'Income Statement', icon: '💰', description: 'Profit & Loss statement' },
    { id: 'cash-flow', name: 'Cash Flow Statement', icon: '💵', description: 'Statement of cash flows' },
    { id: 'ap-aging', name: 'AP Aging', icon: '📉', description: 'Accounts payable aging report' },
    { id: 'ar-aging', name: 'AR Aging', icon: '📈', description: 'Accounts receivable aging report' },
    { id: 'vat-return', name: 'VAT Return', icon: '🇿🇦', description: 'SA VAT201 return' },
    { id: 'paye', name: 'PAYE Report', icon: '💼', description: 'PAYE tax report for SARS' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <a href="/erp-dashboard" className="text-white/70 hover:text-white text-sm mb-2 inline-block">
                ← Back to Dashboard
              </a>
              <h1 className="text-3xl font-bold text-white">Financial Reports</h1>
              <p className="text-white/70 mt-1">Comprehensive financial reporting & analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                📥 Export PDF
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition">
                📊 Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 sticky top-4">
              <h2 className="text-lg font-semibold text-white mb-4">Reports</h2>
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      activeReport === report.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{report.icon}</span>
                      <span className="font-medium text-sm">{report.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="lg:col-span-3">
            {/* Date Range Filter */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="text-white/70 text-sm mb-2 block">From Date</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/70 text-sm mb-2 block">To Date</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="pt-6">
                  <button
                    onClick={loadReport}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Report Display */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-white text-xl">Loading report...</div>
                </div>
              ) : (
                <>
                  {/* Trial Balance */}
                  {activeReport === 'trial-balance' && reportData && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white">Trial Balance</h2>
                        <p className="text-white/70">As of {reportData.as_of_date}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-white">Account Code</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-white">Account Name</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Debit</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {reportData.accounts?.map((account, idx) => (
                              <tr key={idx} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-white font-mono text-sm">{account.account_code}</td>
                                <td className="px-4 py-3 text-white text-sm">{account.account_name}</td>
                                <td className="px-4 py-3 text-right text-white text-sm">
                                  {account.balance_type === 'debit' ? formatCurrency(account.balance) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-white text-sm">
                                  {account.balance_type === 'credit' ? formatCurrency(account.balance) : '-'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-white/10 font-bold">
                              <td colSpan="2" className="px-4 py-3 text-white">Total</td>
                              <td className="px-4 py-3 text-right text-white">{formatCurrency(reportData.total_debits)}</td>
                              <td className="px-4 py-3 text-right text-white">{formatCurrency(reportData.total_credits)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex items-center justify-end">
                        <span className={`px-4 py-2 rounded-lg font-semibold ${
                          reportData.balanced ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {reportData.balanced ? '✓ Balanced' : '✗ Not Balanced'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Balance Sheet */}
                  {activeReport === 'balance-sheet' && reportData && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white">Balance Sheet</h2>
                        <p className="text-white/70">As of {reportData.as_of_date}</p>
                      </div>
                      <div className="space-y-6">
                        {/* Assets */}
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-3">Assets</h3>
                          <div className="bg-white/5 rounded-lg p-4">
                            {reportData.assets?.accounts?.map((account, idx) => (
                              <div key={idx} className="flex justify-between py-2 border-b border-white/10 last:border-0">
                                <span className="text-white/70">{account.account_name}</span>
                                <span className="text-white font-mono">{formatCurrency(account.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between py-3 mt-2 font-bold">
                              <span className="text-white">Total Assets</span>
                              <span className="text-white">{formatCurrency(reportData.assets?.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Liabilities */}
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-3">Liabilities</h3>
                          <div className="bg-white/5 rounded-lg p-4">
                            {reportData.liabilities?.accounts?.map((account, idx) => (
                              <div key={idx} className="flex justify-between py-2 border-b border-white/10 last:border-0">
                                <span className="text-white/70">{account.account_name}</span>
                                <span className="text-white font-mono">{formatCurrency(account.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between py-3 mt-2 font-bold">
                              <span className="text-white">Total Liabilities</span>
                              <span className="text-white">{formatCurrency(reportData.liabilities?.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Equity */}
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-3">Equity</h3>
                          <div className="bg-white/5 rounded-lg p-4">
                            {reportData.equity?.accounts?.map((account, idx) => (
                              <div key={idx} className="flex justify-between py-2 border-b border-white/10 last:border-0">
                                <span className="text-white/70">{account.account_name}</span>
                                <span className="text-white font-mono">{formatCurrency(account.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between py-3 mt-2 font-bold">
                              <span className="text-white">Total Equity</span>
                              <span className="text-white">{formatCurrency(reportData.equity?.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Reports */}
                  {!['trial-balance', 'balance-sheet'].includes(activeReport) && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">{reports.find(r => r.id === activeReport)?.icon}</div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {reports.find(r => r.id === activeReport)?.name}
                      </h3>
                      <p className="text-white/70 mb-6">
                        {reports.find(r => r.id === activeReport)?.description}
                      </p>
                      <button
                        onClick={loadReport}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
                      >
                        Generate Report
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ERPReports;
