import { useState, useEffect } from 'react';
import { performanceReviewsApi } from '../../services/newPagesApi';

interface PerformanceReview {
  id: string;
  review_number: string;
  employee_name?: string;
  reviewer_name?: string;
  review_period: string;
  review_date: string;
  overall_rating: number;
  goals_achieved: number;
  goals_total: number;
  status: string;
}

export default function PerformanceReviews() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: '', reviewer_id: '', review_period: '', review_date: '', overall_rating: 3, strengths: '', areas_for_improvement: '', goals: '', comments: '' });

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await performanceReviewsApi.getAll();
      setReviews(response.data.performance_reviews || []);
    } catch (err) { setError('Failed to load performance reviews'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await performanceReviewsApi.create(formData);
      setShowForm(false);
      setFormData({ employee_id: '', reviewer_id: '', review_period: '', review_date: '', overall_rating: 3, strengths: '', areas_for_improvement: '', goals: '', comments: '' });
      fetchReviews();
    } catch (err) { setError('Failed to create performance review'); }
  };

  const handleSubmitReview = async (id: string) => {
    try { await performanceReviewsApi.submit(id); fetchReviews(); } catch (err) { setError('Failed to submit review'); }
  };

  const handleApprove = async (id: string) => {
    try { await performanceReviewsApi.approve(id); fetchReviews(); } catch (err) { setError('Failed to approve review'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'approved': return 'bg-green-100 text-green-800'; case 'submitted': return 'bg-blue-100 text-blue-800'; case 'draft': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-blue-600';
    if (rating >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Performance Reviews</h1><p className="text-gray-600">Manage employee performance evaluations</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Review</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Performance Review</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Review Period</label><input type="text" placeholder="e.g., Q1 2026" value={formData.review_period} onChange={(e) => setFormData({ ...formData, review_period: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label><input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating (1-5)</label><select value={formData.overall_rating} onChange={(e) => setFormData({ ...formData, overall_rating: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2"><option value={1}>1 - Needs Improvement</option><option value={2}>2 - Below Expectations</option><option value={3}>3 - Meets Expectations</option><option value={4}>4 - Exceeds Expectations</option><option value={5}>5 - Outstanding</option></select></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label><textarea value={formData.strengths} onChange={(e) => setFormData({ ...formData, strengths: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Areas for Improvement</label><textarea value={formData.areas_for_improvement} onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Goals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reviews.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No performance reviews found.</td></tr>) : (
              reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.review_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.employee_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.reviewer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.review_period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.review_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center"><span className={`font-bold ${getRatingColor(r.overall_rating)}`}>{r.overall_rating}/5</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.goals_achieved}/{r.goals_total}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {r.status === 'draft' && <button onClick={() => handleSubmitReview(r.id)} className="text-blue-600 hover:text-blue-900">Submit</button>}
                    {r.status === 'submitted' && <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:text-green-900">Approve</button>}
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
