import React, { useState } from 'react';
import { Plus, Edit2, Download, Eye, FileText, Clock, CheckCircle, AlertTriangle, Upload } from 'lucide-react';

interface ControlledDocument {
  id: number;
  document_number: string;
  title: string;
  category: string;
  version: string;
  owner: string;
  effective_date: string;
  review_date: string;
  last_reviewed: string;
  approver: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXPIRED' | 'SUPERSEDED';
}

const DocumentControl: React.FC = () => {
  const [documents, setDocuments] = useState<ControlledDocument[]>([
    { id: 1, document_number: 'POL-001', title: 'Information Security Policy', category: 'Policy', version: '3.0', owner: 'IT Manager', effective_date: '2025-01-01', review_date: '2026-01-01', last_reviewed: '2025-12-15', approver: 'CEO', status: 'APPROVED' },
    { id: 2, document_number: 'SOP-001', title: 'Invoice Processing Procedure', category: 'SOP', version: '2.1', owner: 'Finance Manager', effective_date: '2025-06-01', review_date: '2026-06-01', last_reviewed: '2025-05-20', approver: 'CFO', status: 'APPROVED' },
    { id: 3, document_number: 'POL-002', title: 'Data Protection Policy (POPIA)', category: 'Policy', version: '2.0', owner: 'Compliance Officer', effective_date: '2025-07-01', review_date: '2026-01-15', last_reviewed: '2025-06-25', approver: 'CEO', status: 'APPROVED' },
    { id: 4, document_number: 'SOP-002', title: 'Customer Onboarding Process', category: 'SOP', version: '1.5', owner: 'Sales Manager', effective_date: '2025-03-01', review_date: '2025-12-31', last_reviewed: '2025-02-15', approver: 'COO', status: 'EXPIRED' },
    { id: 5, document_number: 'WI-001', title: 'Server Backup Instructions', category: 'Work Instruction', version: '4.0', owner: 'IT Manager', effective_date: '2026-01-15', review_date: '2026-07-15', last_reviewed: '2026-01-10', approver: 'IT Director', status: 'PENDING_APPROVAL' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', owner: '', approver: '', effective_date: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> },
      PENDING_APPROVAL: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      APPROVED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      EXPIRED: { bg: '#fee2e2', text: '#991b1b', icon: <AlertTriangle size={14} /> },
      SUPERSEDED: { bg: '#e0e7ff', text: '#3730a3', icon: <FileText size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      Policy: { bg: '#dbeafe', text: '#1e40af' },
      SOP: { bg: '#dcfce7', text: '#166534' },
      'Work Instruction': { bg: '#fef3c7', text: '#92400e' },
      Form: { bg: '#e0e7ff', text: '#3730a3' },
      Template: { bg: '#f3f4f6', text: '#374151' }
    };
    const c = config[category] || config.Policy;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{category}</span>;
  };

  const handleCreate = () => {
    setForm({ title: '', category: '', owner: '', approver: '', effective_date: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const prefix = form.category === 'Policy' ? 'POL' : form.category === 'SOP' ? 'SOP' : form.category === 'Work Instruction' ? 'WI' : 'DOC';
    const newDoc: ControlledDocument = {
      id: Date.now(),
      document_number: `${prefix}-${String(documents.length + 1).padStart(3, '0')}`,
      title: form.title,
      category: form.category,
      version: '1.0',
      owner: form.owner,
      effective_date: form.effective_date,
      review_date: new Date(new Date(form.effective_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      last_reviewed: new Date().toISOString().split('T')[0],
      approver: form.approver,
      status: 'DRAFT'
    };
    setDocuments([newDoc, ...documents]);
    setShowModal(false);
  };

  const handleApprove = (id: number) => {
    setDocuments(documents.map(d => d.id === id ? { ...d, status: 'APPROVED' as const } : d));
  };

  const approved = documents.filter(d => d.status === 'APPROVED').length;
  const pendingApproval = documents.filter(d => d.status === 'PENDING_APPROVAL').length;
  const expired = documents.filter(d => d.status === 'EXPIRED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Document Control</h1>
        <p style={{ color: '#6b7280' }}>Manage controlled documents, policies, and procedures</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Documents</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{documents.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{approved}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending Approval</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{pendingApproval}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expired</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{expired}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Document Register</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Document
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Document</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Version</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Review Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{doc.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{doc.document_number}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getCategoryBadge(doc.category)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb', textAlign: 'center' }}>v{doc.version}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{doc.owner}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: new Date(doc.review_date) < new Date() ? '#ef4444' : '#6b7280' }}>{doc.review_date}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(doc.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Download size={16} /></button>
                  {doc.status === 'PENDING_APPROVAL' && (
                    <button onClick={() => handleApprove(doc.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Controlled Document</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Document Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Category</option>
                    <option value="Policy">Policy</option>
                    <option value="SOP">SOP</option>
                    <option value="Work Instruction">Work Instruction</option>
                    <option value="Form">Form</option>
                    <option value="Template">Template</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Effective Date *</label>
                  <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Document Owner *</label>
                  <input type="text" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Approver *</label>
                  <input type="text" value={form.approver} onChange={(e) => setForm({ ...form, approver: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentControl;
