import { useState, useEffect } from 'react';
import { budgetsApi } from '../../services/newPagesApi';

interface Budget {
  id: string;
  budget_code: string;
  budget_name: string;
  fiscal_year: number;
  department_name?: string;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
}

export default function BudgetManagement() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    budget_code: '',
    budget_name: '',
    fiscal_year: new Date().getFullYear(),
    department_id: '',
    cost_center: '',
    total_amount: 0,
    notes: ''
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await budgetsApi.getAll();
      setBudgets(response.data.budgets || []);
    } catch (err) {
      setError('Failed to load budgets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await budgetsApi.create(formData);
      setShowForm(false);
      setFormData({
        budget_code: '',
        budget_name: '',
        fiscal_year: new Date().getFullYear(),
        department_id: '',
        cost_center: '',
        total_amount: 0,
        notes: ''
      });
      fetchBudgets();
    } catch (err) {
      setError('Failed to create budget');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      fetchBudgets();
    } catch (err) {
      setError('Failed to delete budget');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
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
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-gray-600">Manage departmental and project budgets</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Budget
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Budget</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
              <input
                type="text"
                value={formData.budget_code}
                onChange={(e) => setFormData({ ...formData, budget_code: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
              <input
                type="text"
                value={formData.budget_name}
                onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year</label>
              <input
                type="number"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Center</label>
              <input
                type="text"
                value={formData.cost_center}
                onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Create Budget
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No budgets found. Create your first budget to get started.
                </td>
              </tr>
            ) : (
              budgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {budget.budget_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{budget.budget_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{budget.fiscal_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{budget.department_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(budget.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(budget.spent_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(budget.remaining_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(budget.status)}`}>
                      {budget.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
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
