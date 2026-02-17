import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, CreditCard, DollarSign, Clock, CheckCircle, Search, Edit2, Trash2 } from 'lucide-react';

interface Payment {
  id: number;
  payment_number: string;
  supplier_name: string;
  bill_number: string;
  amount: number;
  payment_date: string;
  payment_method: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CARD';
  status: 'PENDING' | 'PROCESSED' | 'CLEARED';
}

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    payment_number: '',
    supplier_name: '',
    bill_number: '',
    amount: '',
    payment_date: '',
    payment_method: 'BANK_TRANSFER' as 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CARD',
    status: 'PENDING' as 'PENDING' | 'PROCESSED' | 'CLEARED'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; number: string }>({
    show: false,
    id: 0,
    number: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/ap/payments');
      setPayments(response.data.payments || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPayment(null);
    setForm({
      payment_number: '',
      supplier_name: '',
      bill_number: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'BANK_TRANSFER',
      status: 'PENDING'
    });
    setShowModal(true);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setForm({
      payment_number: payment.payment_number,
      supplier_name: payment.supplier_name,
      bill_number: payment.bill_number,
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      status: payment.status
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
      
      if (editingPayment) {
        await api.put(`/ap/payments/${editingPayment.id}`, payload);
      } else {
        await api.post('/ap/payments', payload);
      }
      setShowModal(false);
      loadPayments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save payment');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/ap/payments/${id}`);
      loadPayments();
      setDeleteConfirm({ show: false, id: 0, number: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      PROCESSED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      CLEARED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    };
    return styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => { if (!dateString) return "-"; const _d = new Date(dateString); return isNaN(_d.getTime()) ? dateString : _d.toLocaleDateString("en-ZA"); };

  const filteredPayments = payments.filter(payment =>
    payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.bill_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-8" data-testid="ap-payments">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl ">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            Supplier Payments
          </h1>
          <p className="text-gray-500 dark:text-gray-300 mt-1">Track and manage supplier payments</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all  flex items-center gap-2 font-medium"
          data-testid="create-button"
        >
          <Plus className="h-5 w-5" />
          New Payment
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Total Paid</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {payments.filter(p => p.status === 'PENDING').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {payments.filter(p => p.status === 'CLEARED').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Cleared</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full" data-testid="payments-table">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Payment #</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Bill #</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Method</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <CreditCard className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-300">No payments found</p>
                  <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">Create your first payment to get started</p>
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{payment.payment_number}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{payment.supplier_name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{payment.bill_number}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{payment.payment_method.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{formatDate(payment.payment_date)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(payment)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ show: true, id: payment.id, number: payment.payment_number })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {editingPayment ? 'Edit Payment' : 'New Payment'}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Number *</label>
                  <input
                    type="text"
                    value={form.payment_number}
                    onChange={(e) => setForm({ ...form, payment_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Supplier Name *</label>
                  <input
                    type="text"
                    value={form.supplier_name}
                    onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bill Number *</label>
                <input
                  type="text"
                  value={form.bill_number}
                  onChange={(e) => setForm({ ...form, bill_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method *</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="CLEARED">Cleared</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all "
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
        title="Delete Payment"
        message={`Are you sure you want to delete payment ${deleteConfirm.number}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onClose={() => setDeleteConfirm({ show: false, id: 0, number: '' })}
      />
    </div>
  );
};

export default Payments;
