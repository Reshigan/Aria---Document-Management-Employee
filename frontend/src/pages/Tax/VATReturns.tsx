import { useState, useEffect } from 'react';
import { Calculator, Plus, Search, FileText, TrendingUp, TrendingDown, DollarSign, Calendar, Info, RefreshCw } from 'lucide-react';

interface VATReturn {
  id: string;
  period: string;
  start_date: string;
  end_date: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  submission_date?: string;
}

interface VATSummary {
  output_vat: number;
  input_vat: number;
  net_vat: number;
  next_submission: string;
}

export default function VATReturns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<VATReturn[]>([]);
  const [summary, setSummary] = useState<VATSummary>({
    output_vat: 0,
    input_vat: 0,
    net_vat: 0,
    next_submission: '-'
  });

  const fetchVATData = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const [returnsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/tax/vat-returns`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API_BASE}/api/tax/vat-summary`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      if (returnsRes.ok) {
        const data = await returnsRes.json();
        const mappedReturns = (Array.isArray(data) ? data : data.returns || data.data || []).map((r: any) => ({
          id: r.id,
          period: r.period || r.tax_period || '',
          start_date: r.start_date || '',
          end_date: r.end_date || '',
          output_vat: r.output_vat || 0,
          input_vat: r.input_vat || 0,
          net_vat: r.net_vat || (r.output_vat || 0) - (r.input_vat || 0),
          status: r.status || 'draft',
          submission_date: r.submission_date
        }));
        setReturns(mappedReturns);
      }
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary({
          output_vat: summaryData.output_vat || 0,
          input_vat: summaryData.input_vat || 0,
          net_vat: summaryData.net_vat || 0,
          next_submission: summaryData.next_submission || '25 Feb 2026'
        });
      }
    } catch (err) {
      console.error('Error fetching VAT data:', err);
      // Fallback data
      setReturns([]);
      setSummary({
        output_vat: 0,
        input_vat: 0,
        net_vat: 0,
        next_submission: '25 Feb 2026'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVATData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
            <Calculator className="h-7 w-7 text-white" />
          </div>
          VAT Returns
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage VAT returns and submissions to SARS</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Output VAT (Sales)</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.output_vat)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Input VAT (Purchases)</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.input_vat)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Net VAT Payable</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(summary.net_vat)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl ">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Next Submission</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{summary.next_submission}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search VAT returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-red-500/40 transition-all">
                <Plus className="h-5 w-5" />
                New VAT Return
              </button>
            </div>

            {returns.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No VAT returns yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Create your first VAT return to submit to SARS
                </p>
                <button className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-red-500/40 transition-all">
                  Create VAT Return
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Output VAT</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Input VAT</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net VAT</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {returns.map((vatReturn) => (
                      <tr key={vatReturn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vatReturn.period}</td>
                        <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400">{formatCurrency(vatReturn.output_vat)}</td>
                        <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400">{formatCurrency(vatReturn.input_vat)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(vatReturn.net_vat)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            vatReturn.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                            vatReturn.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                            vatReturn.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>{vatReturn.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">VAT Compliance</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span>VAT returns are due on the 25th of the month following the tax period</li>
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span>Standard VAT rate in South Africa is 15%</li>
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span>Aria can automatically calculate VAT from your transactions</li>
              <li className="flex items-start gap-2"><span className="text-blue-500">•</span>Submit returns directly to SARS eFiling (coming soon)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
