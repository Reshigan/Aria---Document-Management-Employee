import React, { useState } from 'react';
import { Plus, ArrowRight, Package, Truck, CheckCircle, Clock } from 'lucide-react';

interface StockTransfer {
  id: number;
  reference: string;
  from_warehouse: string;
  to_warehouse: string;
  items_count: number;
  total_quantity: number;
  requested_date: string;
  status: 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED';
  created_by: string;
}

const StockTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([
    { id: 1, reference: 'TRF-2026-001', from_warehouse: 'Main Warehouse', to_warehouse: 'Secondary Warehouse', items_count: 5, total_quantity: 150, requested_date: '2026-01-15', status: 'COMPLETED', created_by: 'John Smith' },
    { id: 2, reference: 'TRF-2026-002', from_warehouse: 'Secondary Warehouse', to_warehouse: 'Main Warehouse', items_count: 3, total_quantity: 80, requested_date: '2026-01-18', status: 'IN_TRANSIT', created_by: 'Sarah Johnson' },
    { id: 3, reference: 'TRF-2026-003', from_warehouse: 'Main Warehouse', to_warehouse: 'Retail Store', items_count: 10, total_quantity: 250, requested_date: '2026-01-20', status: 'PENDING', created_by: 'Mike Brown' },
    { id: 4, reference: 'TRF-2026-004', from_warehouse: 'Main Warehouse', to_warehouse: 'Secondary Warehouse', items_count: 2, total_quantity: 45, requested_date: '2026-01-21', status: 'DRAFT', created_by: 'Lisa Davis' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ from_warehouse: '', to_warehouse: '', items_count: '', total_quantity: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <Clock size={14} /> },
      PENDING: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      IN_TRANSIT: { bg: '#dbeafe', text: '#1e40af', icon: <Truck size={14} /> },
      RECEIVED: { bg: '#d1fae5', text: '#065f46', icon: <Package size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const handleCreate = () => {
    setForm({ from_warehouse: '', to_warehouse: '', items_count: '', total_quantity: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newTransfer: StockTransfer = {
      id: Date.now(),
      reference: `TRF-2026-${String(transfers.length + 1).padStart(3, '0')}`,
      from_warehouse: form.from_warehouse,
      to_warehouse: form.to_warehouse,
      items_count: parseInt(form.items_count),
      total_quantity: parseInt(form.total_quantity),
      requested_date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      created_by: 'Current User'
    };
    setTransfers([newTransfer, ...transfers]);
    setShowModal(false);
  };

  const handleStatusChange = (id: number, newStatus: StockTransfer['status']) => {
    setTransfers(transfers.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Stock Transfers</h1>
        <p style={{ color: '#6b7280' }}>Transfer inventory between warehouses and locations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Package size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Transfers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{transfers.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><Truck size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>In Transit</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{transfers.filter(t => t.status === 'IN_TRANSIT').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{transfers.filter(t => t.status === 'PENDING').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{transfers.filter(t => t.status === 'COMPLETED').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Transfer List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Transfer
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>From / To</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Items</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Quantity</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{transfer.reference}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#111827' }}>{transfer.from_warehouse}</span>
                    <ArrowRight size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', color: '#111827' }}>{transfer.to_warehouse}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{transfer.items_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'center' }}>{transfer.total_quantity}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{transfer.requested_date}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(transfer.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {transfer.status === 'DRAFT' && <button onClick={() => handleStatusChange(transfer.id, 'PENDING')} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Submit</button>}
                  {transfer.status === 'PENDING' && <button onClick={() => handleStatusChange(transfer.id, 'IN_TRANSIT')} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Ship</button>}
                  {transfer.status === 'IN_TRANSIT' && <button onClick={() => handleStatusChange(transfer.id, 'COMPLETED')} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Receive</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Stock Transfer</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>From Warehouse *</label>
                  <select value={form.from_warehouse} onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Warehouse</option>
                    <option value="Main Warehouse">Main Warehouse</option>
                    <option value="Secondary Warehouse">Secondary Warehouse</option>
                    <option value="Retail Store">Retail Store</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>To Warehouse *</label>
                  <select value={form.to_warehouse} onChange={(e) => setForm({ ...form, to_warehouse: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Warehouse</option>
                    <option value="Main Warehouse">Main Warehouse</option>
                    <option value="Secondary Warehouse">Secondary Warehouse</option>
                    <option value="Retail Store">Retail Store</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Number of Items *</label>
                  <input type="number" value={form.items_count} onChange={(e) => setForm({ ...form, items_count: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Total Quantity *</label>
                  <input type="number" value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default StockTransfers;
