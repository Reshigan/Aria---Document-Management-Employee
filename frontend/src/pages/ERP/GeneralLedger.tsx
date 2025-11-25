import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, BookOpen, X, Check } from 'lucide-react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_category?: string;
  is_active: boolean;
  created_at?: string;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  reference?: string;
  lines?: JournalEntryLine[];
}

interface JournalEntryLine {
  line_number: number;
  account_code: string;
  account_name?: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
}

interface TrialBalance {
  as_of_date: string;
  accounts: {
    account_code: string;
    account_name: string;
    balance: number;
    balance_type: 'debit' | 'credit';
  }[];
  total_debits: number;
  total_credits: number;
  balanced: boolean;
}

export default function GeneralLedger() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial-balance'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showCreateJournalModal, setShowCreateJournalModal] = useState(false);
  const [showPostJournalDialog, setShowPostJournalDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [accountFormData, setAccountFormData] = useState<Partial<Account>>({
    account_code: '',
    account_name: '',
    account_type: 'asset',
    account_category: '',
    is_active: true
  });
  const [journalFormData, setJournalFormData] = useState<Partial<JournalEntry>>({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: ''
  });
  const [journalLines, setJournalLines] = useState<JournalEntryLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'accounts') {
      loadAccounts();
    } else if (activeTab === 'journal') {
      loadJournalEntries();
      loadAccounts();
    } else if (activeTab === 'trial-balance') {
      loadTrialBalance();
    }
  }, [activeTab, searchTerm, typeFilter]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (typeFilter) params.type = typeFilter;
      
      const response = await api.get('/erp/gl/chart-of-accounts', { params });
      setAccounts(response.data.accounts || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      setError(err.response?.data?.detail || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadJournalEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/gl/journal-entries');
      setJournalEntries(response.data.entries || response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading journal entries:', err);
      setError(err.response?.data?.detail || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/reports/trial-balance');
      setTrialBalance(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading trial balance:', err);
      setError(err.response?.data?.detail || 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setAccountFormData({
      account_code: '',
      account_name: '',
      account_type: 'asset',
      account_category: '',
      is_active: true
    });
    setShowCreateAccountModal(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setAccountFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_category: account.account_category,
      is_active: account.is_active
    });
    setShowEditAccountModal(true);
  };

  const handleDeleteAccount = (account: Account) => {
    setSelectedAccount(account);
    setShowDeleteAccountDialog(true);
  };

  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;
    
    try {
      await api.delete(`/erp/gl/chart-of-accounts/${selectedAccount.account_code}`);
      loadAccounts();
      setSelectedAccount(null);
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.response?.data?.detail || 'Failed to delete account');
    }
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountFormData.account_code || !accountFormData.account_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (showEditAccountModal && selectedAccount) {
        await api.put(`/erp/gl/chart-of-accounts/${selectedAccount.account_code}`, accountFormData);
      } else {
        await api.post('/erp/gl/chart-of-accounts', accountFormData);
      }

      loadAccounts();
      setShowCreateAccountModal(false);
      setShowEditAccountModal(false);
      setSelectedAccount(null);
      setError(null);
    } catch (err: any) {
      console.error('Error saving account:', err);
      setError(err.response?.data?.detail || 'Failed to save account');
    }
  };

  const handleCreateJournal = () => {
    setJournalFormData({
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      reference: ''
    });
    setJournalLines([
      { line_number: 1, account_code: '', description: '', debit_amount: 0, credit_amount: 0 },
      { line_number: 2, account_code: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]);
    setShowCreateJournalModal(true);
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (journalLines.length < 2) {
      setError('Journal entry must have at least 2 lines');
      return;
    }

    const totalDebits = journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredits = journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      setError(`Journal entry is not balanced. Debits: R${totalDebits.toFixed(2)}, Credits: R${totalCredits.toFixed(2)}`);
      return;
    }

    try {
      const payload = {
        ...journalFormData,
        lines: journalLines.filter(line => line.account_code && (line.debit_amount > 0 || line.credit_amount > 0))
      };

      await api.post('/erp/gl/journal-entries', payload);
      loadJournalEntries();
      setShowCreateJournalModal(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving journal entry:', err);
      setError(err.response?.data?.detail || 'Failed to save journal entry');
    }
  };

  const handlePostJournal = (journal: JournalEntry) => {
    setSelectedJournal(journal);
    setShowPostJournalDialog(true);
  };

  const confirmPostJournal = async () => {
    if (!selectedJournal) return;
    
    try {
      await api.post(`/erp/gl/journal-entries/${selectedJournal.id}/post`);
      alert('Journal entry posted to GL successfully!');
      loadJournalEntries();
      setShowPostJournalDialog(false);
      setSelectedJournal(null);
    } catch (err: any) {
      console.error('Error posting journal entry:', err);
      setError(err.response?.data?.detail || 'Failed to post journal entry');
    }
  };

  const addJournalLine = () => {
    setJournalLines([
      ...journalLines,
      { line_number: journalLines.length + 1, account_code: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]);
  };

  const removeJournalLine = (index: number) => {
    const newLines = journalLines.filter((_, i) => i !== index);
    newLines.forEach((line, i) => {
      line.line_number = i + 1;
    });
    setJournalLines(newLines);
  };

  const updateJournalLine = (index: number, updates: Partial<JournalEntryLine>) => {
    const newLines = [...journalLines];
    newLines[index] = { ...newLines[index], ...updates };
    setJournalLines(newLines);
  };

  const getTotalDebits = () => journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const getTotalCredits = () => journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const isBalanced = () => Math.abs(getTotalDebits() - getTotalCredits()) < 0.01;

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: '#2563eb',
      liability: '#ef4444',
      equity: '#8b5cf6',
      revenue: '#10b981',
      expense: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderAccountFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditAccountModal : showCreateAccountModal;
    const onClose = () => isEdit ? setShowEditAccountModal(false) : setShowCreateAccountModal(false);

    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              {isEdit ? 'Edit Account' : 'Create Account'}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitAccount}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Account Code *
                  </label>
                  <input
                    type="text"
                    value={accountFormData.account_code || ''}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_code: e.target.value })}
                    required
                    disabled={isEdit}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: isEdit ? '#f3f4f6' : 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Account Type *
                  </label>
                  <select
                    value={accountFormData.account_type || 'asset'}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_type: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Account Name *
                </label>
                <input
                  type="text"
                  value={accountFormData.account_name || ''}
                  onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Category
                </label>
                <input
                  type="text"
                  value={accountFormData.account_category || ''}
                  onChange={(e) => setAccountFormData({ ...accountFormData, account_category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={accountFormData.is_active || false}
                    onChange={(e) => setAccountFormData({ ...accountFormData, is_active: e.target.checked })}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Active</span>
                </label>
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {isEdit ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderJournalFormModal = () => {
    if (!showCreateJournalModal) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={() => setShowCreateJournalModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '1200px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              Create Journal Entry
            </h2>
            <button
              onClick={() => setShowCreateJournalModal(false)}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitJournal}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Entry Date *
                  </label>
                  <input
                    type="date"
                    value={journalFormData.entry_date || ''}
                    onChange={(e) => setJournalFormData({ ...journalFormData, entry_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Reference
                  </label>
                  <input
                    type="text"
                    value={journalFormData.reference || ''}
                    onChange={(e) => setJournalFormData({ ...journalFormData, reference: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Balance Status
                  </label>
                  <div style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    background: isBalanced() ? '#d1fae5' : '#fee2e2',
                    color: isBalanced() ? '#065f46' : '#991b1b',
                    textAlign: 'center'
                  }}>
                    {isBalanced() ? '✓ Balanced' : '✗ Not Balanced'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Description *
                </label>
                <textarea
                  value={journalFormData.description || ''}
                  onChange={(e) => setJournalFormData({ ...journalFormData, description: e.target.value })}
                  required
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Journal Lines</h3>
                  <button
                    type="button"
                    onClick={addJournalLine}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} />
                    Add Line
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '50px' }}>#</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', minWidth: '150px' }}>Account</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', minWidth: '200px' }}>Description</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '120px' }}>Debit</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '120px' }}>Credit</th>
                        <th style={{ padding: '0.75rem', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {journalLines.map((line, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{line.line_number}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <select
                              value={line.account_code}
                              onChange={(e) => {
                                const account = accounts.find(a => a.account_code === e.target.value);
                                updateJournalLine(index, {
                                  account_code: e.target.value,
                                  account_name: account?.account_name
                                });
                              }}
                              required
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="">Select account...</option>
                              {accounts.filter(a => a.is_active).map(account => (
                                <option key={account.id} value={account.account_code}>
                                  {account.account_code} - {account.account_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <input
                              type="text"
                              value={line.description || ''}
                              onChange={(e) => updateJournalLine(index, { description: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <input
                              type="number"
                              value={line.debit_amount || 0}
                              onChange={(e) => updateJournalLine(index, {
                                debit_amount: parseFloat(e.target.value) || 0,
                                credit_amount: 0
                              })}
                              min="0"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                textAlign: 'right'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <input
                              type="number"
                              value={line.credit_amount || 0}
                              onChange={(e) => updateJournalLine(index, {
                                credit_amount: parseFloat(e.target.value) || 0,
                                debit_amount: 0
                              })}
                              min="0"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                textAlign: 'right'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {journalLines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeJournalLine(index)}
                                style={{
                                  padding: '0.25rem',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer'
                                }}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#f9fafb', borderTop: '2px solid #d1d5db' }}>
                      <tr>
                        <td colSpan={3} style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>Total</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(getTotalDebits())}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(getTotalCredits())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={() => setShowCreateJournalModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isBalanced()}
                style={{
                  padding: '0.5rem 1rem',
                  background: isBalanced() ? '#2563eb' : '#d1d5db',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: isBalanced() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Journal Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>General Ledger</h1>
          <p style={{ color: '#6b7280' }}>Chart of Accounts, Journal Entries & Trial Balance</p>
        </div>
        {activeTab === 'accounts' && (
          <button
            onClick={handleCreateAccount}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            New Account
          </button>
        )}
        {activeTab === 'journal' && (
          <button
            onClick={handleCreateJournal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            New Journal Entry
          </button>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button
              onClick={() => setActiveTab('accounts')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'accounts' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'accounts' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Chart of Accounts
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'journal' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'journal' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Journal Entries
            </button>
            <button
              onClick={() => setActiveTab('trial-balance')}
              style={{
                padding: '1rem 0',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'trial-balance' ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === 'trial-balance' ? '#2563eb' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Trial Balance
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'accounts' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                  <Search
                    size={20}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by code or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ minWidth: '200px' }}>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: 'white'
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading accounts...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
                          <BookOpen size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No accounts found</h3>
                          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                            {searchTerm || typeFilter ? 'Try adjusting your filters' : 'Get started by creating your first account'}
                          </p>
                          {!searchTerm && !typeFilter && (
                            <button
                              onClick={handleCreateAccount}
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Create Account
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      accounts.map((account) => (
                        <tr key={account.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500', fontFamily: 'monospace' }}>{account.account_code}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{account.account_name}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: getAccountTypeColor(account.account_type) + '20',
                              color: getAccountTypeColor(account.account_type)
                            }}>
                              {account.account_type}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{account.account_category || '-'}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: account.is_active ? '#d1fae5' : '#f3f4f6',
                              color: account.is_active ? '#065f46' : '#6b7280'
                            }}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleEditAccount(account)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'transparent',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '0.25rem',
                                  color: '#6b7280',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(account)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'transparent',
                                  border: '1px solid #fecaca',
                                  borderRadius: '0.25rem',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'journal' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading journal entries...
              </div>
            ) : journalEntries.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <BookOpen size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No journal entries found</h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Get started by creating your first journal entry</p>
                <button
                  onClick={handleCreateJournal}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Create Journal Entry
                </button>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {journalEntries.map((entry) => (
                  <div key={entry.id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>{entry.entry_number}</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{entry.description}</p>
                        {entry.reference && (
                          <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>Ref: {entry.reference}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </p>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: entry.status === 'posted' ? '#d1fae5' : '#fef3c7',
                          color: entry.status === 'posted' ? '#065f46' : '#92400e'
                        }}>
                          {entry.status}
                        </span>
                        {entry.status === 'draft' && (
                          <button
                            onClick={() => handlePostJournal(entry)}
                            style={{
                              display: 'block',
                              marginTop: '0.5rem',
                              padding: '0.25rem 0.75rem',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Post to GL
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <tr>
                            <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Account</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Description</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Debit</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines?.map((line, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                {line.account_code} - {line.account_name}
                              </td>
                              <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                {line.description || '-'}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                                {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>
                                {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'trial-balance' && (
        <>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                Loading trial balance...
              </div>
            ) : !trialBalance ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <BookOpen size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No trial balance data</h3>
                <p style={{ color: '#6b7280' }}>Trial balance will be available once you have posted journal entries</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                    Trial Balance - As of {trialBalance.as_of_date}
                  </h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Account Name</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Debit</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts?.map((account, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{account.account_code}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{account.account_name}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {account.balance_type === 'debit' ? formatCurrency(account.balance) : '-'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                            {account.balance_type === 'credit' ? formatCurrency(account.balance) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ background: '#f9fafb', borderTop: '2px solid #d1d5db' }}>
                      <tr>
                        <td colSpan={2} style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>Total</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(trialBalance.total_debits)}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                          {formatCurrency(trialBalance.total_credits)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div style={{ padding: '1.5rem', textAlign: 'right' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    background: trialBalance.balanced ? '#d1fae5' : '#fee2e2',
                    color: trialBalance.balanced ? '#065f46' : '#991b1b'
                  }}>
                    {trialBalance.balanced ? '✓ Balanced' : '✗ Not Balanced'}
                  </span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {renderAccountFormModal(false)}
      {renderAccountFormModal(true)}
      {renderJournalFormModal()}

      <ConfirmDialog
        isOpen={showDeleteAccountDialog}
        onClose={() => setShowDeleteAccountDialog(false)}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message={`Are you sure you want to delete account "${selectedAccount?.account_code} - ${selectedAccount?.account_name}"? This action cannot be undone.`}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showPostJournalDialog}
        onClose={() => setShowPostJournalDialog(false)}
        onConfirm={confirmPostJournal}
        title="Post Journal Entry"
        message={`Are you sure you want to post journal entry "${selectedJournal?.entry_number}" to the General Ledger? This action cannot be undone.`}
        variant="warning"
      />
    </div>
  );
}
