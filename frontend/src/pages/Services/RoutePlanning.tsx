import { useState, useEffect } from 'react';
import { MapPin, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, Navigation, Truck, Play } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      planned: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.planned;
  };

  const stats = { total: routes.length, completed: routes.filter(r => r.status === 'completed').length, inProgress: routes.filter(r => r.status === 'in_progress').length, totalDistance: routes.reduce((sum, r) => sum + r.total_distance_km, 0) };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Route Planning</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Plan and track delivery routes</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRoutes} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium hover:from-sky-700 hover:to-blue-700 transition-all "><Plus className="h-5 w-5" />New Route</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl "><MapPin className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Routes</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Completed</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl "><Truck className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p><p className="text-xs text-gray-500 dark:text-gray-300">In Progress</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Navigation className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.totalDistance} km</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Distance</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-sky-600 to-blue-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><MapPin className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Route Plan</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Route Name *</label><input type="text" required value={formData.route_name} onChange={(e) => setFormData({ ...formData, route_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Planned Date *</label><input type="date" required value={formData.planned_date} onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time *</label><input type="time" required value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Stops</label><input type="number" value={formData.total_stops} onChange={(e) => setFormData({ ...formData, total_stops: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Distance (km)</label><input type="number" value={formData.total_distance_km} onChange={(e) => setFormData({ ...formData, total_distance_km: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium hover:from-sky-700 hover:to-blue-700 ">Create Route</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-sky-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : routes.length === 0 ? (<div className="p-12 text-center"><MapPin className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No route plans</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium">New Route</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Route #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Driver</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Time</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Stops</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Distance</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{routes.map((r) => (<tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-sky-600 dark:text-sky-400">{r.route_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.route_name}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.driver_name || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.planned_date}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.start_time}</td><td className="px-6 py-4 text-center"><span className="px-3 py-1 rounded-lg text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">{r.completed_stops}/{r.total_stops}</span></td><td className="px-6 py-4 text-right font-semibold text-sky-600 dark:text-sky-400">{r.total_distance_km} km</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(r.status)}`}>{r.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{r.status.replace('_', ' ')}</span></td><td className="px-6 py-4 text-right space-x-1">{r.status === 'planned' && <button onClick={() => handleStart(r.id)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Play className="h-4 w-4 inline mr-1" />Start</button>}{r.status === 'in_progress' && <button onClick={() => handleComplete(r.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><CheckCircle className="h-4 w-4 inline mr-1" />Complete</button>}</td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
