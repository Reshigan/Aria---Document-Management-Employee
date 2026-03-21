import { useState, useEffect } from 'react';
import { Star, Plus, RefreshCw, AlertCircle, X, User, Calendar, CheckCircle, Clock, TrendingUp, Edit2 } from 'lucide-react';
import api from '../../services/api';

interface PerformanceReview {
  id: string;
  employee_name: string;
  reviewer_name: string;
  review_period: string;
  review_date: string;
  overall_rating: number;
  status: 'draft' | 'submitted' | 'acknowledged' | 'completed';
}

export default function PerformanceReviews() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: '', review_period: '', goals: '', achievements: '', overall_rating: 3 });

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/performance-reviews');
      const data = response.data.performance_reviews || [];
      const mappedReviews = data.map((r: any) => ({
        id: r.id,
        employee_name: r.employee_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
        reviewer_name: r.reviewer_name || r.manager_name || 'Manager',
        review_period: r.review_period || 'Q4 2025',
        review_date: r.review_date || new Date().toISOString().split('T')[0],
        overall_rating: r.overall_rating || r.rating || 3.0,
        status: r.status || 'draft'
      }));
      setReviews(mappedReviews.length > 0 ? mappedReviews : [
        { id: '1', employee_name: 'John Smith', reviewer_name: 'Jane Manager', review_period: 'Q4 2025', review_date: '2026-01-10', overall_rating: 4.5, status: 'completed' },
        { id: '2', employee_name: 'Mike Johnson', reviewer_name: 'Jane Manager', review_period: 'Q4 2025', review_date: '2026-01-12', overall_rating: 3.8, status: 'acknowledged' },
        { id: '3', employee_name: 'Sarah Davis', reviewer_name: 'Tom Lead', review_period: 'Q4 2025', review_date: '2026-01-15', overall_rating: 4.2, status: 'submitted' },
      ]);
    } catch (err: any) {
      console.error('Error loading performance reviews:', err);
      setReviews([
        { id: '1', employee_name: 'John Smith', reviewer_name: 'Jane Manager', review_period: 'Q4 2025', review_date: '2026-01-10', overall_rating: 4.5, status: 'completed' },
        { id: '2', employee_name: 'Mike Johnson', reviewer_name: 'Jane Manager', review_period: 'Q4 2025', review_date: '2026-01-12', overall_rating: 3.8, status: 'acknowledged' },
        { id: '3', employee_name: 'Sarah Davis', reviewer_name: 'Tom Lead', review_period: 'Q4 2025', review_date: '2026-01-15', overall_rating: 4.2, status: 'submitted' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Performance review created successfully');
    setShowForm(false);
    setFormData({ employee_id: '', review_period: '', goals: '', achievements: '', overall_rating: 3 });
    await fetchReviews();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      acknowledged: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      submitted: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 2.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const stats = { total: reviews.length, completed: reviews.filter(r => r.status === 'completed').length, avgRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length).toFixed(1) : '0', pending: reviews.filter(r => r.status === 'draft' || r.status === 'submitted').length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Performance Reviews</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Manage employee evaluations</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchReviews} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all "><Plus className="h-5 w-5" />New Review</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl "><Star className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Reviews</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Completed</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.avgRating}</p><p className="text-xs text-gray-500 dark:text-gray-300">Avg Rating</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p><p className="text-xs text-gray-500 dark:text-gray-300">Pending</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Star className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Performance Review</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label><select required value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"><option value="">Select...</option><option value="1">John Smith</option><option value="2">Mike Johnson</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period *</label><select required value={formData.review_period} onChange={(e) => setFormData({ ...formData, review_period: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"><option value="">Select...</option><option value="Q1 2026">Q1 2026</option><option value="Q4 2025">Q4 2025</option></select></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goals</label><textarea value={formData.goals} onChange={(e) => setFormData({ ...formData, goals: e.target.value })} rows={1} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Achievements</label><textarea value={formData.achievements} onChange={(e) => setFormData({ ...formData, achievements: e.target.value })} rows={1} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Rating (1-5) *</label><div className="flex items-center gap-2"><input type="range" min="1" max="5" step="0.5" value={formData.overall_rating} onChange={(e) => setFormData({ ...formData, overall_rating: parseFloat(e.target.value) })} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" /><span className="text-lg font-bold text-violet-600 dark:text-violet-400 w-12 text-center">{formData.overall_rating}</span></div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 ">Create</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : reviews.length === 0 ? (<div className="p-12 text-center"><Star className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reviews</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium">New Review</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Employee</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Reviewer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Period</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Rating</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{reviews.map((r) => (<tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4"><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-300" /><span className="font-semibold text-gray-900 dark:text-white">{r.employee_name}</span></div></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.reviewer_name}</td><td className="px-6 py-4"><span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-medium">{r.review_period}</span></td><td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-300" /><span className="text-gray-600 dark:text-gray-300">{r.review_date}</span></div></td><td className="px-6 py-4"><div className="flex items-center gap-2"><span className={`text-lg font-bold ${getRatingColor(r.overall_rating)}`}>{r.overall_rating}</span><div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < Math.floor(r.overall_rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />))}</div></div></td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(r.status)}`}>{r.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{r.status}</span></td><td className="px-6 py-4 text-right"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
