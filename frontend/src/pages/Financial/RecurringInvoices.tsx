import { useState, useEffect } from 'react';
import api from '../../services/api';

interface RecurringInvoice {
  id: string;
  customer_id: string;
  customer_name?: string;
  template_name: string;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string | null;
  next_invoice_date: string;
  total_amount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  invoices_generated: number;
  auto_send: boolean;
  created_at: string;
}

export default function RecurringInvoices() {
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RecurringInvoice | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    template_name: '',
    frequency: 'monthly' as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    total_amount: 0,
    payment_terms_days: 30,
    notes: '',
    auto_send: false
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/xero/recurring-invoices');
      setInvoices(response.data.recurring_invoices || []);
    } catch (err) {
      setError('Failed to load recurring invoices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/xero/recurring-invoices', formData);
      setShowForm(false);
      resetForm();
      fetchInvoices();
    } catch (err) {
      setError('Failed to create recurring invoice');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      template_name: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      total_amount: 0,
      payment_terms_days: 30,
      notes: '',
      auto_send: false
    });
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/xero/recurring-invoices/${id}/pause`);
      fetchInvoices();
    } catch (err) {
      setError('Failed to pause recurring invoice');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.post(`/xero/recurring-invoices/${id}/resume`);
      fetchInvoices();
    } catch (err) {
      setError('Failed to resume recurring invoice');
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      await api.post(`/xero/recurring-invoices/${id}/generate`);
      fetchInvoices();
      alert('Invoice generated successfully!');
    } catch (err) {
      setError('Failed to generate invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      fortnightly: 'Every 2 Weeks',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually'
    };
    return labels[freq] || freq;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Invoices</h1>
          <p className="text-gray-600">Automate your billing with scheduled recurring invoices</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>+</span> New Recurring Invoice
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active Templates</div>
          <div className="text-2xl font-bold text-green-600">
            {invoices.filter(i => i.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Paused</div>
          <div className="text-2xl font-bold text-yellow-600">
            {invoices.filter(i => i.status === 'paused').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Generated</div>
          <div className="text-2xl font-bold text-blue-600">
            {invoices.reduce((sum, i) => sum + i.invoices_generated, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Monthly Revenue</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(invoices.filter(i => i.status === 'active').reduce((sum, i) => sum + i.total_amount, 0))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Recurring Invoice Template</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Monthly Retainer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
              <input
                type="text"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                min="0"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_send}
                  onChange={(e) => setFormData({ ...formData, auto_send: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Auto-send invoice when generated</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Create Template
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Invoice</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Generated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No recurring invoices found. Create your first template to automate billing.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{invoice.template_name}</div>
                    {invoice.auto_send && (
                      <div className="text-xs text-green-600">Auto-send enabled</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.customer_name || invoice.customer_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getFrequencyLabel(invoice.frequency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invoice.next_invoice_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {invoice.invoices_generated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      {invoice.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleGenerate(invoice.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Generate invoice now"
                          >
                            Generate
                          </button>
                          <button
                            onClick={() => handlePause(invoice.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Pause
                          </button>
                        </>
                      )}
                      {invoice.status === 'paused' && (
                        <button
                          onClick={() => handleResume(invoice.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
