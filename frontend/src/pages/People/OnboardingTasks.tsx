import { useState, useEffect } from 'react';
import { onboardingTasksApi } from '../../services/newPagesApi';

interface OnboardingTask {
  id: string;
  task_number: string;
  employee_name?: string;
  task_name: string;
  task_category: string;
  assigned_to_name?: string;
  due_date: string;
  completed_date?: string;
  status: string;
}

export default function OnboardingTasks() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: '', task_name: '', task_category: 'documentation', assigned_to: '', due_date: '', description: '' });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await onboardingTasksApi.getAll();
      setTasks(response.data.onboarding_tasks || []);
    } catch (err) { setError('Failed to load onboarding tasks'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onboardingTasksApi.create(formData);
      setShowForm(false);
      setFormData({ employee_id: '', task_name: '', task_category: 'documentation', assigned_to: '', due_date: '', description: '' });
      fetchTasks();
    } catch (err) { setError('Failed to create onboarding task'); }
  };

  const handleComplete = async (id: string) => {
    try { await onboardingTasksApi.complete(id); fetchTasks(); } catch (err) { setError('Failed to complete task'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; case 'overdue': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Onboarding Tasks</h1><p className="text-gray-600">Manage new employee onboarding</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Task</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Onboarding Task</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label><input type="text" value={formData.task_name} onChange={(e) => setFormData({ ...formData, task_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.task_category} onChange={(e) => setFormData({ ...formData, task_category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="documentation">Documentation</option><option value="it_setup">IT Setup</option><option value="training">Training</option><option value="introduction">Introduction</option><option value="compliance">Compliance</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No onboarding tasks found.</td></tr>) : (
              tasks.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.task_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.employee_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.task_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{t.task_category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.assigned_to_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.due_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(t.status)}`}>{t.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{t.status !== 'completed' && <button onClick={() => handleComplete(t.id)} className="text-green-600 hover:text-green-900">Complete</button>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
