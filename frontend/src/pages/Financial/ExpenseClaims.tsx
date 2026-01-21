import React, { useState } from 'react';
import { Plus, Eye, CheckCircle, XCircle, Clock, Receipt, DollarSign } from 'lucide-react';

interface ExpenseClaim {
  id: number;
  claim_number: string;
  employee: string;
  department: string;
  category: string;
  amount: number;
  description: string;
  receipt_attached: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  submitted_date: string;
}

const ExpenseClaims: React.FC = () => {
  const [claims, setClaims] = useState<ExpenseClaim[]>([
    { id: 1, claim_number: 'EXP-2026-001', employee: 'John Smith', department: 'Sales', category: 'Travel', amount: 4500, description: 'Client visit - Cape Town', receipt_attached: true, status: 'PAID', submitted_date: '2026-01-10' },
    { id: 2, claim_number: 'EXP-2026-002', employee: 'Sarah Johnson', department: 'Marketing', category: 'Entertainment', amount: 2800, description: 'Client dinner', receipt_attached: true, status: 'APPROVED', submitted_date: '2026-01-12' },
    { id: 3, claim_number: 'EXP-2026-003', employee: 'Mike Brown', department: 'IT', category: 'Equipment', amount: 1500, description: 'Laptop accessories', receipt_attached: true, status: 'SUBMITTED', submitted_date: '2026-01-15' },
    { id: 4, claim_number: 'EXP-2026-004', employee: 'Lisa Davis', department: 'HR', category: 'Training', amount: 3200, description: 'Conference registration', receipt_attached: false, status: 'SUBMITTED', submitted_date: '2026-01-18' },
    { id: 5, claim_number: 'EXP-2026-005', employee: 'Tom Wilson', department: 'Operations', category: 'Travel', amount: 6800, description: 'Site inspection - Durban', receipt_attached: true, status: 'DRAFT', submitted_date: '2026-01-20' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: '', department: '', category: '', amount: '', description: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      SUBMITTED: { bg: '#fef3c7', text: '#92400e' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      REJECTED: { bg: '#fee2e2', text: '#991b1b' },
      PAID: { bg: '#dcfce7', text: '#166534' }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ employee: '', department: '', category: '', amount: '', description: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newClaim: ExpenseClaim = {
      id: Date.now(),
      claim_number: `EXP-2026-${String(claims.length + 1).padStart(3, '0')}`,
      employee: form.employee,
      department: form.department,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description,
      receipt_attached: false,
      status: 'DRAFT',
      submitted_date: new Date().toISOString().split('T')[0]
    };
    setClaims([newClaim, ...claims]);
    setShowModal(false);
  };

  const handleApprove = (id: number) => setClaims(claims.map(c => c.id === id ? { ...c, status: 'APPROVED' as const } : c));
  const handleReject = (id: number) => setClaims(claims.map(c => c.id === id ? { ...c, status: 'REJECTED' as const } : c));

  const pendingAmount = claims.filter(c => c.status === 'SUBMITTED').reduce((acc, c) => acc + c.amount, 0);
  const approvedAmount = claims.filter(c => c.status === 'APPROVED').reduce((acc, c) => acc + c.amount, 0);
  const paidAmount = claims.filter(c => c.status === 'PAID').reduce((acc, c) => acc + c.amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Expense Claims</h1>
        <p style={{ color: '#6b7280' }}>Submit and manage employee expense reimbursements</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Receipt size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Claims</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{claims.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending Review</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(pendingAmount)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(approvedAmount)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Paid</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(paidAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Claims List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Claim
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Claim #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Receipt</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{claim.claim_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{claim.employee}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{claim.department}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{claim.category}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{claim.description}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(claim.amount)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {claim.receipt_attached ? <CheckCircle size={16} style={{ color: '#10b981' }} /> : <XCircle size={16} style={{ color: '#ef4444' }} />}
                </td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(claim.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {claim.status === 'SUBMITTED' && (
                    <>
                      <button onClick={() => handleApprove(claim.id)} style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleReject(claim.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Reject</button>
                    </>
                  )}
                  <button style={{ padding: '4px 8px', fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}><Eye size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Expense Claim</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Employee *</label>
                  <input type="text" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Category</option>
                    <option value="Travel">Travel</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Training">Training</option>
                    <option value="Meals">Meals</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Amount (ZAR) *</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseClaims;
