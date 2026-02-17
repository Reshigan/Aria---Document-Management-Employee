import { useState, useEffect } from 'react';
import { Plus, FileText, DollarSign, TrendingUp, Calendar, Download, X } from 'lucide-react';

interface VATReturn {
  id: number;
  return_number: string;
  period_start: string;
  period_end: string;
  output_tax: number;
  input_tax: number;
  net_vat: number;
  status: string;
  filing_date?: string;
  payment_date?: string;
}

export default function VATReturnsPage() {
  const [returns, setReturns] = useState<VATReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    filing_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/vat/returns`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.returns || data.data || []).map((r: any) => ({
          id: r.id,
          return_number: r.return_number || r.returnNumber || '',
          period_start: r.period_start || r.periodStart || '',
          period_end: r.period_end || r.periodEnd || '',
          output_tax: r.output_tax || r.outputTax || 0,
          input_tax: r.input_tax || r.inputTax || 0,
          net_vat: r.net_vat || r.netVat || 0,
          status: r.status || 'DRAFT',
          filing_date: r.filing_date || r.filingDate || '',
          payment_date: r.payment_date || r.paymentDate || ''
        }));
        setReturns(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch VAT returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/vat/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          period_start: '',
          period_end: '',
          filing_date: new Date().toISOString().split('T')[0]
        });
        fetchReturns();
      }
    } catch (error) {
      console.error('Failed to create VAT return:', error);
    }
  };

  const handleFileReturn = async (id: number) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/vat/returns/${id}/file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchReturns();
      }
    } catch (error) {
      console.error('Failed to file VAT return:', error);
    }
  };

  const totalOutput = returns.reduce((sum, r) => sum + r.output_tax, 0);
  const totalInput = returns.reduce((sum, r) => sum + r.input_tax, 0);
  const totalNet = returns.reduce((sum, r) => sum + r.net_vat, 0);
  const pendingCount = returns.filter(r => r.status === 'DRAFT').length;

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'FILED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'PAID': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-600" />
            VAT Returns
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage VAT returns and submissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-5 w-5" />
          New VAT Return
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Output Tax</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                R {Number(totalOutput ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Input Tax</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                R {Number(totalInput ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${totalNet >= 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              <FileText className={`h-6 w-6 ${totalNet >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Net VAT {totalNet >= 0 ? 'Payable' : 'Refund'}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                R {Math.abs(totalNet).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Returns</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {pendingCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Return Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Period</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Output Tax</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Input Tax</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Net VAT</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <div className="font-medium">No VAT returns found</div>
                    <div className="text-sm mt-1">Create your first VAT return to get started</div>
                  </td>
                </tr>
              ) : (
                returns.map((vatReturn) => (
                  <tr key={vatReturn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{vatReturn.return_number}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {(vatReturn.period_start ? new Date(vatReturn.period_start).toLocaleDateString('en-ZA') : "-")} - {(vatReturn.period_end ? new Date(vatReturn.period_end).toLocaleDateString('en-ZA') : "-")}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">
                      R {Number(vatReturn.output_tax ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-600 dark:text-blue-400">
                      R {Number(vatReturn.input_tax ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${vatReturn.net_vat >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      R {Number(vatReturn.net_vat ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(vatReturn.status)}`}>
                        {vatReturn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        {vatReturn.status === 'DRAFT' && (
                          <button
                            onClick={() => handleFileReturn(vatReturn.id)}
                            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            File Return
                          </button>
                        )}
                        <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">New VAT Return</h2>
                    <p className="text-white/80 text-sm">Create a new VAT return period</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Period Start *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Period End *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filing Date
                </label>
                <input
                  type="date"
                  value={formData.filing_date}
                  onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Create VAT Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
