import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronRight, ChevronDown, Edit2, Trash2, Building2, Wallet, TrendingUp, TrendingDown, PiggyBank, CreditCard, RefreshCw, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  description: string | null;
  parent_account_id: string | null;
  is_system_account: boolean;
  is_active: boolean;
  children?: Account[];
}

const accountTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  asset: { label: 'Asset', color: 'bg-blue-500', icon: <Building2 className="h-4 w-4" /> },
  current_asset: { label: 'Current Asset', color: 'bg-blue-400', icon: <Wallet className="h-4 w-4" /> },
  bank: { label: 'Bank', color: 'bg-cyan-500', icon: <CreditCard className="h-4 w-4" /> },
  liability: { label: 'Liability', color: 'bg-red-500', icon: <TrendingDown className="h-4 w-4" /> },
  equity: { label: 'Equity', color: 'bg-purple-500', icon: <PiggyBank className="h-4 w-4" /> },
  revenue: { label: 'Revenue', color: 'bg-green-500', icon: <TrendingUp className="h-4 w-4" /> },
  expense: { label: 'Expense', color: 'bg-orange-500', icon: <TrendingDown className="h-4 w-4" /> },
};

const accountTypes = [
  { value: 'asset', label: 'Asset' },
  { value: 'current_asset', label: 'Current Asset' },
  { value: 'bank', label: 'Bank' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
];

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', account_type: 'expense', description: '' });

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/chart-of-accounts`);
      const data = await response.json();
      if (data.success) setAccounts(data.data || []);
    } catch (error) {
      setAccounts([
        { id: '1', code: '1000', name: 'Cash', account_type: 'bank', description: 'Main cash account', parent_account_id: null, is_system_account: true, is_active: true },
        { id: '2', code: '1100', name: 'Accounts Receivable', account_type: 'current_asset', description: 'Trade receivables', parent_account_id: null, is_system_account: true, is_active: true },
        { id: '3', code: '2000', name: 'Accounts Payable', account_type: 'liability', description: 'Trade payables', parent_account_id: null, is_system_account: true, is_active: true },
        { id: '4', code: '3000', name: 'Share Capital', account_type: 'equity', description: 'Issued share capital', parent_account_id: null, is_system_account: true, is_active: true },
        { id: '5', code: '4000', name: 'Sales Revenue', account_type: 'revenue', description: 'Revenue from sales', parent_account_id: null, is_system_account: true, is_active: true },
        { id: '6', code: '5000', name: 'Operating Expenses', account_type: 'expense', description: 'General expenses', parent_account_id: null, is_system_account: false, is_active: true },
      ]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const url = editingAccount ? `${API_BASE}/api/admin-config/chart-of-accounts/${editingAccount.id}` : `${API_BASE}/api/admin-config/chart-of-accounts`;
      const response = await fetch(url, { method: editingAccount ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.success) { alert(editingAccount ? 'Account updated' : 'Account created'); setShowModal(false); setEditingAccount(null); setFormData({ code: '', name: '', account_type: 'expense', description: '' }); fetchAccounts(); }
      else alert(data.error || 'Failed to save');
    } catch (error) { alert('Failed to save account'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin-config/chart-of-accounts/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { alert('Account deleted'); fetchAccounts(); } else alert(data.error || 'Failed to delete');
    } catch (error) { alert('Failed to delete'); }
  };

  const openEdit = (account: Account) => { setEditingAccount(account); setFormData({ code: account.code, name: account.name, account_type: account.account_type, description: account.description || '' }); setShowModal(true); };
  const toggleExpand = (id: string) => { const n = new Set(expandedAccounts); n.has(id) ? n.delete(id) : n.add(id); setExpandedAccounts(n); };

  const buildTree = (accs: Account[]): Account[] => {
    const map = new Map<string, Account>();
    const roots: Account[] = [];
    accs.forEach(a => map.set(a.id, { ...a, children: [] }));
    accs.forEach(a => { const node = map.get(a.id)!; if (a.parent_account_id && map.has(a.parent_account_id)) { map.get(a.parent_account_id)!.children!.push(node); } else roots.push(node); });
    return roots;
  };

  const filtered = accounts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.code.includes(searchTerm));
  const tree = buildTree(filtered);

  const renderRow = (account: Account, level = 0): React.ReactNode => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const config = accountTypeConfig[account.account_type] || { label: account.account_type, color: 'bg-gray-500', icon: null };
    return (
      <React.Fragment key={account.id}>
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? <button onClick={() => toggleExpand(account.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <span className="w-6" />}
              <span className="font-mono text-sm font-semibold">{account.code}</span>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color} text-white`}>{config.icon}</div>
              <div><p className="font-medium">{account.name}</p>{account.description && <p className="text-xs text-gray-500">{account.description}</p>}</div>
            </div>
          </td>
          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs text-white ${config.color}`}>{config.label}</span></td>
          <td className="px-4 py-3">
            {!account.is_system_account && (
              <div className="flex gap-2">
                <button onClick={() => openEdit(account)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(account.id)} className="p-1 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </td>
        </tr>
        {isExpanded && account.children?.map(child => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Chart of Accounts</h1>
          <p className="text-gray-500 mt-1">Manage your account structure and hierarchy</p>
        </div>
        <button onClick={() => { setEditingAccount(null); setFormData({ code: '', name: '', account_type: 'expense', description: '' }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium"><Plus className="h-4 w-4" />Add Account</button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search accounts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Account Name</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Actions</th></tr>
            </thead>
            <tbody>{tree.map(account => renderRow(account))}</tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{editingAccount ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Account Code</label><input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
              <div><label className="block text-sm font-medium mb-1">Account Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
              <div><label className="block text-sm font-medium mb-1">Account Type</label><select value={formData.account_type} onChange={(e) => setFormData({ ...formData, account_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">{accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" rows={3} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
