import { useState, useEffect } from 'react';
import { applicantsApi } from '../../services/newPagesApi';

interface Applicant {
  id: string;
  applicant_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  application_date: string;
  source: string;
  status: string;
  rating?: number;
}

export default function Applicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', job_posting_id: '', application_date: '', source: 'website', resume_url: '', cover_letter: '' });

  useEffect(() => { fetchApplicants(); }, []);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const response = await applicantsApi.getAll();
      setApplicants(response.data.applicants || []);
    } catch (err) { setError('Failed to load applicants'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await applicantsApi.create(formData);
      setShowForm(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', job_posting_id: '', application_date: '', source: 'website', resume_url: '', cover_letter: '' });
      fetchApplicants();
    } catch (err) { setError('Failed to create applicant'); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try { await applicantsApi.updateStatus(id, status); fetchApplicants(); } catch (err) { setError('Failed to update status'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'hired': return 'bg-green-100 text-green-800'; case 'interview': return 'bg-blue-100 text-blue-800'; case 'shortlisted': return 'bg-yellow-100 text-yellow-800'; case 'rejected': return 'bg-red-100 text-red-800'; case 'new': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Applicants</h1><p className="text-gray-600">Manage job applicants</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Applicant</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Applicant</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label><input type="date" value={formData.application_date} onChange={(e) => setFormData({ ...formData, application_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label><select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="website">Website</option><option value="linkedin">LinkedIn</option><option value="referral">Referral</option><option value="agency">Agency</option><option value="other">Other</option></select></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applicants.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No applicants found.</td></tr>) : (
              applicants.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.applicant_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.first_name} {a.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.job_title || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.application_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{a.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{a.rating ? `${a.rating}/5` : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(a.status)}`}>{a.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <select onChange={(e) => handleUpdateStatus(a.id, e.target.value)} value={a.status} className="text-sm border rounded px-2 py-1">
                      <option value="new">New</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview">Interview</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
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
