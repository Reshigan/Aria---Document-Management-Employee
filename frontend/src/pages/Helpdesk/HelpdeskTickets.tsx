import { useState, useEffect } from 'react';
import { Ticket, Plus, Search, Edit, Trash2, Clock, AlertCircle, CheckCircle, User, MessageSquare } from 'lucide-react';
import api from '../../lib/api';

interface HelpdeskTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  team_id?: string;
  team_name?: string;
  assigned_to?: string;
  assigned_name?: string;
  stage_id?: string;
  stage_name?: string;
  priority: string;
  sla_policy_id?: string;
  sla_deadline?: string;
  sla_status?: string;
  first_response_at?: string;
  resolved_at?: string;
  message_count?: number;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

interface Stage {
  id: string;
  name: string;
  is_closed: boolean;
}

export default function HelpdeskTickets() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<HelpdeskTicket | null>(null);
  const [showDetail, setShowDetail] = useState<HelpdeskTicket | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customer_email: '',
    team_id: '',
    priority: 'medium',
    stage_id: ''
  });

  useEffect(() => {
    loadTickets();
    loadTeams();
    loadStages();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filterTeam, filterPriority]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      let url = '/odoo/helpdesk/tickets';
      const params = new URLSearchParams();
      if (filterTeam) params.append('team_id', filterTeam);
      if (filterPriority) params.append('priority', filterPriority);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/teams');
      const data = response.data.data || response.data || [];
      setTeams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadStages = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/stages');
      const data = response.data.data || response.data || [];
      setStages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTicket) {
        await api.put(`/odoo/helpdesk/tickets/${editingTicket.id}`, formData);
      } else {
        await api.post('/odoo/helpdesk/tickets', formData);
      }
      setShowForm(false);
      setEditingTicket(null);
      resetForm();
      loadTickets();
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('Error saving ticket. Please try again.');
    }
  };

  const handleEdit = (ticket: HelpdeskTicket) => {
    setEditingTicket(ticket);
    setFormData({
      subject: ticket.subject,
      description: ticket.description || '',
      customer_email: ticket.customer_email || '',
      team_id: ticket.team_id || '',
      priority: ticket.priority,
      stage_id: ticket.stage_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await api.delete(`/odoo/helpdesk/tickets/${id}`);
      loadTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error deleting ticket. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      description: '',
      customer_email: '',
      team_id: '',
      priority: 'medium',
      stage_id: ''
    });
  };

  const filteredTickets = tickets.filter(t =>
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const slaStatusColors: Record<string, string> = {
    on_track: 'text-green-600',
    at_risk: 'text-yellow-600',
    breached: 'text-red-600'
  };

  const openTickets = tickets.filter(t => !stages.find(s => s.id === t.stage_id)?.is_closed);
  const breachedTickets = tickets.filter(t => t.sla_status === 'breached');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Ticket size={28} className="text-blue-500" />
          Helpdesk Tickets
        </h1>
        <p className="text-gray-600 mt-1">Manage customer support tickets with SLA tracking</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Tickets</div>
          <div className="text-2xl font-bold text-blue-600">{tickets.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Open Tickets</div>
          <div className="text-2xl font-bold text-orange-600">{openTickets.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">SLA Breached</div>
          <div className="text-2xl font-bold text-red-600">{breachedTickets.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Urgent</div>
          <div className="text-2xl font-bold text-purple-600">
            {tickets.filter(t => t.priority === 'urgent').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            onClick={() => { setEditingTicket(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={16} />
            New Ticket
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">SLA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div 
                      className="cursor-pointer"
                      onClick={() => setShowDetail(ticket)}
                    >
                      <div className="font-medium text-blue-600 hover:underline">
                        #{ticket.ticket_number}
                      </div>
                      <div className="text-sm text-gray-900">{ticket.subject}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">{ticket.customer_name || '-'}</div>
                        <div className="text-xs text-gray-500">{ticket.customer_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ticket.team_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {ticket.assigned_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {ticket.stage_name || 'New'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {ticket.sla_deadline ? (
                      <div className={`flex items-center justify-center gap-1 ${slaStatusColors[ticket.sla_status || 'on_track']}`}>
                        {ticket.sla_status === 'breached' ? (
                          <AlertCircle size={14} />
                        ) : ticket.sla_status === 'at_risk' ? (
                          <Clock size={14} />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        <span className="text-xs">
                          {new Date(ticket.sla_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No SLA</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setShowDetail(ticket)}
                      className="text-gray-600 hover:text-gray-900 mr-2"
                      title="View Messages"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(ticket)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(ticket.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || filterTeam || filterPriority 
                ? 'No tickets found matching your criteria' 
                : 'No tickets yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingTicket ? 'Edit Ticket' : 'New Ticket'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Detailed description of the issue"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                  <select
                    value={formData.team_id}
                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              {editingTicket && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={formData.stage_id}
                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Stage</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingTicket(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTicket ? 'Update' : 'Create'} Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showDetail && (
        <TicketDetailModal 
          ticket={showDetail} 
          onClose={() => setShowDetail(null)}
          onUpdate={loadTickets}
        />
      )}
    </div>
  );
}

function TicketDetailModal({ ticket, onClose, onUpdate }: { 
  ticket: HelpdeskTicket; 
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [ticket.id]);

  const loadMessages = async () => {
    try {
      const response = await api.get(`/odoo/helpdesk/tickets/${ticket.id}/messages`);
      const data = response.data.data || response.data || [];
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setLoading(true);
      await api.post(`/odoo/helpdesk/tickets/${ticket.id}/messages`, {
        body: newMessage,
        is_internal: isInternal
      });
      setNewMessage('');
      loadMessages();
      onUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-500">#{ticket.ticket_number}</div>
            <h2 className="text-xl font-bold">{ticket.subject}</h2>
            <div className="text-sm text-gray-600 mt-1">
              {ticket.customer_name || ticket.customer_email || 'Unknown Customer'}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        {ticket.description && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="text-sm text-gray-700">{ticket.description}</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg ${
                  msg.is_internal 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : msg.author_type === 'customer'
                    ? 'bg-gray-100'
                    : 'bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">
                    {msg.author_name || 'System'}
                    {msg.is_internal && (
                      <span className="ml-2 text-xs text-yellow-600">(Internal Note)</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-700">{msg.body}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2 mb-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Internal Note (not visible to customer)
            </label>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={2}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
