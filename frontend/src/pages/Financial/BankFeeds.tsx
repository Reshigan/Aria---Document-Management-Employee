import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Building2, Plus, RefreshCw, AlertCircle, X, DollarSign, ArrowUpRight, ArrowDownRight, Link2, Unlink, Zap, CheckCircle, Clock, XCircle } from 'lucide-react';

interface BankConnection {
  id: string;
  bank_account_id: string;
  bank_account_name?: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  account_mask: string;
  status: 'active' | 'pending' | 'error' | 'disconnected';
  last_sync_at: string | null;
  last_sync_status: string | null;
  error_message: string | null;
  created_at: string;
}

interface BankFeedTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  description: string;
  merchant_name: string | null;
  category: string | null;
  transaction_type: 'debit' | 'credit';
  is_matched: boolean;
  suggested_gl_account_id: string | null;
}

export default function BankFeeds() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [transactions, setTransactions] = useState<BankFeedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankFeedTransaction | null>(null);
  const [matchData, setMatchData] = useState({ matched_to_type: 'invoice', matched_to_id: '' });

  useEffect(() => { fetchConnections(); fetchUnmatchedTransactions(); }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/xero/bank-feeds/connections');
      setConnections(response.data.connections || []);
    } catch (err) { setError('Failed to load bank connections'); } finally { setLoading(false); }
  };

  const fetchUnmatchedTransactions = async () => {
    try {
      const response = await api.get('/xero/bank-feeds/transactions/unmatched');
      setTransactions(response.data.transactions || []);
    } catch (err) { console.error('Failed to load transactions:', err); }
  };

  const handleSync = async (connectionId: string) => {
    try {
      setSyncing(connectionId);
      await api.post(`/xero/bank-feeds/connections/${connectionId}/sync`, {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });
      await fetchConnections();
      await fetchUnmatchedTransactions();
    } catch (err) { setError('Failed to sync transactions'); } finally { setSyncing(null); }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this bank account?')) return;
    try { await api.delete(`/xero/bank-feeds/connections/${connectionId}`); await fetchConnections(); } catch (err) { setError('Failed to disconnect bank'); }
  };

  const handleAutoMatch = async () => {
    try {
      setLoading(true);
      const response = await api.post('/xero/bank-feeds/auto-match', {});
      alert(`Auto-matched ${response.data.matched} transactions`);
      await fetchUnmatchedTransactions();
    } catch (err) { setError('Failed to auto-match transactions'); } finally { setLoading(false); }
  };

  const handleMatchTransaction = async () => {
    if (!selectedTransaction || !matchData.matched_to_id) return;
    try {
      await api.post(`/xero/bank-feeds/transactions/${selectedTransaction.id}/match`, matchData);
      setSelectedTransaction(null);
      setMatchData({ matched_to_type: 'invoice', matched_to_id: '' });
      await fetchUnmatchedTransactions();
    } catch (err) { setError('Failed to match transaction'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA');
  const formatDateTime = (date: string) => new Date(date).toLocaleString('en-ZA');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      disconnected: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.disconnected;
  };

  const getStatusIcon = (status: string) => {
    switch (status) { case 'active': return <CheckCircle className="h-3.5 w-3.5" />; case 'pending': return <Clock className="h-3.5 w-3.5" />; case 'error': return <XCircle className="h-3.5 w-3.5" />; default: return <Unlink className="h-3.5 w-3.5" />; }
  };

  const stats = {
    connected: connections.filter(c => c.status === 'active').length,
    unmatched: transactions.length,
    totalDebits: transactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalCredits: transactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Bank Feeds</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Connect your bank accounts for automatic transaction import</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchConnections} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowConnectModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all "><Plus className="h-5 w-5" />Connect Bank</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Building2 className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.connected}</p><p className="text-xs text-gray-500 dark:text-gray-400">Connected Banks</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Link2 className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.unmatched}</p><p className="text-xs text-gray-500 dark:text-gray-400">Unmatched</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><ArrowDownRight className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalDebits)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Debits</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><ArrowUpRight className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalCredits)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Credits</p></div></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Bank Accounts</h2></div>
          {connections.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No bank accounts connected</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Connect your bank to automatically import transactions</p><button onClick={() => setShowConnectModal(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all">Connect Bank</button></div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {connections.map((connection) => (
                <div key={connection.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold ">{connection.institution_name?.substring(0, 2).toUpperCase() || 'BK'}</div>
                    <div><div className="font-semibold text-gray-900 dark:text-white">{connection.institution_name}</div><div className="text-xs text-gray-500 dark:text-gray-400">{connection.account_name} •••• {connection.account_mask}</div>{connection.last_sync_at && <div className="text-xs text-gray-400 dark:text-gray-500">Last synced: {formatDateTime(connection.last_sync_at)}</div>}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(connection.status)}`}>{getStatusIcon(connection.status)}{connection.status}</span>
                    {connection.status === 'active' && <button onClick={() => handleSync(connection.id)} disabled={syncing === connection.id} className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50">{syncing === connection.id ? 'Syncing...' : 'Sync'}</button>}
                    <button onClick={() => handleDisconnect(connection.id)} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">Disconnect</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Unmatched Transactions</h2>
            {transactions.length > 0 && <button onClick={handleAutoMatch} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all "><Zap className="h-4 w-4" />Auto-Match All</button>}
          </div>
          {transactions.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle className="h-8 w-8 text-green-500" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3><p className="text-gray-500 dark:text-gray-400">No unmatched transactions</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Merchant</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(txn.transaction_date)}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white max-w-xs truncate">{txn.description}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{txn.merchant_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{txn.category || '-'}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${txn.transaction_type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{txn.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}</td>
                      <td className="px-6 py-4 text-right"><button onClick={() => setSelectedTransaction(txn)} className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">Match</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showConnectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConnectModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Building2 className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Connect Bank Account</h2><p className="text-white/80 text-sm">Secure bank connection via Plaid</p></div></div>
                  <button onClick={() => setShowConnectModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-gray-600 dark:text-gray-400">Connect your bank account using Plaid to automatically import transactions.</p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"><div className="text-sm text-blue-800 dark:text-blue-300"><strong>Secure Connection</strong><p className="mt-1 text-blue-700 dark:text-blue-400">Your bank credentials are never stored. We use Plaid's secure connection to access your transaction data.</p></div></div>
                <div className="space-y-2"><div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><CheckCircle className="h-4 w-4 text-green-500" />Bank-level encryption</div><div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><CheckCircle className="h-4 w-4 text-green-500" />Read-only access</div><div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><CheckCircle className="h-4 w-4 text-green-500" />Disconnect anytime</div></div>
                <div className="flex gap-3 pt-4">
                  <button onClick={async () => { try { const response = await api.post('/xero/bank-feeds/link-token'); alert('Plaid Link would open here with token: ' + response.data.link_token?.substring(0, 20) + '...'); setShowConnectModal(false); } catch (err: unknown) { const error = err as { response?: { data?: { error?: string } } }; if (error.response?.data?.error === 'Plaid not configured') { alert('Plaid integration is not configured.'); } else { setError('Failed to initialize bank connection'); } setShowConnectModal(false); } }} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all ">Connect with Plaid</button>
                  <button onClick={() => setShowConnectModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedTransaction(null); setMatchData({ matched_to_type: 'invoice', matched_to_id: '' }); }}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Link2 className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Match Transaction</h2><p className="text-white/80 text-sm">Link to invoice or bill</p></div></div>
                  <button onClick={() => { setSelectedTransaction(null); setMatchData({ matched_to_type: 'invoice', matched_to_id: '' }); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4"><div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(selectedTransaction.transaction_date)}</div><div className="font-medium text-gray-900 dark:text-white">{selectedTransaction.description}</div><div className={`text-lg font-bold ${selectedTransaction.transaction_type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{selectedTransaction.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(selectedTransaction.amount))}</div></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Match To</label><select value={matchData.matched_to_type} onChange={(e) => setMatchData({ ...matchData, matched_to_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"><option value="invoice">Invoice</option><option value="bill">Bill</option><option value="expense">Expense</option><option value="transfer">Bank Transfer</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference ID</label><input type="text" value={matchData.matched_to_id} onChange={(e) => setMatchData({ ...matchData, matched_to_id: e.target.value })} placeholder="Enter invoice/bill number" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" /></div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleMatchTransaction} disabled={!matchData.matched_to_id} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all  disabled:opacity-50 disabled:cursor-not-allowed">Match</button>
                  <button onClick={() => { setSelectedTransaction(null); setMatchData({ matched_to_type: 'invoice', matched_to_id: '' }); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
