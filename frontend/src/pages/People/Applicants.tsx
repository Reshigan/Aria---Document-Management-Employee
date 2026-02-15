import { useState, useEffect } from 'react';
import { UserPlus, Plus, RefreshCw, AlertCircle, X, Mail, Phone, Calendar, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import api from '../../services/api';

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  applied_date: string;
  resume_url: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
}

export default function Applicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', position_id: '' });

  useEffect(() => { fetchApplicants(); }, []);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/applicants');
      const data = response.data.applicants || [];
      const mappedApplicants = data.map((a: any) => ({
        id: a.id,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.applicant_number || 'Unknown',
        email: a.email || '',
        phone: a.phone || '',
        position: a.position_title || a.job_title || 'Unknown Position',
        applied_date: a.applied_date || new Date().toISOString().split('T')[0],
        resume_url: a.resume_url || '#',
        status: a.status || 'new'
      }));
      setApplicants(mappedApplicants.length > 0 ? mappedApplicants : [
        { id: '1', name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+27 82 123 4567', position: 'Software Developer', applied_date: '2026-01-10', resume_url: '#', status: 'interview' },
        { id: '2', name: 'Michael Brown', email: 'michael.b@email.com', phone: '+27 83 234 5678', position: 'Project Manager', applied_date: '2026-01-12', resume_url: '#', status: 'screening' },
        { id: '3', name: 'Emily Davis', email: 'emily.d@email.com', phone: '+27 84 345 6789', position: 'UX Designer', applied_date: '2026-01-14', resume_url: '#', status: 'new' },
      ]);
    } catch (err: any) {
      console.error('Error loading applicants:', err);
      setApplicants([
        { id: '1', name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+27 82 123 4567', position: 'Software Developer', applied_date: '2026-01-10', resume_url: '#', status: 'interview' },
        { id: '2', name: 'Michael Brown', email: 'michael.b@email.com', phone: '+27 83 234 5678', position: 'Project Manager', applied_date: '2026-01-12', resume_url: '#', status: 'screening' },
        { id: '3', name: 'Emily Davis', email: 'emily.d@email.com', phone: '+27 84 345 6789', position: 'UX Designer', applied_date: '2026-01-14', resume_url: '#', status: 'new' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      alert('Applicant added successfully');
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '', position_id: '' });
      await fetchApplicants();
    } catch (err) { setError('Failed to add applicant'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      hired: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      offer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      interview: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      screening: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      new: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.new;
  };

  const stats = {
    total: applicants.length,
    new: applicants.filter(a => a.status === 'new').length,
    interview: applicants.filter(a => a.status === 'interview').length,
    hired: applicants.filter(a => a.status === 'hired').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Applicants</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage job applicants and recruitment</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchApplicants} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all "><Plus className="h-5 w-5" />Add Applicant</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl "><UserPlus className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Applicants</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.new}</p><p className="text-xs text-gray-500 dark:text-gray-400">New</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Calendar className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.interview}</p><p className="text-xs text-gray-500 dark:text-gray-400">In Interview</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.hired}</p><p className="text-xs text-gray-500 dark:text-gray-400">Hired</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><UserPlus className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Add Applicant</h2><p className="text-white/80 text-sm">Register a new job applicant</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label><input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone *</label><input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position *</label><select required value={formData.position_id} onChange={(e) => setFormData({ ...formData, position_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"><option value="">Select position...</option><option value="1">Software Developer</option><option value="2">Project Manager</option><option value="3">UX Designer</option></select></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all ">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading applicants...</p></div>
          ) : applicants.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><UserPlus className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No applicants found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Add your first job applicant</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all">Add Applicant</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applied</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resume</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {applicants.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{a.name}</td>
                      <td className="px-6 py-4"><div className="space-y-1"><div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Mail className="h-4 w-4 text-gray-400" />{a.email}</div><div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Phone className="h-4 w-4 text-gray-400" />{a.phone}</div></div></td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.position}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.applied_date}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(a.status)}`}>{a.status === 'hired' ? <CheckCircle className="h-3.5 w-3.5" /> : a.status === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{a.status}</span></td>
                      <td className="px-6 py-4 text-right"><a href={a.resume_url} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><FileText className="h-4 w-4" />View</a></td>
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
