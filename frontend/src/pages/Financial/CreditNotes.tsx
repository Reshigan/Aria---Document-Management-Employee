import { useState, useEffect } from 'react';
import { creditNotesApi } from '../../services/newPagesApi';

interface CreditNote {
  id: string;
  credit_note_number: string;
  customer_name?: string;
  credit_note_date: string;
  reason: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
}

export default function CreditNotes() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', invoice_id: '', credit_note_date: '', reason: '', subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'ZAR', notes: '' });

  useEffect(() => { fetchCreditNotes(); }, []);

  const fetchCreditNotes = async () => {
    try {
      setLoading(true);
      const response = await creditNotesApi.getAll();
      setCreditNotes(response.data.credit_notes || []);
    } catch (err) { setError('Failed to load credit notes'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await creditNotesApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', invoice_id: '', credit_note_date: '', reason: '', subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'ZAR', notes: '' });
      fetchCreditNotes();
    } catch (err) { setError('Failed to create credit note'); }
  };

  const handleIssue = async (id: string) => {
    try { await creditNotesApi.issue(id); fetchCreditNotes(); } catch (err) { setError('Failed to issue credit note'); }
  };

  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'issued': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Credit Notes</h1><p className="text-gray-600">Manage customer credit notes</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Credit Note</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Credit Note</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={formData.credit_note_date} onChange={(e) => setFormData({ ...formData, credit_note_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label><input type="number" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Reason</label><textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CN #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {creditNotes.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No credit notes found.</td></tr>) : (
              creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cn.credit_note_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cn.customer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cn.credit_note_date}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{cn.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(cn.total_amount, cn.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(cn.status)}`}>{cn.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{cn.status === 'draft' && <button onClick={() => handleIssue(cn.id)} className="text-green-600 hover:text-green-900">Issue</button>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
