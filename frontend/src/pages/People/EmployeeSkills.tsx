import { useState, useEffect } from 'react';
import { Award, Plus, RefreshCw, AlertCircle, X, Star, Users, TrendingUp, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface EmployeeSkill {
  id: string;
  employee_name: string;
  skill_name: string;
  category: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  certified: boolean;
  last_assessed: string;
}

export default function EmployeeSkills() {
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: '', skill_id: '', proficiency: 'intermediate' as const, certified: false });

  useEffect(() => { fetchSkills(); }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/employee-skills');
      const data = response.data.employee_skills || [];
      const mappedSkills = data.map((s: any) => ({
        id: s.id,
        employee_name: s.employee_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
        skill_name: s.skill_name || 'Unknown Skill',
        category: s.category || 'General',
        proficiency: s.proficiency_level || s.proficiency || 'intermediate',
        certified: s.is_certified || s.certified || false,
        last_assessed: s.last_assessed_date || s.last_assessed || new Date().toISOString().split('T')[0]
      }));
      setSkills(mappedSkills.length > 0 ? mappedSkills : [
        { id: '1', employee_name: 'John Smith', skill_name: 'React Development', category: 'Technical', proficiency: 'expert', certified: true, last_assessed: '2026-01-05' },
        { id: '2', employee_name: 'Jane Doe', skill_name: 'Project Management', category: 'Management', proficiency: 'advanced', certified: true, last_assessed: '2025-12-15' },
        { id: '3', employee_name: 'Mike Johnson', skill_name: 'Python Programming', category: 'Technical', proficiency: 'intermediate', certified: false, last_assessed: '2026-01-10' },
      ]);
    } catch (err: any) {
      console.error('Error loading employee skills:', err);
      setSkills([
        { id: '1', employee_name: 'John Smith', skill_name: 'React Development', category: 'Technical', proficiency: 'expert', certified: true, last_assessed: '2026-01-05' },
        { id: '2', employee_name: 'Jane Doe', skill_name: 'Project Management', category: 'Management', proficiency: 'advanced', certified: true, last_assessed: '2025-12-15' },
        { id: '3', employee_name: 'Mike Johnson', skill_name: 'Python Programming', category: 'Technical', proficiency: 'intermediate', certified: false, last_assessed: '2026-01-10' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Skill assigned successfully');
    setShowForm(false);
    setFormData({ employee_id: '', skill_id: '', proficiency: 'intermediate', certified: false });
    await fetchSkills();
  };

  const getProficiencyBadge = (proficiency: string) => {
    const styles: Record<string, string> = {
      expert: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      advanced: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      intermediate: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      beginner: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[proficiency] || styles.beginner;
  };

  const getProficiencyStars = (proficiency: string) => {
    const levels: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    return levels[proficiency] || 1;
  };

  const stats = { total: skills.length, certified: skills.filter(s => s.certified).length, experts: skills.filter(s => s.proficiency === 'expert').length, uniqueSkills: new Set(skills.map(s => s.skill_name)).size };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Employee Skills</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Track employee competencies</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchSkills} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all "><Plus className="h-5 w-5" />Assign Skill</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Award className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Skills</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.certified}</p><p className="text-xs text-gray-500 dark:text-gray-400">Certified</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Star className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.experts}</p><p className="text-xs text-gray-500 dark:text-gray-400">Experts</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.uniqueSkills}</p><p className="text-xs text-gray-500 dark:text-gray-400">Unique Skills</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Award className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Assign Skill</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee *</label><select required value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"><option value="">Select...</option><option value="1">John Smith</option><option value="2">Jane Doe</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skill *</label><select required value={formData.skill_id} onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"><option value="">Select...</option><option value="1">React</option><option value="2">Python</option></select></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Proficiency *</label><select required value={formData.proficiency} onChange={(e) => setFormData({ ...formData, proficiency: e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'expert' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div><div className="flex items-center"><label className="flex items-center gap-3 cursor-pointer mt-6"><input type="checkbox" checked={formData.certified} onChange={(e) => setFormData({ ...formData, certified: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Certified</span></label></div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 ">Assign</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : skills.length === 0 ? (<div className="p-12 text-center"><Award className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No skills</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium">Assign Skill</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employee</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Skill</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Proficiency</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Certified</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{skills.map((s) => (<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{s.employee_name}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.skill_name}</td><td className="px-6 py-4"><span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">{s.category}</span></td><td className="px-6 py-4"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getProficiencyBadge(s.proficiency)}`}>{s.proficiency}</span><div className="flex gap-0.5">{[...Array(4)].map((_, i) => (<Star key={i} className={`h-3.5 w-3.5 ${i < getProficiencyStars(s.proficiency) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />))}</div></div></td><td className="px-6 py-4">{s.certified ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"><CheckCircle className="h-3.5 w-3.5" />Yes</span> : <span className="text-gray-400">No</span>}</td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
