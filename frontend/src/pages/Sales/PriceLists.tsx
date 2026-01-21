import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Calendar, CheckCircle } from 'lucide-react';

interface PriceList {
  id: number;
  name: string;
  code: string;
  currency: string;
  effective_from: string;
  effective_to: string;
  customer_group: string;
  status: 'ACTIVE' | 'DRAFT' | 'EXPIRED';
  items_count: number;
}

const PriceLists: React.FC = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([
    { id: 1, name: 'Standard Price List 2026', code: 'STD-2026', currency: 'ZAR', effective_from: '2026-01-01', effective_to: '2026-12-31', customer_group: 'All Customers', status: 'ACTIVE', items_count: 245 },
    { id: 2, name: 'Wholesale Pricing', code: 'WHL-2026', currency: 'ZAR', effective_from: '2026-01-01', effective_to: '2026-12-31', customer_group: 'Wholesalers', status: 'ACTIVE', items_count: 245 },
    { id: 3, name: 'Retail Pricing', code: 'RTL-2026', currency: 'ZAR', effective_from: '2026-01-01', effective_to: '2026-12-31', customer_group: 'Retailers', status: 'ACTIVE', items_count: 180 },
    { id: 4, name: 'Export Pricing (USD)', code: 'EXP-USD-2026', currency: 'USD', effective_from: '2026-01-01', effective_to: '2026-12-31', customer_group: 'Export Customers', status: 'ACTIVE', items_count: 120 },
    { id: 5, name: 'Promotional Q1 2026', code: 'PROMO-Q1', currency: 'ZAR', effective_from: '2026-01-01', effective_to: '2026-03-31', customer_group: 'All Customers', status: 'ACTIVE', items_count: 50 },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', currency: 'ZAR', effective_from: '', effective_to: '', customer_group: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      EXPIRED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ name: '', code: '', currency: 'ZAR', effective_from: '', effective_to: '', customer_group: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newPL: PriceList = {
      id: Date.now(),
      name: form.name,
      code: form.code,
      currency: form.currency,
      effective_from: form.effective_from,
      effective_to: form.effective_to,
      customer_group: form.customer_group,
      status: 'DRAFT',
      items_count: 0
    };
    setPriceLists([newPL, ...priceLists]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this price list?')) {
      setPriceLists(priceLists.filter(p => p.id !== id));
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Price Lists</h1>
        <p style={{ color: '#6b7280' }}>Manage product pricing for different customer groups and currencies</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Tag size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Price Lists</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{priceLists.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{priceLists.filter(p => p.status === 'ACTIVE').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#6b7280' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Draft</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{priceLists.filter(p => p.status === 'DRAFT').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expired</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{priceLists.filter(p => p.status === 'EXPIRED').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Price List Management</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Price List
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Currency</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Customer Group</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Valid Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Items</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {priceLists.map((pl) => (
              <tr key={pl.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{pl.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#2563eb', fontWeight: 600 }}>{pl.code}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{pl.currency}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{pl.customer_group}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{pl.effective_from} to {pl.effective_to}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{pl.items_count}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(pl.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(pl.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Price List</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Currency *</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer Group *</label>
                  <select value={form.customer_group} onChange={(e) => setForm({ ...form, customer_group: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Group</option>
                    <option value="All Customers">All Customers</option>
                    <option value="Wholesalers">Wholesalers</option>
                    <option value="Retailers">Retailers</option>
                    <option value="Export Customers">Export Customers</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Effective From *</label>
                  <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Effective To *</label>
                  <input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default PriceLists;
