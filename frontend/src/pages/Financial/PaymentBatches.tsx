import { useState, useEffect } from 'react';
import { paymentBatchesApi } from '../../services/newPagesApi';

interface PaymentBatch {
  id: string;
  batch_number: string;
  batch_date: string;
  bank_account_name?: string;
  payment_method: string;
  total_amount: number;
  payment_count: number;
  status: string;
  approved_at?: string;
  processed_at?: string;
}

export default function PaymentBatches() {
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ batch_date: '', bank_account_id: '', payment_method: 'eft', notes: '' });

  useEffect(() => { fetchBatches(); }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await paymentBatchesApi.getAll();
      setBatches(response.data.payment_batches || []);
    } catch (err) { setError('Failed to load payment batches'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await paymentBatchesApi.create(formData);
      setShowForm(false);
      setFormData({ batch_date: '', bank_account_id: '', payment_method: 'eft', notes: '' });
      fetchBatches();
    } catch (err) { setError('Failed to create payment batch'); }
  };

  const handleApprove = async (id: string) => {
    try { await paymentBatchesApi.approve(id); fetchBatches(); } catch (err) { setError('Failed to approve batch'); }
  };

  const handleProcess = async (id: string) => {
    try { await paymentBatchesApi.process(id); fetchBatches(); } catch (err) { setError('Failed to process batch'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Batches</h1>
          <p className="text-gray-600">Manage supplier payment batches</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Batch</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Payment Batch</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Date</label>
              <input type="date" value={formData.batch_date} onChange={(e) => setFormData({ ...formData, batch_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="eft">EFT</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payments</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No payment batches found.</td></tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.batch_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.batch_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.bank_account_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{batch.payment_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(batch.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{batch.payment_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>{batch.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {batch.status === 'draft' && <button onClick={() => handleApprove(batch.id)} className="text-blue-600 hover:text-blue-900">Approve</button>}
                    {batch.status === 'approved' && <button onClick={() => handleProcess(batch.id)} className="text-green-600 hover:text-green-900">Process</button>}
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
