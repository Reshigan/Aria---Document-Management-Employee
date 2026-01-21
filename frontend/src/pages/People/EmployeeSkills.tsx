import { useState, useEffect } from 'react';
import { employeeSkillsApi } from '../../services/newPagesApi';

interface EmployeeSkill {
  id: string;
  employee_name?: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: string;
  years_experience: number;
  certified: boolean;
  certification_date?: string;
  expiry_date?: string;
}

export default function EmployeeSkills() {
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: '', skill_name: '', skill_category: 'technical', proficiency_level: 'intermediate', years_experience: 1, certified: false, certification_date: '', expiry_date: '' });

  useEffect(() => { fetchSkills(); }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await employeeSkillsApi.getAll();
      setSkills(response.data.employee_skills || []);
    } catch (err) { setError('Failed to load employee skills'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeSkillsApi.create(formData);
      setShowForm(false);
      setFormData({ employee_id: '', skill_name: '', skill_category: 'technical', proficiency_level: 'intermediate', years_experience: 1, certified: false, certification_date: '', expiry_date: '' });
      fetchSkills();
    } catch (err) { setError('Failed to create employee skill'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await employeeSkillsApi.delete(id); fetchSkills(); } catch (err) { setError('Failed to delete skill'); }
  };

  const getProficiencyColor = (level: string) => {
    switch (level) { case 'expert': return 'bg-green-100 text-green-800'; case 'advanced': return 'bg-blue-100 text-blue-800'; case 'intermediate': return 'bg-yellow-100 text-yellow-800'; case 'beginner': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Employee Skills</h1><p className="text-gray-600">Track employee skills and certifications</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Add Skill</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Employee Skill</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label><input type="text" value={formData.skill_name} onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.skill_category} onChange={(e) => setFormData({ ...formData, skill_category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="technical">Technical</option><option value="soft_skills">Soft Skills</option><option value="language">Language</option><option value="management">Management</option><option value="industry">Industry</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Proficiency Level</label><select value={formData.proficiency_level} onChange={(e) => setFormData({ ...formData, proficiency_level: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Years Experience</label><input type="number" value={formData.years_experience} onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={formData.certified} onChange={(e) => setFormData({ ...formData, certified: e.target.checked })} className="mr-2" /><span className="text-sm text-gray-700">Certified</span></label></div>
            {formData.certified && (
              <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Certification Date</label><input type="date" value={formData.certification_date} onChange={(e) => setFormData({ ...formData, certification_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label><input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
              </>
            )}
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proficiency</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Experience</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certified</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {skills.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No employee skills found.</td></tr>) : (
              skills.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.employee_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.skill_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{s.skill_category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getProficiencyColor(s.proficiency_level)}`}>{s.proficiency_level}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{s.years_experience} yrs</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${s.certified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.certified ? 'Yes' : 'No'}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.expiry_date || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
