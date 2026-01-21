import { useState, useEffect } from 'react';
import { machineMaintenanceApi } from '../../services/newPagesApi';

interface MaintenanceSchedule {
  id: string;
  schedule_number: string;
  machine_name?: string;
  maintenance_type: string;
  scheduled_date: string;
  completed_date?: string;
  technician_name?: string;
  estimated_hours: number;
  actual_hours?: number;
  status: string;
  notes?: string;
}

export default function MachineMaintenance() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ machine_id: '', maintenance_type: 'preventive', scheduled_date: '', technician_id: '', estimated_hours: 2, notes: '' });

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await machineMaintenanceApi.getAll();
      setSchedules(response.data.maintenance_schedules || []);
    } catch (err) { setError('Failed to load maintenance schedules'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await machineMaintenanceApi.create(formData);
      setShowForm(false);
      setFormData({ machine_id: '', maintenance_type: 'preventive', scheduled_date: '', technician_id: '', estimated_hours: 2, notes: '' });
      fetchSchedules();
    } catch (err) { setError('Failed to create maintenance schedule'); }
  };

  const handleStart = async (id: string) => {
    try { await machineMaintenanceApi.start(id); fetchSchedules(); } catch (err) { setError('Failed to start maintenance'); }
  };

  const handleComplete = async (id: string) => {
    try { await machineMaintenanceApi.complete(id); fetchSchedules(); } catch (err) { setError('Failed to complete maintenance'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'scheduled': return 'bg-yellow-100 text-yellow-800'; case 'overdue': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Machine Maintenance</h1><p className="text-gray-600">Schedule and track equipment maintenance</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Schedule Maintenance</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Schedule Maintenance</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label><select value={formData.maintenance_type} onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="preventive">Preventive</option><option value="corrective">Corrective</option><option value="predictive">Predictive</option><option value="emergency">Emergency</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label><input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label><input type="number" value={formData.estimated_hours} onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Schedule</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Hours</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schedules.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No maintenance schedules found.</td></tr>) : (
              schedules.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.schedule_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.machine_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{s.maintenance_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.scheduled_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.technician_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{s.estimated_hours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{s.actual_hours ? `${s.actual_hours}h` : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(s.status)}`}>{s.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {s.status === 'scheduled' && <button onClick={() => handleStart(s.id)} className="text-blue-600 hover:text-blue-900">Start</button>}
                    {s.status === 'in_progress' && <button onClick={() => handleComplete(s.id)} className="text-green-600 hover:text-green-900">Complete</button>}
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
