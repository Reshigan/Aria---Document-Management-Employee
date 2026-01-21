import { useState, useEffect } from 'react';
import { bankTransfersApi } from '../../services/newPagesApi';

interface BankTransfer {
  id: string;
  transfer_number: string;
  from_account_name?: string;
  to_account_name?: string;
  transfer_date: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
}

export default function BankTransfers() {
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ from_account_id: '', to_account_id: '', transfer_date: '', amount: 0, currency: 'ZAR', reference: '', notes: '' });

  useEffect(() => { fetchTransfers(); }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await bankTransfersApi.getAll();
      setTransfers(response.data.bank_transfers || []);
    } catch (err) { setError('Failed to load bank transfers'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bankTransfersApi.create(formData);
      setShowForm(false);
      setFormData({ from_account_id: '', to_account_id: '', transfer_date: '', amount: 0, currency: 'ZAR', reference: '', notes: '' });
      fetchTransfers();
    } catch (err) { setError('Failed to create bank transfer'); }
  };

  const handleApprove = async (id: string) => {
    try { await bankTransfersApi.approve(id); fetchTransfers(); } catch (err) { setError('Failed to approve transfer'); }
  };

  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'approved': return 'bg-blue-100 text-blue-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Bank Transfers</h1><p className="text-gray-600">Manage inter-account transfers</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Transfer</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Bank Transfer</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label><input type="date" value={formData.transfer_date} onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference</label><input type="text" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transfers.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No bank transfers found.</td></tr>) : (
              transfers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.transfer_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.from_account_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.to_account_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.transfer_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(t.amount, t.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.reference}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(t.status)}`}>{t.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{t.status === 'pending' && <button onClick={() => handleApprove(t.id)} className="text-blue-600 hover:text-blue-900">Approve</button>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
