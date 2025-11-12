import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

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
      const response = await api.get('/erp/banking/accounts');
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
        await api.put(`/erp/banking/accounts/${editingAccount.id}`, payload);
      } else {
        await api.post('/erp/banking/accounts', payload);
      }
      setShowAccountModal(false);
      loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save bank account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    try {
      await api.delete(`/erp/banking/accounts/${id}`);
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
      const response = await api.get('/erp/banking/transactions');
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
        await api.put(`/erp/banking/transactions/${editingTransaction.id}`, payload);
      } else {
        await api.post('/erp/banking/transactions', payload);
      }
      setShowTransactionModal(false);
      loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save transaction');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await api.delete(`/erp/banking/transactions/${id}`);
      loadTransactions();
      setDeleteConfirm({ show: false, type: 'transaction', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete transaction');
    }
  };

  const handleReconcileTransaction = async (transactionId: number) => {
    try {
      await api.post(`/erp/banking/transactions/${transactionId}/reconcile`);
      loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reconcile transaction');
    }
  };

  const loadReconciliations = async () => {
    setReconciliationsLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/banking/reconciliations');
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
        await api.put(`/erp/banking/reconciliations/${editingReconciliation.id}`, payload);
      } else {
        await api.post('/erp/banking/reconciliations', payload);
      }
      setShowReconciliationModal(false);
      loadReconciliations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save reconciliation');
    }
  };

  const handleDeleteReconciliation = async (id: number) => {
    try {
      await api.delete(`/erp/banking/reconciliations/${id}`);
      loadReconciliations();
      setDeleteConfirm({ show: false, type: 'reconciliation', id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete reconciliation');
    }
  };

  const handleCompleteReconciliation = async (reconciliationId: number) => {
    try {
      await api.post(`/erp/banking/reconciliations/${reconciliationId}/complete`);
      loadReconciliations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete reconciliation');
    }
  };

  const filteredAccounts = accounts.filter(a =>
    a.account_name.toLowerCase().includes(accountsSearch.toLowerCase()) ||
    a.account_number.toLowerCase().includes(accountsSearch.toLowerCase()) ||
    a.bank_name.toLowerCase().includes(accountsSearch.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t =>
    t.transaction_number.toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(transactionsSearch.toLowerCase()) ||
    t.reference.toLowerCase().includes(transactionsSearch.toLowerCase())
  );

  const filteredReconciliations = reconciliations.filter(r =>
    r.reconciliation_number.toLowerCase().includes(reconciliationsSearch.toLowerCase()) ||
    r.account_name?.toLowerCase().includes(reconciliationsSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
      COMPLETED: { bg: '#dcfce7', text: '#166534' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status.replace('_', ' ')}</span>;
  };

  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      CURRENT: { bg: '#dbeafe', text: '#1e40af' },
      SAVINGS: { bg: '#dcfce7', text: '#166534' },
      FOREIGN_CURRENCY: { bg: '#fef3c7', text: '#92400e' }
    };
    const color = colors[type] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{type.replace('_', ' ')}</span>;
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Banking & Cash Management</h1>
        <p style={{ color: '#6b7280' }}>Manage bank accounts, transactions, and reconciliations</p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setActiveTab('accounts')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'accounts' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'accounts' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Bank Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'transactions' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'transactions' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'reconciliation' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'reconciliation' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Reconciliation ({reconciliations.length})
          </button>
        </div>
      </div>

      {/* BANK ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search bank accounts..."
              value={accountsSearch}
              onChange={(e) => setAccountsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateAccount}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Bank Account
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Accounts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{accounts.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Active Accounts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {accounts.filter(a => a.is_active).length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Balance (ZAR)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                {formatCurrency(accounts.filter(a => a.currency === 'ZAR').reduce((sum, a) => sum + a.balance, 0))}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Foreign Currency</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                {accounts.filter(a => a.currency !== 'ZAR').length}
              </div>
            </div>
          </div>

          {/* Bank Accounts Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Account Number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Account Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Bank</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Currency</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading bank accounts...</td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No bank accounts found</td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{account.account_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{account.account_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{account.bank_name}</td>
                      <td style={{ padding: '12px 16px' }}>{getAccountTypeBadge(account.account_type)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{account.currency}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(account.balance, account.currency)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditAccount(account)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'account', id: account.id, name: account.account_name })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search transactions..."
              value={transactionsSearch}
              onChange={(e) => setTransactionsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateTransaction}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Transaction
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Transactions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{transactions.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Debits</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                {formatCurrency(transactions.reduce((sum, t) => sum + t.debit, 0))}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Credits</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {formatCurrency(transactions.reduce((sum, t) => sum + t.credit, 0))}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Unreconciled</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {transactions.filter(t => !t.reconciled).length}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Transaction #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Debit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Credit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading transactions...</td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No transactions found</td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{transaction.transaction_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(transaction.transaction_date)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{transaction.description}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{transaction.reference}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#dc2626' }}>{transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#059669' }}>{transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{formatCurrency(transaction.balance)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: transaction.reconciled ? '#dcfce7' : '#fef3c7', color: transaction.reconciled ? '#166534' : '#92400e' }}>
                          {transaction.reconciled ? 'Reconciled' : 'Unreconciled'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEditTransaction(transaction)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {!transaction.reconciled && (
                            <button onClick={() => handleReconcileTransaction(transaction.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Reconcile</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'transaction', id: transaction.id, name: transaction.transaction_number })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search reconciliations..."
              value={reconciliationsSearch}
              onChange={(e) => setReconciliationsSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '300px' }}
            />
            <button
              onClick={handleCreateReconciliation}
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              + New Reconciliation
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Reconciliations</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{reconciliations.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {reconciliations.filter(r => r.status === 'IN_PROGRESS').length}
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {reconciliations.filter(r => r.status === 'COMPLETED').length}
              </div>
            </div>
          </div>

          {/* Reconciliations Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reconciliation #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Account</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Statement Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Statement Balance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>GL Balance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Difference</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading reconciliations...</td>
                  </tr>
                ) : filteredReconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No reconciliations found</td>
                  </tr>
                ) : (
                  filteredReconciliations.map((reconciliation) => (
                    <tr key={reconciliation.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{reconciliation.reconciliation_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{reconciliation.account_name || `Account #${reconciliation.account_id}`}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(reconciliation.statement_date)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatCurrency(reconciliation.statement_balance)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatCurrency(reconciliation.gl_balance)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: reconciliation.difference === 0 ? '#059669' : '#dc2626' }}>
                        {formatCurrency(reconciliation.difference)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{getStatusBadge(reconciliation.status)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEditReconciliation(reconciliation)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                          {reconciliation.status !== 'COMPLETED' && (
                            <button onClick={() => handleCompleteReconciliation(reconciliation.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Complete</button>
                          )}
                          <button onClick={() => setDeleteConfirm({ show: true, type: 'reconciliation', id: reconciliation.id, name: reconciliation.reconciliation_number })} style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                        </div>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingAccount ? 'Edit Bank Account' : 'New Bank Account'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Account Number *</label>
                  <input
                    type="text"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Bank Name *</label>
                  <input
                    type="text"
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Account Name *</label>
                <input
                  type="text"
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Account Type *</label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value as 'CURRENT' | 'SAVINGS' | 'FOREIGN_CURRENCY' })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="CURRENT">Current</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="FOREIGN_CURRENCY">Foreign Currency</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Currency *</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="ZAR">ZAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Opening Balance *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountForm.balance}
                    onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={accountForm.is_active}
                    onChange={(e) => setAccountForm({ ...accountForm, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Active</span>
                </label>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccount}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingAccount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {showTransactionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingTransaction ? 'Edit Transaction' : 'New Transaction'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Account ID *</label>
                <input
                  type="number"
                  value={transactionForm.account_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Transaction Date *</label>
                <input
                  type="date"
                  value={transactionForm.transaction_date}
                  onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reference</label>
                  <input
                    type="text"
                    value={transactionForm.reference}
                    onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                  <input
                    type="text"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Debit Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.debit}
                    onChange={(e) => setTransactionForm({ ...transactionForm, debit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Credit Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.credit}
                    onChange={(e) => setTransactionForm({ ...transactionForm, credit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowTransactionModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTransaction}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingTransaction ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILIATION MODAL */}
      {showReconciliationModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingReconciliation ? 'Edit Reconciliation' : 'New Reconciliation'}</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Account ID *</label>
                <input
                  type="number"
                  value={reconciliationForm.account_id}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, account_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Statement Date *</label>
                <input
                  type="date"
                  value={reconciliationForm.statement_date}
                  onChange={(e) => setReconciliationForm({ ...reconciliationForm, statement_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Statement Balance (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.statement_balance}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, statement_balance: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>GL Balance (ZAR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reconciliationForm.gl_balance}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, gl_balance: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
              <button
                onClick={() => setShowReconciliationModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReconciliation}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
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
        onCancel={() => setDeleteConfirm({ show: false, type: 'account', id: 0, name: '' })}
      />
    </div>
  );
};

export default BankingDashboard;
