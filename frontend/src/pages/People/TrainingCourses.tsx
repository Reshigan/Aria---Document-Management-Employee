import { useState, useEffect } from 'react';
import { trainingCoursesApi } from '../../services/newPagesApi';

interface TrainingCourse {
  id: string;
  course_code: string;
  course_name: string;
  category: string;
  duration_hours: number;
  instructor_name?: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  enrolled_count: number;
  status: string;
}

export default function TrainingCourses() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ course_code: '', course_name: '', category: 'technical', duration_hours: 8, instructor_id: '', start_date: '', end_date: '', max_participants: 20, description: '', objectives: '' });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await trainingCoursesApi.getAll();
      setCourses(response.data.training_courses || []);
    } catch (err) { setError('Failed to load training courses'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trainingCoursesApi.create(formData);
      setShowForm(false);
      setFormData({ course_code: '', course_name: '', category: 'technical', duration_hours: 8, instructor_id: '', start_date: '', end_date: '', max_participants: 20, description: '', objectives: '' });
      fetchCourses();
    } catch (err) { setError('Failed to create training course'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await trainingCoursesApi.delete(id); fetchCourses(); } catch (err) { setError('Failed to delete course'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'scheduled': return 'bg-yellow-100 text-yellow-800'; case 'cancelled': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Training Courses</h1><p className="text-gray-600">Manage employee training programs</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Course</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Training Course</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label><input type="text" value={formData.course_code} onChange={(e) => setFormData({ ...formData, course_code: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label><input type="text" value={formData.course_name} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="technical">Technical</option><option value="soft_skills">Soft Skills</option><option value="compliance">Compliance</option><option value="leadership">Leadership</option><option value="safety">Safety</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (Hours)</label><input type="number" value={formData.duration_hours} onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label><input type="number" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instructor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Enrolled</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {courses.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No training courses found.</td></tr>) : (
              courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.course_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.course_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{c.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{c.duration_hours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.instructor_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.start_date} - {c.end_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{c.enrolled_count}/{c.max_participants}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
