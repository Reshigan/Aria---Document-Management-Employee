import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Scale, Plus, Clock, CheckCircle, ShieldCheck, Edit2, Trash2 } from 'lucide-react';

interface Reconciliation {
  id: number;
  account_name: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  statement_balance: number;
  difference: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
}

const Reconciliation: React.FC = () => {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRecon, setEditingRecon] = useState<Reconciliation | null>(null);
  const [form, setForm] = useState({
    account_name: '',
    period_start: '',
    period_end: '',
    opening_balance: '',
    closing_balance: '',
    statement_balance: '',
    status: 'IN_PROGRESS' as 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; account: string }>({
    show: false,
    id: 0,
    account: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadReconciliations();
  }, []);

  const loadReconciliations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/banking/reconciliations');
      setReconciliations(response.data.reconciliations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load reconciliations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRecon(null);
    setForm({
      account_name: '',
      period_start: '',
      period_end: '',
      opening_balance: '',
      closing_balance: '',
      statement_balance: '',
      status: 'IN_PROGRESS'
    });
    setShowModal(true);
  };

  const handleEdit = (recon: Reconciliation) => {
    setEditingRecon(recon);
    setForm({
      account_name: recon.account_name,
      period_start: recon.period_start,
      period_end: recon.period_end,
      opening_balance: recon.opening_balance.toString(),
      closing_balance: recon.closing_balance.toString(),
      statement_balance: recon.statement_balance.toString(),
      status: recon.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        opening_balance: parseFloat(form.opening_balance) || 0,
        closing_balance: parseFloat(form.closing_balance) || 0,
        statement_balance: parseFloat(form.statement_balance) || 0
      };
      
      if (editingRecon) {
        await api.put(`/banking/reconciliations/${editingRecon.id}`, payload);
      } else {
        await api.post('/banking/reconciliations', payload);
      }
      setShowModal(false);
      loadReconciliations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save reconciliation');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/banking/reconciliations/${id}`);
      loadReconciliations();
      setDeleteConfirm({ show: false, id: 0, account: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete reconciliation');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
    const style = styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{status.replace('_', ' ')}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => { if (!dateString) return "-"; const _d = new Date(dateString); return isNaN(_d.getTime()) ? dateString : _d.toLocaleDateString("en-ZA"); };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="banking-reconciliation">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bank Reconciliation</h1>
            <p className="text-gray-600 dark:text-gray-400">Reconcile bank statements with accounting records</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all  flex items-center gap-2 font-medium"
          data-testid="create-button"
        >
          <Plus className="h-5 w-5" />
          New Reconciliation
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
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
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{reconciliations.filter(r => r.status === 'COMPLETED').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{reconciliations.filter(r => r.status === 'APPROVED').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="reconciliations-table">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Account</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Opening</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Closing</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Statement</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Difference</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : reconciliations.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No reconciliations found</td></tr>
              ) : (
                reconciliations.map((recon) => (
                  <tr key={recon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{recon.account_name}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(recon.period_start)} - {formatDate(recon.period_end)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(recon.opening_balance)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(recon.closing_balance)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(recon.statement_balance)}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${recon.difference !== 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(recon.difference)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(recon.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(recon)}
                          className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, id: recon.id, account: recon.account_name })}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Scale className="h-5 w-5" />
                {editingRecon ? 'Edit Reconciliation' : 'New Reconciliation'}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name *</label>
                <input
                  type="text"
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Start *</label>
                  <input
                    type="date"
                    value={form.period_start}
                    onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period End *</label>
                  <input
                    type="date"
                    value={form.period_end}
                    onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opening Balance *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.opening_balance}
                    onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Closing Balance *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.closing_balance}
                    onChange={(e) => setForm({ ...form, closing_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statement Balance *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.statement_balance}
                    onChange={(e) => setForm({ ...form, statement_balance: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all  font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Reconciliation"
        message={`Are you sure you want to delete reconciliation for ${deleteConfirm.account}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ show: false, id: 0, account: '' })}
      />
    </div>
  );
};

export default Reconciliation;
