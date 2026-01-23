import { useState, useEffect } from 'react';
import api from '../../services/api';

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
  const [matchData, setMatchData] = useState({
    matched_to_type: 'invoice',
    matched_to_id: ''
  });

  useEffect(() => {
    fetchConnections();
    fetchUnmatchedTransactions();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/xero/bank-feeds/connections');
      setConnections(response.data.connections || []);
    } catch (err) {
      setError('Failed to load bank connections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnmatchedTransactions = async () => {
    try {
      const response = await api.get('/xero/bank-feeds/transactions/unmatched');
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
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
    } catch (err) {
      setError('Failed to sync transactions');
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this bank account?')) return;
    
    try {
      await api.delete(`/xero/bank-feeds/connections/${connectionId}`);
      await fetchConnections();
    } catch (err) {
      setError('Failed to disconnect bank');
      console.error(err);
    }
  };

  const handleAutoMatch = async () => {
    try {
      setLoading(true);
      const response = await api.post('/xero/bank-feeds/auto-match', {});
      alert(`Auto-matched ${response.data.matched} transactions`);
      await fetchUnmatchedTransactions();
    } catch (err) {
      setError('Failed to auto-match transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchTransaction = async () => {
    if (!selectedTransaction || !matchData.matched_to_id) return;
    
    try {
      await api.post(`/xero/bank-feeds/transactions/${selectedTransaction.id}/match`, matchData);
      setSelectedTransaction(null);
      setMatchData({ matched_to_type: 'invoice', matched_to_id: '' });
      await fetchUnmatchedTransactions();
    } catch (err) {
      setError('Failed to match transaction');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-ZA');
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Feeds</h1>
          <p className="text-gray-600">Connect your bank accounts for automatic transaction import</p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>+</span> Connect Bank
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Connected Banks</div>
          <div className="text-2xl font-bold text-green-600">
            {connections.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Unmatched Transactions</div>
          <div className="text-2xl font-bold text-yellow-600">
            {transactions.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Debits</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(transactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Credits</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(transactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0))}
          </div>
        </div>
      </div>

      {/* Bank Connections */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Connected Bank Accounts</h2>
        </div>
        {connections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">🏦</div>
            <div className="mb-2">No bank accounts connected</div>
            <div className="text-sm">Connect your bank to automatically import transactions</div>
          </div>
        ) : (
          <div className="divide-y">
            {connections.map((connection) => (
              <div key={connection.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                    {connection.institution_name?.substring(0, 2).toUpperCase() || 'BK'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{connection.institution_name}</div>
                    <div className="text-sm text-gray-500">
                      {connection.account_name} •••• {connection.account_mask}
                    </div>
                    {connection.last_sync_at && (
                      <div className="text-xs text-gray-400">
                        Last synced: {formatDateTime(connection.last_sync_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(connection.status)}`}>
                    {connection.status}
                  </span>
                  {connection.status === 'active' && (
                    <button
                      onClick={() => handleSync(connection.id)}
                      disabled={syncing === connection.id}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {syncing === connection.id ? 'Syncing...' : 'Sync'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unmatched Transactions */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Unmatched Transactions</h2>
          {transactions.length > 0 && (
            <button
              onClick={handleAutoMatch}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
            >
              Auto-Match All
            </button>
          )}
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No unmatched transactions. All caught up!
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(txn.transaction_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {txn.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {txn.merchant_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {txn.category || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => setSelectedTransaction(txn)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Match
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Connect Bank Account</h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                Connect your bank account using Plaid to automatically import transactions.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-blue-800">
                  <strong>Secure Connection</strong>
                  <p className="mt-1">Your bank credentials are never stored. We use Plaid's secure connection to access your transaction data.</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> Bank-level encryption
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> Read-only access
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> Disconnect anytime
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await api.post('/xero/bank-feeds/link-token');
                    alert('Plaid Link would open here with token: ' + response.data.link_token?.substring(0, 20) + '...');
                    setShowConnectModal(false);
                  } catch (err: any) {
                    if (err.response?.data?.error === 'Plaid not configured') {
                      alert('Plaid integration is not configured. Please add PLAID_CLIENT_ID and PLAID_SECRET to your environment.');
                    } else {
                      setError('Failed to initialize bank connection');
                    }
                    setShowConnectModal(false);
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Connect with Plaid
              </button>
              <button
                onClick={() => setShowConnectModal(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Transaction Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Match Transaction</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">{formatDate(selectedTransaction.transaction_date)}</div>
              <div className="font-medium">{selectedTransaction.description}</div>
              <div className={`text-lg font-bold ${selectedTransaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                {selectedTransaction.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(selectedTransaction.amount))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match To</label>
                <select
                  value={matchData.matched_to_type}
                  onChange={(e) => setMatchData({ ...matchData, matched_to_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="invoice">Invoice</option>
                  <option value="bill">Bill</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
                <input
                  type="text"
                  value={matchData.matched_to_id}
                  onChange={(e) => setMatchData({ ...matchData, matched_to_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter invoice/bill number"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleMatchTransaction}
                disabled={!matchData.matched_to_id}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Match
              </button>
              <button
                onClick={() => { setSelectedTransaction(null); setMatchData({ matched_to_type: 'invoice', matched_to_id: '' }); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
