import { useState, useEffect } from 'react';
import { routePlansApi } from '../../services/newPagesApi';

interface RoutePlan {
  id: string;
  route_number: string;
  route_name: string;
  driver_name?: string;
  vehicle_name?: string;
  planned_date: string;
  start_time: string;
  end_time?: string;
  total_stops: number;
  completed_stops: number;
  total_distance_km: number;
  status: string;
}

export default function RoutePlanning() {
  const [routes, setRoutes] = useState<RoutePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ route_name: '', driver_id: '', vehicle_id: '', planned_date: '', start_time: '', total_stops: 0, total_distance_km: 0, notes: '' });

  useEffect(() => { fetchRoutes(); }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await routePlansApi.getAll();
      setRoutes(response.data.route_plans || []);
    } catch (err) { setError('Failed to load route plans'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await routePlansApi.create(formData);
      setShowForm(false);
      setFormData({ route_name: '', driver_id: '', vehicle_id: '', planned_date: '', start_time: '', total_stops: 0, total_distance_km: 0, notes: '' });
      fetchRoutes();
    } catch (err) { setError('Failed to create route plan'); }
  };

  const handleStart = async (id: string) => {
    try { await routePlansApi.start(id); fetchRoutes(); } catch (err) { setError('Failed to start route'); }
  };

  const handleComplete = async (id: string) => {
    try { await routePlansApi.complete(id); fetchRoutes(); } catch (err) { setError('Failed to complete route'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'planned': return 'bg-yellow-100 text-yellow-800'; case 'cancelled': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Route Planning</h1><p className="text-gray-600">Plan and track delivery routes</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Route</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Route Plan</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label><input type="text" value={formData.route_name} onChange={(e) => setFormData({ ...formData, route_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Planned Date</label><input type="date" value={formData.planned_date} onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label><input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Stops</label><input type="number" value={formData.total_stops} onChange={(e) => setFormData({ ...formData, total_stops: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label><input type="number" value={formData.total_distance_km} onChange={(e) => setFormData({ ...formData, total_distance_km: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stops</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {routes.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No route plans found.</td></tr>) : (
              routes.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.route_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.route_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.driver_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.planned_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.start_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.completed_stops}/{r.total_stops}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{r.total_distance_km} km</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {r.status === 'planned' && <button onClick={() => handleStart(r.id)} className="text-blue-600 hover:text-blue-900">Start</button>}
                    {r.status === 'in_progress' && <button onClick={() => handleComplete(r.id)} className="text-green-600 hover:text-green-900">Complete</button>}
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
