import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Edit2, Trash2, Clock, CheckCircle, AlertCircle, FileCheck } from 'lucide-react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface TaxObligation {
  id: string;
  type: string;
  description: string;
  frequency: string;
  next_due: string;
  status: string;
  tax_type?: string;
  period?: string;
  due_date?: string;
  amount?: number;
}

const TaxCompliance: React.FC = () => {
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingObligation, setEditingObligation] = useState<TaxObligation | null>(null);
  const [form, setForm] = useState({
    tax_type: '',
    period: '',
    due_date: '',
    amount: '',
    status: 'PENDING' as 'PENDING' | 'FILED' | 'PAID' | 'OVERDUE'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; type: string }>({
    show: false,
    id: 0,
    type: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadObligations();
  }, []);

  const loadObligations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/tax/obligations');
      setObligations(response.data.obligations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tax obligations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingObligation(null);
    setForm({
      tax_type: '',
      period: '',
      due_date: '',
      amount: '',
      status: 'PENDING'
    });
    setShowModal(true);
  };

  const handleEdit = (obligation: TaxObligation) => {
    setEditingObligation(obligation);
    setForm({
      tax_type: obligation.type || obligation.tax_type || '',
      period: obligation.frequency || obligation.period || '',
      due_date: obligation.next_due || obligation.due_date || '',
      amount: (obligation.amount || 0).toString(),
      status: (obligation.status || 'PENDING').toUpperCase() as any
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0
      };
      
      if (editingObligation) {
        await api.put(`/tax/obligations/${editingObligation.id}`, payload);
      } else {
        await api.post('/tax/obligations', payload);
      }
      setShowModal(false);
      loadObligations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save tax obligation');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tax/obligations/${id}`);
      loadObligations();
      setDeleteConfirm({ show: false, id: 0, type: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete tax obligation');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      FILED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null || isNaN(Number(amount))) return 'R 0.00';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount));
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-ZA');
  };

  if (loading && obligations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-300">Loading tax obligations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="tax-compliance">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
            <FileSpreadsheet className="h-7 w-7 text-white" />
          </div>
          Tax Compliance
        </h1>
        <p className="text-gray-500 dark:text-gray-300 mt-1">Manage tax obligations and filings</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200"
          data-testid="create-button"
        >
          <Plus className="h-5 w-5" />
          New Tax Obligation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{obligations.filter(o => o.status === 'PENDING').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{obligations.filter(o => o.status === 'FILED').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Filed</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl ">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{obligations.filter(o => o.status === 'PAID').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Paid</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{obligations.filter(o => o.status === 'OVERDUE').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full" data-testid="obligations-table">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tax Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Period</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-300">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : obligations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-300">No tax obligations found</p>
                  <button
                    onClick={handleCreate}
                    className="mt-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                  >
                    Add your first tax obligation
                  </button>
                </td>
              </tr>
            ) : (
              obligations.map((obligation) => (
                <tr key={obligation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{obligation.type || obligation.tax_type || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{obligation.frequency || obligation.period || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(obligation.next_due || obligation.due_date)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatCurrency(obligation.amount)}</td>
                  <td className="px-6 py-4">{getStatusBadge(obligation.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(obligation)}
                        className="p-2 text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ show: true, id: obligation.id, type: obligation.tax_type })}
                        className="p-2 text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-red-500 to-rose-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6" />
                {editingObligation ? 'Edit Tax Obligation' : 'New Tax Obligation'}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tax Type *</label>
                <input
                  type="text"
                  value={form.tax_type}
                  onChange={(e) => setForm({ ...form, tax_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="e.g., VAT, Income Tax, PAYE"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Period *</label>
                <input
                  type="text"
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="e.g., Q1 2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  <option value="PENDING">Pending</option>
                  <option value="FILED">Filed</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-red-500/40 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Tax Obligation"
        message={`Are you sure you want to delete ${deleteConfirm.type} tax obligation? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ show: false, id: 0, type: '' })}
      />
    </div>
  );
};

export default TaxCompliance;
