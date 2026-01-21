import { useState, useEffect } from 'react';
import { collectionsApi } from '../../services/newPagesApi';

interface Collection {
  id: string;
  collection_number: string;
  customer_name?: string;
  contact_date: string;
  contact_method: string;
  contact_person: string;
  amount_outstanding: number;
  promise_to_pay_date?: string;
  promise_to_pay_amount?: number;
  outcome: string;
  follow_up_date?: string;
  assigned_to_name?: string;
  notes?: string;
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', invoice_id: '', contact_date: '', contact_method: 'phone', contact_person: '', amount_outstanding: 0, promise_to_pay_date: '', promise_to_pay_amount: 0, outcome: '', follow_up_date: '', assigned_to: '', notes: '' });

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await collectionsApi.getAll();
      setCollections(response.data.collections || []);
    } catch (err) { setError('Failed to load collections'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await collectionsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', invoice_id: '', contact_date: '', contact_method: 'phone', contact_person: '', amount_outstanding: 0, promise_to_pay_date: '', promise_to_pay_amount: 0, outcome: '', follow_up_date: '', assigned_to: '', notes: '' });
      fetchCollections();
    } catch (err) { setError('Failed to create collection record'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Collections</h1><p className="text-gray-600">Track customer collection activities</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Collection</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Log Collection Activity</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Date</label><input type="date" value={formData.contact_date} onChange={(e) => setFormData({ ...formData, contact_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Method</label><select value={formData.contact_method} onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="phone">Phone</option><option value="email">Email</option><option value="visit">Visit</option><option value="letter">Letter</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label><input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount Outstanding</label><input type="number" value={formData.amount_outstanding} onChange={(e) => setFormData({ ...formData, amount_outstanding: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Promise to Pay Date</label><input type="date" value={formData.promise_to_pay_date} onChange={(e) => setFormData({ ...formData, promise_to_pay_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label><input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label><textarea value={formData.outcome} onChange={(e) => setFormData({ ...formData, outcome: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promise Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {collections.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No collection records found.</td></tr>) : (
              collections.map((col) => (
                <tr key={col.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{col.collection_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{col.customer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{col.contact_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{col.contact_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(col.amount_outstanding)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{col.promise_to_pay_date || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{col.outcome || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{col.assigned_to_name || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
