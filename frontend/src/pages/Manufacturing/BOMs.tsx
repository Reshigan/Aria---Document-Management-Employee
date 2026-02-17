import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Layers, Plus, RefreshCw, AlertCircle, X, DollarSign, CheckCircle, Clock, Edit2, Trash2, Package } from 'lucide-react';

interface BOM {
  id: number;
  bom_code: string;
  product_name: string;
  version: string;
  total_components: number;
  total_cost: number;
  status: 'DRAFT' | 'ACTIVE' | 'OBSOLETE';
  created_at: string;
}

export default function BOMs() {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [form, setForm] = useState({ bom_code: '', product_name: '', version: '1.0', total_components: '', total_cost: '', status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'OBSOLETE' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; code: string }>({ show: false, id: 0, code: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadBOMs(); }, []);

  const loadBOMs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/manufacturing/boms');
      setBOMs(response.data.boms || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load BOMs');
    } finally { setLoading(false); }
  };

  const handleCreate = () => {
    setEditingBOM(null);
    setForm({ bom_code: '', product_name: '', version: '1.0', total_components: '', total_cost: '', status: 'DRAFT' });
    setShowModal(true);
  };

  const handleEdit = (bom: BOM) => {
    setEditingBOM(bom);
    setForm({ bom_code: bom.bom_code, product_name: bom.product_name, version: bom.version, total_components: bom.total_components.toString(), total_cost: bom.total_cost.toString(), status: bom.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...form, total_components: parseInt(form.total_components) || 0, total_cost: parseFloat(form.total_cost) || 0 };
      if (editingBOM) { await api.put(`/manufacturing/boms/${editingBOM.id}`, payload); } else { await api.post('/manufacturing/boms', payload); }
      setShowModal(false);
      loadBOMs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save BOM');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/manufacturing/boms/${id}`);
      loadBOMs();
      setDeleteConfirm({ show: false, id: 0, code: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete BOM');
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      OBSOLETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.DRAFT;
  };

  const stats = {
    total: boms.length,
    active: boms.filter(b => b.status === 'ACTIVE').length,
    draft: boms.filter(b => b.status === 'DRAFT').length,
    totalCost: boms.reduce((sum, b) => sum + b.total_cost, 0),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="manufacturing-boms">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Bills of Materials</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage product BOMs and component lists</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadBOMs} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleCreate} data-testid="create-button" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all "><Plus className="h-5 w-5" />New BOM</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl "><Layers className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total BOMs</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-400">Active</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-400">Draft</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalCost)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p></div></div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Layers className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">{editingBOM ? 'Edit BOM' : 'New BOM'}</h2><p className="text-white/80 text-sm">Bill of Materials details</p></div></div>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">BOM Code *</label><input type="text" value={form.bom_code} onChange={(e) => setForm({ ...form, bom_code: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version *</label><input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name *</label><input type="text" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Components *</label><input type="number" value={form.total_components} onChange={(e) => setForm({ ...form, total_components: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Cost *</label><input type="number" step="0.01" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'DRAFT' | 'ACTIVE' | 'OBSOLETE' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="OBSOLETE">Obsolete</option></select></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all ">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading BOMs...</p></div>
          ) : boms.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Layers className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No BOMs found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Create your first Bill of Materials</p><button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all">New BOM</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="boms-table">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">BOM Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Components</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Cost</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {boms.map((bom) => (
                    <tr key={bom.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-orange-600 dark:text-orange-400">{bom.bom_code}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{bom.product_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{bom.version}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{bom.total_components}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(bom.total_cost)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(bom.status)}`}>{bom.status === 'ACTIVE' ? <CheckCircle className="h-3.5 w-3.5" /> : bom.status === 'DRAFT' ? <Clock className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}{bom.status}</span></td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(bom)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button>
                        <button onClick={() => setDeleteConfirm({ show: true, id: bom.id, code: bom.bom_code })} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmDialog isOpen={deleteConfirm.show} title="Delete BOM" message={`Are you sure you want to delete BOM ${deleteConfirm.code}? This action cannot be undone.`} onConfirm={() => handleDelete(deleteConfirm.id)} onClose={() => setDeleteConfirm({ show: false, id: 0, code: '' })} />
      </div>
    </div>
  );
}
