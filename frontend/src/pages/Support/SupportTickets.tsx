import React, { useState } from 'react';
import { Plus, Edit2, Eye, MessageSquare, Clock, CheckCircle, AlertTriangle, User } from 'lucide-react';

interface SupportTicket {
  id: number;
  reference: string;
  subject: string;
  customer: string;
  contact_email: string;
  category: 'TECHNICAL' | 'BILLING' | 'GENERAL' | 'FEATURE_REQUEST' | 'BUG';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_to: string;
  created_date: string;
  last_updated: string;
  response_count: number;
  status: 'NEW' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
}

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([
    { id: 1, reference: 'TKT-2026-001', subject: 'Cannot access dashboard', customer: 'ABC Manufacturing', contact_email: 'support@abc.co.za', category: 'TECHNICAL', priority: 'HIGH', assigned_to: 'John Smith', created_date: '2026-01-20', last_updated: '2026-01-21', response_count: 3, status: 'OPEN' },
    { id: 2, reference: 'TKT-2026-002', subject: 'Invoice discrepancy', customer: 'XYZ Retail', contact_email: 'accounts@xyz.co.za', category: 'BILLING', priority: 'MEDIUM', assigned_to: 'Sarah Johnson', created_date: '2026-01-19', last_updated: '2026-01-20', response_count: 2, status: 'PENDING' },
    { id: 3, reference: 'TKT-2026-003', subject: 'Feature request: Export to PDF', customer: 'Tech Solutions', contact_email: 'info@tech.co.za', category: 'FEATURE_REQUEST', priority: 'LOW', assigned_to: '', created_date: '2026-01-21', last_updated: '2026-01-21', response_count: 0, status: 'NEW' },
    { id: 4, reference: 'TKT-2026-004', subject: 'System down - urgent', customer: 'Global Logistics', contact_email: 'it@global.co.za', category: 'BUG', priority: 'CRITICAL', assigned_to: 'Mike Brown', created_date: '2026-01-21', last_updated: '2026-01-21', response_count: 5, status: 'RESOLVED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject: '', customer: '', contact_email: '', category: 'GENERAL', priority: 'MEDIUM', description: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      NEW: { bg: '#dbeafe', text: '#1e40af', icon: <MessageSquare size={14} /> },
      OPEN: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      PENDING: { bg: '#e0e7ff', text: '#3730a3', icon: <Clock size={14} /> },
      RESOLVED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      CLOSED: { bg: '#f3f4f6', text: '#374151', icon: <CheckCircle size={14} /> }
    };
    const c = config[status] || config.NEW;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      LOW: { bg: '#f3f4f6', text: '#374151' },
      MEDIUM: { bg: '#dbeafe', text: '#1e40af' },
      HIGH: { bg: '#fef3c7', text: '#92400e' },
      CRITICAL: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[priority] || config.MEDIUM;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{priority}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      TECHNICAL: 'Technical',
      BILLING: 'Billing',
      GENERAL: 'General',
      FEATURE_REQUEST: 'Feature',
      BUG: 'Bug'
    };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', backgroundColor: '#f3f4f6', color: '#374151' }}>{labels[category] || category}</span>;
  };

  const handleCreate = () => {
    setForm({ subject: '', customer: '', contact_email: '', category: 'GENERAL', priority: 'MEDIUM', description: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newTicket: SupportTicket = {
      id: Date.now(),
      reference: `TKT-2026-${String(tickets.length + 1).padStart(3, '0')}`,
      subject: form.subject,
      customer: form.customer,
      contact_email: form.contact_email,
      category: form.category as SupportTicket['category'],
      priority: form.priority as SupportTicket['priority'],
      assigned_to: '',
      created_date: new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString().split('T')[0],
      response_count: 0,
      status: 'NEW'
    };
    setTickets([newTicket, ...tickets]);
    setShowModal(false);
  };

  const handleAssign = (id: number) => setTickets(tickets.map(t => t.id === id ? { ...t, assigned_to: 'Current User', status: 'OPEN' as const } : t));
  const handleResolve = (id: number) => setTickets(tickets.map(t => t.id === id ? { ...t, status: 'RESOLVED' as const } : t));

  const newTickets = tickets.filter(t => t.status === 'NEW').length;
  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'PENDING').length;
  const criticalTickets = tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Support Tickets</h1>
        <p style={{ color: '#6b7280' }}>Manage customer support requests and issues</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><MessageSquare size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Tickets</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{tickets.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><Clock size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>New</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{newTickets}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Open</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{openTickets}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Critical</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{criticalTickets}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Ticket List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Ticket
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Ticket</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Assigned</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Replies</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Updated</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{ticket.reference}</div>
                  <div style={{ fontSize: '14px', color: '#111827' }}>{ticket.subject}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{ticket.customer}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getCategoryBadge(ticket.category)}</td>
                <td style={{ padding: '12px 16px' }}>{getPriorityBadge(ticket.priority)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: ticket.assigned_to ? '#111827' : '#9ca3af' }}>{ticket.assigned_to || 'Unassigned'}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#6b7280', textAlign: 'center' }}>{ticket.response_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{ticket.last_updated}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(ticket.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  {ticket.status === 'NEW' && (
                    <button onClick={() => handleAssign(ticket.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Assign</button>
                  )}
                  {(ticket.status === 'OPEN' || ticket.status === 'PENDING') && (
                    <button onClick={() => handleResolve(ticket.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Resolve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Support Ticket</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Subject *</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer *</label>
                  <input type="text" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Contact Email *</label>
                  <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="GENERAL">General</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="BUG">Bug Report</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Priority *</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
