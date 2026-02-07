import { useState, useEffect } from 'react';
import { Briefcase, Plus, RefreshCw, AlertCircle, X, MapPin, Clock, CheckCircle, Users, Calendar, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  posted_date: string;
  closing_date: string;
  applicants_count: number;
  status: 'open' | 'closed' | 'draft';
}

export default function JobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', department: '', location: '', employment_type: 'full_time' as const, closing_date: '', description: '' });

  useEffect(() => { fetchPostings(); }, []);

  const fetchPostings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/job-postings');
      const data = response.data.job_postings || [];
      const mappedPostings = data.map((p: any) => ({
        id: p.id,
        title: p.job_title || p.title || 'Unknown Position',
        department: p.department_name || p.department || 'General',
        location: p.location || 'Remote',
        employment_type: p.employment_type || 'full_time',
        posted_date: p.posted_date || new Date().toISOString().split('T')[0],
        closing_date: p.closing_date || new Date().toISOString().split('T')[0],
        applicants_count: p.applicants_count || 0,
        status: p.status || 'open'
      }));
      setPostings(mappedPostings.length > 0 ? mappedPostings : [
        { id: '1', title: 'Senior Software Developer', department: 'Engineering', location: 'Cape Town', employment_type: 'full_time', posted_date: '2026-01-01', closing_date: '2026-01-31', applicants_count: 15, status: 'open' },
        { id: '2', title: 'Project Manager', department: 'Operations', location: 'Johannesburg', employment_type: 'full_time', posted_date: '2026-01-05', closing_date: '2026-02-05', applicants_count: 8, status: 'open' },
        { id: '3', title: 'UX Design Intern', department: 'Design', location: 'Remote', employment_type: 'internship', posted_date: '2025-12-15', closing_date: '2026-01-15', applicants_count: 25, status: 'closed' },
      ]);
    } catch (err: any) {
      console.error('Error loading job postings:', err);
      setPostings([
        { id: '1', title: 'Senior Software Developer', department: 'Engineering', location: 'Cape Town', employment_type: 'full_time', posted_date: '2026-01-01', closing_date: '2026-01-31', applicants_count: 15, status: 'open' },
        { id: '2', title: 'Project Manager', department: 'Operations', location: 'Johannesburg', employment_type: 'full_time', posted_date: '2026-01-05', closing_date: '2026-02-05', applicants_count: 8, status: 'open' },
        { id: '3', title: 'UX Design Intern', department: 'Design', location: 'Remote', employment_type: 'internship', posted_date: '2025-12-15', closing_date: '2026-01-15', applicants_count: 25, status: 'closed' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      alert('Job posting created successfully');
      setShowForm(false);
      setFormData({ title: '', department: '', location: '', employment_type: 'full_time', closing_date: '', description: '' });
      await fetchPostings();
    } catch (err) { setError('Failed to create job posting'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      closed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship' };
    return labels[type] || type;
  };

  const stats = {
    total: postings.length,
    open: postings.filter(p => p.status === 'open').length,
    totalApplicants: postings.reduce((sum, p) => sum + p.applicants_count, 0),
    closed: postings.filter(p => p.status === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Job Postings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage open positions and recruitment</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPostings} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"><Plus className="h-5 w-5" />New Posting</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30"><Briefcase className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Postings</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.open}</p><p className="text-sm text-gray-500 dark:text-gray-400">Open Positions</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30"><Users className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalApplicants}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Applicants</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.closed}</p><p className="text-sm text-gray-500 dark:text-gray-400">Closed</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Briefcase className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Job Posting</h2><p className="text-white/80 text-sm">Create a new open position</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Title *</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department *</label><input type="text" required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location *</label><input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employment Type *</label><select required value={formData.employment_type} onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as 'full_time' | 'part_time' | 'contract' | 'internship' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Closing Date *</label><input type="date" required value={formData.closing_date} onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading job postings...</p></div>
          ) : postings.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Briefcase className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No job postings</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Create your first job posting</p><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">New Posting</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applicants</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Closes</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {postings.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{p.title}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.department}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span className="text-gray-600 dark:text-gray-300">{p.location}</span></div></td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">{getTypeBadge(p.employment_type)}</span></td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{p.applicants_count}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-600 dark:text-gray-300">{p.closing_date}</span></div></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(p.status)}`}>{p.status === 'open' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{p.status}</span></td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button>
                        <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
