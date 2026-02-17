import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Landmark, Plus, CreditCard, ArrowUpDown, CheckCircle, Search, Edit2, Trash2, RefreshCw, DollarSign, TrendingUp, TrendingDown, Clock, Globe } from 'lucide-react';

interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  bank_name: string;
  account_type: 'CURRENT' | 'SAVINGS' | 'FOREIGN_CURRENCY';
  currency: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

interface BankTransaction {
  id: number;
  transaction_number: string;
  account_id: number;
  account_name?: string;
  transaction_date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  reconciled: boolean;
  category: string;
  created_at: string;
}

interface Reconciliation {
  id: number;
  reconciliation_number: string;
  account_id: number;
  account_name?: string;
  statement_date: string;
  statement_balance: number;
  gl_balance: number;
  difference: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  created_at: string;
}

const BankingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'reconciliation'>('accounts');
  
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsSearch, setAccountsSearch] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    account_number: '',
    account_name: '',
    bank_name: '',
    account_type: 'CURRENT' as 'CURRENT' | 'SAVINGS' | 'FOREIGN_CURRENCY',
    currency: 'ZAR',
    balance: '0',
    is_active: true
  });
  
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsSearch, setTransactionsSearch] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [transactionForm, setTransactionForm] = useState({
    account_id: '',
    transaction_date: '',
    description: '',
    reference: '',
    debit: '0',
    credit: '0',
    category: ''
  });
  
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [reconciliationsLoading, setReconciliationsLoading] = useState(false);
  const [reconciliationsSearch, setReconciliationsSearch] = useState('');
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [editingReconciliation, setEditingReconciliation] = useState<Reconciliation | null>(null);
  const [reconciliationForm, setReconciliationForm] = useState({
    account_id: '',
    statement_date: '',
    statement_balance: '',
    gl_balance: ''
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'account' | 'transaction' | 'reconciliation';
    id: number;
    name: string;
  }>({ show: false, type: 'account', id: 0, name: '' });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'accounts') loadAccounts();
    else if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'reconciliation') loadReconciliations();
  }, [activeTab]);

  const loadAccounts = async () => {
    setAccountsLoading(true);
    setError('');
    try {
      const response = await api.get('/banking/accounts');
      setAccounts(response.data.accounts || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bank accounts');
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      account_number: '',
      account_name: '',
      bank_name: '',
      account_type: 'CURRENT',
      currency: 'ZAR',
      balance: '0',
      is_active: true
    });
    setShowAccountModal(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setAccountForm({
      account_number: account.account_number,
      account_name: account.account_name,
      bank_name: account.bank_name,
      account_type: account.account_type,
      currency: account.currency,
      balance: account.balance.toString(),
      is_active: account.is_active
    });
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    setError('');
    try {
      const payload = {
        ...accountForm,
        balance: parseFloat(accountForm.balance)
      };
      
      if (editingAccount) {
        await api.put(`/banking/accounts/${editingAccount.id}`, payload);
      } else {
        await api.post('/banking/accounts', payload);
      }
      setShowAccountModal(false);
      loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save bank account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    try {
      await api.delete(`/banking/accounts/${id}`);
      loadAccounts();
      setDeleteConfirm({ show: false, type: 'account', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete bank account');
    }
  };

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    setError('');
    try {
      const response = await api.get('/banking/transactions');
      setTransactions(response.data.transactions || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleCreateTransaction = () => {
    setEditingTransaction(null);
    setTransactionForm({
      account_id: '',
      transaction_date: '',
      description: '',
      reference: '',
      debit: '0',
      credit: '0',
      category: ''
    });
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: BankTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      account_id: transaction.account_id.toString(),
      transaction_date: transaction.transaction_date,
      description: transaction.description,
      reference: transaction.reference,
      debit: transaction.debit.toString(),
      credit: transaction.credit.toString(),
      category: transaction.category
    });
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async () => {
    setError('');
    try {
      const payload = {
        ...transactionForm,
        account_id: parseInt(transactionForm.account_id),
        debit: parseFloat(transactionForm.debit),
        credit: parseFloat(transactionForm.credit)
      };
      
      if (editingTransaction) {
        await api.put(`/banking/transactions/${editingTransaction.id}`, payload);
      } else {
        await api.post('/banking/transactions', payload);
      }
      setShowTransactionModal(false);
      loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save transaction');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await api.delete(`/banking/transactions/${id}`);
      loadTransactions();
      setDeleteConfirm({ show: false, type: 'transaction', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete transaction');
    }
  };

  const handleReconcileTransaction = async (transactionId: number) => {
    try {
      await api.post(`/banking/transactions/${transactionId}/reconcile`);
      loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reconcile transaction');
    }
  };

  const loadReconciliations = async () => {
    setReconciliationsLoading(true);
    setError('');
    try {
      const response = await api.get('/banking/reconciliations');
      setReconciliations(response.data.reconciliations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load reconciliations');
    } finally {
      setReconciliationsLoading(false);
    }
  };

  const handleCreateReconciliation = () => {
    setEditingReconciliation(null);
    setReconciliationForm({
      account_id: '',
      statement_date: '',
      statement_balance: '',
      gl_balance: ''
    });
    setShowReconciliationModal(true);
  };

  const handleEditReconciliation = (reconciliation: Reconciliation) => {
    setEditingReconciliation(reconciliation);
    setReconciliationForm({
      account_id: reconciliation.account_id.toString(),
      statement_date: reconciliation.statement_date,
      statement_balance: reconciliation.statement_balance.toString(),
      gl_balance: reconciliation.gl_balance.toString()
    });
    setShowReconciliationModal(true);
  };

  const handleSaveReconciliation = async () => {
    setError('');
    try {
      const payload = {
        ...reconciliationForm,
        account_id: parseInt(reconciliationForm.account_id),
        statement_balance: parseFloat(reconciliationForm.statement_balance),
        gl_balance: parseFloat(reconciliationForm.gl_balance)
      };
      
      if (editingReconciliation) {
        await api.put(`/banking/reconciliations/${editingReconciliation.id}`, payload);
      } else {
        await api.post('/banking/reconciliations', payload);
      }
      setShowReconciliationModal(false);
      loadReconciliations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save reconciliation');
    }
  };

  const handleDeleteReconciliation = async (id: number) => {
    try {
      await api.delete(`/banking/reconciliations/${id}`);
      loadReconciliations();
      setDeleteConfirm({ show: false, type: 'reconciliation', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete reconciliation');
    }
  };

  const handleCompleteReconciliation = async (reconciliationId: number) => {
    try {
      await api.post(`/banking/reconciliations/${reconciliationId}/complete`);
      loadReconciliations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete reconciliation');
    }
  };

  const filteredAccounts = accounts.filter(a =>
    (a.account_name || '').toLowerCase().includes(accountsSearch.toLowerCase()) ||
    (a.account_number || '').toLowerCase().includes(accountsSearch.toLowerCase()) ||
    (a.bank_name || '').toLowerCase().includes(accountsSearch.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t =>
    (t.transaction_number || '').toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    (t.reference || '').toLowerCase().includes(transactionsSearch.toLowerCase())
  );

  const filteredReconciliations = reconciliations.filter(r =>
    (r.reconciliation_number || '').toLowerCase().includes(reconciliationsSearch.toLowerCase()) ||
    (r.account_name || '').toLowerCase().includes(reconciliationsSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
    const style = styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{(status || '').replace('_', ' ')}</span>;
  };

  const getAccountTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      CURRENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      SAVINGS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      FOREIGN_CURRENCY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    };
    const style = styles[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{(type || '').replace('_', ' ')}</span>;
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(Number(amount ?? 0));
  };

  const formatDate = (dateString: string) => { if (!dateString) return "-"; const _d = new Date(dateString); return isNaN(_d.getTime()) ? dateString : _d.toLocaleDateString("en-ZA"); };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
            <Landmark className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Banking & Cash Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage bank accounts, transactions, and reconciliations</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex gap-2 p-2">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'accounts'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white '
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Bank Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white '
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ArrowUpDown className="h-4 w-4" />
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'reconciliation'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white '
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Reconciliation ({reconciliations.length})
          </button>
        </div>
      </div>

      {/* BANK ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div>
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search bank accounts..."
                value={accountsSearch}
                onChange={(e) => setAccountsSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent w-80"
              />
            </div>
            <button
              onClick={handleCreateAccount}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all  flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              New Bank Account
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{accounts.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Accounts</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{accounts.filter(a => a.is_active).length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Accounts</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(accounts.filter(a => a.currency === 'ZAR').reduce((sum, a) => sum + Number(a.balance ?? 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Balance (ZAR)</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{accounts.filter(a => a.currency !== 'ZAR').length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Foreign Currency</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Accounts Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Account Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Account Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Currency</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {accountsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Loading bank accounts...</td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No bank accounts found</td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-teal-600 dark:text-teal-400">{account.account_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{account.account_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{account.bank_name}</td>
                      <td className="px-6 py-4">{getAccountTypeBadge(account.account_type)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{account.currency}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(account.balance, account.currency)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors mr-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'account', id: account.id, name: account.account_name })}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div>
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={transactionsSearch}
                onChange={(e) => setTransactionsSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent w-80"
              />
            </div>
            <button
              onClick={handleCreateTransaction}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all  flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              New Transaction
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
                  <ArrowUpDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Transactions</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(transactions.reduce((sum, t) => sum + Number(t.debit ?? 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Debits</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(transactions.reduce((sum, t) => sum + Number(t.credit ?? 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Credits</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.filter(t => !t.reconciled).length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unreconciled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Transaction #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Debit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Credit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transactionsLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Loading transactions...</td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No transactions found</td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-teal-600 dark:text-teal-400">{transaction.transaction_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(transaction.transaction_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{transaction.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{transaction.reference}</td>
                      <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400">{transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}</td>
                      <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400">{transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(transaction.balance)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          transaction.reconciled 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {transaction.reconciled ? 'Reconciled' : 'Unreconciled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors mr-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!transaction.reconciled && (
                          <button
                            onClick={() => handleReconcileTransaction(transaction.id)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors mr-1"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'transaction', id: transaction.id, name: transaction.transaction_number })}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECONCILIATION TAB */}
      {activeTab === 'reconciliation' && (
        <div>
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reconciliations..."
                value={reconciliationsSearch}
                onChange={(e) => setReconciliationsSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent w-80"
              />
            </div>
            <button
              onClick={handleCreateReconciliation}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all  flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              New Reconciliation
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{reconciliations.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Reconciliations</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{reconciliations.filter(r => r.status === 'IN_PROGRESS').length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{reconciliations.filter(r => r.status === 'COMPLETED').length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reconciliations Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Reconciliation #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Statement Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Statement Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">GL Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Difference</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reconciliationsLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Loading reconciliations...</td>
                  </tr>
                ) : filteredReconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No reconciliations found</td>
                  </tr>
                ) : (
                  filteredReconciliations.map((reconciliation) => (
                    <tr key={reconciliation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-teal-600 dark:text-teal-400">{reconciliation.reconciliation_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{reconciliation.account_name || `Account #${reconciliation.account_id}`}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(reconciliation.statement_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(reconciliation.statement_balance)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(reconciliation.gl_balance)}</td>
                      <td className={`px-6 py-4 text-sm font-semibold ${reconciliation.difference === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(reconciliation.difference)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(reconciliation.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditReconciliation(reconciliation)}
                          className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors mr-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {reconciliation.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCompleteReconciliation(reconciliation.id)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors mr-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm({ show: true, type: 'reconciliation', id: reconciliation.id, name: reconciliation.reconciliation_number })}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BANK ACCOUNT MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {editingAccount ? 'Edit Bank Account' : 'New Bank Account'}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number *</label>
                  <input
                    type="text"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name *</label>
                <input
                  type="text"
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Type *</label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value as 'CURRENT' | 'SAVINGS' | 'FOREIGN_CURRENCY' })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="CURRENT">Current</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="FOREIGN_CURRENCY">Foreign Currency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency *</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="ZAR">ZAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opening Balance *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountForm.balance}
                    onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accountForm.is_active}
                    onChange={(e) => setAccountForm({ ...accountForm, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccount}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-cyan-600 transition-all "
              >
                {editingAccount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account ID *</label>
                  <input
                    type="number"
                    value={transactionForm.account_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Date *</label>
                  <input
                    type="date"
                    value={transactionForm.transaction_date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference</label>
                  <input
                    type="text"
                    value={transactionForm.reference}
                    onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <input
                    type="text"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Debit Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.debit}
                    onChange={(e) => setTransactionForm({ ...transactionForm, debit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Credit Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.credit}
                    onChange={(e) => setTransactionForm({ ...transactionForm, credit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <button
                onClick={() => setShowTransactionModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTransaction}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-cyan-600 transition-all "
              >
                {editingTransaction ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILIATION MODAL */}
      {showReconciliationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {editingReconciliation ? 'Edit Reconciliation' : 'New Reconciliation'}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account ID *</label>
                  <input
                    type="number"
                    value={reconciliationForm.account_id}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, account_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statement Date *</label>
                  <input
                    type="date"
                    value={reconciliationForm.statement_date}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, statement_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statement Balance (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.statement_balance}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, statement_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GL Balance (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.gl_balance}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, gl_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <button
                onClick={() => setShowReconciliationModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReconciliation}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-cyan-600 transition-all "
              >
                {editingReconciliation ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={`Delete ${deleteConfirm.type}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteConfirm.type === 'account') handleDeleteAccount(deleteConfirm.id);
          else if (deleteConfirm.type === 'transaction') handleDeleteTransaction(deleteConfirm.id);
          else if (deleteConfirm.type === 'reconciliation') handleDeleteReconciliation(deleteConfirm.id);
        }}
        onClose={() => setDeleteConfirm({ show: false, type: 'account', id: 0, name: '' })}
      />
    </div>
  );
};

export default BankingDashboard;
