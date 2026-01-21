import { useState, useEffect } from 'react';
import { bbbeeScorecardsApi } from '../../services/newPagesApi';

interface BBBEEScorecard {
  id: string;
  scorecard_number: string;
  assessment_year: string;
  verification_agency?: string;
  ownership_score: number;
  management_control_score: number;
  skills_development_score: number;
  enterprise_development_score: number;
  supplier_development_score: number;
  socio_economic_score: number;
  total_score: number;
  level: number;
  valid_from: string;
  valid_to: string;
  status: string;
}

export default function BBBEE() {
  const [scorecards, setScorecards] = useState<BBBEEScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ assessment_year: new Date().getFullYear().toString(), verification_agency: '', ownership_score: 0, management_control_score: 0, skills_development_score: 0, enterprise_development_score: 0, supplier_development_score: 0, socio_economic_score: 0, valid_from: '', valid_to: '' });

  useEffect(() => { fetchScorecards(); }, []);

  const fetchScorecards = async () => {
    try {
      setLoading(true);
      const response = await bbbeeScorecardsApi.getAll();
      setScorecards(response.data.bbbee_scorecards || []);
    } catch (err) { setError('Failed to load B-BBEE scorecards'); } finally { setLoading(false); }
  };

  const calculateTotal = () => formData.ownership_score + formData.management_control_score + formData.skills_development_score + formData.enterprise_development_score + formData.supplier_development_score + formData.socio_economic_score;
  const calculateLevel = (total: number) => { if (total >= 100) return 1; if (total >= 95) return 2; if (total >= 90) return 3; if (total >= 80) return 4; if (total >= 75) return 5; if (total >= 70) return 6; if (total >= 55) return 7; if (total >= 40) return 8; return 'NC'; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const total = calculateTotal();
      await bbbeeScorecardsApi.create({ ...formData, total_score: total, level: calculateLevel(total) });
      setShowForm(false);
      setFormData({ assessment_year: new Date().getFullYear().toString(), verification_agency: '', ownership_score: 0, management_control_score: 0, skills_development_score: 0, enterprise_development_score: 0, supplier_development_score: 0, socio_economic_score: 0, valid_from: '', valid_to: '' });
      fetchScorecards();
    } catch (err) { setError('Failed to create B-BBEE scorecard'); }
  };

  const handleVerify = async (id: string) => {
    try { await bbbeeScorecardsApi.verify(id); fetchScorecards(); } catch (err) { setError('Failed to verify scorecard'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await bbbeeScorecardsApi.delete(id); fetchScorecards(); } catch (err) { setError('Failed to delete scorecard'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'verified': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'expired': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const getLevelColor = (level: number) => {
    if (level <= 2) return 'bg-green-100 text-green-800';
    if (level <= 4) return 'bg-blue-100 text-blue-800';
    if (level <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">B-BBEE Compliance</h1><p className="text-gray-600">Manage Broad-Based Black Economic Empowerment scorecards</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Scorecard</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create B-BBEE Scorecard</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Assessment Year</label><input type="text" value={formData.assessment_year} onChange={(e) => setFormData({ ...formData, assessment_year: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Verification Agency</label><input type="text" value={formData.verification_agency} onChange={(e) => setFormData({ ...formData, verification_agency: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label><input type="date" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label><input type="date" value={formData.valid_to} onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-3 border-t pt-4 mt-2"><h3 className="font-medium text-gray-900 mb-3">Scorecard Elements (Max Points)</h3></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ownership (25)</label><input type="number" max={25} value={formData.ownership_score} onChange={(e) => setFormData({ ...formData, ownership_score: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Management Control (19)</label><input type="number" max={19} value={formData.management_control_score} onChange={(e) => setFormData({ ...formData, management_control_score: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Skills Development (20)</label><input type="number" max={20} value={formData.skills_development_score} onChange={(e) => setFormData({ ...formData, skills_development_score: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Enterprise Development (15)</label><input type="number" max={15} value={formData.enterprise_development_score} onChange={(e) => setFormData({ ...formData, enterprise_development_score: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier Development (16)</label><input type="number" max={16} value={formData.supplier_development_score} onChange={(e) => setFormData({ ...formData, supplier_development_score: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Socio-Economic (5)</label><input type="number" max={5} value={formData.socio_economic_score} onChange={(e) => setFormData({ ...formData, socio_economic_score: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-3 bg-gray-50 p-4 rounded-lg flex justify-between items-center"><div><span className="text-sm text-gray-600">Total Score: </span><span className="font-bold text-lg">{calculateTotal()}/100</span></div><div><span className="text-sm text-gray-600">B-BBEE Level: </span><span className={`px-3 py-1 rounded-full font-bold ${getLevelColor(calculateLevel(calculateTotal()) as number)}`}>Level {calculateLevel(calculateTotal())}</span></div></div>
            <div className="col-span-3 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scorecard #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scorecards.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No B-BBEE scorecards found.</td></tr>) : (
              scorecards.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.scorecard_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.assessment_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.verification_agency || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{s.total_score}/100</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><span className={`px-2 py-1 text-xs font-bold rounded-full ${getLevelColor(s.level)}`}>Level {s.level}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.valid_from} - {s.valid_to}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(s.status)}`}>{s.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {s.status === 'draft' && <button onClick={() => handleVerify(s.id)} className="text-green-600 hover:text-green-900">Verify</button>}
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
