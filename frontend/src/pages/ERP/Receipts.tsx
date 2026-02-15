import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Plus, Search, Eye, DollarSign, TrendingUp, Clock, CheckCircle, RefreshCw, AlertCircle, X, CreditCard } from 'lucide-react';

interface Receipt {
  id: string;
  receipt_number: string;
  customer_id: string;
  customer_name?: string;
  payment_date: string;
  bank_account_id: string;
  payment_method: string;
  reference?: string;
  amount: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ReceiptStats {
  total_receipts: number;
  total_amount: number;
  posted_count: number;
  posted_amount: number;
  draft_count: number;
  draft_amount: number;
}

export default function Receipts() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<ReceiptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [searchTerm, statusFilter]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/ar/receipts', { params });
      const raw = response.data;
      const data = Array.isArray(raw) ? raw : raw.receipts || raw.data || [];
      setReceipts(data);
      
      const totalAmount = data.reduce((sum: number, r: Receipt) => sum + r.amount, 0);
      const postedReceipts = data.filter((r: Receipt) => r.status === 'posted');
      const postedAmount = postedReceipts.reduce((sum: number, r: Receipt) => sum + r.amount, 0);
      const draftReceipts = data.filter((r: Receipt) => r.status === 'draft');
      const draftAmount = draftReceipts.reduce((sum: number, r: Receipt) => sum + r.amount, 0);

      setStats({
        total_receipts: data.length,
        total_amount: totalAmount,
        posted_count: postedReceipts.length,
        posted_amount: postedAmount,
        draft_count: draftReceipts.length,
        draft_amount: draftAmount
      });

      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching receipts:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (receipt: Receipt) => {
    navigate(`/ar/receipts/${receipt.id}`);
  };

  const handleCreateNew = () => {
    navigate('/ar/receipts/new');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      posted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      void: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      cheque: 'Cheque',
      eft: 'EFT',
      card: 'Card',
    };
    return labels[method] || method;
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = !searchTerm || 
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Customer Receipts</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage customer payments and allocations</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadReceipts()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all ">
              <Plus className="h-5 w-5" />New Receipt
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total_receipts}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Receipts</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">R {Number(stats.total_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.posted_count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Posted</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">R {Number(stats.posted_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl "><Clock className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft_count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Draft</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">R {Number(stats.draft_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">R {stats.total_receipts > 0 ? (stats.total_amount / stats.total_receipts).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg Receipt</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by receipt number, customer, or reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all min-w-[150px]">
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading receipts...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><CreditCard className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No receipts found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first receipt'}</p>
              {!searchTerm && statusFilter === 'all' && (
                <button onClick={handleCreateNew} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all">Create First Receipt</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{receipt.receipt_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{receipt.customer_name || `Customer ${receipt.customer_id}`}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(receipt.payment_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{getPaymentMethodLabel(receipt.payment_method)}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{receipt.reference || '-'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(receipt.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(receipt.status)}`}>{receipt.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button onClick={() => handleViewDetail(receipt)} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                        </div>
                      </td>
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
