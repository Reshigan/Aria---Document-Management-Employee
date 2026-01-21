import { useState, useEffect } from 'react';
import { serviceContractsApi } from '../../services/newPagesApi';

interface ServiceContract {
  id: string;
  contract_number: string;
  customer_name?: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  billing_frequency: string;
  auto_renew: boolean;
  status: string;
}

export default function ServiceContracts() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', contract_type: 'maintenance', start_date: '', end_date: '', contract_value: 0, billing_frequency: 'monthly', auto_renew: false, terms: '', scope_of_work: '' });

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await serviceContractsApi.getAll();
      setContracts(response.data.service_contracts || []);
    } catch (err) { setError('Failed to load service contracts'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await serviceContractsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', contract_type: 'maintenance', start_date: '', end_date: '', contract_value: 0, billing_frequency: 'monthly', auto_renew: false, terms: '', scope_of_work: '' });
      fetchContracts();
    } catch (err) { setError('Failed to create service contract'); }
  };

  const handleRenew = async (id: string) => {
    try { await serviceContractsApi.renew(id); fetchContracts(); } catch (err) { setError('Failed to renew contract'); }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this contract?')) return;
    try { await serviceContractsApi.terminate(id); fetchContracts(); } catch (err) { setError('Failed to terminate contract'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'active': return 'bg-green-100 text-green-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; case 'expired': return 'bg-red-100 text-red-800'; case 'terminated': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Service Contracts</h1><p className="text-gray-600">Manage customer service agreements</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Contract</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Service Contract</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label><select value={formData.contract_type} onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="maintenance">Maintenance</option><option value="support">Support</option><option value="sla">SLA</option><option value="subscription">Subscription</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label><input type="number" value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label><select value={formData.billing_frequency} onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option><option value="once_off">Once-off</option></select></div>
            <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={formData.auto_renew} onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })} className="mr-2" /><span className="text-sm text-gray-700">Auto Renew</span></label></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label><textarea value={formData.scope_of_work} onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto Renew</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No service contracts found.</td></tr>) : (
              contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.contract_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.customer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{c.contract_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.start_date} - {c.end_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(c.contract_value)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{c.billing_frequency}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${c.auto_renew ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{c.auto_renew ? 'Yes' : 'No'}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {c.status === 'active' && <button onClick={() => handleRenew(c.id)} className="text-blue-600 hover:text-blue-900">Renew</button>}
                    {c.status === 'active' && <button onClick={() => handleTerminate(c.id)} className="text-red-600 hover:text-red-900">Terminate</button>}
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
