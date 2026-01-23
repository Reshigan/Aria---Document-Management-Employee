import { useState, useEffect } from 'react';
import { BookOpen, Plus, RefreshCw, AlertCircle, X, Users, Clock, CheckCircle, Calendar, Edit2, Trash2 } from 'lucide-react';

interface TrainingCourse {
  id: string;
  name: string;
  category: string;
  duration_hours: number;
  instructor: string;
  start_date: string;
  enrolled: number;
  capacity: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export default function TrainingCourses() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', duration_hours: 8, instructor: '', start_date: '', capacity: 20 });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setCourses([
        { id: '1', name: 'Leadership Fundamentals', category: 'Management', duration_hours: 16, instructor: 'John Trainer', start_date: '2026-02-01', enrolled: 15, capacity: 20, status: 'scheduled' },
        { id: '2', name: 'Advanced Excel', category: 'Technical', duration_hours: 8, instructor: 'Sarah Expert', start_date: '2026-01-20', enrolled: 18, capacity: 25, status: 'in_progress' },
        { id: '3', name: 'Safety Compliance', category: 'Compliance', duration_hours: 4, instructor: 'Mike Safety', start_date: '2026-01-10', enrolled: 30, capacity: 30, status: 'completed' },
      ]);
    } catch (err) { setError('Failed to load training courses'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Training course created successfully');
    setShowForm(false);
    setFormData({ name: '', category: '', duration_hours: 8, instructor: '', start_date: '', capacity: 20 });
    await fetchCourses();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      scheduled: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.scheduled;
  };

  const stats = { total: courses.length, scheduled: courses.filter(c => c.status === 'scheduled').length, inProgress: courses.filter(c => c.status === 'in_progress').length, totalEnrolled: courses.reduce((sum, c) => sum + c.enrolled, 0) };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Training Courses</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage employee training programs</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchCourses} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"><Plus className="h-5 w-5" />New Course</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30"><BookOpen className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Courses</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><Calendar className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.scheduled}</p><p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p><p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><Users className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalEnrolled}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Enrolled</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><BookOpen className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Training Course</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label><select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"><option value="">Select...</option><option value="Technical">Technical</option><option value="Management">Management</option><option value="Compliance">Compliance</option><option value="Soft Skills">Soft Skills</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (hours) *</label><input type="number" required min="1" value={formData.duration_hours} onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instructor *</label><input type="text" required value={formData.instructor} onChange={(e) => setFormData({ ...formData, instructor: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label><input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity *</label><input type="number" required min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30">Create</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : courses.length === 0 ? (<div className="p-12 text-center"><BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No courses</h3><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium">New Course</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Course</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Instructor</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Start Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Enrollment</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{courses.map((c) => (<tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{c.name}</td><td className="px-6 py-4"><span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">{c.category}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.duration_hours}h</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.instructor}</td><td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-600 dark:text-gray-300">{c.start_date}</span></div></td><td className="px-6 py-4"><div className="flex items-center gap-2"><span className="text-gray-900 dark:text-white font-medium">{c.enrolled}/{c.capacity}</span><div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${(c.enrolled / c.capacity) * 100}%` }} /></div></div></td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(c.status)}`}>{c.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{c.status.replace('_', ' ')}</span></td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
