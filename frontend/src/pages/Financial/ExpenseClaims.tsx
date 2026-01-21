import { useState, useEffect } from 'react';
import { expenseClaimsApi } from '../../services/newPagesApi';

interface ExpenseClaim {
  id: string;
  claim_number: string;
  employee_name?: string;
  claim_date: string;
  description: string;
  total_amount: number;
  currency: string;
  status: string;
  submitted_at?: string;
  approved_at?: string;
}

export default function ExpenseClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: '', claim_date: '', description: '', total_amount: 0, currency: 'ZAR' });

  useEffect(() => { fetchClaims(); }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await expenseClaimsApi.getAll();
      setClaims(response.data.expense_claims || []);
    } catch (err) { setError('Failed to load expense claims'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await expenseClaimsApi.create(formData);
      setShowForm(false);
      setFormData({ employee_id: '', claim_date: '', description: '', total_amount: 0, currency: 'ZAR' });
      fetchClaims();
    } catch (err) { setError('Failed to create expense claim'); }
  };

  const handleAction = async (id: string, action: 'submit' | 'approve' | 'reject') => {
    try {
      if (action === 'submit') await expenseClaimsApi.submit(id);
      else if (action === 'approve') await expenseClaimsApi.approve(id);
      else if (action === 'reject') await expenseClaimsApi.reject(id, 'Rejected by manager');
      fetchClaims();
    } catch (err) { setError(`Failed to ${action} claim`); }
  };

  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Claims</h1>
          <p className="text-gray-600">Manage employee expense claims and reimbursements</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Claim</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Expense Claim</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Date</label>
              <input type="date" value={formData.claim_date} onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input type="number" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} required />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {claims.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No expense claims found.</td></tr>
            ) : (
              claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{claim.claim_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.employee_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.claim_date}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{claim.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(claim.total_amount, claim.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>{claim.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {claim.status === 'draft' && <button onClick={() => handleAction(claim.id, 'submit')} className="text-blue-600 hover:text-blue-900">Submit</button>}
                    {claim.status === 'submitted' && (
                      <>
                        <button onClick={() => handleAction(claim.id, 'approve')} className="text-green-600 hover:text-green-900">Approve</button>
                        <button onClick={() => handleAction(claim.id, 'reject')} className="text-red-600 hover:text-red-900">Reject</button>
                      </>
                    )}
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
