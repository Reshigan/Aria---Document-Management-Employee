import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, X, Check, Calendar, Percent, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  term_type: string;
  day_of_month: number | null;
  is_default: boolean;
  is_active: boolean;
  description: string | null;
  early_payment_discount_percent: number | null;
  early_payment_discount_days: number | null;
  late_fee_percent: number | null;
  late_fee_grace_days: number | null;
}

const termTypes = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_days', label: 'Net Days' },
  { value: 'day_of_month', label: 'Day of Month' },
  { value: 'day_of_following_month', label: 'Day of Following Month' },
];

export default function PaymentTerms() {
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const [formData, setFormData] = useState({
    name: '', days: 30, term_type: 'net_days', day_of_month: 1, is_default: false,
    description: '', early_payment_discount_percent: 0, early_payment_discount_days: 0,
    late_fee_percent: 0, late_fee_grace_days: 0
  });

  useEffect(() => { fetchTerms(); }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/payment-terms`);
      const data = await response.json();
      if (data.success) setTerms(data.data || []);
    } catch (error) {
      setTerms([
        { id: '1', name: 'Due on Receipt', days: 0, term_type: 'due_on_receipt', day_of_month: null, is_default: false, is_active: true, description: 'Payment due immediately', early_payment_discount_percent: null, early_payment_discount_days: null, late_fee_percent: null, late_fee_grace_days: null },
        { id: '2', name: 'Net 30', days: 30, term_type: 'net_days', day_of_month: null, is_default: true, is_active: true, description: 'Payment due in 30 days', early_payment_discount_percent: 2, early_payment_discount_days: 10, late_fee_percent: 2, late_fee_grace_days: 7 },
        { id: '3', name: 'Net 60', days: 60, term_type: 'net_days', day_of_month: null, is_default: false, is_active: true, description: 'Payment due in 60 days', early_payment_discount_percent: null, early_payment_discount_days: null, late_fee_percent: null, late_fee_grace_days: null },
        { id: '4', name: 'End of Month', days: 0, term_type: 'day_of_month', day_of_month: 31, is_default: false, is_active: true, description: 'Payment due at end of month', early_payment_discount_percent: null, early_payment_discount_days: null, late_fee_percent: null, late_fee_grace_days: null },
      ]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const url = editingTerm ? `${API_BASE}/api/admin-config/payment-terms/${editingTerm.id}` : `${API_BASE}/api/admin-config/payment-terms`;
      const response = await fetch(url, { method: editingTerm ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.success) { alert(editingTerm ? 'Term updated' : 'Term created'); setShowModal(false); setEditingTerm(null); fetchTerms(); }
      else alert(data.error || 'Failed to save');
    } catch (error) { alert('Failed to save term'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment term?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin-config/payment-terms/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { alert('Term deleted'); fetchTerms(); } else alert(data.error || 'Failed to delete');
    } catch (error) { alert('Failed to delete'); }
  };

  const openEdit = (term: PaymentTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name, days: term.days, term_type: term.term_type, day_of_month: term.day_of_month || 1,
      is_default: term.is_default, description: term.description || '',
      early_payment_discount_percent: term.early_payment_discount_percent || 0,
      early_payment_discount_days: term.early_payment_discount_days || 0,
      late_fee_percent: term.late_fee_percent || 0, late_fee_grace_days: term.late_fee_grace_days || 0
    });
    setShowModal(true);
  };

  const stats = {
    total: terms.length,
    active: terms.filter(t => t.is_active).length,
    withDiscount: terms.filter(t => t.early_payment_discount_percent).length,
    defaultTerm: terms.find(t => t.is_default)?.name || 'None'
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Payment Terms</h1>
          <p className="text-gray-500 mt-1">Configure payment terms with discounts and late fees</p>
        </div>
        <button onClick={() => { setEditingTerm(null); setFormData({ name: '', days: 30, term_type: 'net_days', day_of_month: 1, is_default: false, description: '', early_payment_discount_percent: 0, early_payment_discount_days: 0, late_fee_percent: 0, late_fee_grace_days: 0 }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium"><Plus className="h-4 w-4" />Add Term</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg"><Calendar className="h-5 w-5 text-cyan-600" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-gray-500">Total Terms</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><Check className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-sm text-gray-500">Active</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg"><Percent className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.withDiscount}</p><p className="text-sm text-gray-500">With Discounts</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><Clock className="h-5 w-5 text-blue-600" /></div><div><p className="text-lg font-bold truncate">{stats.defaultTerm}</p><p className="text-sm text-gray-500">Default</p></div></div></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terms.map(term => (
            <div key={term.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">{term.name}{term.is_default && <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full">Default</span>}</h3>
                  <p className="text-sm text-gray-500">{term.description}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(term)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit2 className="h-4 w-4" /></button>
                  {!term.is_default && <button onClick={() => handleDelete(term.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Due</span>
                  <span className="font-medium">{term.term_type === 'due_on_receipt' ? 'Immediately' : term.term_type === 'net_days' ? `${term.days} days` : `Day ${term.day_of_month}`}</span>
                </div>
                {term.early_payment_discount_percent && (
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-green-700 dark:text-green-400">Early Discount</span>
                    <span className="font-medium text-green-700">{term.early_payment_discount_percent}% if paid in {term.early_payment_discount_days} days</span>
                  </div>
                )}
                {term.late_fee_percent && (
                  <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm text-red-700 dark:text-red-400">Late Fee</span>
                    <span className="font-medium text-red-700">{term.late_fee_percent}% after {term.late_fee_grace_days} days grace</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">{editingTerm ? 'Edit Payment Term' : 'New Payment Term'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Term Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="e.g., Net 30" /></div>
              <div><label className="block text-sm font-medium mb-1">Term Type</label><select value={formData.term_type} onChange={(e) => setFormData({ ...formData, term_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">{termTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              {formData.term_type === 'net_days' && <div><label className="block text-sm font-medium mb-1">Days</label><input type="number" value={formData.days} onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>}
              {(formData.term_type === 'day_of_month' || formData.term_type === 'day_of_following_month') && <div><label className="block text-sm font-medium mb-1">Day of Month</label><input type="number" min="1" max="31" value={formData.day_of_month} onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>}
              <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-3">
                <h4 className="font-medium text-green-800 dark:text-green-200">Early Payment Discount</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">Discount %</label><input type="number" step="0.1" value={formData.early_payment_discount_percent} onChange={(e) => setFormData({ ...formData, early_payment_discount_percent: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                  <div><label className="block text-xs mb-1">If paid within (days)</label><input type="number" value={formData.early_payment_discount_days} onChange={(e) => setFormData({ ...formData, early_payment_discount_days: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                </div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-3">
                <h4 className="font-medium text-red-800 dark:text-red-200">Late Fee</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1">Fee %</label><input type="number" step="0.1" value={formData.late_fee_percent} onChange={(e) => setFormData({ ...formData, late_fee_percent: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                  <div><label className="block text-xs mb-1">Grace period (days)</label><input type="number" value={formData.late_fee_grace_days} onChange={(e) => setFormData({ ...formData, late_fee_grace_days: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="w-5 h-5 rounded" /><span>Set as Default Term</span></label>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
