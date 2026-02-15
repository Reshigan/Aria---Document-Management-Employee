import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, BookOpen, X, Check, RefreshCw, AlertCircle, FileText, Calculator, TrendingUp } from 'lucide-react';

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
  accounts: { account_code: string; account_name: string; balance: number; balance_type: 'debit' | 'credit'; }[];
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
    account_code: '', account_name: '', account_type: 'asset', account_category: '', is_active: true
  });
  const [journalFormData, setJournalFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0], description: '', reference: ''
  });
  const [journalLines, setJournalLines] = useState<JournalEntryLine[]>([
    { line_number: 1, account_code: '', description: '', debit_amount: 0, credit_amount: 0 },
    { line_number: 2, account_code: '', description: '', debit_amount: 0, credit_amount: 0 }
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'accounts') loadAccounts();
    else if (activeTab === 'journal') { loadJournalEntries(); loadAccounts(); }
    else if (activeTab === 'trial-balance') loadTrialBalance();
  }, [activeTab, searchTerm, typeFilter]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (typeFilter) params.type = typeFilter;
      const response = await api.get('/erp/gl/chart-of-accounts', { params });
      setAccounts(response.data.accounts || response.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading accounts:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load accounts');
    } finally { setLoading(false); }
  };

  const loadJournalEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/gl/journal-entries');
      setJournalEntries(response.data.entries || response.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading journal entries:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load journal entries');
    } finally { setLoading(false); }
  };

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/reports/trial-balance');
      setTrialBalance(response.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading trial balance:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load trial balance');
    } finally { setLoading(false); }
  };

  const handleCreateAccount = () => {
    setAccountFormData({ account_code: '', account_name: '', account_type: 'asset', account_category: '', is_active: true });
    setShowCreateAccountModal(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setAccountFormData({ ...account });
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
    } catch (err: unknown) {
      console.error('Error deleting account:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete account');
    }
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.account_code || !accountFormData.account_name) { setError('Please fill in all required fields'); return; }
    try {
      if (showEditAccountModal && selectedAccount) await api.put(`/erp/gl/chart-of-accounts/${selectedAccount.account_code}`, accountFormData);
      else await api.post('/erp/gl/chart-of-accounts', accountFormData);
      loadAccounts();
      setShowCreateAccountModal(false);
      setShowEditAccountModal(false);
      setSelectedAccount(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving account:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save account');
    }
  };

  const handleCreateJournal = () => {
    setJournalFormData({ entry_date: new Date().toISOString().split('T')[0], description: '', reference: '' });
    setJournalLines([
      { line_number: 1, account_code: '', description: '', debit_amount: 0, credit_amount: 0 },
      { line_number: 2, account_code: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]);
    setShowCreateJournalModal(true);
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (journalLines.length < 2) { setError('Journal entry must have at least 2 lines'); return; }
    const totalDebits = journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredits = journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) { setError(`Journal entry is not balanced. Debits: R${totalDebits.toFixed(2)}, Credits: R${totalCredits.toFixed(2)}`); return; }
    try {
      const payload = { ...journalFormData, lines: journalLines.filter(line => line.account_code && (line.debit_amount > 0 || line.credit_amount > 0)) };
      await api.post('/erp/gl/journal-entries', payload);
      loadJournalEntries();
      setShowCreateJournalModal(false);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving journal entry:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save journal entry');
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
      loadJournalEntries();
      setShowPostJournalDialog(false);
      setSelectedJournal(null);
    } catch (err: unknown) {
      console.error('Error posting journal entry:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to post journal entry');
    }
  };

  const addJournalLine = () => {
    setJournalLines([...journalLines, { line_number: journalLines.length + 1, account_code: '', description: '', debit_amount: 0, credit_amount: 0 }]);
  };

  const removeJournalLine = (index: number) => {
    const newLines = journalLines.filter((_, i) => i !== index);
    newLines.forEach((line, i) => { line.line_number = i + 1; });
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

  const getAccountTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      asset: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      liability: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      equity: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      revenue: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      expense: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[type] || styles.asset;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      posted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.is_active).length,
    totalJournals: journalEntries.length,
    draftJournals: journalEntries.filter(j => j.status === 'draft').length,
    postedJournals: journalEntries.filter(j => j.status === 'posted').length
  };

  const renderAccountModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditAccountModal : showCreateAccountModal;
    const onClose = () => isEdit ? setShowEditAccountModal(false) : setShowCreateAccountModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><BookOpen className="h-6 w-6" /></div>
                <div><h2 className="text-xl font-semibold">{isEdit ? 'Edit Account' : 'Create Account'}</h2><p className="text-white/80 text-sm">Chart of Accounts</p></div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitAccount}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Code *</label><input type="text" value={accountFormData.account_code || ''} onChange={(e) => setAccountFormData({ ...accountFormData, account_code: e.target.value })} required disabled={isEdit} className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isEdit ? 'bg-gray-100 dark:bg-gray-600' : ''}`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Type *</label><select value={accountFormData.account_type || 'asset'} onChange={(e) => setAccountFormData({ ...accountFormData, account_type: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name *</label><input type="text" value={accountFormData.account_name || ''} onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label><input type="text" value={accountFormData.account_category || ''} onChange={(e) => setAccountFormData({ ...accountFormData, account_category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="e.g., Current Assets, Fixed Assets" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={accountFormData.is_active || false} onChange={(e) => setAccountFormData({ ...accountFormData, is_active: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span></label>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30">{isEdit ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderJournalModal = () => {
    if (!showCreateJournalModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateJournalModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create Journal Entry</h2><p className="text-white/80 text-sm">Record a new journal entry</p></div></div>
              <button onClick={() => setShowCreateJournalModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitJournal}>
            <div className="p-6 space-y-6">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entry Date</label><input type="date" value={journalFormData.entry_date} onChange={(e) => setJournalFormData({ ...journalFormData, entry_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference</label><input type="text" value={journalFormData.reference} onChange={(e) => setJournalFormData({ ...journalFormData, reference: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="Optional reference" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><input type="text" value={journalFormData.description} onChange={(e) => setJournalFormData({ ...journalFormData, description: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="Journal description" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900 dark:text-white">Journal Lines</h3><button type="button" onClick={addJournalLine} className="flex items-center gap-1 px-3 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"><Plus className="h-4 w-4" />Add Line</button></div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">#</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Account</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Debit</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit</th><th className="px-4 py-3 w-10"></th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {journalLines.map((line, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{line.line_number}</td>
                          <td className="px-4 py-2"><select value={line.account_code} onChange={(e) => updateJournalLine(index, { account_code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"><option value="">Select account...</option>{accounts.map(a => <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>)}</select></td>
                          <td className="px-4 py-2"><input type="text" value={line.description || ''} onChange={(e) => updateJournalLine(index, { description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Line description" /></td>
                          <td className="px-4 py-2"><input type="number" min="0" step="0.01" value={line.debit_amount || ''} onChange={(e) => updateJournalLine(index, { debit_amount: parseFloat(e.target.value) || 0, credit_amount: 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></td>
                          <td className="px-4 py-2"><input type="number" min="0" step="0.01" value={line.credit_amount || ''} onChange={(e) => updateJournalLine(index, { credit_amount: parseFloat(e.target.value) || 0, debit_amount: 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-transparent" /></td>
                          <td className="px-4 py-2">{journalLines.length > 2 && <button type="button" onClick={() => removeJournalLine(index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><X className="h-4 w-4" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                      <tr><td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Totals:</td><td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">R {getTotalDebits().toFixed(2)}</td><td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">R {getTotalCredits().toFixed(2)}</td><td></td></tr>
                      <tr><td colSpan={6} className="px-4 py-2"><div className={`flex items-center gap-2 justify-center ${isBalanced() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{isBalanced() ? <><Check className="h-4 w-4" />Balanced</> : <><AlertCircle className="h-4 w-4" />Not Balanced (Difference: R {Math.abs(getTotalDebits() - getTotalCredits()).toFixed(2)})</>}</div></td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateJournalModal(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" disabled={!isBalanced()} className={`px-6 py-3 rounded-xl font-medium transition-all shadow-lg ${isBalanced() ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}>Create Journal Entry</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getCreateButton = () => {
    if (activeTab === 'accounts') return <button onClick={handleCreateAccount} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"><Plus className="h-5 w-5" />Add Account</button>;
    if (activeTab === 'journal') return <button onClick={handleCreateJournal} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"><Plus className="h-5 w-5" />New Journal Entry</button>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">General Ledger</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Chart of Accounts, Journal Entries & Trial Balance</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { if (activeTab === 'accounts') loadAccounts(); else if (activeTab === 'journal') loadJournalEntries(); else loadTrialBalance(); }} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            {getCreateButton()}
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30"><BookOpen className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAccounts}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Accounts</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><FileText className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalJournals}</p><p className="text-sm text-gray-500 dark:text-gray-400">Journal Entries</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><Calculator className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draftJournals}</p><p className="text-sm text-gray-500 dark:text-gray-400">Draft Entries</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><Check className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.postedJournals}</p><p className="text-sm text-gray-500 dark:text-gray-400">Posted Entries</p></div></div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['accounts', 'journal', 'trial-balance'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium capitalize transition-all ${activeTab === tab ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>{tab === 'trial-balance' ? 'Trial Balance' : tab}</button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {activeTab !== 'trial-balance' && (
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                {activeTab === 'accounts' && (<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-w-[150px]"><option value="">All Types</option><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option></select>)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>
          ) : activeTab === 'accounts' ? (
            accounts.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><BookOpen className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No accounts found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by adding your first account</p><button onClick={handleCreateAccount} className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">Add First Account</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {accounts.map(account => (
                      <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{account.account_code}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{account.account_name}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize ${getAccountTypeBadge(account.account_type)}`}>{account.account_type}</span></td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{account.account_category || '-'}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${account.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>{account.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => handleEditAccount(account)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button><button onClick={() => handleDeleteAccount(account)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'journal' ? (
            journalEntries.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No journal entries found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first journal entry</p><button onClick={handleCreateJournal} className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">Create First Entry</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {journalEntries.map(journal => (
                      <tr key={journal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{journal.entry_number}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(journal.entry_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{journal.description || '-'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{journal.reference || '-'}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(journal.status)}`}>{journal.status}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">{journal.status === 'draft' && <button onClick={() => handlePostJournal(journal)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-xs font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"><Check className="h-3 w-3" />Post</button>}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            !trialBalance ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><TrendingUp className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No trial balance data</h3><p className="text-gray-500 dark:text-gray-400">Post journal entries to generate trial balance</p></div>) : (
              <div>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div><h3 className="font-semibold text-gray-900 dark:text-white">Trial Balance</h3><p className="text-sm text-gray-500 dark:text-gray-400">As of {new Date(trialBalance.as_of_date).toLocaleDateString()}</p></div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${trialBalance.balanced ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>{trialBalance.balanced ? <><Check className="h-4 w-4" />Balanced</> : <><AlertCircle className="h-4 w-4" />Not Balanced</>}</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Name</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Debit</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {trialBalance.accounts.map(acc => (
                        <tr key={acc.account_code} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{acc.account_code}</td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">{acc.account_name}</td>
                          <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{acc.balance_type === 'debit' ? `R ${Number(acc.balance ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{acc.balance_type === 'credit' ? `R ${Number(acc.balance ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900/50 font-bold">
                      <tr><td colSpan={2} className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">Totals:</td><td className="px-6 py-4 text-right text-gray-900 dark:text-white">R {Number(trialBalance.total_debits ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td><td className="px-6 py-4 text-right text-gray-900 dark:text-white">R {Number(trialBalance.total_credits ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {renderAccountModal(false)}
      {renderAccountModal(true)}
      {renderJournalModal()}
      <ConfirmDialog isOpen={showDeleteAccountDialog} onClose={() => setShowDeleteAccountDialog(false)} onConfirm={confirmDeleteAccount} title="Delete Account" message={`Are you sure you want to delete ${selectedAccount?.account_name}? This action cannot be undone.`} confirmText="Delete" confirmVariant="danger" />
      <ConfirmDialog isOpen={showPostJournalDialog} onClose={() => setShowPostJournalDialog(false)} onConfirm={confirmPostJournal} title="Post Journal Entry" message={`Are you sure you want to post ${selectedJournal?.entry_number}? This will update the general ledger and cannot be undone.`} confirmText="Post" confirmVariant="primary" />
    </div>
  );
}
