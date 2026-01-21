import { useState, useEffect } from 'react';
import { jobPostingsApi } from '../../services/newPagesApi';

interface JobPosting {
  id: string;
  posting_number: string;
  job_title: string;
  department_name?: string;
  location: string;
  employment_type: string;
  salary_min?: number;
  salary_max?: number;
  posting_date: string;
  closing_date: string;
  applications_count: number;
  status: string;
}

export default function JobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ job_title: '', department_id: '', position_id: '', location: '', employment_type: 'full_time', salary_min: 0, salary_max: 0, posting_date: '', closing_date: '', description: '', requirements: '' });

  useEffect(() => { fetchPostings(); }, []);

  const fetchPostings = async () => {
    try {
      setLoading(true);
      const response = await jobPostingsApi.getAll();
      setPostings(response.data.job_postings || []);
    } catch (err) { setError('Failed to load job postings'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await jobPostingsApi.create(formData);
      setShowForm(false);
      setFormData({ job_title: '', department_id: '', position_id: '', location: '', employment_type: 'full_time', salary_min: 0, salary_max: 0, posting_date: '', closing_date: '', description: '', requirements: '' });
      fetchPostings();
    } catch (err) { setError('Failed to create job posting'); }
  };

  const handlePublish = async (id: string) => {
    try { await jobPostingsApi.publish(id); fetchPostings(); } catch (err) { setError('Failed to publish posting'); }
  };

  const handleClose = async (id: string) => {
    try { await jobPostingsApi.close(id); fetchPostings(); } catch (err) { setError('Failed to close posting'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'published': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'closed': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Job Postings</h1><p className="text-gray-600">Manage recruitment job postings</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Posting</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Job Posting</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label><input type="text" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label><select value={formData.employment_type} onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Posting Date</label><input type="date" value={formData.posting_date} onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label><input type="date" value={formData.closing_date} onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label><div className="flex gap-2"><input type="number" placeholder="Min" value={formData.salary_min} onChange={(e) => setFormData({ ...formData, salary_min: parseFloat(e.target.value) })} className="w-1/2 border rounded-lg px-3 py-2" /><input type="number" placeholder="Max" value={formData.salary_max} onChange={(e) => setFormData({ ...formData, salary_max: parseFloat(e.target.value) })} className="w-1/2 border rounded-lg px-3 py-2" /></div></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posting #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salary Range</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Applications</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {postings.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No job postings found.</td></tr>) : (
              postings.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.posting_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.job_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{p.employment_type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{p.salary_min && p.salary_max ? `${formatCurrency(p.salary_min)} - ${formatCurrency(p.salary_max)}` : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.closing_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{p.applications_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(p.status)}`}>{p.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {p.status === 'draft' && <button onClick={() => handlePublish(p.id)} className="text-green-600 hover:text-green-900">Publish</button>}
                    {p.status === 'published' && <button onClick={() => handleClose(p.id)} className="text-red-600 hover:text-red-900">Close</button>}
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
