import { useState, useEffect } from 'react';
import { projectMilestonesApi } from '../../services/newPagesApi';

interface ProjectMilestone {
  id: string;
  milestone_number: string;
  project_name?: string;
  milestone_name: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  deliverables_count: number;
  completed_deliverables: number;
  budget_amount: number;
  actual_amount: number;
  status: string;
}

export default function ProjectMilestones() {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ project_id: '', milestone_name: '', description: '', due_date: '', budget_amount: 0, deliverables: '' });

  useEffect(() => { fetchMilestones(); }, []);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await projectMilestonesApi.getAll();
      setMilestones(response.data.project_milestones || []);
    } catch (err) { setError('Failed to load project milestones'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectMilestonesApi.create(formData);
      setShowForm(false);
      setFormData({ project_id: '', milestone_name: '', description: '', due_date: '', budget_amount: 0, deliverables: '' });
      fetchMilestones();
    } catch (err) { setError('Failed to create project milestone'); }
  };

  const handleStart = async (id: string) => {
    try { await projectMilestonesApi.start(id); fetchMilestones(); } catch (err) { setError('Failed to start milestone'); }
  };

  const handleComplete = async (id: string) => {
    try { await projectMilestonesApi.complete(id); fetchMilestones(); } catch (err) { setError('Failed to complete milestone'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await projectMilestonesApi.delete(id); fetchMilestones(); } catch (err) { setError('Failed to delete milestone'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; case 'overdue': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Project Milestones</h1><p className="text-gray-600">Track project deliverables and milestones</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Milestone</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Project Milestone</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name</label><input type="text" value={formData.milestone_name} onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount</label><input type="number" value={formData.budget_amount} onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Deliverables (one per line)</label><textarea value={formData.deliverables} onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Enter each deliverable on a new line" /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milestone #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milestone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Deliverables</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {milestones.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No project milestones found.</td></tr>) : (
              milestones.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.milestone_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.project_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{m.milestone_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.due_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{m.completed_deliverables}/{m.deliverables_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(m.budget_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(m.actual_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(m.status)}`}>{m.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {m.status === 'pending' && <button onClick={() => handleStart(m.id)} className="text-blue-600 hover:text-blue-900">Start</button>}
                    {m.status === 'in_progress' && <button onClick={() => handleComplete(m.id)} className="text-green-600 hover:text-green-900">Complete</button>}
                    <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
