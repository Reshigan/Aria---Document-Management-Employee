import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, X, Check, Percent, FileText, Calculator } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  tax_type: string;
  is_default: boolean;
  is_active: boolean;
  applies_to: string;
  report_code: string | null;
  description: string | null;
}

const taxTypes = [
  { value: 'output', label: 'Output Tax (Sales)', color: 'bg-green-500' },
  { value: 'input', label: 'Input Tax (Purchases)', color: 'bg-blue-500' },
  { value: 'zero_rated', label: 'Zero Rated', color: 'bg-gray-500' },
  { value: 'exempt', label: 'Exempt', color: 'bg-purple-500' },
  { value: 'reverse_charge', label: 'Reverse Charge', color: 'bg-orange-500' },
];

const appliesTo = [
  { value: 'all', label: 'All Transactions' },
  { value: 'sales', label: 'Sales Only' },
  { value: 'purchases', label: 'Purchases Only' },
];

export default function TaxRates() {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState({
    name: '', rate: 15, tax_type: 'output', is_default: false, applies_to: 'all', report_code: '', description: ''
  });

  useEffect(() => { fetchRates(); }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/tax-rates`);
      const data = await response.json();
      if (data.success) setRates(data.data || []);
    } catch (error) {
      setRates([
        { id: '1', name: 'Standard VAT (15%)', rate: 15, tax_type: 'output', is_default: true, is_active: true, applies_to: 'all', report_code: 'VAT-STD', description: 'Standard VAT rate for South Africa' },
        { id: '2', name: 'Zero Rated', rate: 0, tax_type: 'zero_rated', is_default: false, is_active: true, applies_to: 'all', report_code: 'VAT-ZERO', description: 'Zero rated supplies' },
        { id: '3', name: 'VAT Exempt', rate: 0, tax_type: 'exempt', is_default: false, is_active: true, applies_to: 'all', report_code: 'VAT-EXE', description: 'VAT exempt supplies' },
        { id: '4', name: 'Input VAT (15%)', rate: 15, tax_type: 'input', is_default: false, is_active: true, applies_to: 'purchases', report_code: 'VAT-IN', description: 'Input VAT on purchases' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const url = editingRate ? `${API_BASE}/api/admin-config/tax-rates/${editingRate.id}` : `${API_BASE}/api/admin-config/tax-rates`;
      const response = await fetch(url, { method: editingRate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (data.success) { alert(editingRate ? 'Tax rate updated' : 'Tax rate created'); setShowModal(false); setEditingRate(null); fetchRates(); }
      else alert(data.error || 'Failed to save');
    } catch (error) { alert('Failed to save tax rate'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tax rate?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin-config/tax-rates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { alert('Tax rate deleted'); fetchRates(); } else alert(data.error || 'Failed to delete');
    } catch (error) { alert('Failed to delete'); }
  };

  const openEdit = (rate: TaxRate) => {
    setEditingRate(rate);
    setFormData({ name: rate.name, rate: rate.rate, tax_type: rate.tax_type, is_default: rate.is_default, applies_to: rate.applies_to, report_code: rate.report_code || '', description: rate.description || '' });
    setShowModal(true);
  };

  const getTypeConfig = (type: string) => taxTypes.find(t => t.value === type) || { label: type, color: 'bg-gray-500' };

  return (
    <div className="p-4 space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Tax Rates</h1>
          <p className="text-gray-500 mt-1">Manage VAT and other tax rates for your transactions</p>
        </div>
        <button onClick={() => { setEditingRate(null); setFormData({ name: '', rate: 15, tax_type: 'output', is_default: false, applies_to: 'all', report_code: '', description: '' }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium"><Plus className="h-4 w-4" />Add Tax Rate</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><Percent className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{rates.length}</p><p className="text-xs text-gray-500">Total Rates</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><Calculator className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{rates.filter(r => r.tax_type === 'output').length}</p><p className="text-xs text-gray-500">Output Tax</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{rates.filter(r => r.tax_type === 'input').length}</p><p className="text-xs text-gray-500">Input Tax</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg"><Check className="h-5 w-5 text-amber-600" /></div><div><p className="text-lg font-bold truncate">{rates.find(r => r.is_default)?.name || 'None'}</p><p className="text-xs text-gray-500">Default</p></div></div></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-green-500" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <tr><th className="px-4 py-3 text-left">Tax Rate</th><th className="px-4 py-3 text-left">Rate</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Applies To</th><th className="px-4 py-3 text-left">Report Code</th><th className="px-4 py-3 text-left">Actions</th></tr>
            </thead>
            <tbody>
              {rates.map(rate => {
                const typeConfig = getTypeConfig(rate.tax_type);
                return (
                  <tr key={rate.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.color} text-white`}><Percent className="h-4 w-4" /></div>
                        <div><p className="font-medium">{rate.name}</p>{rate.description && <p className="text-xs text-gray-500">{rate.description}</p>}</div>
                        {rate.is_default && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Default</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xl font-bold">{rate.rate}%</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs text-white ${typeConfig.color}`}>{typeConfig.label}</span></td>
                    <td className="px-4 py-3"><span className="text-sm capitalize">{rate.applies_to === 'all' ? 'All' : rate.applies_to}</span></td>
                    <td className="px-4 py-3"><span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{rate.report_code || '-'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(rate)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Edit2 className="h-4 w-4" /></button>
                        {!rate.is_default && <button onClick={() => handleDelete(rate.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">{editingRate ? 'Edit Tax Rate' : 'New Tax Rate'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Tax Rate Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="e.g., Standard VAT (15%)" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Rate (%)</label><input type="number" step="0.01" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium mb-1">Tax Type</label><select value={formData.tax_type} onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">{taxTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Applies To</label><select value={formData.applies_to} onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">{appliesTo.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Report Code</label><input type="text" value={formData.report_code} onChange={(e) => setFormData({ ...formData, report_code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="e.g., VAT-STD" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" rows={2} /></div>
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="w-5 h-5 rounded" /><span>Set as Default Tax Rate</span></label>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
