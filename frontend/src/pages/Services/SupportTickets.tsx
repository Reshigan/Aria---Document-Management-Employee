import { useState, useEffect } from 'react';
import { supportTicketsApi } from '../../services/newPagesApi';

interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_name?: string;
  subject: string;
  category: string;
  priority: string;
  assigned_to_name?: string;
  created_at: string;
  resolved_at?: string;
  status: string;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', subject: '', description: '', category: 'general', priority: 'medium', assigned_to: '' });

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await supportTicketsApi.getAll();
      setTickets(response.data.support_tickets || []);
    } catch (err) { setError('Failed to load support tickets'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supportTicketsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', subject: '', description: '', category: 'general', priority: 'medium', assigned_to: '' });
      fetchTickets();
    } catch (err) { setError('Failed to create support ticket'); }
  };

  const handleAssign = async (id: string) => {
    try { await supportTicketsApi.assign(id, { assigned_to: '' }); fetchTickets(); } catch (err) { setError('Failed to assign ticket'); }
  };

  const handleResolve = async (id: string) => {
    try { await supportTicketsApi.resolve(id); fetchTickets(); } catch (err) { setError('Failed to resolve ticket'); }
  };

  const handleClose = async (id: string) => {
    try { await supportTicketsApi.close(id); fetchTickets(); } catch (err) { setError('Failed to close ticket'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'closed': return 'bg-gray-100 text-gray-800'; case 'resolved': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'open': return 'bg-yellow-100 text-yellow-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) { case 'critical': return 'bg-red-100 text-red-800'; case 'high': return 'bg-orange-100 text-orange-800'; case 'medium': return 'bg-yellow-100 text-yellow-800'; case 'low': return 'bg-green-100 text-green-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1><p className="text-gray-600">Manage customer support requests</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Ticket</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Support Ticket</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="feature_request">Feature Request</option><option value="bug">Bug Report</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={4} required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No support tickets found.</td></tr>) : (
              tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.ticket_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.customer_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{t.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(t.priority)}`}>{t.priority}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.assigned_to_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.created_at?.split('T')[0]}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(t.status)}`}>{t.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {t.status === 'open' && <button onClick={() => handleAssign(t.id)} className="text-blue-600 hover:text-blue-900">Assign</button>}
                    {(t.status === 'open' || t.status === 'in_progress') && <button onClick={() => handleResolve(t.id)} className="text-green-600 hover:text-green-900">Resolve</button>}
                    {t.status === 'resolved' && <button onClick={() => handleClose(t.id)} className="text-gray-600 hover:text-gray-900">Close</button>}
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
