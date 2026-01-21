import { useState, useEffect } from 'react';
import { auditTrailApi } from '../../services/newPagesApi';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
}

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ entity_type: '', action: '', date_from: '', date_to: '' });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await auditTrailApi.getAll();
      setEntries(response.data.audit_entries || []);
    } catch (err) { setError('Failed to load audit trail'); } finally { setLoading(false); }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      const response = await auditTrailApi.search(filters);
      setEntries(response.data.audit_entries || []);
    } catch (err) { setError('Failed to filter audit trail'); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const response = await auditTrailApi.export(filters);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) { setError('Failed to export audit trail'); }
  };

  const getActionColor = (action: string) => {
    switch (action) { case 'create': return 'bg-green-100 text-green-800'; case 'update': return 'bg-blue-100 text-blue-800'; case 'delete': return 'bg-red-100 text-red-800'; case 'login': return 'bg-purple-100 text-purple-800'; case 'logout': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1><p className="text-gray-600">Track all system activities and changes</p></div>
        <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Export</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label><select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="">All Types</option><option value="customer">Customer</option><option value="invoice">Invoice</option><option value="purchase_order">Purchase Order</option><option value="employee">Employee</option><option value="product">Product</option><option value="user">User</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Action</label><select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="">All Actions</option><option value="create">Create</option><option value="update">Update</option><option value="delete">Delete</option><option value="login">Login</option><option value="logout">Logout</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date From</label><input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date To</label><input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
          <div className="flex items-end"><button onClick={handleFilter} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Filter</button></div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No audit entries found.</td></tr>) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.user_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(e.action)}`}>{e.action}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{e.entity_type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.entity_name || e.entity_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.ip_address || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{e.new_values ? JSON.stringify(JSON.parse(e.new_values)).substring(0, 50) + '...' : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
