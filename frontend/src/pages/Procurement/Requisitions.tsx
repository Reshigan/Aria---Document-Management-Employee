import React, { useState } from 'react';
import { Plus, Edit2, Eye, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Requisition {
  id: number;
  reference: string;
  requester: string;
  department: string;
  description: string;
  items_count: number;
  total_amount: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requested_date: string;
  required_date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ORDERED';
}

const Requisitions: React.FC = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([
    { id: 1, reference: 'REQ-2026-001', requester: 'John Smith', department: 'Operations', description: 'Office supplies for Q1', items_count: 15, total_amount: 12500, priority: 'MEDIUM', requested_date: '2026-01-15', required_date: '2026-01-25', status: 'APPROVED' },
    { id: 2, reference: 'REQ-2026-002', requester: 'Sarah Johnson', department: 'IT', description: 'Server hardware upgrade', items_count: 5, total_amount: 85000, priority: 'HIGH', requested_date: '2026-01-16', required_date: '2026-02-01', status: 'SUBMITTED' },
    { id: 3, reference: 'REQ-2026-003', requester: 'Mike Brown', department: 'Manufacturing', description: 'Raw materials for production', items_count: 8, total_amount: 45000, priority: 'URGENT', requested_date: '2026-01-18', required_date: '2026-01-22', status: 'ORDERED' },
    { id: 4, reference: 'REQ-2026-004', requester: 'Lisa Davis', department: 'HR', description: 'Training materials', items_count: 3, total_amount: 8500, priority: 'LOW', requested_date: '2026-01-20', required_date: '2026-02-15', status: 'DRAFT' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ department: '', description: '', items_count: '', total_amount: '', priority: 'MEDIUM', required_date: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> },
      SUBMITTED: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      APPROVED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      REJECTED: { bg: '#fee2e2', text: '#991b1b', icon: <XCircle size={14} /> },
      ORDERED: { bg: '#dbeafe', text: '#1e40af', icon: <CheckCircle size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      LOW: { bg: '#f3f4f6', text: '#374151' },
      MEDIUM: { bg: '#dbeafe', text: '#1e40af' },
      HIGH: { bg: '#fef3c7', text: '#92400e' },
      URGENT: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[priority] || config.MEDIUM;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{priority}</span>;
  };

  const handleCreate = () => {
    setForm({ department: '', description: '', items_count: '', total_amount: '', priority: 'MEDIUM', required_date: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newReq: Requisition = {
      id: Date.now(),
      reference: `REQ-2026-${String(requisitions.length + 1).padStart(3, '0')}`,
      requester: 'Current User',
      department: form.department,
      description: form.description,
      items_count: parseInt(form.items_count),
      total_amount: parseFloat(form.total_amount),
      priority: form.priority as Requisition['priority'],
      requested_date: new Date().toISOString().split('T')[0],
      required_date: form.required_date,
      status: 'DRAFT'
    };
    setRequisitions([newReq, ...requisitions]);
    setShowModal(false);
  };

  const handleApprove = (id: number) => setRequisitions(requisitions.map(r => r.id === id ? { ...r, status: 'APPROVED' as const } : r));
  const handleReject = (id: number) => setRequisitions(requisitions.map(r => r.id === id ? { ...r, status: 'REJECTED' as const } : r));

  const totalPending = requisitions.filter(r => r.status === 'SUBMITTED').reduce((acc, r) => acc + r.total_amount, 0);
  const totalApproved = requisitions.filter(r => r.status === 'APPROVED').reduce((acc, r) => acc + r.total_amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Purchase Requisitions</h1>
        <p style={{ color: '#6b7280' }}>Create and manage purchase requisitions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Requisitions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{requisitions.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending Approval</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalPending)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalApproved)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><XCircle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Urgent</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{requisitions.filter(r => r.priority === 'URGENT').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Requisition List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Requisition
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Department</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Required</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.map((req) => (
              <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{req.reference}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{req.description}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.items_count} items</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{req.department}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(req.total_amount)}</td>
                <td style={{ padding: '12px 16px' }}>{getPriorityBadge(req.priority)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{req.required_date}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(req.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  {req.status === 'SUBMITTED' && (
                    <>
                      <button onClick={() => handleApprove(req.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleReject(req.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Reject</button>
                    </>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Requisition</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Department</option>
                    <option value="Operations">Operations</option>
                    <option value="IT">IT</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Priority *</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Items Count</label>
                  <input type="number" value={form.items_count} onChange={(e) => setForm({ ...form, items_count: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Est. Amount</label>
                  <input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Required By</label>
                  <input type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
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

export default Requisitions;
